import { useRef, useState, useCallback, useEffect, useMemo, useImperativeHandle, forwardRef } from "react"
import type { RoomEntity, FurnitureEntity, DoorEntity, Point, HingeSide } from "@apartment-planner/shared"
import { getAbsoluteVertices, pointInPolygon, furnitureShapeToVertices, findNearestDistances, getWallSegments, findClosestWallPoint, getRoomVertices, getFurnitureVertices } from "@apartment-planner/shared"
import { RoomPolygon } from "./shapes/room-polygon"
import { FurnitureShape } from "./shapes/furniture-shape"
import { DoorShape, GhostDoor } from "./shapes/door-shape"
import { DistanceIndicator } from "./shapes/distance-indicator"
import { GRID_SIZE, SCALE } from "./lib/constants"
import { loadViewBox, saveViewBox, calculateFitToContentViewBox } from "./lib/viewbox"
import { hitTestFurniture as hitTestFurnitureLib, hitTestRoom as hitTestRoomLib } from "./lib/hit-testing"

export type CursorMode = "grab" | "grabbing" | "pointer" | "crosshair"

export type RoomCanvasHandle = {
  screenToWorld: (clientX: number, clientY: number) => Point
  getViewportCenter: () => Point
  zoomIn: () => void
  zoomOut: () => void
  getSvgElement: () => SVGSVGElement | null
}

type PlacingDoorState = {
  roomId: string
  doorWidth: number
  hingeSide: HingeSide
}

type RoomCanvasProps = {
  roomCode: string
  rooms: RoomEntity[]
  furniture: FurnitureEntity[]
  doors: DoorEntity[]
  selectedId: string | null
  selectedType: "room" | "furniture" | "door" | null
  draggingRoomId: string | null
  draggingFurnitureId: string | null
  draggingDoorId: string | null
  draggingFurnitureOriginalRoomId: string | null
  draggingFurniturePendingRoomId: string | null
  placingDoor: PlacingDoorState | null
  onMouseDown: (entityId: string, entityType: "room" | "furniture" | "door", mousePos: Point, worldPos: Point) => void
  onMouseUp: () => void
  onDragUpdate: (worldPosition: Point, mousePos: Point) => void
  onCanvasClick: () => void
  onContextMenu: (x: number, y: number, targetRoom: RoomEntity | null) => void
  onCursorModeChange: (mode: CursorMode) => void
  onDoorPlace: (roomId: string, wallIndex: number, positionOnWall: number) => void
  onDoorPlaceCancel: () => void
  checkRoomCollision: (roomId: string, position: Point) => boolean
  checkFurnitureCollision: (furnitureId: string, position: Point, roomId: string) => boolean
  onZoomChange: (zoomPercent: number) => void
}

export const RoomCanvas = forwardRef<RoomCanvasHandle, RoomCanvasProps>(function RoomCanvas({
  roomCode,
  rooms,
  furniture,
  doors,
  selectedId,
  selectedType,
  draggingRoomId,
  draggingFurnitureId,
  draggingDoorId,
  draggingFurnitureOriginalRoomId,
  draggingFurniturePendingRoomId,
  placingDoor,
  onMouseDown,
  onMouseUp,
  onDragUpdate,
  onCanvasClick,
  onContextMenu,
  onCursorModeChange,
  onDoorPlace,
  onDoorPlaceCancel,
  checkRoomCollision,
  checkFurnitureCollision,
  onZoomChange,
}, ref) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [viewBox, setViewBox] = useState(() => {
    const stored = loadViewBox(roomCode)
    return stored ?? { x: -500, y: -500, width: 2000, height: 1500 }
  })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<Point | null>(null)
  const [cursorMode, setCursorMode] = useState<CursorMode>("grab")
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null)
  const [ghostDoor, setGhostDoor] = useState<{
    wallStart: Point
    wallEnd: Point
    positionOnWall: number
    wallIndex: number
  } | null>(null)
  
  useEffect(() => {
    onCursorModeChange(cursorMode)
  }, [cursorMode, onCursorModeChange])

  useEffect(() => {
    if (placingDoor) {
      setCursorMode("crosshair")
    }
  }, [placingDoor])

  useEffect(() => {
    if (!placingDoor) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        setGhostDoor(null)
        onDoorPlaceCancel()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [placingDoor, onDoorPlaceCancel])

  const hasInitialFitRef = useRef(false)
  const hasStoredViewBoxRef = useRef(loadViewBox(roomCode) !== null)
  const initialRoomsRef = useRef<RoomEntity[] | null>(null)
  const baseViewWidthRef = useRef<number | null>(null)
  const isDragging = draggingRoomId !== null || draggingFurnitureId !== null || draggingDoorId !== null

  const scale = SCALE

  useEffect(() => {
    saveViewBox(roomCode, viewBox)
  }, [roomCode, viewBox])

  useEffect(() => {
    if (baseViewWidthRef.current === null) {
      baseViewWidthRef.current = viewBox.width
    }
  }, [viewBox])

  useEffect(() => {
    if (hasInitialFitRef.current) return
    if (hasStoredViewBoxRef.current) {
      hasInitialFitRef.current = true
      return
    }
    if (rooms.length === 0) return
    if (!svgRef.current) return

    if (initialRoomsRef.current === null) {
      initialRoomsRef.current = rooms
    }

    hasInitialFitRef.current = true

    const rect = svgRef.current.getBoundingClientRect()
    const fitViewBox = calculateFitToContentViewBox(initialRoomsRef.current, rect.width, rect.height)
    if (fitViewBox) {
      setViewBox(fitViewBox)
    }
  }, [rooms])

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

  const zoomAtCenter = useCallback((zoomFactor: number) => {
    setViewBox((prev) => {
      const baseWidth = baseViewWidthRef.current ?? prev.width
      if (baseViewWidthRef.current === null) {
        baseViewWidthRef.current = baseWidth
      }

      const centerX = prev.x + prev.width / 2
      const centerY = prev.y + prev.height / 2

      const newWidth = prev.width * zoomFactor
      const newHeight = prev.height * zoomFactor

      const newX = centerX - newWidth / 2
      const newY = centerY - newHeight / 2

      const zoomPercent = Math.round((baseWidth / newWidth) * 100)
      onZoomChange(zoomPercent)

      return { x: newX, y: newY, width: newWidth, height: newHeight }
    })
  }, [onZoomChange])

  useImperativeHandle(ref, () => ({
    screenToWorld: (clientX: number, clientY: number): Point => {
      const svgPos = screenToSvg(clientX, clientY)
      return svgToWorld(svgPos)
    },
    getViewportCenter: (): Point => {
      const centerSvg = {
        x: viewBox.x + viewBox.width / 2,
        y: viewBox.y + viewBox.height / 2,
      }
      return svgToWorld(centerSvg)
    },
    zoomIn: () => zoomAtCenter(0.9),
    zoomOut: () => zoomAtCenter(1.1),
    getSvgElement: () => svgRef.current,
  }), [screenToSvg, svgToWorld, viewBox, zoomAtCenter])

  const hitTestFurniture = useCallback(
    (worldPos: Point): FurnitureEntity | null => hitTestFurnitureLib(worldPos, furniture, rooms),
    [furniture, rooms]
  )

  const hitTestRoom = useCallback(
    (worldPos: Point): RoomEntity | null => hitTestRoomLib(worldPos, rooms),
    [rooms]
  )

  const updateCursorMode = useCallback(
    (clientX: number, clientY: number) => {
      if (placingDoor) {
        setHoveredRoomId(null)
        setCursorMode("crosshair")
        return
      }

      if (isPanning) {
        setHoveredRoomId(null)
        setCursorMode("grabbing")
        return
      }

      const svgPos = screenToSvg(clientX, clientY)
      const worldPos = svgToWorld(svgPos)
      
      const hitFurniture = hitTestFurniture(worldPos)
      const hitRoom = hitTestRoom(worldPos)

      setHoveredRoomId(hitRoom?.id ?? null)

      if (hitFurniture || hitRoom) {
        setCursorMode("pointer")
      } else {
        setCursorMode("grab")
      }
    },
    [placingDoor, isPanning, screenToSvg, svgToWorld, hitTestFurniture, hitTestRoom]
  )

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return

    const svgPos = screenToSvg(e.clientX, e.clientY)
    const worldPos = svgToWorld(svgPos)

    if (placingDoor && ghostDoor) {
      onDoorPlace(placingDoor.roomId, ghostDoor.wallIndex, ghostDoor.positionOnWall)
      setGhostDoor(null)
      return
    }

    const hitFurniture = hitTestFurniture(worldPos)
    if (hitFurniture) {
      onMouseDown(hitFurniture.id, "furniture", { x: e.clientX, y: e.clientY }, worldPos)
      return
    }

    const hitRoom = hitTestRoom(worldPos)
    if (hitRoom) {
      onMouseDown(hitRoom.id, "room", { x: e.clientX, y: e.clientY }, worldPos)
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

    if (placingDoor) {
      const svgPos = screenToSvg(e.clientX, e.clientY)
      const worldPos = svgToWorld(svgPos)
      const room = rooms.find((r) => r.id === placingDoor.roomId)
      if (room) {
        const walls = getWallSegments(getRoomVertices(room), room.position)
        const snapResult = findClosestWallPoint(worldPos, walls, placingDoor.doorWidth)
        if (snapResult) {
          setGhostDoor({
            wallStart: snapResult.wallStart,
            wallEnd: snapResult.wallEnd,
            positionOnWall: snapResult.positionOnWall,
            wallIndex: snapResult.wallIndex,
          })
        }
      }
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
      const baseWidth = baseViewWidthRef.current ?? prev.width
      if (baseViewWidthRef.current === null) {
        baseViewWidthRef.current = baseWidth
      }

      const newWidth = prev.width * zoomFactor
      const newHeight = prev.height * zoomFactor

      const newX = svgPos.x - (svgPos.x - prev.x) * zoomFactor
      const newY = svgPos.y - (svgPos.y - prev.y) * zoomFactor

      const zoomPercent = Math.round((baseWidth / newWidth) * 100)
      onZoomChange(zoomPercent)

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
    
    if (draggingFurniturePendingRoomId && draggingFurnitureOriginalRoomId && draggingFurniturePendingRoomId !== draggingFurnitureOriginalRoomId) {
      const originalRoom = rooms.find((r) => r.id === draggingFurnitureOriginalRoomId)
      const pendingRoom = rooms.find((r) => r.id === draggingFurniturePendingRoomId)
      if (originalRoom && pendingRoom) {
        const absolutePos = {
          x: originalRoom.position.x + f.position.x,
          y: originalRoom.position.y + f.position.y,
        }
        const relativeToNewRoom = {
          x: absolutePos.x - pendingRoom.position.x,
          y: absolutePos.y - pendingRoom.position.y,
        }
        return checkFurnitureCollision(f.id, relativeToNewRoom, draggingFurniturePendingRoomId)
      }
    }
    
    return checkFurnitureCollision(f.id, f.position, f.roomId)
  }

  const pixelScale = svgRef.current ? viewBox.width / svgRef.current.clientWidth : 1
  const selectedRoom = useMemo(
    () => (selectedType === "room" ? rooms.find((r) => r.id === selectedId) ?? null : null),
    [rooms, selectedId, selectedType]
  )
  const selectedRoomLabel = useMemo(() => {
    if (!selectedRoom) return null

    const vertices = getRoomVertices(selectedRoom)
    const localScaledVertices = vertices.map((v) => ({
      x: v.x * scale,
      y: v.y * scale,
    }))

    const titleFontSize = 13 * pixelScale
    const titleOffset = 10 * pixelScale
    const padding = 3 * pixelScale
    const textWidth = selectedRoom.name.length * titleFontSize * 0.55
    const textHeight = titleFontSize * 1.05

    const localX = localScaledVertices.reduce((sum, v) => sum + v.x, 0) / localScaledVertices.length
    const localY = Math.min(...localScaledVertices.map((v) => v.y)) - titleOffset

    return {
      translateX: selectedRoom.position.x * scale,
      translateY: selectedRoom.position.y * scale,
      localX,
      localY,
      fontSize: titleFontSize,
      roomName: selectedRoom.name,
      bgWidth: textWidth + padding * 2,
      bgHeight: textHeight + padding * 2,
    }
  }, [pixelScale, scale, selectedRoom])

  const visibleFurniture = furniture

  const distanceMeasurements = useMemo(() => {
    if (!draggingFurnitureId) return []

    const draggedFurniture = furniture.find((f) => f.id === draggingFurnitureId)
    if (!draggedFurniture) return []

    const room = rooms.find((r) => r.id === draggedFurniture.roomId)
    if (!room) return []

    const absolutePos = {
      x: room.position.x + draggedFurniture.position.x,
      y: room.position.y + draggedFurniture.position.y,
    }

    const furnitureVerts = getAbsoluteVertices(
      getFurnitureVertices(draggedFurniture),
      absolutePos
    )

    const roomWallVerts = getAbsoluteVertices(getRoomVertices(room), room.position)

    const allVertsInsideRoom = furnitureVerts.every((v) => pointInPolygon(v, roomWallVerts))
    if (!allVertsInsideRoom) return []

    const otherFurnitureData = furniture
      .filter((f) => f.id !== draggingFurnitureId && f.roomId === draggedFurniture.roomId)
      .map((f) => {
        const otherAbsPos = {
          x: room.position.x + f.position.x,
          y: room.position.y + f.position.y,
        }
        return {
          vertices: getAbsoluteVertices(getFurnitureVertices(f), otherAbsPos),
          name: f.name,
        }
      })

    return findNearestDistances(furnitureVerts, roomWallVerts, otherFurnitureData, 2)
  }, [draggingFurnitureId, furniture, rooms])

  return (
    <svg
      ref={svgRef}
      className="h-full w-full cursor-none"
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={(e) => {
        setHoveredRoomId(null)
        handleMouseUp(e)
      }}
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
          isHovered={hoveredRoomId === room.id}
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
            isRoomDragging={draggingRoomId === f.roomId}
            isColliding={getFurnitureCollisionState(f)}
            onMouseDown={(e) => {
              e.stopPropagation()
              const svgPos = screenToSvg(e.clientX, e.clientY)
              const worldPos = svgToWorld(svgPos)
              onMouseDown(f.id, "furniture", { x: e.clientX, y: e.clientY }, worldPos)
            }}
          />
        )
      })}

      {doors.map((door) => {
        const room = rooms.find((r) => r.id === door.roomId)
        if (!room) return null
        return (
          <DoorShape
            key={door.id}
            door={door}
            room={room}
            scale={scale}
            pixelScale={pixelScale}
            isSelected={selectedType === "door" && selectedId === door.id}
            isDragging={draggingDoorId === door.id}
            isRoomDragging={draggingRoomId === door.roomId}
            onMouseDown={(e) => {
              e.stopPropagation()
              const svgPos = screenToSvg(e.clientX, e.clientY)
              const worldPos = svgToWorld(svgPos)
              onMouseDown(door.id, "door", { x: e.clientX, y: e.clientY }, worldPos)
            }}
          />
        )
      })}

      {placingDoor && ghostDoor && (() => {
        const room = rooms.find((r) => r.id === placingDoor.roomId)
        if (!room) return null
        return (
          <GhostDoor
            wallStart={ghostDoor.wallStart}
            wallEnd={ghostDoor.wallEnd}
            positionOnWall={ghostDoor.positionOnWall}
            doorWidth={placingDoor.doorWidth}
            hingeSide={placingDoor.hingeSide}
            roomVertices={getRoomVertices(room)}
            roomPosition={room.position}
            scale={scale}
            pixelScale={pixelScale}
          />
        )
      })()}

      {distanceMeasurements.map((m, i) => (
        <DistanceIndicator
          key={i}
          from={m.furniturePoint}
          to={m.obstaclePoint}
          distanceInEighths={Math.round(m.distance)}
          scale={scale}
          pixelScale={pixelScale}
        />
      ))}

      {selectedRoomLabel && (
        <g
          transform={`translate(${selectedRoomLabel.translateX}, ${selectedRoomLabel.translateY})`}
          style={draggingRoomId === selectedId ? { transition: "transform 60ms ease-out" } : undefined}
          className="pointer-events-none select-none"
        >
          <rect
            x={selectedRoomLabel.localX - selectedRoomLabel.bgWidth / 2}
            y={selectedRoomLabel.localY - selectedRoomLabel.bgHeight / 2}
            width={selectedRoomLabel.bgWidth}
            height={selectedRoomLabel.bgHeight}
            rx={3 * pixelScale}
            ry={3 * pixelScale}
            fill="white"
            fillOpacity={0.92}
          />
          <text
            x={selectedRoomLabel.localX}
            y={selectedRoomLabel.localY}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="hsl(222 47% 25%)"
            style={{
              fontSize: selectedRoomLabel.fontSize,
              fontWeight: 600,
            }}
          >
            {selectedRoomLabel.roomName}
          </text>
        </g>
      )}
    </svg>
  )
})

