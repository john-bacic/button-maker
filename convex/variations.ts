import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("variations").order("desc").collect();
    return rows.map((row) => ({
      id: row._id,
      name: row.name,
      stateJson: row.stateJson,
    }));
  },
});

export const save = mutation({
  args: {
    name: v.string(),
    stateJson: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("variations")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .unique();

    const updatedAt = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        stateJson: args.stateJson,
        updatedAt,
      });
      return { id: existing._id, name: args.name, stateJson: args.stateJson };
    }

    const id = await ctx.db.insert("variations", {
      name: args.name,
      stateJson: args.stateJson,
      updatedAt,
    });

    return { id, name: args.name, stateJson: args.stateJson };
  },
});

export const remove = mutation({
  args: {
    id: v.id("variations"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
