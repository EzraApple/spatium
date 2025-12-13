import type { Point, RoomEntity, FurnitureEntity } from "@apartment-planner/shared"
import {
  getAbsoluteVertices,
  polygonsIntersect,
  pointInPolygon,
  furnitureShapeToVertices,
  getFurnitureVertices,
  circlesIntersect,
  circlePolygonIntersect,
  getRoomVertices,
} from "@apartment-planner/shared"

export function checkRoomCollision(
  rooms: RoomEntity[],
  roomId: string,
  position: Point
): boolean {
  const room = rooms.find((r) => r.id === roomId)
  if (!room) return false

  const movingVertices = getAbsoluteVertices(getRoomVertices(room), position)
  for (const other of rooms) {
    if (other.id === roomId) continue
    const otherVertices = getAbsoluteVertices(getRoomVertices(other), other.position)
    if (polygonsIntersect(movingVertices, otherVertices)) {
      return true
    }
  }
  return false
}

export function checkFurnitureCollision(
  rooms: RoomEntity[],
  furniture: FurnitureEntity[],
  furnitureId: string,
  position: Point,
  roomId: string
): boolean {
  const f = furniture.find((item) => item.id === furnitureId)
  const room = rooms.find((r) => r.id === roomId)
  if (!f || !room) return true

  const absolutePos = {
    x: room.position.x + position.x,
    y: room.position.y + position.y,
  }

  if (f.shapeTemplate.type === "circle") {
    const center = {
      x: absolutePos.x + f.shapeTemplate.radius,
      y: absolutePos.y + f.shapeTemplate.radius,
    }
    const roomVertices = getAbsoluteVertices(getRoomVertices(room), room.position)
    
    const innerCheck = furnitureShapeToVertices(f.shapeTemplate).every((v) => {
      const absV = { x: absolutePos.x + v.x, y: absolutePos.y + v.y }
      return pointInPolygon(absV, roomVertices)
    })
    if (!innerCheck) return true

    for (const other of furniture) {
      if (other.id === furnitureId) continue
      const otherRoom = rooms.find((r) => r.id === other.roomId)
      if (!otherRoom) continue

      const otherAbsPos = {
        x: otherRoom.position.x + other.position.x,
        y: otherRoom.position.y + other.position.y,
      }

      if (other.shapeTemplate.type === "circle") {
        const otherCenter = {
          x: otherAbsPos.x + other.shapeTemplate.radius,
          y: otherAbsPos.y + other.shapeTemplate.radius,
        }
        if (circlesIntersect(center, f.shapeTemplate.radius, otherCenter, other.shapeTemplate.radius)) {
          return true
        }
      } else {
        const otherVertices = getAbsoluteVertices(
          getFurnitureVertices(other),
          otherAbsPos
        )
        if (circlePolygonIntersect(center, f.shapeTemplate.radius, otherVertices)) {
          return true
        }
      }
    }
  } else {
    const movingVertices = getAbsoluteVertices(
      getFurnitureVertices({ ...f, position }),
      absolutePos
    )
    const roomVertices = getAbsoluteVertices(getRoomVertices(room), room.position)

    const allInsideRoom = movingVertices.every((v) => pointInPolygon(v, roomVertices))
    if (!allInsideRoom) return true

    for (const other of furniture) {
      if (other.id === furnitureId) continue
      const otherRoom = rooms.find((r) => r.id === other.roomId)
      if (!otherRoom) continue

      const otherAbsPos = {
        x: otherRoom.position.x + other.position.x,
        y: otherRoom.position.y + other.position.y,
      }

      if (other.shapeTemplate.type === "circle") {
        const otherCenter = {
          x: otherAbsPos.x + other.shapeTemplate.radius,
          y: otherAbsPos.y + other.shapeTemplate.radius,
        }
        if (circlePolygonIntersect(otherCenter, other.shapeTemplate.radius, movingVertices)) {
          return true
        }
      } else {
        const otherVertices = getAbsoluteVertices(
          getFurnitureVertices(other),
          otherAbsPos
        )
        if (polygonsIntersect(movingVertices, otherVertices)) {
          return true
        }
      }
    }
  }

  return false
}

export function findRoomAtPoint(rooms: RoomEntity[], point: Point): RoomEntity | null {
  for (const room of rooms) {
    const vertices = getAbsoluteVertices(getRoomVertices(room), room.position)
    if (pointInPolygon(point, vertices)) {
      return room
    }
  }
  return null
}

export function checkInventoryFurnitureCollision(
  rooms: RoomEntity[],
  existingFurniture: FurnitureEntity[],
  furnitureToPlace: FurnitureEntity,
  position: Point,
  roomId: string
): boolean {
  const room = rooms.find((r) => r.id === roomId)
  if (!room) return true

  const absolutePos = {
    x: room.position.x + position.x,
    y: room.position.y + position.y,
  }

  if (furnitureToPlace.shapeTemplate.type === "circle") {
    const center = {
      x: absolutePos.x + furnitureToPlace.shapeTemplate.radius,
      y: absolutePos.y + furnitureToPlace.shapeTemplate.radius,
    }
    const roomVertices = getAbsoluteVertices(getRoomVertices(room), room.position)
    
    const innerCheck = furnitureShapeToVertices(furnitureToPlace.shapeTemplate).every((v) => {
      const absV = { x: absolutePos.x + v.x, y: absolutePos.y + v.y }
      return pointInPolygon(absV, roomVertices)
    })
    if (!innerCheck) return true

    for (const other of existingFurniture) {
      if (other.id === furnitureToPlace.id) continue
      const otherRoom = rooms.find((r) => r.id === other.roomId)
      if (!otherRoom) continue

      const otherAbsPos = {
        x: otherRoom.position.x + other.position.x,
        y: otherRoom.position.y + other.position.y,
      }

      if (other.shapeTemplate.type === "circle") {
        const otherCenter = {
          x: otherAbsPos.x + other.shapeTemplate.radius,
          y: otherAbsPos.y + other.shapeTemplate.radius,
        }
        if (circlesIntersect(center, furnitureToPlace.shapeTemplate.radius, otherCenter, other.shapeTemplate.radius)) {
          return true
        }
      } else {
        const otherVertices = getAbsoluteVertices(
          getFurnitureVertices(other),
          otherAbsPos
        )
        if (circlePolygonIntersect(center, furnitureToPlace.shapeTemplate.radius, otherVertices)) {
          return true
        }
      }
    }
  } else {
    const movingVertices = getAbsoluteVertices(
      getFurnitureVertices({ ...furnitureToPlace, position }),
      absolutePos
    )
    const roomVertices = getAbsoluteVertices(getRoomVertices(room), room.position)

    const allInsideRoom = movingVertices.every((v) => pointInPolygon(v, roomVertices))
    if (!allInsideRoom) return true

    for (const other of existingFurniture) {
      if (other.id === furnitureToPlace.id) continue
      const otherRoom = rooms.find((r) => r.id === other.roomId)
      if (!otherRoom) continue

      const otherAbsPos = {
        x: otherRoom.position.x + other.position.x,
        y: otherRoom.position.y + other.position.y,
      }

      if (other.shapeTemplate.type === "circle") {
        const otherCenter = {
          x: otherAbsPos.x + other.shapeTemplate.radius,
          y: otherAbsPos.y + other.shapeTemplate.radius,
        }
        if (circlePolygonIntersect(otherCenter, other.shapeTemplate.radius, movingVertices)) {
          return true
        }
      } else {
        const otherVertices = getAbsoluteVertices(
          getFurnitureVertices(other),
          otherAbsPos
        )
        if (polygonsIntersect(movingVertices, otherVertices)) {
          return true
        }
      }
    }
  }

  return false
}

