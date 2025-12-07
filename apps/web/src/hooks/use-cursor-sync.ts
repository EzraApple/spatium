import { useEffect, useRef, useState, useCallback } from "react"
import PartySocket from "partysocket"
import { env } from "@/lib/env"
import {
  THROTTLE_MS,
  type ClientMessage,
  type ClientState,
  type ServerMessage,
} from "@apartment-planner/shared"

type ConnectionStatus = "connecting" | "connected" | "disconnected"

export type ClickEvent = {
  id: string
  x: number
  y: number
  color: string
}

export function useCursorSync(roomId?: string) {
  const [cursors, setCursors] = useState<Record<string, ClientState>>({})
  const [clicks, setClicks] = useState<ClickEvent[]>([])
  const [status, setStatus] = useState<ConnectionStatus>("connecting")
  const [myColor, setMyColor] = useState<string | null>(null)
  const socketRef = useRef<PartySocket | null>(null)
  const lastSentRef = useRef<number>(0)
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

      if (message.type === "sync") {
        myIdRef.current = socket.id
        setCursors(message.clients)
        const myState = message.clients[socket.id]
        if (myState) {
          setMyColor(myState.color)
        }
      } else if (message.type === "cursor-update") {
        setCursors((prev) => ({
          ...prev,
          [message.clientId]: {
            ...prev[message.clientId],
            x: message.x,
            y: message.y,
          },
        }))
      } else if (message.type === "client-join") {
        setCursors((prev) => ({
          ...prev,
          [message.clientId]: { color: message.color, x: 0, y: 0 },
        }))
      } else if (message.type === "client-leave") {
        setCursors((prev) => {
          const next = { ...prev }
          delete next[message.clientId]
          return next
        })
      } else if (message.type === "cursor-click") {
        const clickId = `${message.clientId}-${Date.now()}`
        setClicks((prev) => [...prev, { id: clickId, x: message.x, y: message.y, color: message.color }])
        setTimeout(() => {
          setClicks((prev) => prev.filter((c) => c.id !== clickId))
        }, 600)
      }
    })

    return () => {
      socket.close()
      socketRef.current = null
      setCursors({})
      setClicks([])
      setMyColor(null)
      myIdRef.current = null
    }
  }, [roomId])

  const sendCursorMove = useCallback((x: number, y: number) => {
    const now = Date.now()
    if (now - lastSentRef.current < THROTTLE_MS) return

    lastSentRef.current = now
    const normalizedX = x / window.innerWidth
    const normalizedY = y / window.innerHeight
    const message: ClientMessage = { type: "cursor-move", x: normalizedX, y: normalizedY }
    socketRef.current?.send(JSON.stringify(message))
  }, [])

  const sendCursorLeave = useCallback(() => {
    const message: ClientMessage = { type: "cursor-leave" }
    socketRef.current?.send(JSON.stringify(message))
  }, [])

  const sendClick = useCallback((x: number, y: number) => {
    const normalizedX = x / window.innerWidth
    const normalizedY = y / window.innerHeight
    const message: ClientMessage = { type: "cursor-click", x: normalizedX, y: normalizedY }
    socketRef.current?.send(JSON.stringify(message))
  }, [])

  const otherCursors = Object.entries(cursors).filter(
    ([id]) => id !== myIdRef.current
  )

  return {
    cursors: otherCursors,
    clicks,
    status,
    myColor,
    clientCount: Object.keys(cursors).length,
    sendCursorMove,
    sendCursorLeave,
    sendClick,
  }
}
