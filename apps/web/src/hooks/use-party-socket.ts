import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import PartySocket from "partysocket"
import { env } from "@/lib/env"
import type { ClientMessage, ServerMessage } from "@apartment-planner/shared"

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "disconnected"

type MessageHandler = (message: ServerMessage, connectionId: string) => void

export function usePartySocket(roomId?: string) {
  const [status, setStatus] = useState<ConnectionStatus>("connecting")
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const socketRef = useRef<PartySocket | null>(null)
  const handlersRef = useRef<Set<MessageHandler>>(new Set())
  const hasConnectedOnceRef = useRef(false)

  useEffect(() => {
    if (!roomId) {
      setStatus("disconnected")
      return
    }

    hasConnectedOnceRef.current = false

    const socket = new PartySocket({
      host: env.PARTYKIT_HOST,
      room: roomId,
    })

    socketRef.current = socket

    socket.addEventListener("open", () => {
      if (hasConnectedOnceRef.current) {
        setStatus("connected")
      } else {
        hasConnectedOnceRef.current = true
        setStatus("connected")
      }
      setConnectionId(socket.id)
    })

    socket.addEventListener("close", () => {
      if (hasConnectedOnceRef.current) {
        setStatus("reconnecting")
      } else {
        setStatus("disconnected")
      }
    })

    socket.addEventListener("error", () => {
      if (hasConnectedOnceRef.current) {
        setStatus("reconnecting")
      }
    })

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data) as ServerMessage
      handlersRef.current.forEach((handler) => handler(message, socket.id))
    })

    return () => {
      socket.close()
      socketRef.current = null
      setConnectionId(null)
      hasConnectedOnceRef.current = false
    }
  }, [roomId])

  const send = useCallback((message: ClientMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message))
    }
  }, [])

  const subscribe = useCallback((handler: MessageHandler) => {
    handlersRef.current.add(handler)
    return () => {
      handlersRef.current.delete(handler)
    }
  }, [])

  return useMemo(() => ({
    status,
    connectionId,
    send,
    subscribe,
  }), [status, connectionId, send, subscribe])
}

