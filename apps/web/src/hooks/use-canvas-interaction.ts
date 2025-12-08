import { useState, useCallback, useEffect, useRef } from "react"
import type { RoomEntity, Point } from "@apartment-planner/shared"
import {
  getAbsoluteVertices,
  polygonsIntersect,
  findSnapPosition,
} from "@apartment-planner/shared"

type InteractionMode =
  | { type: "idle" }
  | { type: "moving"; roomId: string; originalPosition: Point }

type UseCanvasInteractionProps = {
  rooms: RoomEntity[]
  onRoomMove: (roomId: string, position: Point) => void
  onRoomMoveThrottled: (roomId: string, position: Point) => void
  gridSize?: number
  snapThreshold?: number
}

const THROTTLE_MS = 50
const NUDGE_AMOUNT = 96

export function useCanvasInteraction({
  rooms,
  onRoomMove,
  onRoomMoveThrottled,
  gridSize = 24,
  snapThreshold = 96,
}: UseCanvasInteractionProps) {
  const [mode, setMode] = useState<InteractionMode>({ type: "idle" })
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const lastSyncRef = useRef<number>(0)
  const pendingPositionRef = useRef<Point | null>(null)

  const movingRoomId = mode.type === "moving" ? mode.roomId : null

  const getMovingRoom = useCallback(() => {
    if (mode.type !== "moving") return null
    return rooms.find((r) => r.id === mode.roomId) ?? null
  }, [mode, rooms])

  const checkCollision = useCallback(
    (roomId: string, position: Point): boolean => {
      const room = rooms.find((r) => r.id === roomId)
      if (!room) return false

      const movingVertices = getAbsoluteVertices(room.vertices, position)
      for (const other of rooms) {
        if (other.id === roomId) continue
        const otherVertices = getAbsoluteVertices(other.vertices, other.position)
        if (polygonsIntersect(movingVertices, otherVertices)) {
          return true
        }
      }
      return false
    },
    [rooms]
  )

  const calculateSnappedPosition = useCallback(
    (roomId: string, rawPosition: Point): Point => {
      const room = rooms.find((r) => r.id === roomId)
      if (!room) return rawPosition

      let position = {
        x: Math.round(rawPosition.x / gridSize) * gridSize,
        y: Math.round(rawPosition.y / gridSize) * gridSize,
      }

      const otherRooms = rooms
        .filter((r) => r.id !== roomId)
        .map((r) => ({ vertices: r.vertices, position: r.position }))

      const snapPos = findSnapPosition(
        { vertices: room.vertices, position },
        otherRooms,
        snapThreshold
      )

      if (snapPos) {
        position = snapPos
      }

      return position
    },
    [rooms, gridSize, snapThreshold]
  )

  const startMoving = useCallback(
    (roomId: string) => {
      const room = rooms.find((r) => r.id === roomId)
      if (!room) return

      setSelectedRoomId(roomId)
      setMode({ type: "moving", roomId, originalPosition: room.position })
    },
    [rooms]
  )

  const updatePosition = useCallback(
    (position: Point) => {
      if (mode.type !== "moving") return

      const snappedPosition = calculateSnappedPosition(mode.roomId, position)

      onRoomMove(mode.roomId, snappedPosition)

      const now = Date.now()
      if (now - lastSyncRef.current >= THROTTLE_MS) {
        lastSyncRef.current = now
        onRoomMoveThrottled(mode.roomId, snappedPosition)
        pendingPositionRef.current = null
      } else {
        pendingPositionRef.current = snappedPosition
      }
    },
    [mode, calculateSnappedPosition, onRoomMove, onRoomMoveThrottled]
  )

  const place = useCallback(() => {
    if (mode.type !== "moving") return

    if (pendingPositionRef.current) {
      onRoomMoveThrottled(mode.roomId, pendingPositionRef.current)
      pendingPositionRef.current = null
    }

    setSelectedRoomId(null)
    setMode({ type: "idle" })
  }, [mode, onRoomMoveThrottled])

  const cancel = useCallback(() => {
    if (mode.type !== "moving") return

    onRoomMove(mode.roomId, mode.originalPosition)
    onRoomMoveThrottled(mode.roomId, mode.originalPosition)
    pendingPositionRef.current = null

    setSelectedRoomId(null)
    setMode({ type: "idle" })
  }, [mode, onRoomMove, onRoomMoveThrottled])

  const nudge = useCallback(
    (direction: "up" | "down" | "left" | "right") => {
      if (mode.type !== "moving") return

      const room = rooms.find((r) => r.id === mode.roomId)
      if (!room) return

      const delta = { x: 0, y: 0 }
      switch (direction) {
        case "up":
          delta.y = -NUDGE_AMOUNT
          break
        case "down":
          delta.y = NUDGE_AMOUNT
          break
        case "left":
          delta.x = -NUDGE_AMOUNT
          break
        case "right":
          delta.x = NUDGE_AMOUNT
          break
      }

      const newPosition = {
        x: room.position.x + delta.x,
        y: room.position.y + delta.y,
      }

      onRoomMove(mode.roomId, newPosition)
      onRoomMoveThrottled(mode.roomId, newPosition)
    },
    [mode, rooms, onRoomMove, onRoomMoveThrottled]
  )

  const handleClick = useCallback(() => {
    if (mode.type === "moving") {
      place()
    }
  }, [mode, place])

  const handleRoomClick = useCallback(
    (roomId: string) => {
      if (mode.type === "moving") {
        place()
        return
      }

      startMoving(roomId)
    },
    [mode, place, startMoving]
  )

  const deselect = useCallback(() => {
    if (mode.type === "idle") {
      setSelectedRoomId(null)
    }
  }, [mode])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode.type === "moving") {
        switch (e.key) {
          case "Enter":
          case " ":
            e.preventDefault()
            place()
            break
          case "Escape":
            e.preventDefault()
            cancel()
            break
          case "ArrowUp":
            e.preventDefault()
            nudge("up")
            break
          case "ArrowDown":
            e.preventDefault()
            nudge("down")
            break
          case "ArrowLeft":
            e.preventDefault()
            nudge("left")
            break
          case "ArrowRight":
            e.preventDefault()
            nudge("right")
            break
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [mode, place, cancel, nudge])

  return {
    mode,
    selectedRoomId,
    movingRoomId,
    isMoving: mode.type === "moving",
    getMovingRoom,
    checkCollision,
    startMoving,
    updatePosition,
    place,
    cancel,
    nudge,
    handleClick,
    handleRoomClick,
    deselect,
  }
}

