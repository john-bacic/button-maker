import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  variations: defineTable({
    name: v.string(),
    stateJson: v.string(),
    updatedAt: v.number(),
  }).index("by_name", ["name"]),
  svgCache: defineTable({
    key: v.string(),
    svgMarkup: v.string(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
});
