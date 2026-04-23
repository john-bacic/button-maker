import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const LATEST_KEY = "latest";

export const getLatest = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("svgCache")
      .withIndex("by_key", (q) => q.eq("key", LATEST_KEY))
      .unique();

    if (!row) return null;
    return {
      svgMarkup: row.svgMarkup,
      updatedAt: row.updatedAt,
    };
  },
});

export const setLatest = mutation({
  args: {
    svgMarkup: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("svgCache")
      .withIndex("by_key", (q) => q.eq("key", LATEST_KEY))
      .unique();

    const updatedAt = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        svgMarkup: args.svgMarkup,
        updatedAt,
      });
      return;
    }

    await ctx.db.insert("svgCache", {
      key: LATEST_KEY,
      svgMarkup: args.svgMarkup,
      updatedAt,
    });
  },
});
