import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Add a door to a room wall
export const addDoor = mutation({
  args: {
    layoutId: v.id("layouts"),
    roomId: v.string(),
    door: v.object({
      id: v.string(),
      segmentId: v.string(),
      position: v.number(),
      size: v.union(v.literal(32), v.literal(36)),
      direction: v.union(v.literal("in"), v.literal("out")),
      hingeSide: v.union(v.literal("left"), v.literal("right"))
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
      doors: [...updatedRooms[roomIndex].doors, args.door],
    };

    await ctx.db.patch(args.layoutId, {
      rooms: updatedRooms,
      updatedAt: Date.now(),
    });
  },
});

// Update a door
export const updateDoor = mutation({
  args: {
    layoutId: v.id("layouts"),
    roomId: v.string(),
    doorId: v.string(),
    updates: v.object({
      segmentId: v.optional(v.string()),
      position: v.optional(v.number()),
      size: v.optional(v.union(v.literal(32), v.literal(36))),
      direction: v.optional(v.union(v.literal("in"), v.literal("out"))),
      hingeSide: v.optional(v.union(v.literal("left"), v.literal("right")))
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

    const doorIndex = layout.rooms[roomIndex].doors.findIndex(
      door => door.id === args.doorId
    );
    if (doorIndex === -1) {
      throw new Error("Door not found");
    }

    // Filter out undefined values
    const filteredUpdates = Object.fromEntries(
      Object.entries(args.updates).filter(([_, value]) => value !== undefined)
    );

    const updatedRooms = [...layout.rooms];
    const updatedDoors = [...updatedRooms[roomIndex].doors];
    updatedDoors[doorIndex] = {
      ...updatedDoors[doorIndex],
      ...filteredUpdates,
    };

    updatedRooms[roomIndex] = {
      ...updatedRooms[roomIndex],
      doors: updatedDoors,
    };

    await ctx.db.patch(args.layoutId, {
      rooms: updatedRooms,
      updatedAt: Date.now(),
    });
  },
});

// Delete a door from a room
export const deleteDoor = mutation({
  args: {
    layoutId: v.id("layouts"),
    roomId: v.string(),
    doorId: v.string(),
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
      doors: updatedRooms[roomIndex].doors.filter(
        door => door.id !== args.doorId
      ),
    };

    await ctx.db.patch(args.layoutId, {
      rooms: updatedRooms,
      updatedAt: Date.now(),
    });
  },
});

// Move a door along a wall segment
export const moveDoor = mutation({
  args: {
    layoutId: v.id("layouts"),
    roomId: v.string(),
    doorId: v.string(),
    position: v.number(), // 0-1 position along the segment
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

    const doorIndex = layout.rooms[roomIndex].doors.findIndex(
      door => door.id === args.doorId
    );
    if (doorIndex === -1) {
      throw new Error("Door not found");
    }

    const updatedRooms = [...layout.rooms];
    const updatedDoors = [...updatedRooms[roomIndex].doors];
    updatedDoors[doorIndex] = {
      ...updatedDoors[doorIndex],
      position: args.position,
    };

    updatedRooms[roomIndex] = {
      ...updatedRooms[roomIndex],
      doors: updatedDoors,
    };

    await ctx.db.patch(args.layoutId, {
      rooms: updatedRooms,
      updatedAt: Date.now(),
    });
  },
});

// Move a door to a different wall segment
export const moveDoorToSegment = mutation({
  args: {
    layoutId: v.id("layouts"),
    roomId: v.string(),
    doorId: v.string(),
    segmentId: v.string(),
    position: v.number(),
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

    const doorIndex = layout.rooms[roomIndex].doors.findIndex(
      door => door.id === args.doorId
    );
    if (doorIndex === -1) {
      throw new Error("Door not found");
    }

    const updatedRooms = [...layout.rooms];
    const updatedDoors = [...updatedRooms[roomIndex].doors];
    updatedDoors[doorIndex] = {
      ...updatedDoors[doorIndex],
      segmentId: args.segmentId,
      position: args.position,
    };

    updatedRooms[roomIndex] = {
      ...updatedRooms[roomIndex],
      doors: updatedDoors,
    };

    await ctx.db.patch(args.layoutId, {
      rooms: updatedRooms,
      updatedAt: Date.now(),
    });
  },
});

// Batch update multiple doors at once
export const batchUpdateDoors = mutation({
  args: {
    layoutId: v.id("layouts"),
    roomId: v.string(),
    updates: v.array(v.object({
      doorId: v.string(),
      updates: v.object({
        segmentId: v.optional(v.string()),
        position: v.optional(v.number()),
        size: v.optional(v.union(v.literal(32), v.literal(36))),
        direction: v.optional(v.union(v.literal("in"), v.literal("out"))),
        hingeSide: v.optional(v.union(v.literal("left"), v.literal("right")))
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
    const updatedDoors = [...updatedRooms[roomIndex].doors];

    // Apply each update
    for (const { doorId, updates } of args.updates) {
      const doorIndex = updatedDoors.findIndex(door => door.id === doorId);
      
      if (doorIndex !== -1) {
        // Filter out undefined values
        const filteredUpdates = Object.fromEntries(
          Object.entries(updates).filter(([_, value]) => value !== undefined)
        );

        updatedDoors[doorIndex] = {
          ...updatedDoors[doorIndex],
          ...filteredUpdates,
        };
      }
    }

    updatedRooms[roomIndex] = {
      ...updatedRooms[roomIndex],
      doors: updatedDoors,
    };

    await ctx.db.patch(args.layoutId, {
      rooms: updatedRooms,
      updatedAt: Date.now(),
    });
  },
}); 