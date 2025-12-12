import { useCallback } from "react"
import { v4 as uuid } from "uuid"
import type {
  RoomEntity,
  FurnitureEntity,
  DoorEntity,
  ShapeTemplate,
  FurnitureType,
  FurnitureShapeTemplate,
  HingeSide,
  Point,
} from "@apartment-planner/shared"
import {
  furnitureShapeToVertices,
  inchesToEighths,
  getRoomVertices,
  shapeToVertices,
  getWallSegments,
  findClosestWallPoint,
} from "@apartment-planner/shared"

type UseEditorActionsProps = {
  rooms: RoomEntity[]
  doors: DoorEntity[]
  addRoom: (room: RoomEntity) => void
  updateRoom: (room: RoomEntity) => void
  deleteRoom: (roomId: string) => void
  addFurniture: (furniture: FurnitureEntity) => void
  updateFurniture: (furniture: FurnitureEntity) => void
  deleteFurniture: (furnitureId: string) => void
  addDoor: (door: DoorEntity) => void
  updateDoor: (door: DoorEntity) => void
  deleteDoor: (doorId: string) => void
  select: (id: string, type: "room" | "furniture" | "door") => void
  deselect: () => void
}

export function useEditorActions({
  rooms,
  doors,
  addRoom,
  updateRoom,
  deleteRoom: deleteRoomSync,
  addFurniture,
  updateFurniture,
  deleteFurniture: deleteFurnitureSync,
  addDoor,
  updateDoor,
  deleteDoor: deleteDoorSync,
  select,
  deselect,
}: UseEditorActionsProps) {
  const createRoom = useCallback(
    (name: string, template: ShapeTemplate, spawnPosition: Point) => {
      const templateVertices = shapeToVertices(template)
      const centerX = templateVertices.reduce((sum, v) => sum + v.x, 0) / templateVertices.length
      const centerY = templateVertices.reduce((sum, v) => sum + v.y, 0) / templateVertices.length

      const room: RoomEntity = {
        type: "room",
        id: uuid(),
        name,
        position: {
          x: spawnPosition.x - centerX,
          y: spawnPosition.y - centerY,
        },
        shapeTemplate: template,
      }

      addRoom(room)
      select(room.id, "room")
      return room
    },
    [addRoom, select]
  )

  const createFurniture = useCallback(
    (roomId: string, name: string, furnitureType: FurnitureType, template: FurnitureShapeTemplate) => {
      const room = rooms.find((r) => r.id === roomId)
      if (!room) return null

      let centerX = 0
      let centerY = 0
      if (template.type === "circle") {
        centerX = template.radius
        centerY = template.radius
      } else {
        const vertices = furnitureShapeToVertices(template)
        centerX = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length
        centerY = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length
      }

      const roomVertices = getRoomVertices(room)
      const roomCenterX = roomVertices.reduce((sum, v) => sum + v.x, 0) / roomVertices.length
      const roomCenterY = roomVertices.reduce((sum, v) => sum + v.y, 0) / roomVertices.length

      const furniture: FurnitureEntity = {
        type: "furniture",
        id: uuid(),
        name,
        furnitureType,
        roomId,
        position: {
          x: roomCenterX - centerX,
          y: roomCenterY - centerY,
        },
        shapeTemplate: template,
        rotation: 0,
      }

      addFurniture(furniture)
      select(furniture.id, "furniture")
      return furniture
    },
    [rooms, addFurniture, select]
  )

  const createDoor = useCallback(
    (roomId: string, wallIndex: number, positionOnWall: number, doorWidth: number, hingeSide: HingeSide) => {
      const door: DoorEntity = {
        type: "door",
        id: crypto.randomUUID(),
        name: "Door",
        roomId,
        wallIndex,
        positionOnWall,
        width: doorWidth,
        hingeSide,
      }

      addDoor(door)
      select(door.id, "door")
      return door
    },
    [addDoor, select]
  )

  const updateRoomWithDoorResnap = useCallback(
    (updatedRoom: RoomEntity) => {
      const oldRoom = rooms.find((r) => r.id === updatedRoom.id)
      const shapeChanged =
        oldRoom && JSON.stringify(oldRoom.shapeTemplate) !== JSON.stringify(updatedRoom.shapeTemplate)

      updateRoom(updatedRoom)

      if (shapeChanged && oldRoom) {
        const roomDoors = doors.filter((d) => d.roomId === updatedRoom.id)
        const oldVertices = shapeToVertices(oldRoom.shapeTemplate)
        const newVertices = shapeToVertices(updatedRoom.shapeTemplate)
        const newWalls = getWallSegments(newVertices, updatedRoom.position)

        for (const door of roomDoors) {
          const oldWalls = getWallSegments(oldVertices, oldRoom.position)
          if (door.wallIndex >= oldWalls.length) continue

          const oldWall = oldWalls[door.wallIndex]
          const t = door.positionOnWall / oldWall.length
          const doorWorldPos = {
            x: oldWall.start.x + (oldWall.end.x - oldWall.start.x) * t,
            y: oldWall.start.y + (oldWall.end.y - oldWall.start.y) * t,
          }

          const snapResult = findClosestWallPoint(doorWorldPos, newWalls, door.width)
          if (snapResult) {
            updateDoor({
              ...door,
              wallIndex: snapResult.wallIndex,
              positionOnWall: snapResult.positionOnWall,
            })
          }
        }
      }
    },
    [rooms, doors, updateRoom, updateDoor]
  )

  const deleteRoom = useCallback(
    (roomId: string) => {
      deleteRoomSync(roomId)
      deselect()
    },
    [deleteRoomSync, deselect]
  )

  const deleteFurniture = useCallback(
    (furnitureId: string) => {
      deleteFurnitureSync(furnitureId)
      deselect()
    },
    [deleteFurnitureSync, deselect]
  )

  const deleteDoor = useCallback(
    (doorId: string) => {
      deleteDoorSync(doorId)
      deselect()
    },
    [deleteDoorSync, deselect]
  )

  const getDefaultDoorPlacement = useCallback(() => {
    return {
      doorWidth: inchesToEighths(36),
      hingeSide: "left" as HingeSide,
    }
  }, [])

  return {
    createRoom,
    createFurniture,
    createDoor,
    updateRoomWithDoorResnap,
    updateFurniture,
    updateDoor,
    deleteRoom,
    deleteFurniture,
    deleteDoor,
    getDefaultDoorPlacement,
  }
}

