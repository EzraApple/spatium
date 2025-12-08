import { useEffect, useRef, useState, useCallback } from "react"
import PartySocket from "partysocket"
import { env } from "@/lib/env"
import type {
  ClientMessage,
  ServerMessage,
  RoomEntity,
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
          entities: prev.entities.filter(
            (e) => !(e.type === "room" && e.id === message.roomId)
          ),
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

  const rooms = document.entities.filter((e): e is RoomEntity => e.type === "room")

  return {
    document,
    rooms,
    status,
    addRoom,
    updateRoom,
    deleteRoom,
    moveRoom,
    moveRoomLocal,
    moveRoomSync,
  }
}

