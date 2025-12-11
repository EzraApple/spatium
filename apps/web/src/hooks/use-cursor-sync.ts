import { useEffect, useState, useCallback, useRef } from "react"
import {
  THROTTLE_MS,
  type ClientMessage,
  type ClientState,
  type ServerMessage,
} from "@apartment-planner/shared"
import { usePartySocket, type ConnectionStatus } from "./use-party-socket"

export type ClickEvent = {
  id: string
  x: number
  y: number
  color: string
}

export function useCursorSync(socket: ReturnType<typeof usePartySocket>) {
  const [cursors, setCursors] = useState<Record<string, ClientState>>({})
  const [clicks, setClicks] = useState<ClickEvent[]>([])
  const [myColor, setMyColor] = useState<string | null>(null)
  const lastSentRef = useRef<number>(0)
  const myIdRef = useRef<string | null>(null)

  const { status, connectionId, send, subscribe } = socket

  useEffect(() => {
    myIdRef.current = connectionId
  }, [connectionId])

  useEffect(() => {
    const unsubscribe = subscribe((message: ServerMessage, socketId: string) => {
      myIdRef.current = socketId

      if (message.type === "sync") {
        setCursors(message.clients)
        const myState = message.clients[socketId]
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

    return unsubscribe
  }, [subscribe, connectionId])

  useEffect(() => {
    if (status === "disconnected") {
      setCursors({})
      setClicks([])
      setMyColor(null)
    }
  }, [status])

  const sendCursorMove = useCallback((x: number, y: number) => {
    const now = Date.now()
    if (now - lastSentRef.current < THROTTLE_MS) return

    lastSentRef.current = now
    const normalizedX = x / window.innerWidth
    const normalizedY = y / window.innerHeight
    const message: ClientMessage = { type: "cursor-move", x: normalizedX, y: normalizedY }
    send(message)
  }, [send])

  const sendCursorLeave = useCallback(() => {
    const message: ClientMessage = { type: "cursor-leave" }
    send(message)
  }, [send])

  const sendClick = useCallback((x: number, y: number) => {
    const normalizedX = x / window.innerWidth
    const normalizedY = y / window.innerHeight
    const message: ClientMessage = { type: "cursor-click", x: normalizedX, y: normalizedY }
    send(message)
  }, [send])

  const otherCursors = Object.entries(cursors).filter(
    ([id]) => id !== myIdRef.current
  )

  return {
    cursors: otherCursors,
    clicks,
    myColor,
    clientCount: Object.keys(cursors).length,
    sendCursorMove,
    sendCursorLeave,
    sendClick,
  }
}
