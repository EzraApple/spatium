import { useEffect, useRef, useState, useCallback } from "react"
import PartySocket from "partysocket"
import { env } from "@/lib/env"
import type {
  ClientMessage,
  ServerMessage,
  RoomEntity,
  FurnitureEntity,
  DoorEntity,
  LayoutDocument,
  Point,
} from "@apartment-planner/shared"

type ConnectionStatus = "connecting" | "connected" | "disconnected"

export function useLayoutSync(roomId?: string) {
  const [document, setDocument] = useState<LayoutDocument>({ version: 1, entities: [] })
  const [status, setStatus] = useState<ConnectionStatus>("connecting")
  const socketRef = useRef<PartySocket | null>(null)
  const myIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!roomId) {
      setStatus("disconnected")
      return
    }

    const socket = new PartySocket({
      host: env.PARTYKIT_HOST,
      room: roomId,
    })

    socketRef.current = socket

    socket.addEventListener("open", () => {
      setStatus("connected")
    })

    socket.addEventListener("close", () => {
      setStatus("disconnected")
    })

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data) as ServerMessage

      if (message.type === "layout-sync") {
        myIdRef.current = socket.id
        setDocument(message.document)
      } else if (message.type === "room-added") {
        setDocument((prev) => ({
          ...prev,
          entities: [...prev.entities, message.room],
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
          entities: prev.entities.filter((e) => {
            if (e.type === "room" && e.id === message.roomId) return false
            if (e.type === "furniture" && e.roomId === message.roomId) return false
            if (e.type === "door" && e.roomId === message.roomId) return false
            return true
          }),
        }))
      } else if (message.type === "room-moved") {
        setDocument((prev) => ({
          ...prev,
          entities: prev.entities.map((e) =>
            e.type === "room" && e.id === message.roomId
              ? { ...e, position: message.position }
              : e
          ),
        }))
      } else if (message.type === "furniture-added") {
        setDocument((prev) => ({
          ...prev,
          entities: [...prev.entities, message.furniture],
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
          entities: prev.entities.filter(
            (e) => !(e.type === "furniture" && e.id === message.furnitureId)
          ),
        }))
      } else if (message.type === "furniture-moved") {
        setDocument((prev) => ({
          ...prev,
          entities: prev.entities.map((e) =>
            e.type === "furniture" && e.id === message.furnitureId
              ? { ...e, position: message.position, roomId: message.roomId }
              : e
          ),
        }))
      } else if (message.type === "door-added") {
        setDocument((prev) => ({
          ...prev,
          entities: [...prev.entities, message.door],
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
          entities: prev.entities.filter(
            (e) => !(e.type === "door" && e.id === message.doorId)
          ),
        }))
      }
    })

    return () => {
      socket.close()
      socketRef.current = null
      setDocument({ version: 1, entities: [] })
      myIdRef.current = null
    }
  }, [roomId])

  const addRoom = useCallback((room: RoomEntity) => {
    const message: ClientMessage = { type: "room-add", room }
    socketRef.current?.send(JSON.stringify(message))
    setDocument((prev) => ({
      ...prev,
      entities: [...prev.entities, room],
    }))
  }, [])

  const updateRoom = useCallback((room: RoomEntity) => {
    const message: ClientMessage = { type: "room-update", room }
    socketRef.current?.send(JSON.stringify(message))
    setDocument((prev) => ({
      ...prev,
      entities: prev.entities.map((e) =>
        e.type === "room" && e.id === room.id ? room : e
      ),
    }))
  }, [])

  const deleteRoom = useCallback((roomId: string) => {
    const message: ClientMessage = { type: "room-delete", roomId }
    socketRef.current?.send(JSON.stringify(message))
    setDocument((prev) => ({
      ...prev,
      entities: prev.entities.filter(
        (e) => !(e.type === "room" && e.id === roomId)
      ),
    }))
  }, [])

  const moveRoomLocal = useCallback((roomId: string, position: Point) => {
    setDocument((prev) => ({
      ...prev,
      entities: prev.entities.map((e) =>
        e.type === "room" && e.id === roomId ? { ...e, position } : e
      ),
    }))
  }, [])

  const moveRoomSync = useCallback((roomId: string, position: Point) => {
    const message: ClientMessage = { type: "room-move", roomId, position }
    socketRef.current?.send(JSON.stringify(message))
  }, [])

  const moveRoom = useCallback((roomId: string, position: Point) => {
    moveRoomLocal(roomId, position)
    moveRoomSync(roomId, position)
  }, [moveRoomLocal, moveRoomSync])

  const addFurniture = useCallback((furniture: FurnitureEntity) => {
    const message: ClientMessage = { type: "furniture-add", furniture }
    socketRef.current?.send(JSON.stringify(message))
    setDocument((prev) => ({
      ...prev,
      entities: [...prev.entities, furniture],
    }))
  }, [])

  const updateFurniture = useCallback((furniture: FurnitureEntity) => {
    const message: ClientMessage = { type: "furniture-update", furniture }
    socketRef.current?.send(JSON.stringify(message))
    setDocument((prev) => ({
      ...prev,
      entities: prev.entities.map((e) =>
        e.type === "furniture" && e.id === furniture.id ? furniture : e
      ),
    }))
  }, [])

  const deleteFurniture = useCallback((furnitureId: string) => {
    const message: ClientMessage = { type: "furniture-delete", furnitureId }
    socketRef.current?.send(JSON.stringify(message))
    setDocument((prev) => ({
      ...prev,
      entities: prev.entities.filter(
        (e) => !(e.type === "furniture" && e.id === furnitureId)
      ),
    }))
  }, [])

  const moveFurnitureLocal = useCallback((furnitureId: string, position: Point, roomId: string) => {
    setDocument((prev) => ({
      ...prev,
      entities: prev.entities.map((e) =>
        e.type === "furniture" && e.id === furnitureId
          ? { ...e, position, roomId }
          : e
      ),
    }))
  }, [])

  const moveFurnitureSync = useCallback((furnitureId: string, position: Point, roomId: string) => {
    const message: ClientMessage = { type: "furniture-move", furnitureId, position, roomId }
    socketRef.current?.send(JSON.stringify(message))
  }, [])

  const addDoor = useCallback((door: DoorEntity) => {
    const message: ClientMessage = { type: "door-add", door }
    socketRef.current?.send(JSON.stringify(message))
    setDocument((prev) => ({
      ...prev,
      entities: [...prev.entities, door],
    }))
  }, [])

  const updateDoor = useCallback((door: DoorEntity) => {
    const message: ClientMessage = { type: "door-update", door }
    socketRef.current?.send(JSON.stringify(message))
    setDocument((prev) => ({
      ...prev,
      entities: prev.entities.map((e) =>
        e.type === "door" && e.id === door.id ? door : e
      ),
    }))
  }, [])

  const deleteDoor = useCallback((doorId: string) => {
    const message: ClientMessage = { type: "door-delete", doorId }
    socketRef.current?.send(JSON.stringify(message))
    setDocument((prev) => ({
      ...prev,
      entities: prev.entities.filter(
        (e) => !(e.type === "door" && e.id === doorId)
      ),
    }))
  }, [])

  const rooms = document.entities.filter((e): e is RoomEntity => e.type === "room")
  const furniture = document.entities.filter((e): e is FurnitureEntity => e.type === "furniture")
  const doors = document.entities.filter((e): e is DoorEntity => e.type === "door")

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
    status,
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
    getDoorsByRoom,
  }
}

