import { useState, useCallback, useEffect, useRef } from "react"
import type { RoomEntity, FurnitureEntity, DoorEntity, Point } from "@apartment-planner/shared"
import { getWallSegments, findClosestWallPoint, getRoomVertices } from "@apartment-planner/shared"
import {
  checkRoomCollision as checkRoomCollisionLib,
  checkFurnitureCollision as checkFurnitureCollisionLib,
  findRoomAtPoint,
} from "@/components/canvas/lib/collision"
import { calculateSnappedPosition } from "@/components/canvas/lib/snapping"

type SelectionType = "room" | "furniture" | "door" | null

type DoorDragOriginal = { wallIndex: number; positionOnWall: number }

type InteractionMode =
  | { type: "idle" }
  | { type: "dragging"; entityType: "room" | "furniture"; entityId: string; originalPosition: Point; originalRoomId: string; pendingRoomId: string; startMousePos: Point; dragOffset: Point }
  | { type: "dragging"; entityType: "door"; entityId: string; originalDoorPosition: DoorDragOriginal; originalRoomId: string; pendingRoomId: string; startMousePos: Point }

type UseCanvasInteractionProps = {
  rooms: RoomEntity[]
  furniture: FurnitureEntity[]
  doors: DoorEntity[]
  onRoomMove: (roomId: string, position: Point) => void
  onRoomMoveThrottled: (roomId: string, position: Point) => void
  onFurnitureMove: (furnitureId: string, position: Point, roomId: string) => void
  onFurnitureMoveThrottled: (furnitureId: string, position: Point, roomId: string) => void
  onDoorMove: (doorId: string, wallIndex: number, positionOnWall: number) => void
  onDoorMoveThrottled: (doorId: string, wallIndex: number, positionOnWall: number) => void
  gridSize?: number
  snapThreshold?: number
}

const THROTTLE_MS = 50
const NUDGE_AMOUNT = 1
const DRAG_THRESHOLD = 5

export function useCanvasInteraction({
  rooms,
  furniture,
  doors,
  onRoomMove,
  onRoomMoveThrottled,
  onFurnitureMove,
  onFurnitureMoveThrottled,
  onDoorMove,
  onDoorMoveThrottled,
  gridSize = 1,
  snapThreshold = 48,
}: UseCanvasInteractionProps) {
  const [mode, setMode] = useState<InteractionMode>({ type: "idle" })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<SelectionType>(null)
  const lastSyncRef = useRef<number>(0)
  const pendingPositionRef = useRef<{ position: Point; roomId?: string } | null>(null)
  const pendingDoorPositionRef = useRef<{ wallIndex: number; positionOnWall: number } | null>(null)
  const hasDraggedRef = useRef(false)

  const isDragging = mode.type === "dragging"
  const draggingRoomId = mode.type === "dragging" && mode.entityType === "room" ? mode.entityId : null
  const draggingFurnitureId = mode.type === "dragging" && mode.entityType === "furniture" ? mode.entityId : null
  const draggingDoorId = mode.type === "dragging" && mode.entityType === "door" ? mode.entityId : null
  const draggingFurnitureOriginalRoomId = mode.type === "dragging" && mode.entityType === "furniture" ? mode.originalRoomId : null
  const draggingFurniturePendingRoomId = mode.type === "dragging" && mode.entityType === "furniture" ? mode.pendingRoomId : null

  const getSelectedRoom = useCallback(() => {
    if (selectedType !== "room" || !selectedId) return null
    return rooms.find((r) => r.id === selectedId) ?? null
  }, [selectedType, selectedId, rooms])

  const getSelectedFurniture = useCallback(() => {
    if (selectedType !== "furniture" || !selectedId) return null
    return furniture.find((f) => f.id === selectedId) ?? null
  }, [selectedType, selectedId, furniture])

  const checkRoomCollision = useCallback(
    (roomId: string, position: Point): boolean => checkRoomCollisionLib(rooms, roomId, position),
    [rooms]
  )

  const checkFurnitureCollision = useCallback(
    (furnitureId: string, position: Point, roomId: string): boolean => 
      checkFurnitureCollisionLib(rooms, furniture, furnitureId, position, roomId),
    [furniture, rooms]
  )

  const select = useCallback((id: string, type: "room" | "furniture" | "door") => {
    setSelectedId(id)
    setSelectedType(type)
  }, [])

  const deselect = useCallback(() => {
    setSelectedId(null)
    setSelectedType(null)
  }, [])

  const startDragging = useCallback(
    (entityId: string, entityType: "room" | "furniture" | "door", mousePos: Point, worldPos: Point) => {
      if (entityType === "room") {
        const room = rooms.find((r) => r.id === entityId)
        if (!room) return
        const dragOffset = {
          x: worldPos.x - room.position.x,
          y: worldPos.y - room.position.y,
        }
        setMode({
          type: "dragging",
          entityType: "room",
          entityId,
          originalPosition: room.position,
          originalRoomId: room.id,
          pendingRoomId: room.id,
          startMousePos: mousePos,
          dragOffset,
        })
      } else if (entityType === "furniture") {
        const f = furniture.find((item) => item.id === entityId)
        if (!f) return
        const room = rooms.find((r) => r.id === f.roomId)
        if (!room) return
        const dragOffset = {
          x: worldPos.x - room.position.x - f.position.x,
          y: worldPos.y - room.position.y - f.position.y,
        }
        setMode({
          type: "dragging",
          entityType: "furniture",
          entityId,
          originalPosition: f.position,
          originalRoomId: f.roomId,
          pendingRoomId: f.roomId,
          startMousePos: mousePos,
          dragOffset,
        })
      } else if (entityType === "door") {
        const door = doors.find((d) => d.id === entityId)
        if (!door) return
        setMode({
          type: "dragging",
          entityType: "door",
          entityId,
          originalDoorPosition: { wallIndex: door.wallIndex, positionOnWall: door.positionOnWall },
          originalRoomId: door.roomId,
          pendingRoomId: door.roomId,
          startMousePos: mousePos,
        })
      }
      hasDraggedRef.current = false
    },
    [rooms, furniture, doors]
  )

  const updateDragPosition = useCallback(
    (worldPosition: Point, mousePos: Point) => {
      if (mode.type !== "dragging") return

      const dx = mousePos.x - mode.startMousePos.x
      const dy = mousePos.y - mode.startMousePos.y
      if (!hasDraggedRef.current && Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) {
        return
      }
      hasDraggedRef.current = true

      if (mode.entityType === "room") {
        const room = rooms.find((r) => r.id === mode.entityId)
        if (!room) return

        const rawPosition = {
          x: worldPosition.x - mode.dragOffset.x,
          y: worldPosition.y - mode.dragOffset.y,
        }

        const snappedPosition = calculateSnappedPosition(rooms, mode.entityId, rawPosition, gridSize, snapThreshold)
        onRoomMove(mode.entityId, snappedPosition)

        const now = Date.now()
        if (now - lastSyncRef.current >= THROTTLE_MS) {
          lastSyncRef.current = now
          onRoomMoveThrottled(mode.entityId, snappedPosition)
          pendingPositionRef.current = null
        } else {
          pendingPositionRef.current = { position: snappedPosition }
        }
      } else if (mode.entityType === "furniture") {
        const f = furniture.find((item) => item.id === mode.entityId)
        if (!f) return

        const originalRoom = rooms.find((r) => r.id === mode.originalRoomId)
        if (!originalRoom) return

        const targetRoom = findRoomAtPoint(rooms, worldPosition)
        const pendingRoomId = targetRoom?.id ?? mode.originalRoomId

        setMode((prev) => prev.type === "dragging" ? { ...prev, pendingRoomId } : prev)

        const relativePosition = {
          x: Math.round((worldPosition.x - originalRoom.position.x - mode.dragOffset.x) / gridSize) * gridSize,
          y: Math.round((worldPosition.y - originalRoom.position.y - mode.dragOffset.y) / gridSize) * gridSize,
        }

        onFurnitureMove(mode.entityId, relativePosition, mode.originalRoomId)

        const now = Date.now()
        if (now - lastSyncRef.current >= THROTTLE_MS) {
          lastSyncRef.current = now
          onFurnitureMoveThrottled(mode.entityId, relativePosition, mode.originalRoomId)
          pendingPositionRef.current = null
        } else {
          pendingPositionRef.current = { position: relativePosition, roomId: mode.originalRoomId }
        }
      } else if (mode.entityType === "door") {
        const door = doors.find((d) => d.id === mode.entityId)
        if (!door) return

        const room = rooms.find((r) => r.id === door.roomId)
        if (!room) return

        const vertices = getRoomVertices(room)
        const walls = getWallSegments(vertices, room.position)
        const snapResult = findClosestWallPoint(worldPosition, walls, door.width)

        if (snapResult) {
          onDoorMove(mode.entityId, snapResult.wallIndex, snapResult.positionOnWall)

          const now = Date.now()
          if (now - lastSyncRef.current >= THROTTLE_MS) {
            lastSyncRef.current = now
            onDoorMoveThrottled(mode.entityId, snapResult.wallIndex, snapResult.positionOnWall)
            pendingDoorPositionRef.current = null
          } else {
            pendingDoorPositionRef.current = { wallIndex: snapResult.wallIndex, positionOnWall: snapResult.positionOnWall }
          }
        }
      }
    },
    [
      mode,
      rooms,
      furniture,
      doors,
      gridSize,
      snapThreshold,
      onRoomMove,
      onRoomMoveThrottled,
      onFurnitureMove,
      onFurnitureMoveThrottled,
      onDoorMove,
      onDoorMoveThrottled,
    ]
  )

  const endDrag = useCallback(() => {
    if (mode.type !== "dragging") return

    if (mode.entityType === "furniture") {
      const f = furniture.find((item) => item.id === mode.entityId)
      if (f) {
        const originalRoom = rooms.find((r) => r.id === mode.originalRoomId)
        const targetRoom = rooms.find((r) => r.id === mode.pendingRoomId)

        if (!originalRoom || !targetRoom) {
          onFurnitureMove(mode.entityId, mode.originalPosition, mode.originalRoomId)
          onFurnitureMoveThrottled(mode.entityId, mode.originalPosition, mode.originalRoomId)
          pendingPositionRef.current = null
          setMode({ type: "idle" })
          return
        }

        let finalPosition = f.position
        let finalRoomId = mode.originalRoomId

        if (mode.pendingRoomId !== mode.originalRoomId) {
          const absoluteX = originalRoom.position.x + f.position.x
          const absoluteY = originalRoom.position.y + f.position.y
          finalPosition = {
            x: absoluteX - targetRoom.position.x,
            y: absoluteY - targetRoom.position.y,
          }
          finalRoomId = mode.pendingRoomId
        }

        const isColliding = checkFurnitureCollision(f.id, finalPosition, finalRoomId)
        if (isColliding) {
          onFurnitureMove(mode.entityId, mode.originalPosition, mode.originalRoomId)
          onFurnitureMoveThrottled(mode.entityId, mode.originalPosition, mode.originalRoomId)
          pendingPositionRef.current = null
          setMode({ type: "idle" })
          return
        }

        if (finalRoomId !== mode.originalRoomId) {
          onFurnitureMove(mode.entityId, finalPosition, finalRoomId)
          onFurnitureMoveThrottled(mode.entityId, finalPosition, finalRoomId)
          pendingPositionRef.current = null
        }
      }
    }

    if (pendingPositionRef.current) {
      if (mode.entityType === "room") {
        onRoomMoveThrottled(mode.entityId, pendingPositionRef.current.position)
      } else if (pendingPositionRef.current.roomId) {
        onFurnitureMoveThrottled(
          mode.entityId,
          pendingPositionRef.current.position,
          pendingPositionRef.current.roomId
        )
      }
      pendingPositionRef.current = null
    }

    if (pendingDoorPositionRef.current && mode.entityType === "door") {
      onDoorMoveThrottled(
        mode.entityId,
        pendingDoorPositionRef.current.wallIndex,
        pendingDoorPositionRef.current.positionOnWall
      )
      pendingDoorPositionRef.current = null
    }

    setMode({ type: "idle" })
  }, [mode, rooms, furniture, checkFurnitureCollision, onFurnitureMove, onRoomMoveThrottled, onFurnitureMoveThrottled, onDoorMoveThrottled])

  const cancelDrag = useCallback(() => {
    if (mode.type !== "dragging") return

    if (mode.entityType === "room") {
      onRoomMove(mode.entityId, mode.originalPosition)
      onRoomMoveThrottled(mode.entityId, mode.originalPosition)
    } else if (mode.entityType === "furniture") {
      onFurnitureMove(mode.entityId, mode.originalPosition, mode.originalRoomId)
      onFurnitureMoveThrottled(mode.entityId, mode.originalPosition, mode.originalRoomId)
    } else if (mode.entityType === "door") {
      onDoorMove(mode.entityId, mode.originalDoorPosition.wallIndex, mode.originalDoorPosition.positionOnWall)
      onDoorMoveThrottled(mode.entityId, mode.originalDoorPosition.wallIndex, mode.originalDoorPosition.positionOnWall)
    }
    pendingPositionRef.current = null
    pendingDoorPositionRef.current = null
    setMode({ type: "idle" })
  }, [mode, onRoomMove, onRoomMoveThrottled, onFurnitureMove, onFurnitureMoveThrottled, onDoorMove, onDoorMoveThrottled])

  const nudge = useCallback(
    (direction: "up" | "down" | "left" | "right") => {
      if (!selectedId || !selectedType) return

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

      if (selectedType === "room") {
        const room = rooms.find((r) => r.id === selectedId)
        if (!room) return
        const newPosition = {
          x: room.position.x + delta.x,
          y: room.position.y + delta.y,
        }
        onRoomMove(selectedId, newPosition)
        onRoomMoveThrottled(selectedId, newPosition)
      } else {
        const f = furniture.find((item) => item.id === selectedId)
        if (!f) return
        const newPosition = {
          x: f.position.x + delta.x,
          y: f.position.y + delta.y,
        }
        onFurnitureMove(selectedId, newPosition, f.roomId)
        onFurnitureMoveThrottled(selectedId, newPosition, f.roomId)
      }
    },
    [selectedId, selectedType, rooms, furniture, onRoomMove, onRoomMoveThrottled, onFurnitureMove, onFurnitureMoveThrottled]
  )

  const handleMouseDown = useCallback(
    (entityId: string, entityType: "room" | "furniture" | "door", mousePos: Point, worldPos: Point) => {
      select(entityId, entityType)
      startDragging(entityId, entityType, mousePos, worldPos)
    },
    [select, startDragging]
  )

  const handleMouseUp = useCallback(() => {
    if (mode.type === "dragging" && hasDraggedRef.current) {
      endDrag()
    } else if (mode.type === "dragging") {
      setMode({ type: "idle" })
    }
  }, [mode, endDrag])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode.type === "dragging") {
        if (e.key === "Escape") {
          e.preventDefault()
          cancelDrag()
        }
      } else if (selectedId && selectedType) {
        switch (e.key) {
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
          case "Escape":
            e.preventDefault()
            deselect()
            break
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [mode, selectedId, selectedType, cancelDrag, nudge, deselect])

  return {
    selectedId,
    selectedType,
    isDragging,
    draggingRoomId,
    draggingFurnitureId,
    draggingDoorId,
    draggingFurnitureOriginalRoomId,
    draggingFurniturePendingRoomId,
    getSelectedRoom,
    getSelectedFurniture,
    checkRoomCollision,
    checkFurnitureCollision,
    select,
    deselect,
    handleMouseDown,
    handleMouseUp,
    updateDragPosition,
    endDrag,
    cancelDrag,
    nudge,
  }
}
