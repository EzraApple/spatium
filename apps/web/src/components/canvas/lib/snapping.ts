import type { Point, RoomEntity } from "@apartment-planner/shared"
import { findSnapPosition, getRoomVertices } from "@apartment-planner/shared"

export function calculateSnappedPosition(
  rooms: RoomEntity[],
  roomId: string,
  rawPosition: Point,
  gridSize: number,
  snapThreshold: number
): Point {
  const room = rooms.find((r) => r.id === roomId)
  if (!room) return rawPosition

  let position = {
    x: Math.round(rawPosition.x / gridSize) * gridSize,
    y: Math.round(rawPosition.y / gridSize) * gridSize,
  }

  const otherRooms = rooms
    .filter((r) => r.id !== roomId)
    .map((r) => ({ vertices: getRoomVertices(r), position: r.position }))

  const snapPos = findSnapPosition(
    { vertices: getRoomVertices(room), position },
    otherRooms,
    snapThreshold
  )

  if (snapPos) {
    position = snapPos
  }

  return position
}

