import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  variations: defineTable({
    name: v.string(),
    /** Denormalized mirror of the latest variationVersions row's stateJson. */
    stateJson: v.string(),
    updatedAt: v.number(),
    createdAt: v.optional(v.number()),
  }).index("by_name", ["name"]),
  variationVersions: defineTable({
    variationId: v.id("variations"),
    stateJson: v.string(),
    savedAt: v.number(),
    message: v.optional(v.string()),
  }).index("by_variation_savedAt", ["variationId", "savedAt"]),
  svgCache: defineTable({
    key: v.string(),
    svgMarkup: v.string(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
  githubDeployCache: defineTable({
    key: v.string(),
    sha: v.optional(v.string()),
    status: v.string(),
    updatedAt: v.number(),
    /** GitHub commits API ETag for If-None-Match (saves rate limit when unchanged). */
    etag: v.optional(v.string()),
  }).index("by_key", ["key"]),
});
