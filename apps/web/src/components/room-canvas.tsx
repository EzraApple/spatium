import { useRef, useState, useCallback, useEffect } from "react"
import type { RoomEntity, Point } from "@apartment-planner/shared"
import { RoomPolygon } from "@/components/room-polygon"

type RoomCanvasProps = {
  rooms: RoomEntity[]
  selectedRoomId: string | null
  movingRoomId: string | null
  onRoomClick: (id: string) => void
  onRoomContextMenu: (id: string, e: React.MouseEvent) => void
  onPositionUpdate: (position: Point) => void
  onCanvasClick: () => void
  checkCollision: (roomId: string, position: Point) => boolean
}

const GRID_SIZE = 24
const FIT_PADDING = 0.7

export function RoomCanvas({
  rooms,
  selectedRoomId,
  movingRoomId,
  onRoomClick,
  onRoomContextMenu,
  onPositionUpdate,
  onCanvasClick,
  checkCollision,
}: RoomCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [viewBox, setViewBox] = useState({ x: -500, y: -500, width: 2000, height: 1500 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<Point | null>(null)
  const hasInitialFitRef = useRef(false)

  const scale = 1 / 12

  useEffect(() => {
    if (hasInitialFitRef.current || rooms.length === 0 || !svgRef.current) return

    hasInitialFitRef.current = true

    const allVertices: Point[] = []
    for (const room of rooms) {
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY })
      e.preventDefault()
    }
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

    if (movingRoomId) {
      const movingRoom = rooms.find((r) => r.id === movingRoomId)
      if (movingRoom) {
        const svgPos = screenToSvg(e.clientX, e.clientY)
        const worldX = svgPos.x / scale
        const worldY = svgPos.y / scale

        const centerOffsetX =
          movingRoom.vertices.reduce((sum, v) => sum + v.x, 0) / movingRoom.vertices.length
        const centerOffsetY =
          movingRoom.vertices.reduce((sum, v) => sum + v.y, 0) / movingRoom.vertices.length

        const newPosition = {
          x: worldX - centerOffsetX,
          y: worldY - centerOffsetY,
        }

        onPositionUpdate(newPosition)
      }
    }
  }

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false)
      setPanStart(null)
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

  const getCollisionState = (room: RoomEntity): boolean => {
    if (room.id !== movingRoomId) return false
    return checkCollision(room.id, room.position)
  }

  const pixelScale = svgRef.current ? viewBox.width / svgRef.current.clientWidth : 1

  return (
    <svg
      ref={svgRef}
      className="h-full w-full"
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleClick}
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
          isSelected={selectedRoomId === room.id}
          isMoving={movingRoomId === room.id}
          isColliding={getCollisionState(room)}
          onClick={() => onRoomClick(room.id)}
          onContextMenu={(e) => onRoomContextMenu(room.id, e)}
        />
      ))}
    </svg>
  )
}
