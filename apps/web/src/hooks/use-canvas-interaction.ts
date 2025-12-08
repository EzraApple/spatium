import { useState, useCallback, useEffect, useRef } from "react"
import type { RoomEntity, FurnitureEntity, Point } from "@apartment-planner/shared"
import {
  getAbsoluteVertices,
  polygonsIntersect,
  findSnapPosition,
  pointInPolygon,
  furnitureShapeToVertices,
  circlesIntersect,
  circlePolygonIntersect,
} from "@apartment-planner/shared"

type SelectionType = "room" | "furniture" | "door" | null

type InteractionMode =
  | { type: "idle" }
  | { type: "dragging"; entityType: "room" | "furniture" | "door"; entityId: string; originalPosition: Point; originalRoomId: string; pendingRoomId: string; startMousePos: Point }

type UseCanvasInteractionProps = {
  rooms: RoomEntity[]
  furniture: FurnitureEntity[]
  onRoomMove: (roomId: string, position: Point) => void
  onRoomMoveThrottled: (roomId: string, position: Point) => void
  onFurnitureMove: (furnitureId: string, position: Point, roomId: string) => void
  onFurnitureMoveThrottled: (furnitureId: string, position: Point, roomId: string) => void
  gridSize?: number
  snapThreshold?: number
}

const THROTTLE_MS = 50
const NUDGE_AMOUNT = 96
const DRAG_THRESHOLD = 5

export function useCanvasInteraction({
  rooms,
  furniture,
  onRoomMove,
  onRoomMoveThrottled,
  onFurnitureMove,
  onFurnitureMoveThrottled,
  gridSize = 24,
  snapThreshold = 96,
}: UseCanvasInteractionProps) {
  const [mode, setMode] = useState<InteractionMode>({ type: "idle" })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<SelectionType>(null)
  const lastSyncRef = useRef<number>(0)
  const pendingPositionRef = useRef<{ position: Point; roomId?: string } | null>(null)
  const hasDraggedRef = useRef(false)

  const isDragging = mode.type === "dragging"
  const draggingRoomId = mode.type === "dragging" && mode.entityType === "room" ? mode.entityId : null
  const draggingFurnitureId = mode.type === "dragging" && mode.entityType === "furniture" ? mode.entityId : null

  const getSelectedRoom = useCallback(() => {
    if (selectedType !== "room" || !selectedId) return null
    return rooms.find((r) => r.id === selectedId) ?? null
  }, [selectedType, selectedId, rooms])

  const getSelectedFurniture = useCallback(() => {
    if (selectedType !== "furniture" || !selectedId) return null
    return furniture.find((f) => f.id === selectedId) ?? null
  }, [selectedType, selectedId, furniture])

  const checkRoomCollision = useCallback(
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

  const getFurnitureCenter = useCallback((f: FurnitureEntity, room: RoomEntity): Point => {
    if (f.shapeTemplate.type === "circle") {
      return {
        x: room.position.x + f.position.x + f.shapeTemplate.radius,
        y: room.position.y + f.position.y + f.shapeTemplate.radius,
      }
    }
    const vertices = furnitureShapeToVertices(f.shapeTemplate)
    const centerX = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length
    const centerY = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length
    return {
      x: room.position.x + f.position.x + centerX,
      y: room.position.y + f.position.y + centerY,
    }
  }, [])

  const checkFurnitureCollision = useCallback(
    (furnitureId: string, position: Point, roomId: string): boolean => {
      const f = furniture.find((item) => item.id === furnitureId)
      const room = rooms.find((r) => r.id === roomId)
      if (!f || !room) return true

      const absolutePos = {
        x: room.position.x + position.x,
        y: room.position.y + position.y,
      }

      if (f.shapeTemplate.type === "circle") {
        const center = {
          x: absolutePos.x + f.shapeTemplate.radius,
          y: absolutePos.y + f.shapeTemplate.radius,
        }
        const roomVertices = getAbsoluteVertices(room.vertices, room.position)
        
        const innerCheck = furnitureShapeToVertices(f.shapeTemplate).every((v) => {
          const absV = { x: absolutePos.x + v.x, y: absolutePos.y + v.y }
          return pointInPolygon(absV, roomVertices)
        })
        if (!innerCheck) return true

        for (const other of furniture) {
          if (other.id === furnitureId) continue
          const otherRoom = rooms.find((r) => r.id === other.roomId)
          if (!otherRoom) continue

          const otherAbsPos = {
            x: otherRoom.position.x + other.position.x,
            y: otherRoom.position.y + other.position.y,
          }

          if (other.shapeTemplate.type === "circle") {
            const otherCenter = {
              x: otherAbsPos.x + other.shapeTemplate.radius,
              y: otherAbsPos.y + other.shapeTemplate.radius,
            }
            if (circlesIntersect(center, f.shapeTemplate.radius, otherCenter, other.shapeTemplate.radius)) {
              return true
            }
          } else {
            const otherVertices = getAbsoluteVertices(
              furnitureShapeToVertices(other.shapeTemplate),
              otherAbsPos
            )
            if (circlePolygonIntersect(center, f.shapeTemplate.radius, otherVertices)) {
              return true
            }
          }
        }
      } else {
        const movingVertices = getAbsoluteVertices(
          furnitureShapeToVertices(f.shapeTemplate),
          absolutePos
        )
        const roomVertices = getAbsoluteVertices(room.vertices, room.position)

        const allInsideRoom = movingVertices.every((v) => pointInPolygon(v, roomVertices))
        if (!allInsideRoom) return true

        for (const other of furniture) {
          if (other.id === furnitureId) continue
          const otherRoom = rooms.find((r) => r.id === other.roomId)
          if (!otherRoom) continue

          const otherAbsPos = {
            x: otherRoom.position.x + other.position.x,
            y: otherRoom.position.y + other.position.y,
          }

          if (other.shapeTemplate.type === "circle") {
            const otherCenter = {
              x: otherAbsPos.x + other.shapeTemplate.radius,
              y: otherAbsPos.y + other.shapeTemplate.radius,
            }
            if (circlePolygonIntersect(otherCenter, other.shapeTemplate.radius, movingVertices)) {
              return true
            }
          } else {
            const otherVertices = getAbsoluteVertices(
              furnitureShapeToVertices(other.shapeTemplate),
              otherAbsPos
            )
            if (polygonsIntersect(movingVertices, otherVertices)) {
              return true
            }
          }
        }
      }

      return false
    },
    [furniture, rooms]
  )

  const findRoomAtPoint = useCallback(
    (point: Point): RoomEntity | null => {
      for (const room of rooms) {
        const vertices = getAbsoluteVertices(room.vertices, room.position)
        if (pointInPolygon(point, vertices)) {
          return room
        }
      }
      return null
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

  const select = useCallback((id: string, type: "room" | "furniture" | "door") => {
    setSelectedId(id)
    setSelectedType(type)
  }, [])

  const deselect = useCallback(() => {
    setSelectedId(null)
    setSelectedType(null)
  }, [])

  const startDragging = useCallback(
    (entityId: string, entityType: "room" | "furniture", mousePos: Point) => {
      if (entityType === "room") {
        const room = rooms.find((r) => r.id === entityId)
        if (!room) return
        setMode({
          type: "dragging",
          entityType: "room",
          entityId,
          originalPosition: room.position,
          originalRoomId: room.id,
          pendingRoomId: room.id,
          startMousePos: mousePos,
        })
      } else {
        const f = furniture.find((item) => item.id === entityId)
        if (!f) return
        setMode({
          type: "dragging",
          entityType: "furniture",
          entityId,
          originalPosition: f.position,
          originalRoomId: f.roomId,
          pendingRoomId: f.roomId,
          startMousePos: mousePos,
        })
      }
      hasDraggedRef.current = false
    },
    [rooms, furniture]
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

        const centerOffsetX = room.vertices.reduce((sum, v) => sum + v.x, 0) / room.vertices.length
        const centerOffsetY = room.vertices.reduce((sum, v) => sum + v.y, 0) / room.vertices.length

        const rawPosition = {
          x: worldPosition.x - centerOffsetX,
          y: worldPosition.y - centerOffsetY,
        }

        const snappedPosition = calculateSnappedPosition(mode.entityId, rawPosition)
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

        const targetRoom = findRoomAtPoint(worldPosition)
        const pendingRoomId = targetRoom?.id ?? mode.originalRoomId

        setMode((prev) => prev.type === "dragging" ? { ...prev, pendingRoomId } : prev)

        let centerOffsetX = 0
        let centerOffsetY = 0
        if (f.shapeTemplate.type === "circle") {
          centerOffsetX = f.shapeTemplate.radius
          centerOffsetY = f.shapeTemplate.radius
        } else {
          const verts = furnitureShapeToVertices(f.shapeTemplate)
          centerOffsetX = verts.reduce((sum, v) => sum + v.x, 0) / verts.length
          centerOffsetY = verts.reduce((sum, v) => sum + v.y, 0) / verts.length
        }

        const relativePosition = {
          x: Math.round((worldPosition.x - originalRoom.position.x - centerOffsetX) / gridSize) * gridSize,
          y: Math.round((worldPosition.y - originalRoom.position.y - centerOffsetY) / gridSize) * gridSize,
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
      }
    },
    [
      mode,
      rooms,
      furniture,
      gridSize,
      calculateSnappedPosition,
      findRoomAtPoint,
      onRoomMove,
      onRoomMoveThrottled,
      onFurnitureMove,
      onFurnitureMoveThrottled,
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

    setMode({ type: "idle" })
  }, [mode, furniture, checkFurnitureCollision, onFurnitureMove, onRoomMoveThrottled, onFurnitureMoveThrottled])

  const cancelDrag = useCallback(() => {
    if (mode.type !== "dragging") return

    if (mode.entityType === "room") {
      onRoomMove(mode.entityId, mode.originalPosition)
      onRoomMoveThrottled(mode.entityId, mode.originalPosition)
    } else if (mode.entityType === "furniture") {
      onFurnitureMove(mode.entityId, mode.originalPosition, mode.originalRoomId)
      onFurnitureMoveThrottled(mode.entityId, mode.originalPosition, mode.originalRoomId)
    }
    pendingPositionRef.current = null
    setMode({ type: "idle" })
  }, [mode, onRoomMove, onRoomMoveThrottled, onFurnitureMove, onFurnitureMoveThrottled])

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
    (entityId: string, entityType: "room" | "furniture" | "door", mousePos: Point) => {
      select(entityId, entityType)
      if (entityType !== "door") {
        startDragging(entityId, entityType, mousePos)
      }
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
