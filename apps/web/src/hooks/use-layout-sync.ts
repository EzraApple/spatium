import { useEffect, useRef, useState, useCallback } from "react"
import type {
  ClientMessage,
  ServerMessage,
  RoomEntity,
  FurnitureEntity,
  DoorEntity,
  LayoutDocument,
  Point,
} from "@apartment-planner/shared"
import {
  addEntity,
  deleteRoomWithContents,
  deleteEntity,
  moveRoom as moveRoomEntity,
  moveFurniture as moveFurnitureEntity,
  moveDoor as moveDoorEntity,
  getRooms,
  getFurniture,
  getDoors,
  normalizeLayoutDocument,
  INVENTORY_ROOM_ID,
} from "@apartment-planner/shared"
import { usePartySocket } from "./use-party-socket"

export function useLayoutSync(socket: ReturnType<typeof usePartySocket>) {
  const [document, setDocument] = useState<LayoutDocument>({ version: 2, entities: [] })
  const documentRef = useRef<LayoutDocument>(document)
  documentRef.current = document

  const { status, send, subscribe } = socket

  useEffect(() => {
    const unsubscribe = subscribe((message: ServerMessage, _socketId: string) => {
      if (message.type === "layout-sync") {
        setDocument(normalizeLayoutDocument(message.document).document)
      } else if (message.type === "room-added") {
        setDocument((prev) => normalizeLayoutDocument({
          ...prev,
          entities: addEntity(prev.entities, message.room),
        }).document)
      } else if (message.type === "room-updated") {
        setDocument((prev) => normalizeLayoutDocument({
          ...prev,
          entities: prev.entities.map((e) =>
            e.type === "room" && e.id === message.room.id ? message.room : e
          ),
        }).document)
      } else if (message.type === "room-deleted") {
        setDocument((prev) => normalizeLayoutDocument({
          ...prev,
          entities: deleteRoomWithContents(prev.entities, message.roomId),
        }).document)
      } else if (message.type === "room-moved") {
        setDocument((prev) => normalizeLayoutDocument({
          ...prev,
          entities: moveRoomEntity(prev.entities, message.roomId, message.position),
        }).document)
      } else if (message.type === "furniture-added") {
        setDocument((prev) => normalizeLayoutDocument({
          ...prev,
          entities: addEntity(prev.entities, message.furniture),
        }).document)
      } else if (message.type === "furniture-updated") {
        setDocument((prev) => normalizeLayoutDocument({
          ...prev,
          entities: prev.entities.map((e) =>
            e.type === "furniture" && e.id === message.furniture.id ? message.furniture : e
          ),
        }).document)
      } else if (message.type === "furniture-deleted") {
        setDocument((prev) => normalizeLayoutDocument({
          ...prev,
          entities: deleteEntity(prev.entities, "furniture", message.furnitureId),
        }).document)
      } else if (message.type === "furniture-moved") {
        setDocument((prev) => normalizeLayoutDocument({
          ...prev,
          entities: moveFurnitureEntity(prev.entities, message.furnitureId, message.position, message.roomId),
        }).document)
      } else if (message.type === "door-added") {
        setDocument((prev) => normalizeLayoutDocument({
          ...prev,
          entities: addEntity(prev.entities, message.door),
        }).document)
      } else if (message.type === "door-updated") {
        setDocument((prev) => normalizeLayoutDocument({
          ...prev,
          entities: prev.entities.map((e) =>
            e.type === "door" && e.id === message.door.id ? message.door : e
          ),
        }).document)
      } else if (message.type === "door-deleted") {
        setDocument((prev) => normalizeLayoutDocument({
          ...prev,
          entities: deleteEntity(prev.entities, "door", message.doorId),
        }).document)
      }
    })

    return unsubscribe
  }, [subscribe])

  useEffect(() => {
    if (status === "disconnected") {
      setDocument({ version: 2, entities: [] })
    }
  }, [status])

  const addRoom = useCallback((room: RoomEntity) => {
    send({ type: "room-add", room })
    setDocument((prev) => normalizeLayoutDocument({
      ...prev,
      entities: addEntity(prev.entities, room),
    }).document)
  }, [send])

  const updateRoom = useCallback((room: RoomEntity) => {
    send({ type: "room-update", room })
    setDocument((prev) => normalizeLayoutDocument({
      ...prev,
      entities: prev.entities.map((e) =>
        e.type === "room" && e.id === room.id ? room : e
      ),
    }).document)
  }, [send])

  const deleteRoom = useCallback((roomId: string) => {
    send({ type: "room-delete", roomId })
    setDocument((prev) => normalizeLayoutDocument({
      ...prev,
      entities: deleteRoomWithContents(prev.entities, roomId),
    }).document)
  }, [send])

  const moveRoomLocal = useCallback((roomId: string, position: Point) => {
    setDocument((prev) => normalizeLayoutDocument({
      ...prev,
      entities: moveRoomEntity(prev.entities, roomId, position),
    }).document)
  }, [])

  const moveRoomSync = useCallback((roomId: string, position: Point) => {
    send({ type: "room-move", roomId, position })
  }, [send])

  const moveRoom = useCallback((roomId: string, position: Point) => {
    moveRoomLocal(roomId, position)
    moveRoomSync(roomId, position)
  }, [moveRoomLocal, moveRoomSync])

  const addFurniture = useCallback((furniture: FurnitureEntity) => {
    send({ type: "furniture-add", furniture })
    setDocument((prev) => normalizeLayoutDocument({
      ...prev,
      entities: addEntity(prev.entities, furniture),
    }).document)
  }, [send])

  const updateFurniture = useCallback((furniture: FurnitureEntity) => {
    send({ type: "furniture-update", furniture })
    setDocument((prev) => normalizeLayoutDocument({
      ...prev,
      entities: prev.entities.map((e) =>
        e.type === "furniture" && e.id === furniture.id ? furniture : e
      ),
    }).document)
  }, [send])

  const deleteFurniture = useCallback((furnitureId: string) => {
    send({ type: "furniture-delete", furnitureId })
    setDocument((prev) => normalizeLayoutDocument({
      ...prev,
      entities: deleteEntity(prev.entities, "furniture", furnitureId),
    }).document)
  }, [send])

  const moveFurnitureLocal = useCallback((furnitureId: string, position: Point, roomId: string) => {
    setDocument((prev) => normalizeLayoutDocument({
      ...prev,
      entities: moveFurnitureEntity(prev.entities, furnitureId, position, roomId),
    }).document)
  }, [])

  const moveFurnitureSync = useCallback((furnitureId: string, position: Point, roomId: string) => {
    send({ type: "furniture-move", furnitureId, position, roomId })
  }, [send])

  const moveFurniture = useCallback((furnitureId: string, position: Point, roomId: string) => {
    moveFurnitureLocal(furnitureId, position, roomId)
    moveFurnitureSync(furnitureId, position, roomId)
  }, [moveFurnitureLocal, moveFurnitureSync])

  const addDoor = useCallback((door: DoorEntity) => {
    send({ type: "door-add", door })
    setDocument((prev) => normalizeLayoutDocument({
      ...prev,
      entities: addEntity(prev.entities, door),
    }).document)
  }, [send])

  const updateDoor = useCallback((door: DoorEntity) => {
    send({ type: "door-update", door })
    setDocument((prev) => normalizeLayoutDocument({
      ...prev,
      entities: prev.entities.map((e) =>
        e.type === "door" && e.id === door.id ? door : e
      ),
    }).document)
  }, [send])

  const deleteDoor = useCallback((doorId: string) => {
    send({ type: "door-delete", doorId })
    setDocument((prev) => normalizeLayoutDocument({
      ...prev,
      entities: deleteEntity(prev.entities, "door", doorId),
    }).document)
  }, [send])

  const moveDoorLocal = useCallback((doorId: string, wallIndex: number, positionOnWall: number) => {
    setDocument((prev) => normalizeLayoutDocument({
      ...prev,
      entities: moveDoorEntity(prev.entities, doorId, wallIndex, positionOnWall),
    }).document)
  }, [])

  const moveDoorSync = useCallback((doorId: string, wallIndex: number, positionOnWall: number) => {
    const currentDoors = getDoors(documentRef.current)
    const door = currentDoors.find((d) => d.id === doorId)
    if (!door) return
    send({ type: "door-update", door: { ...door, wallIndex, positionOnWall } })
  }, [send])

  const moveDoor = useCallback((doorId: string, wallIndex: number, positionOnWall: number) => {
    moveDoorLocal(doorId, wallIndex, positionOnWall)
    moveDoorSync(doorId, wallIndex, positionOnWall)
  }, [moveDoorLocal, moveDoorSync])

  const rooms = getRooms(document)
  const allFurniture = getFurniture(document)
  const furniture = allFurniture.filter((f) => f.roomId !== INVENTORY_ROOM_ID)
  const inventoryFurniture = allFurniture.filter((f) => f.roomId === INVENTORY_ROOM_ID)
  const doors = getDoors(document)

  const getFurnitureByRoom = useCallback((roomId: string) => {
    return furniture.filter((f) => f.roomId === roomId)
  }, [furniture])

  const getDoorsByRoom = useCallback((roomId: string) => {
    return doors.filter((d) => d.roomId === roomId)
  }, [doors])

  return {
    document,
    rooms,
    furniture,
    inventoryFurniture,
    doors,
    addRoom,
    updateRoom,
    deleteRoom,
    moveRoom,
    moveRoomLocal,
    moveRoomSync,
    addFurniture,
    updateFurniture,
    deleteFurniture,
    moveFurniture,
    moveFurnitureLocal,
    moveFurnitureSync,
    getFurnitureByRoom,
    addDoor,
    updateDoor,
    deleteDoor,
    moveDoor,
    moveDoorLocal,
    moveDoorSync,
    getDoorsByRoom,
  }
}
