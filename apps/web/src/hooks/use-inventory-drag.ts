import { useState, useCallback, useRef, useEffect } from "react"
import type { FurnitureEntity, RoomEntity, Point } from "@apartment-planner/shared"
import { furnitureShapeToVertices, INVENTORY_ROOM_ID } from "@apartment-planner/shared"
import { findRoomAtPoint, checkInventoryFurnitureCollision } from "@/components/canvas/lib/collision"

const THROTTLE_MS = 50

type InventoryDragState =
  | { type: "idle" }
  | {
      type: "dragging"
      furnitureId: string
      furniture: FurnitureEntity
      cardRect: DOMRect
      cursorPos: Point
      referenceRoomId: string
    }

type UseInventoryDragProps = {
  inventoryFurniture: FurnitureEntity[]
  furniture: FurnitureEntity[]
  rooms: RoomEntity[]
  moveFurniture: (furnitureId: string, position: Point, roomId: string) => void
  moveFurnitureLocal: (furnitureId: string, position: Point, roomId: string) => void
  moveFurnitureSync: (furnitureId: string, position: Point, roomId: string) => void
  screenToWorld: (clientX: number, clientY: number) => Point
}

export function useInventoryDrag({
  inventoryFurniture,
  furniture,
  rooms,
  moveFurniture,
  moveFurnitureLocal,
  moveFurnitureSync,
  screenToWorld,
}: UseInventoryDragProps) {
  const [dragState, setDragState] = useState<InventoryDragState>({ type: "idle" })
  const [snapBackAnimation, setSnapBackAnimation] = useState<{
    furnitureId: string
    from: Point
    to: Point
  } | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastSyncRef = useRef<number>(0)

  const isDragging = dragState.type === "dragging"
  const draggingFurnitureId = isDragging ? dragState.furnitureId : null

  const getFurnitureCenter = useCallback((f: FurnitureEntity): Point => {
    if (f.shapeTemplate.type === "circle") {
      return { x: f.shapeTemplate.radius, y: f.shapeTemplate.radius }
    }
    const vertices = furnitureShapeToVertices(f.shapeTemplate)
    return {
      x: vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length,
      y: vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length,
    }
  }, [])

  const startDrag = useCallback((furnitureId: string, cardRect: DOMRect) => {
    const f = inventoryFurniture.find((item) => item.id === furnitureId)
    if (!f) return
    if (rooms.length === 0) return

    const centerX = cardRect.left + cardRect.width / 2
    const centerY = cardRect.top + cardRect.height / 2
    const worldPos = screenToWorld(centerX, centerY)
    const center = getFurnitureCenter(f)

    const referenceRoom = rooms[0]
    const relativePos = {
      x: worldPos.x - referenceRoom.position.x - center.x,
      y: worldPos.y - referenceRoom.position.y - center.y,
    }

    moveFurnitureLocal(furnitureId, relativePos, referenceRoom.id)
    moveFurnitureSync(furnitureId, relativePos, referenceRoom.id)

    setDragState({
      type: "dragging",
      furnitureId,
      furniture: f,
      cardRect,
      cursorPos: { x: centerX, y: centerY },
      referenceRoomId: referenceRoom.id,
    })
  }, [inventoryFurniture, rooms, screenToWorld, getFurnitureCenter, moveFurnitureLocal, moveFurnitureSync])

  const updateDrag = useCallback((clientX: number, clientY: number) => {
    if (dragState.type !== "dragging") return

    const referenceRoom = rooms.find((r) => r.id === dragState.referenceRoomId)
    if (!referenceRoom) return

    const worldPos = screenToWorld(clientX, clientY)
    const center = getFurnitureCenter(dragState.furniture)

    const relativePos = {
      x: worldPos.x - referenceRoom.position.x - center.x,
      y: worldPos.y - referenceRoom.position.y - center.y,
    }

    moveFurnitureLocal(dragState.furnitureId, relativePos, referenceRoom.id)

    const now = Date.now()
    if (now - lastSyncRef.current >= THROTTLE_MS) {
      lastSyncRef.current = now
      moveFurnitureSync(dragState.furnitureId, relativePos, referenceRoom.id)
    }

    setDragState((prev) => {
      if (prev.type !== "dragging") return prev
      return {
        ...prev,
        cursorPos: { x: clientX, y: clientY },
      }
    })
  }, [dragState, rooms, screenToWorld, getFurnitureCenter, moveFurnitureLocal, moveFurnitureSync])

  const endDrag = useCallback(() => {
    if (dragState.type !== "dragging") return

    const { furniture: draggingFurniture, cursorPos, cardRect, referenceRoomId } = dragState
    const worldPos = screenToWorld(cursorPos.x, cursorPos.y)
    const targetRoom = findRoomAtPoint(rooms, worldPos)
    const center = getFurnitureCenter(draggingFurniture)

    if (targetRoom) {
      const relativePos = {
        x: worldPos.x - targetRoom.position.x - center.x,
        y: worldPos.y - targetRoom.position.y - center.y,
      }

      const isColliding = checkInventoryFurnitureCollision(rooms, furniture, draggingFurniture, relativePos, targetRoom.id)
      
      if (!isColliding) {
        moveFurniture(draggingFurniture.id, relativePos, targetRoom.id)
        setDragState({ type: "idle" })
        return
      }
    }

    moveFurniture(draggingFurniture.id, { x: 0, y: 0 }, INVENTORY_ROOM_ID)

    setSnapBackAnimation({
      furnitureId: draggingFurniture.id,
      from: cursorPos,
      to: { x: cardRect.left + cardRect.width / 2, y: cardRect.top + cardRect.height / 2 },
    })
    setDragState({ type: "idle" })
  }, [dragState, rooms, furniture, screenToWorld, getFurnitureCenter, moveFurniture])

  useEffect(() => {
    if (!snapBackAnimation) return

    const duration = 200
    const startTime = performance.now()
    const { from, to } = snapBackAnimation

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        setSnapBackAnimation(null)
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [snapBackAnimation])

  useEffect(() => {
    if (dragState.type !== "dragging") return

    const handleMouseMove = (e: MouseEvent) => {
      updateDrag(e.clientX, e.clientY)
    }

    const handleMouseUp = () => {
      endDrag()
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [dragState.type, updateDrag, endDrag])

  return {
    isDragging,
    draggingFurnitureId,
    dragState,
    snapBackAnimation,
    startDrag,
    updateDrag,
    endDrag,
  }
}

