import { mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

const VERSION_CAP = 50;

/** Newest first. */
const collectVersions = async (
  ctx: MutationCtx,
  variationId: Id<"variations">
): Promise<Array<Doc<"variationVersions">>> =>
  ctx.db
    .query("variationVersions")
    .withIndex("by_variation_savedAt", (q) => q.eq("variationId", variationId))
    .order("desc")
    .collect();

/** Backfills a v1 row from the legacy denormalized stateJson when a variation has no versions. */
const ensureBaselineVersion = async (
  ctx: MutationCtx,
  variation: Doc<"variations">
): Promise<Array<Doc<"variationVersions">>> => {
  const existing = await collectVersions(ctx, variation._id);
  if (existing.length > 0) return existing;
  await ctx.db.insert("variationVersions", {
    variationId: variation._id,
    stateJson: variation.stateJson,
    savedAt: variation.updatedAt,
    message: undefined,
  });
  return collectVersions(ctx, variation._id);
};

const serializeVersion = (row: Doc<"variationVersions">) => ({
  id: row._id,
  stateJson: row.stateJson,
  savedAt: row.savedAt,
  message: row.message,
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const variations = await ctx.db.query("variations").order("desc").collect();
    const enriched = await Promise.all(
      variations.map(async (variation) => {
        const versions = await ctx.db
          .query("variationVersions")
          .withIndex("by_variation_savedAt", (q) =>
            q.eq("variationId", variation._id)
          )
          .order("desc")
          .collect();

        // Synthesize a virtual baseline for legacy rows so the client always sees ≥1 version.
        const synthesized = versions.length === 0
          ? [{
              id: `legacy:${variation._id}`,
              stateJson: variation.stateJson,
              savedAt: variation.updatedAt,
              message: undefined as string | undefined,
              isLegacyBaseline: true,
            }]
          : versions.map((row) => ({ ...serializeVersion(row), isLegacyBaseline: false }));

        return {
          id: variation._id,
          name: variation.name,
          createdAt: variation.createdAt ?? variation.updatedAt,
          updatedAt: variation.updatedAt,
          versions: synthesized,
        };
      })
    );
    return enriched;
  },
});

export const createVariation = mutation({
  args: {
    name: v.string(),
    stateJson: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, { name, stateJson, message }) => {
    const now = Date.now();
    const variationId = await ctx.db.insert("variations", {
      name,
      stateJson,
      updatedAt: now,
      createdAt: now,
    });
    const versionId = await ctx.db.insert("variationVersions", {
      variationId,
      stateJson,
      savedAt: now,
      message,
    });
    return {
      variation: { id: variationId, name, createdAt: now, updatedAt: now },
      version: { id: versionId, stateJson, savedAt: now, message },
    };
  },
});

export const saveVersion = mutation({
  args: {
    variationId: v.id("variations"),
    stateJson: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, { variationId, stateJson, message }) => {
    const variation = await ctx.db.get(variationId);
    if (!variation) throw new Error("Variation not found");
    await ensureBaselineVersion(ctx, variation);

    const now = Date.now();
    const versionId = await ctx.db.insert("variationVersions", {
      variationId,
      stateJson,
      savedAt: now,
      message,
    });
    await ctx.db.patch(variationId, { stateJson, updatedAt: now });

    const versions = await collectVersions(ctx, variationId);
    if (versions.length > VERSION_CAP) {
      for (const old of versions.slice(VERSION_CAP)) {
        await ctx.db.delete(old._id);
      }
    }

    return { version: { id: versionId, stateJson, savedAt: now, message } };
  },
});

export const renameVariation = mutation({
  args: {
    variationId: v.id("variations"),
    name: v.string(),
  },
  handler: async (ctx, { variationId, name }) => {
    await ctx.db.patch(variationId, { name, updatedAt: Date.now() });
  },
});

export const deleteVersion = mutation({
  args: { versionId: v.id("variationVersions") },
  handler: async (ctx, { versionId }) => {
    const version = await ctx.db.get(versionId);
    if (!version) return null;
    await ctx.db.delete(versionId);
    const remaining = await collectVersions(ctx, version.variationId);
    if (remaining.length > 0) {
      // Update denormalized latest stateJson on the variation.
      await ctx.db.patch(version.variationId, {
        stateJson: remaining[0].stateJson,
        updatedAt: remaining[0].savedAt,
      });
    }
    return { variationId: version.variationId };
  },
});

export const deleteVariation = mutation({
  args: { variationId: v.id("variations") },
  handler: async (ctx, { variationId }) => {
    const versions = await collectVersions(ctx, variationId);
    for (const row of versions) {
      await ctx.db.delete(row._id);
    }
    await ctx.db.delete(variationId);
  },
});

/* ------------------------------------------------------------------------- */
/*  Legacy aliases (older clients still call these). Internally append a     */
/*  version row so history works regardless of caller version.               */
/* ------------------------------------------------------------------------- */

export const save = mutation({
  args: {
    name: v.string(),
    stateJson: v.string(),
  },
  handler: async (ctx, { name, stateJson }) => {
    const existing = await ctx.db
      .query("variations")
      .withIndex("by_name", (q) => q.eq("name", name))
      .unique();
    const now = Date.now();

    if (existing) {
      await ensureBaselineVersion(ctx, existing);
      await ctx.db.insert("variationVersions", {
        variationId: existing._id,
        stateJson,
        savedAt: now,
        message: undefined,
      });
      await ctx.db.patch(existing._id, { stateJson, updatedAt: now });
      return { id: existing._id, name, stateJson, updatedAt: now };
    }

    const id = await ctx.db.insert("variations", {
      name,
      stateJson,
      updatedAt: now,
      createdAt: now,
    });
    await ctx.db.insert("variationVersions", {
      variationId: id,
      stateJson,
      savedAt: now,
      message: undefined,
    });
    return { id, name, stateJson, updatedAt: now };
  },
});

export const remove = mutation({
  args: { id: v.id("variations") },
  handler: async (ctx, { id }) => {
    const versions = await collectVersions(ctx, id);
    for (const row of versions) {
      await ctx.db.delete(row._id);
    }
    await ctx.db.delete(id);
  },
});
