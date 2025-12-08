import { useRef, useState, useCallback, useEffect } from "react"
import type { RoomEntity, FurnitureEntity, Point } from "@apartment-planner/shared"
import { getAbsoluteVertices, pointInPolygon, furnitureShapeToVertices, pointInCircle } from "@apartment-planner/shared"
import { RoomPolygon } from "@/components/room-polygon"
import { FurnitureShape } from "@/components/furniture-shape"

export type CursorMode = "grab" | "grabbing" | "pointer"

type RoomCanvasProps = {
  rooms: RoomEntity[]
  furniture: FurnitureEntity[]
  selectedId: string | null
  selectedType: "room" | "furniture" | null
  draggingRoomId: string | null
  draggingFurnitureId: string | null
  onMouseDown: (entityId: string, entityType: "room" | "furniture", mousePos: Point) => void
  onMouseUp: () => void
  onDragUpdate: (worldPosition: Point, mousePos: Point) => void
  onCanvasClick: () => void
  onContextMenu: (x: number, y: number, targetRoom: RoomEntity | null) => void
  onCursorModeChange: (mode: CursorMode) => void
  checkRoomCollision: (roomId: string, position: Point) => boolean
  checkFurnitureCollision: (furnitureId: string, position: Point, roomId: string) => boolean
  expandedRoomIds: Set<string>
}

const GRID_SIZE = 24
const FIT_PADDING = 0.7

export function RoomCanvas({
  rooms,
  furniture,
  selectedId,
  selectedType,
  draggingRoomId,
  draggingFurnitureId,
  onMouseDown,
  onMouseUp,
  onDragUpdate,
  onCanvasClick,
  onContextMenu,
  onCursorModeChange,
  checkRoomCollision,
  checkFurnitureCollision,
  expandedRoomIds,
}: RoomCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [viewBox, setViewBox] = useState({ x: -500, y: -500, width: 2000, height: 1500 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<Point | null>(null)
  const [cursorMode, setCursorMode] = useState<CursorMode>("grab")
  
  useEffect(() => {
    onCursorModeChange(cursorMode)
  }, [cursorMode, onCursorModeChange])

  const hasInitialFitRef = useRef(false)
  const initialRoomsRef = useRef<RoomEntity[] | null>(null)
  const isDragging = draggingRoomId !== null || draggingFurnitureId !== null

  const scale = 1 / 12

  useEffect(() => {
    if (hasInitialFitRef.current) return
    if (rooms.length === 0) return
    if (!svgRef.current) return

    if (initialRoomsRef.current === null) {
      initialRoomsRef.current = rooms
    }

    hasInitialFitRef.current = true

    const roomsToFit = initialRoomsRef.current
    const allVertices: Point[] = []
    for (const room of roomsToFit) {
      for (const vertex of room.vertices) {
        allVertices.push({
          x: (vertex.x + room.position.x) * scale,
          y: (vertex.y + room.position.y) * scale,
        })
      }
    }

    if (allVertices.length === 0) return

    const minX = Math.min(...allVertices.map((v) => v.x))
    const maxX = Math.max(...allVertices.map((v) => v.x))
    const minY = Math.min(...allVertices.map((v) => v.y))
    const maxY = Math.max(...allVertices.map((v) => v.y))

    const contentWidth = maxX - minX
    const contentHeight = maxY - minY
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    const rect = svgRef.current.getBoundingClientRect()
    const aspectRatio = rect.width / rect.height

    const paddedWidth = contentWidth / FIT_PADDING
    const paddedHeight = contentHeight / FIT_PADDING

    let viewWidth: number
    let viewHeight: number

    if (paddedWidth / paddedHeight > aspectRatio) {
      viewWidth = paddedWidth
      viewHeight = paddedWidth / aspectRatio
    } else {
      viewHeight = paddedHeight
      viewWidth = paddedHeight * aspectRatio
    }

    setViewBox({
      x: centerX - viewWidth / 2,
      y: centerY - viewHeight / 2,
      width: viewWidth,
      height: viewHeight,
    })
  }, [rooms, scale])

  const screenToSvg = useCallback(
    (clientX: number, clientY: number): Point => {
      if (!svgRef.current) return { x: 0, y: 0 }
      const rect = svgRef.current.getBoundingClientRect()
      const x = ((clientX - rect.left) / rect.width) * viewBox.width + viewBox.x
      const y = ((clientY - rect.top) / rect.height) * viewBox.height + viewBox.y
      return { x, y }
    },
    [viewBox]
  )

  const svgToWorld = useCallback(
    (svgPos: Point): Point => {
      return {
        x: svgPos.x / scale,
        y: svgPos.y / scale,
      }
    },
    [scale]
  )

  const hitTestFurniture = useCallback(
    (worldPos: Point): FurnitureEntity | null => {
      for (const f of furniture) {
        if (!expandedRoomIds.has(f.roomId)) continue
        
        const room = rooms.find((r) => r.id === f.roomId)
        if (!room) continue

        const absolutePos = {
          x: room.position.x + f.position.x,
          y: room.position.y + f.position.y,
        }

        if (f.shapeTemplate.type === "circle") {
          const center = {
            x: absolutePos.x + f.shapeTemplate.radius,
            y: absolutePos.y + f.shapeTemplate.radius,
          }
          if (pointInCircle(worldPos, center, f.shapeTemplate.radius)) {
            return f
          }
        } else {
          const vertices = getAbsoluteVertices(
            furnitureShapeToVertices(f.shapeTemplate),
            absolutePos
          )
          if (pointInPolygon(worldPos, vertices)) {
            return f
          }
        }
      }
      return null
    },
    [furniture, rooms, expandedRoomIds]
  )

  const hitTestRoom = useCallback(
    (worldPos: Point): RoomEntity | null => {
      for (const room of rooms) {
        const vertices = getAbsoluteVertices(room.vertices, room.position)
        if (pointInPolygon(worldPos, vertices)) {
          return room
        }
      }
      return null
    },
    [rooms]
  )

  const updateCursorMode = useCallback(
    (clientX: number, clientY: number) => {
      if (isPanning) {
        setCursorMode("grabbing")
        return
      }

      const svgPos = screenToSvg(clientX, clientY)
      const worldPos = svgToWorld(svgPos)
      
      const hitFurniture = hitTestFurniture(worldPos)
      const hitRoom = hitTestRoom(worldPos)

      if (hitFurniture || hitRoom) {
        setCursorMode("pointer")
      } else {
        setCursorMode("grab")
      }
    },
    [isPanning, screenToSvg, svgToWorld, hitTestFurniture, hitTestRoom]
  )

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return

    const svgPos = screenToSvg(e.clientX, e.clientY)
    const worldPos = svgToWorld(svgPos)

    const hitFurniture = hitTestFurniture(worldPos)
    if (hitFurniture) {
      onMouseDown(hitFurniture.id, "furniture", { x: e.clientX, y: e.clientY })
      return
    }

    const hitRoom = hitTestRoom(worldPos)
    if (hitRoom) {
      onMouseDown(hitRoom.id, "room", { x: e.clientX, y: e.clientY })
      return
    }

    setIsPanning(true)
    setPanStart({ x: e.clientX, y: e.clientY })
    setCursorMode("grabbing")
    e.preventDefault()
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && panStart) {
      const dx = ((e.clientX - panStart.x) / svgRef.current!.clientWidth) * viewBox.width
      const dy = ((e.clientY - panStart.y) / svgRef.current!.clientHeight) * viewBox.height
      setViewBox((prev) => ({
        ...prev,
        x: prev.x - dx,
        y: prev.y - dy,
      }))
      setPanStart({ x: e.clientX, y: e.clientY })
      return
    }

    if (isDragging) {
      const svgPos = screenToSvg(e.clientX, e.clientY)
      const worldPos = svgToWorld(svgPos)
      onDragUpdate(worldPos, { x: e.clientX, y: e.clientY })
      return
    }

    updateCursorMode(e.clientX, e.clientY)
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false)
      setPanStart(null)
      updateCursorMode(e.clientX, e.clientY)
      return
    }

    if (isDragging) {
      onMouseUp()
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9
    const svgPos = screenToSvg(e.clientX, e.clientY)

    setViewBox((prev) => {
      const newWidth = prev.width * zoomFactor
      const newHeight = prev.height * zoomFactor

      const newX = svgPos.x - (svgPos.x - prev.x) * zoomFactor
      const newY = svgPos.y - (svgPos.y - prev.y) * zoomFactor

      return { x: newX, y: newY, width: newWidth, height: newHeight }
    })
  }

  const handleClick = (e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as Element).classList.contains("canvas-bg")) {
      onCanvasClick()
    }
  }

  const handleContextMenuEvent = (e: React.MouseEvent) => {
    e.preventDefault()
    const svgPos = screenToSvg(e.clientX, e.clientY)
    const worldPos = svgToWorld(svgPos)
    const targetRoom = hitTestRoom(worldPos)
    onContextMenu(e.clientX, e.clientY, targetRoom)
  }

  const getRoomCollisionState = (room: RoomEntity): boolean => {
    if (room.id !== draggingRoomId) return false
    return checkRoomCollision(room.id, room.position)
  }

  const getFurnitureCollisionState = (f: FurnitureEntity): boolean => {
    if (f.id !== draggingFurnitureId) return false
    return checkFurnitureCollision(f.id, f.position, f.roomId)
  }

  const pixelScale = svgRef.current ? viewBox.width / svgRef.current.clientWidth : 1

  const visibleFurniture = furniture.filter((f) => expandedRoomIds.has(f.roomId))

  return (
    <svg
      ref={svgRef}
      className="h-full w-full cursor-none"
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleClick}
      onContextMenu={handleContextMenuEvent}
    >
      <defs>
        <pattern id="smallGrid" width={GRID_SIZE * scale} height={GRID_SIZE * scale} patternUnits="userSpaceOnUse">
          <path
            d={`M ${GRID_SIZE * scale} 0 L 0 0 0 ${GRID_SIZE * scale}`}
            fill="none"
            stroke="hsl(214 40% 88% / 0.5)"
            strokeWidth={0.5 * pixelScale}
          />
        </pattern>
        <pattern id="largeGrid" width={GRID_SIZE * 5 * scale} height={GRID_SIZE * 5 * scale} patternUnits="userSpaceOnUse">
          <rect width={GRID_SIZE * 5 * scale} height={GRID_SIZE * 5 * scale} fill="url(#smallGrid)" />
          <path
            d={`M ${GRID_SIZE * 5 * scale} 0 L 0 0 0 ${GRID_SIZE * 5 * scale}`}
            fill="none"
            stroke="hsl(214 40% 88%)"
            strokeWidth={1 * pixelScale}
          />
        </pattern>
      </defs>

      <rect
        className="canvas-bg"
        x={viewBox.x - 10000}
        y={viewBox.y - 10000}
        width={viewBox.width + 20000}
        height={viewBox.height + 20000}
        fill="hsl(214 100% 97%)"
      />
      <rect
        className="canvas-bg"
        x={viewBox.x - 10000}
        y={viewBox.y - 10000}
        width={viewBox.width + 20000}
        height={viewBox.height + 20000}
        fill="url(#largeGrid)"
      />

      {rooms.map((room) => (
        <RoomPolygon
          key={room.id}
          room={room}
          scale={scale}
          pixelScale={pixelScale}
          isSelected={selectedType === "room" && selectedId === room.id}
          isDragging={draggingRoomId === room.id}
          isColliding={getRoomCollisionState(room)}
        />
      ))}

      {visibleFurniture.map((f) => {
        const room = rooms.find((r) => r.id === f.roomId)
        if (!room) return null
        return (
          <FurnitureShape
            key={f.id}
            furniture={f}
            roomPosition={room.position}
            scale={scale}
            pixelScale={pixelScale}
            isSelected={selectedType === "furniture" && selectedId === f.id}
            isDragging={draggingFurnitureId === f.id}
            isColliding={getFurnitureCollisionState(f)}
            onMouseDown={(e) => {
              e.stopPropagation()
              onMouseDown(f.id, "furniture", { x: e.clientX, y: e.clientY })
            }}
          />
        )
      })}
    </svg>
  )
}
