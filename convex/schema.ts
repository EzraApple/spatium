import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  layouts: defineTable({
    // Basic layout information
    name: v.string(),
    title: v.string(),
    code: v.string(), // 8-letter all-caps identifier
    createdAt: v.number(), // timestamp
    updatedAt: v.number(), // timestamp
    
    // Layout rooms data
    rooms: v.array(v.object({
      id: v.string(),
      name: v.string(),
      
      // Room geometry
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
      
      // Doors on room walls
      doors: v.array(v.object({
        id: v.string(),
        segmentId: v.string(), // Which wall segment this door is on
        position: v.number(), // 0-1, position along the segment
        size: v.union(v.literal(32), v.literal(36)), // Door width in inches
        direction: v.union(v.literal("in"), v.literal("out")), // Opening direction
        hingeSide: v.union(v.literal("left"), v.literal("right")) // Hinge side
      })),
      
      // Furniture items in the room
      furniture: v.array(v.object({
        id: v.string(),
        type: v.string(), // Flexible furniture type (table, circular-table, bed, couch, etc.)
        name: v.string(),
        length: v.number(), // in inches
        width: v.number(), // in inches
        depth: v.optional(v.number()), // in inches (for L-shaped furniture)
        diameter: v.optional(v.number()), // for circular items
        x: v.number(), // position in room
        y: v.number(), // position in room
        rotation: v.union(v.literal(0), v.literal(90), v.literal(180), v.literal(270)), // degrees
        isSelected: v.optional(v.boolean()) // tracks if furniture is currently being moved by someone
      }))
    }))
  })
    .index("by_code", ["code"]) // Index for quick lookup by layout code
    .index("by_created_at", ["createdAt"]) // Index for sorting by creation time
});

export default schema; 