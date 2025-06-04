import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get layout by code
export const getLayoutByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const layout = await ctx.db
      .query("layouts")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();
    return layout;
  },
});

// Get layout by ID
export const getLayoutById = query({
  args: { id: v.id("layouts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new layout
export const createLayout = mutation({
  args: {
    name: v.string(),
    title: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const layoutId = await ctx.db.insert("layouts", {
      name: args.name,
      title: args.title,
      code: args.code,
      createdAt: now,
      updatedAt: now,
      rooms: [],
    });
    
    return layoutId;
  },
});

// Update layout basic information
export const updateLayoutInfo = mutation({
  args: {
    id: v.id("layouts"),
    title: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    // Filter out undefined values
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    
    if (Object.keys(filteredUpdates).length === 0) {
      return; // No updates to make
    }
    
    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });
  },
});

// Replace entire layout (for bulk updates)
export const updateLayout = mutation({
  args: {
    id: v.id("layouts"),
    name: v.optional(v.string()),
    title: v.optional(v.string()),
    rooms: v.optional(v.array(v.object({
      id: v.string(),
      name: v.string(),
      vertices: v.array(v.object({
        id: v.string(),
        x: v.number(),
        y: v.number()
      })),
      segments: v.array(v.object({
        id: v.string(),
        v1_id: v.string(),
        v2_id: v.string(),
        isLocked: v.boolean()
      })),
      doors: v.array(v.object({
        id: v.string(),
        segmentId: v.string(),
        position: v.number(),
        size: v.union(v.literal(32), v.literal(36)),
        direction: v.union(v.literal("in"), v.literal("out")),
        hingeSide: v.union(v.literal("left"), v.literal("right"))
      })),
      furniture: v.array(v.object({
        id: v.string(),
        type: v.string(),
        name: v.string(),
        length: v.number(),
        width: v.number(),
        depth: v.optional(v.number()),
        diameter: v.optional(v.number()),
        x: v.number(),
        y: v.number(),
        rotation: v.union(v.literal(0), v.literal(90), v.literal(180), v.literal(270))
      }))
    })))
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    // Filter out undefined values
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    
    if (Object.keys(filteredUpdates).length === 0) {
      return; // No updates to make
    }
    
    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });
  },
});

// Delete a layout
export const deleteLayout = mutation({
  args: { id: v.id("layouts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// List all layouts (for dashboard/management)
export const listLayouts = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    
    return await ctx.db
      .query("layouts")
      .withIndex("by_created_at")
      .order("desc")
      .take(limit);
  },
}); 