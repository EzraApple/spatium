import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Add a new room to a layout
export const addRoom = mutation({
  args: {
    layoutId: v.id("layouts"),
    room: v.object({
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
    })
  },
  handler: async (ctx, args) => {
    const layout = await ctx.db.get(args.layoutId);
    if (!layout) {
      throw new Error("Layout not found");
    }

    const updatedRooms = [...layout.rooms, args.room];

    await ctx.db.patch(args.layoutId, {
      rooms: updatedRooms,
      updatedAt: Date.now(),
    });
  },
});

// Update an existing room
export const updateRoom = mutation({
  args: {
    layoutId: v.id("layouts"),
    roomId: v.string(),
    updates: v.object({
      name: v.optional(v.string()),
      vertices: v.optional(v.array(v.object({
        id: v.string(),
        x: v.number(),
        y: v.number()
      }))),
      segments: v.optional(v.array(v.object({
        id: v.string(),
        v1_id: v.string(),
        v2_id: v.string(),
        isLocked: v.boolean()
      }))),
      doors: v.optional(v.array(v.object({
        id: v.string(),
        segmentId: v.string(),
        position: v.number(),
        size: v.union(v.literal(32), v.literal(36)),
        direction: v.union(v.literal("in"), v.literal("out")),
        hingeSide: v.union(v.literal("left"), v.literal("right"))
      }))),
      furniture: v.optional(v.array(v.object({
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
      })))
    })
  },
  handler: async (ctx, args) => {
    const layout = await ctx.db.get(args.layoutId);
    if (!layout) {
      throw new Error("Layout not found");
    }

    const roomIndex = layout.rooms.findIndex(room => room.id === args.roomId);
    if (roomIndex === -1) {
      throw new Error("Room not found");
    }

    // Filter out undefined values
    const filteredUpdates = Object.fromEntries(
      Object.entries(args.updates).filter(([_, value]) => value !== undefined)
    );

    const updatedRooms = [...layout.rooms];
    updatedRooms[roomIndex] = {
      ...updatedRooms[roomIndex],
      ...filteredUpdates,
    };

    await ctx.db.patch(args.layoutId, {
      rooms: updatedRooms,
      updatedAt: Date.now(),
    });
  },
});

// Delete a room from a layout
export const deleteRoom = mutation({
  args: {
    layoutId: v.id("layouts"),
    roomId: v.string(),
  },
  handler: async (ctx, args) => {
    const layout = await ctx.db.get(args.layoutId);
    if (!layout) {
      throw new Error("Layout not found");
    }

    const updatedRooms = layout.rooms.filter(room => room.id !== args.roomId);

    await ctx.db.patch(args.layoutId, {
      rooms: updatedRooms,
      updatedAt: Date.now(),
    });
  },
});

// Update room geometry (vertices and segments)
export const updateRoomGeometry = mutation({
  args: {
    layoutId: v.id("layouts"),
    roomId: v.string(),
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
    }))
  },
  handler: async (ctx, args) => {
    const layout = await ctx.db.get(args.layoutId);
    if (!layout) {
      throw new Error("Layout not found");
    }

    const roomIndex = layout.rooms.findIndex(room => room.id === args.roomId);
    if (roomIndex === -1) {
      throw new Error("Room not found");
    }

    const updatedRooms = [...layout.rooms];
    updatedRooms[roomIndex] = {
      ...updatedRooms[roomIndex],
      vertices: args.vertices,
      segments: args.segments,
    };

    await ctx.db.patch(args.layoutId, {
      rooms: updatedRooms,
      updatedAt: Date.now(),
    });
  },
});

// Update room doors
export const updateRoomDoors = mutation({
  args: {
    layoutId: v.id("layouts"),
    roomId: v.string(),
    doors: v.array(v.object({
      id: v.string(),
      segmentId: v.string(),
      position: v.number(),
      size: v.union(v.literal(32), v.literal(36)),
      direction: v.union(v.literal("in"), v.literal("out")),
      hingeSide: v.union(v.literal("left"), v.literal("right"))
    }))
  },
  handler: async (ctx, args) => {
    const layout = await ctx.db.get(args.layoutId);
    if (!layout) {
      throw new Error("Layout not found");
    }

    const roomIndex = layout.rooms.findIndex(room => room.id === args.roomId);
    if (roomIndex === -1) {
      throw new Error("Room not found");
    }

    const updatedRooms = [...layout.rooms];
    updatedRooms[roomIndex] = {
      ...updatedRooms[roomIndex],
      doors: args.doors,
    };

    await ctx.db.patch(args.layoutId, {
      rooms: updatedRooms,
      updatedAt: Date.now(),
    });
  },
}); 