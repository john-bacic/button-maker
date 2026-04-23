import { action, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const CACHE_KEY = "main";
const REPO_OWNER = "john-bacic";
const REPO_NAME = "button-maker";
const COMMITS_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits/main`;

export const getCached = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("githubDeployCache")
      .withIndex("by_key", (q) => q.eq("key", CACHE_KEY))
      .unique();

    if (!row) return null;

    return {
      sha: row.sha ?? null,
      status: row.status,
      updatedAt: row.updatedAt,
    };
  },
});

export const setCached = internalMutation({
  args: {
    key: v.string(),
    sha: v.optional(v.string()),
    status: v.string(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("githubDeployCache")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        sha: args.sha,
        status: args.status,
        updatedAt: args.updatedAt,
      });
      return;
    }

    await ctx.db.insert("githubDeployCache", {
      key: args.key,
      sha: args.sha,
      status: args.status,
      updatedAt: args.updatedAt,
    });
  },
});

export const refresh = action({
  args: {},
  handler: async (ctx) => {
    const updatedAt = Date.now();

    try {
      const response = await fetch(COMMITS_API, { cache: "no-store" });

      if (!response.ok) {
        const status = response.status === 403 ? "rate_limited" : "unavailable";
        await ctx.runMutation(internal.githubDeploy.setCached, {
          key: CACHE_KEY,
          sha: undefined,
          status,
          updatedAt,
        });
        return { sha: null, status, updatedAt };
      }

      const payload = await response.json();
      const shortSha = String(payload.sha || "").slice(0, 7);
      const status = shortSha ? "ok" : "unavailable";

      await ctx.runMutation(internal.githubDeploy.setCached, {
        key: CACHE_KEY,
        sha: shortSha || undefined,
        status,
        updatedAt,
      });

      return { sha: shortSha || null, status, updatedAt };
    } catch {
      const status = "network_error";
      await ctx.runMutation(internal.githubDeploy.setCached, {
        key: CACHE_KEY,
        sha: undefined,
        status,
        updatedAt,
      });
      return { sha: null, status, updatedAt };
    }
  },
});
