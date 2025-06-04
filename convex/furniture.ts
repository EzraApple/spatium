import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Add furniture to a room
export const addFurniture = mutation({
  args: {
    layoutId: v.id("layouts"),
    roomId: v.string(),
    furniture: v.object({
      id: v.string(),
      type: v.string(),
      name: v.string(),
      length: v.number(),
      width: v.number(),
      depth: v.optional(v.number()),
      diameter: v.optional(v.number()),
      x: v.number(),
      y: v.number(),
      rotation: v.union(v.literal(0), v.literal(90), v.literal(180), v.literal(270)),
      isSelected: v.optional(v.boolean())
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

    const updatedRooms = [...layout.rooms];
    updatedRooms[roomIndex] = {
      ...updatedRooms[roomIndex],
      furniture: [...updatedRooms[roomIndex].furniture, args.furniture],
    };

    await ctx.db.patch(args.layoutId, {
      rooms: updatedRooms,
      updatedAt: Date.now(),
    });
  },
});

// Update furniture in a room
export const updateFurniture = mutation({
  args: {
    layoutId: v.id("layouts"),
    roomId: v.string(),
    furnitureId: v.string(),
    updates: v.object({
      name: v.optional(v.string()),
      length: v.optional(v.number()),
      width: v.optional(v.number()),
      depth: v.optional(v.number()),
      diameter: v.optional(v.number()),
      x: v.optional(v.number()),
      y: v.optional(v.number()),
      rotation: v.optional(v.union(v.literal(0), v.literal(90), v.literal(180), v.literal(270))),
      isSelected: v.optional(v.boolean())
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

    const furnitureIndex = layout.rooms[roomIndex].furniture.findIndex(
      furniture => furniture.id === args.furnitureId
    );
    if (furnitureIndex === -1) {
      throw new Error("Furniture not found");
    }

    // Filter out undefined values
    const filteredUpdates = Object.fromEntries(
      Object.entries(args.updates).filter(([_, value]) => value !== undefined)
    );

    const updatedRooms = [...layout.rooms];
    const updatedFurniture = [...updatedRooms[roomIndex].furniture];
    updatedFurniture[furnitureIndex] = {
      ...updatedFurniture[furnitureIndex],
      ...filteredUpdates,
    };

    updatedRooms[roomIndex] = {
      ...updatedRooms[roomIndex],
      furniture: updatedFurniture,
    };

    await ctx.db.patch(args.layoutId, {
      rooms: updatedRooms,
      updatedAt: Date.now(),
    });
  },
});

// Move furniture (update position and rotation)
export const moveFurniture = mutation({
  args: {
    layoutId: v.id("layouts"),
    roomId: v.string(),
    furnitureId: v.string(),
    x: v.number(),
    y: v.number(),
    rotation: v.optional(v.union(v.literal(0), v.literal(90), v.literal(180), v.literal(270)))
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

    const furnitureIndex = layout.rooms[roomIndex].furniture.findIndex(
      furniture => furniture.id === args.furnitureId
    );
    if (furnitureIndex === -1) {
      throw new Error("Furniture not found");
    }

    const updatedRooms = [...layout.rooms];
    const updatedFurniture = [...updatedRooms[roomIndex].furniture];
    updatedFurniture[furnitureIndex] = {
      ...updatedFurniture[furnitureIndex],
      x: args.x,
      y: args.y,
      ...(args.rotation !== undefined && { rotation: args.rotation }),
    };

    updatedRooms[roomIndex] = {
      ...updatedRooms[roomIndex],
      furniture: updatedFurniture,
    };

    await ctx.db.patch(args.layoutId, {
      rooms: updatedRooms,
      updatedAt: Date.now(),
    });
  },
});

// Delete furniture from a room
export const deleteFurniture = mutation({
  args: {
    layoutId: v.id("layouts"),
    roomId: v.string(),
    furnitureId: v.string(),
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
      furniture: updatedRooms[roomIndex].furniture.filter(
        furniture => furniture.id !== args.furnitureId
      ),
    };

    await ctx.db.patch(args.layoutId, {
      rooms: updatedRooms,
      updatedAt: Date.now(),
    });
  },
});

// Replace all furniture in a room (for bulk updates)
export const updateRoomFurniture = mutation({
  args: {
    layoutId: v.id("layouts"),
    roomId: v.string(),
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
      furniture: args.furniture,
    };

    await ctx.db.patch(args.layoutId, {
      rooms: updatedRooms,
      updatedAt: Date.now(),
    });
  },
});

// Batch update multiple furniture items at once
export const batchUpdateFurniture = mutation({
  args: {
    layoutId: v.id("layouts"),
    roomId: v.string(),
    updates: v.array(v.object({
      furnitureId: v.string(),
      updates: v.object({
        name: v.optional(v.string()),
        length: v.optional(v.number()),
        width: v.optional(v.number()),
        depth: v.optional(v.number()),
        diameter: v.optional(v.number()),
        x: v.optional(v.number()),
        y: v.optional(v.number()),
        rotation: v.optional(v.union(v.literal(0), v.literal(90), v.literal(180), v.literal(270)))
      })
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
    const updatedFurniture = [...updatedRooms[roomIndex].furniture];

    // Apply each update
    for (const { furnitureId, updates } of args.updates) {
      const furnitureIndex = updatedFurniture.findIndex(
        furniture => furniture.id === furnitureId
      );
      
      if (furnitureIndex !== -1) {
        // Filter out undefined values
        const filteredUpdates = Object.fromEntries(
          Object.entries(updates).filter(([_, value]) => value !== undefined)
        );

        updatedFurniture[furnitureIndex] = {
          ...updatedFurniture[furnitureIndex],
          ...filteredUpdates,
        };
      }
    }

    updatedRooms[roomIndex] = {
      ...updatedRooms[roomIndex],
      furniture: updatedFurniture,
    };

    await ctx.db.patch(args.layoutId, {
      rooms: updatedRooms,
      updatedAt: Date.now(),
    });
  },
});

// Select furniture (mark as being moved)
export const selectFurniture = mutation({
  args: {
    layoutId: v.id("layouts"),
    roomId: v.string(),
    furnitureId: v.string(),
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

    const furnitureIndex = layout.rooms[roomIndex].furniture.findIndex(
      furniture => furniture.id === args.furnitureId
    );
    if (furnitureIndex === -1) {
      throw new Error("Furniture not found");
    }

    const updatedRooms = [...layout.rooms];
    const updatedFurniture = [...updatedRooms[roomIndex].furniture];
    updatedFurniture[furnitureIndex] = {
      ...updatedFurniture[furnitureIndex],
      isSelected: true,
    };

    updatedRooms[roomIndex] = {
      ...updatedRooms[roomIndex],
      furniture: updatedFurniture,
    };

    await ctx.db.patch(args.layoutId, {
      rooms: updatedRooms,
      updatedAt: Date.now(),
    });
  },
});

// Deselect furniture (finished moving)
export const deselectFurniture = mutation({
  args: {
    layoutId: v.id("layouts"),
    roomId: v.string(),
    furnitureId: v.string(),
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

    const furnitureIndex = layout.rooms[roomIndex].furniture.findIndex(
      furniture => furniture.id === args.furnitureId
    );
    if (furnitureIndex === -1) {
      throw new Error("Furniture not found");
    }

    const updatedRooms = [...layout.rooms];
    const updatedFurniture = [...updatedRooms[roomIndex].furniture];
    updatedFurniture[furnitureIndex] = {
      ...updatedFurniture[furnitureIndex],
      isSelected: false,
    };

    updatedRooms[roomIndex] = {
      ...updatedRooms[roomIndex],
      furniture: updatedFurniture,
    };

    await ctx.db.patch(args.layoutId, {
      rooms: updatedRooms,
      updatedAt: Date.now(),
    });
  },
});

// Update furniture position in real-time (while dragging)
export const updateFurniturePosition = mutation({
  args: {
    layoutId: v.id("layouts"),
    roomId: v.string(),
    furnitureId: v.string(),
    x: v.number(),
    y: v.number(),
    rotation: v.optional(v.union(v.literal(0), v.literal(90), v.literal(180), v.literal(270)))
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

    const furnitureIndex = layout.rooms[roomIndex].furniture.findIndex(
      furniture => furniture.id === args.furnitureId
    );
    if (furnitureIndex === -1) {
      throw new Error("Furniture not found");
    }

    const updatedRooms = [...layout.rooms];
    const updatedFurniture = [...updatedRooms[roomIndex].furniture];
    updatedFurniture[furnitureIndex] = {
      ...updatedFurniture[furnitureIndex],
      x: args.x,
      y: args.y,
      ...(args.rotation !== undefined && { rotation: args.rotation }),
    };

    updatedRooms[roomIndex] = {
      ...updatedRooms[roomIndex],
      furniture: updatedFurniture,
    };

    await ctx.db.patch(args.layoutId, {
      rooms: updatedRooms,
      updatedAt: Date.now(),
    });
  },
}); 