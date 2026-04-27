import { action, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

const CACHE_KEY = "main";
const REPO_OWNER = "john-bacic";
const REPO_NAME = "button-maker";
const COMMITS_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits/main`;

/** Skip new HTTP calls while rate_limited to avoid burning the budget (see refresh). */
const RATE_LIMIT_BACKOFF_MS = 15 * 60 * 1000;

/**
 * Set `GITHUB_TOKEN` in the Convex dashboard (fine-grained: read-only on this repo, or classic `public_repo`)
 * so the commits API uses 5k/hr auth instead of ~60/hr shared unauthenticated IP limits.
 */
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
      etag: row.etag ?? null,
    };
  },
});

export const setCached = internalMutation({
  args: {
    key: v.string(),
    sha: v.optional(v.string()),
    status: v.string(),
    updatedAt: v.number(),
    etag: v.optional(v.string()),
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
        ...(args.etag !== undefined ? { etag: args.etag } : {}),
      });
      return;
    }

    await ctx.db.insert("githubDeployCache", {
      key: args.key,
      sha: args.sha,
      status: args.status,
      updatedAt: args.updatedAt,
      ...(args.etag !== undefined ? { etag: args.etag } : {}),
    });
  },
});

export const refresh = action({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const prev = await ctx.runQuery(api.githubDeploy.getCached, {});

    if (
      prev?.status === "rate_limited" &&
      prev.updatedAt &&
      now - prev.updatedAt < RATE_LIMIT_BACKOFF_MS
    ) {
      return {
        sha: prev.sha ?? null,
        status: "rate_limited" as const,
        updatedAt: prev.updatedAt,
        backoff: true,
      };
    }

    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    const token = process.env.GITHUB_TOKEN;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (prev?.etag) {
      headers["If-None-Match"] = prev.etag;
    }

    try {
      const response = await fetch(COMMITS_API, { headers, cache: "no-store" });

      if (response.status === 304) {
        if (prev?.sha) {
          await ctx.runMutation(internal.githubDeploy.setCached, {
            key: CACHE_KEY,
            sha: prev.sha,
            status: "ok",
            updatedAt: now,
            etag: response.headers.get("etag") ?? prev.etag,
          });
          return { sha: prev.sha, status: "ok" as const, updatedAt: now, notModified: true };
        }
      }

      if (!response.ok) {
        const isRateLimited =
          response.status === 403 || response.status === 429 || response.status === 503;
        const status = isRateLimited ? "rate_limited" : "unavailable";
        await ctx.runMutation(internal.githubDeploy.setCached, {
          key: CACHE_KEY,
          sha: prev?.sha ?? undefined,
          status,
          updatedAt: now,
          etag: prev?.etag,
        });
        return { sha: prev?.sha ?? null, status, updatedAt: now };
      }

      const payload = await response.json();
      const shortSha = String(payload.sha || "").slice(0, 7);
      const status = shortSha ? "ok" : "unavailable";
      const etag = response.headers.get("etag") ?? undefined;

      await ctx.runMutation(internal.githubDeploy.setCached, {
        key: CACHE_KEY,
        sha: shortSha || prev?.sha || undefined,
        status,
        updatedAt: now,
        etag,
      });

      return { sha: shortSha || prev?.sha || null, status, updatedAt: now };
    } catch {
      const status = "network_error";
      await ctx.runMutation(internal.githubDeploy.setCached, {
        key: CACHE_KEY,
        sha: prev?.sha ?? undefined,
        status,
        updatedAt: now,
        etag: prev?.etag,
      });
      return { sha: prev?.sha ?? null, status, updatedAt: now };
    }
  },
});
