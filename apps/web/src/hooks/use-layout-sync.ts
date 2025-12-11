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
} from "@apartment-planner/shared"
import { usePartySocket } from "./use-party-socket"

export function useLayoutSync(socket: ReturnType<typeof usePartySocket>) {
  const [document, setDocument] = useState<LayoutDocument>({ version: 1, entities: [] })
  const documentRef = useRef<LayoutDocument>(document)
  documentRef.current = document

  const { status, send, subscribe } = socket

  useEffect(() => {
    const unsubscribe = subscribe((message: ServerMessage, _socketId: string) => {
      if (message.type === "layout-sync") {
        setDocument(message.document)
      } else if (message.type === "room-added") {
        setDocument((prev) => ({
          ...prev,
          entities: addEntity(prev.entities, message.room),
        }))
      } else if (message.type === "room-updated") {
        setDocument((prev) => ({
          ...prev,
          entities: prev.entities.map((e) =>
            e.type === "room" && e.id === message.room.id ? message.room : e
          ),
        }))
      } else if (message.type === "room-deleted") {
        setDocument((prev) => ({
          ...prev,
          entities: deleteRoomWithContents(prev.entities, message.roomId),
        }))
      } else if (message.type === "room-moved") {
        setDocument((prev) => ({
          ...prev,
          entities: moveRoomEntity(prev.entities, message.roomId, message.position),
        }))
      } else if (message.type === "furniture-added") {
        setDocument((prev) => ({
          ...prev,
          entities: addEntity(prev.entities, message.furniture),
        }))
      } else if (message.type === "furniture-updated") {
        setDocument((prev) => ({
          ...prev,
          entities: prev.entities.map((e) =>
            e.type === "furniture" && e.id === message.furniture.id ? message.furniture : e
          ),
        }))
      } else if (message.type === "furniture-deleted") {
        setDocument((prev) => ({
          ...prev,
          entities: deleteEntity(prev.entities, "furniture", message.furnitureId),
        }))
      } else if (message.type === "furniture-moved") {
        setDocument((prev) => ({
          ...prev,
          entities: moveFurnitureEntity(prev.entities, message.furnitureId, message.position, message.roomId),
        }))
      } else if (message.type === "door-added") {
        setDocument((prev) => ({
          ...prev,
          entities: addEntity(prev.entities, message.door),
        }))
      } else if (message.type === "door-updated") {
        setDocument((prev) => ({
          ...prev,
          entities: prev.entities.map((e) =>
            e.type === "door" && e.id === message.door.id ? message.door : e
          ),
        }))
      } else if (message.type === "door-deleted") {
        setDocument((prev) => ({
          ...prev,
          entities: deleteEntity(prev.entities, "door", message.doorId),
        }))
      }
    })

    return unsubscribe
  }, [subscribe])

  useEffect(() => {
    if (status === "disconnected") {
      setDocument({ version: 1, entities: [] })
    }
  }, [status])

  const addRoom = useCallback((room: RoomEntity) => {
    send({ type: "room-add", room })
    setDocument((prev) => ({
      ...prev,
      entities: addEntity(prev.entities, room),
    }))
  }, [send])

  const updateRoom = useCallback((room: RoomEntity) => {
    send({ type: "room-update", room })
    setDocument((prev) => ({
      ...prev,
      entities: prev.entities.map((e) =>
        e.type === "room" && e.id === room.id ? room : e
      ),
    }))
  }, [send])

  const deleteRoom = useCallback((roomId: string) => {
    send({ type: "room-delete", roomId })
    setDocument((prev) => ({
      ...prev,
      entities: deleteRoomWithContents(prev.entities, roomId),
    }))
  }, [send])

  const moveRoomLocal = useCallback((roomId: string, position: Point) => {
    setDocument((prev) => ({
      ...prev,
      entities: moveRoomEntity(prev.entities, roomId, position),
    }))
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
    setDocument((prev) => ({
      ...prev,
      entities: addEntity(prev.entities, furniture),
    }))
  }, [send])

  const updateFurniture = useCallback((furniture: FurnitureEntity) => {
    send({ type: "furniture-update", furniture })
    setDocument((prev) => ({
      ...prev,
      entities: prev.entities.map((e) =>
        e.type === "furniture" && e.id === furniture.id ? furniture : e
      ),
    }))
  }, [send])

  const deleteFurniture = useCallback((furnitureId: string) => {
    send({ type: "furniture-delete", furnitureId })
    setDocument((prev) => ({
      ...prev,
      entities: deleteEntity(prev.entities, "furniture", furnitureId),
    }))
  }, [send])

  const moveFurnitureLocal = useCallback((furnitureId: string, position: Point, roomId: string) => {
    setDocument((prev) => ({
      ...prev,
      entities: moveFurnitureEntity(prev.entities, furnitureId, position, roomId),
    }))
  }, [])

  const moveFurnitureSync = useCallback((furnitureId: string, position: Point, roomId: string) => {
    send({ type: "furniture-move", furnitureId, position, roomId })
  }, [send])

  const addDoor = useCallback((door: DoorEntity) => {
    send({ type: "door-add", door })
    setDocument((prev) => ({
      ...prev,
      entities: addEntity(prev.entities, door),
    }))
  }, [send])

  const updateDoor = useCallback((door: DoorEntity) => {
    send({ type: "door-update", door })
    setDocument((prev) => ({
      ...prev,
      entities: prev.entities.map((e) =>
        e.type === "door" && e.id === door.id ? door : e
      ),
    }))
  }, [send])

  const deleteDoor = useCallback((doorId: string) => {
    send({ type: "door-delete", doorId })
    setDocument((prev) => ({
      ...prev,
      entities: deleteEntity(prev.entities, "door", doorId),
    }))
  }, [send])

  const moveDoorLocal = useCallback((doorId: string, wallIndex: number, positionOnWall: number) => {
    setDocument((prev) => ({
      ...prev,
      entities: moveDoorEntity(prev.entities, doorId, wallIndex, positionOnWall),
    }))
  }, [])

  const moveDoorSync = useCallback((doorId: string, wallIndex: number, positionOnWall: number) => {
    const currentDoors = getDoors(documentRef.current)
    const door = currentDoors.find((d) => d.id === doorId)
    if (!door) return
    send({ type: "door-update", door: { ...door, wallIndex, positionOnWall } })
  }, [send])

  const rooms = getRooms(document)
  const furniture = getFurniture(document)
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
    moveFurnitureLocal,
    moveFurnitureSync,
    getFurnitureByRoom,
    addDoor,
    updateDoor,
    deleteDoor,
    moveDoorLocal,
    moveDoorSync,
    getDoorsByRoom,
  }
}
