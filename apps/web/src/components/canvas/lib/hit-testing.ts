import type { Point, RoomEntity, FurnitureEntity } from "@apartment-planner/shared"
import { getAbsoluteVertices, pointInPolygon, furnitureShapeToVertices, pointInCircle, getRoomVertices } from "@apartment-planner/shared"

export function hitTestFurniture(
  worldPos: Point,
  furniture: FurnitureEntity[],
  rooms: RoomEntity[]
): FurnitureEntity | null {
  for (const f of furniture) {
    const room = rooms.find((r) => r.id === f.roomId)
    if (!room) continue

    const absolutePos = {
      x: room.position.x + f.position.x,
      y: room.position.y + f.position.y,
    }

    if (f.shapeTemplate.type === "circle") {
      const center = {
        x: absolutePos.x + f.shapeTemplate.radius,
        y: absolutePos.y + f.shapeTemplate.radius,
      }
      if (pointInCircle(worldPos, center, f.shapeTemplate.radius)) {
        return f
      }
    } else {
      const vertices = getAbsoluteVertices(
        furnitureShapeToVertices(f.shapeTemplate),
        absolutePos
      )
      if (pointInPolygon(worldPos, vertices)) {
        return f
      }
    }
  }
  return null
}

export function hitTestRoom(worldPos: Point, rooms: RoomEntity[]): RoomEntity | null {
  for (const room of rooms) {
    const vertices = getAbsoluteVertices(getRoomVertices(room), room.position)
    if (pointInPolygon(worldPos, vertices)) {
      return room
    }
  }
  return null
}

