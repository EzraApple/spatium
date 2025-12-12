import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { LayoutHeader } from "@/components/layout"
import { CursorCanvas, LocalCursor, ClickRipple } from "@/components/cursors"
import { RoomSidebar } from "@/components/sidebar"
import { RoomCanvas, type CursorMode, type RoomCanvasHandle } from "@/components/canvas"
import { PropertyPanel } from "@/components/property-panel"
import { AddRoomModal, AddFurnitureModal, CanvasContextMenu } from "@/components/modals"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { usePartySocket } from "@/hooks/use-party-socket"
import { useCursorSync } from "@/hooks/use-cursor-sync"
import { useLayoutSync } from "@/hooks/use-layout-sync"
import { useCanvasInteraction } from "@/hooks/use-canvas-interaction"
import { useEditorActions } from "@/hooks/use-editor-actions"
import { getLayout, updateLayoutName } from "@/lib/api"
import { addVisitedRoom } from "@/lib/visited-rooms"
import type {
  Layout,
  RoomEntity,
  ShapeTemplate,
  FurnitureType,
  FurnitureShapeTemplate,
  HingeSide,
  Point,
} from "@apartment-planner/shared"
import { getRoomVertices } from "@apartment-planner/shared"

export function EditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const roomCanvasRef = useRef<RoomCanvasHandle>(null)
  const [layout, setLayout] = useState<Layout | null>(null)
  const [loading, setLoading] = useState(true)
  const [localCursor, setLocalCursor] = useState({ x: 0, y: 0 })
  const [roomSpawnPosition, setRoomSpawnPosition] = useState<Point | null>(null)
  const [zoomPercent, setZoomPercent] = useState<number | null>(null)
  const [showZoomIndicator, setShowZoomIndicator] = useState(false)
  const zoomHideTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)

  const [addRoomModalOpen, setAddRoomModalOpen] = useState(false)
  const [addFurnitureModalOpen, setAddFurnitureModalOpen] = useState(false)
  const [addFurnitureRoomId, setAddFurnitureRoomId] = useState<string | null>(null)
  const [expandedRoomIds, setExpandedRoomIds] = useState<Set<string>>(new Set())
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    targetRoom: RoomEntity | null
  } | null>(null)
  const [cursorMode, setCursorMode] = useState<CursorMode>("grab")
  const [isOverCanvas, setIsOverCanvas] = useState(false)
  const [placingDoor, setPlacingDoor] = useState<{
    roomId: string
    doorWidth: number
    hingeSide: HingeSide
  } | null>(null)

  const socket = usePartySocket(layout?.roomCode)

  const {
    cursors,
    clicks,
    myColor,
    clientCount,
    sendCursorMove,
    sendCursorLeave,
    sendClick,
  } = useCursorSync(socket)

  const {
    rooms,
    furniture,
    doors,
    addRoom,
    updateRoom,
    deleteRoom,
    moveRoomLocal,
    moveRoomSync,
    addFurniture,
    updateFurniture,
    deleteFurniture,
    moveFurnitureLocal,
    moveFurnitureSync,
    addDoor,
    updateDoor,
    deleteDoor,
    moveDoorLocal,
    moveDoorSync,
  } = useLayoutSync(socket)

  const {
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
  } = useCanvasInteraction({
    rooms,
    furniture,
    doors,
    onRoomMove: moveRoomLocal,
    onRoomMoveThrottled: moveRoomSync,
    onFurnitureMove: moveFurnitureLocal,
    onFurnitureMoveThrottled: moveFurnitureSync,
    onDoorMove: moveDoorLocal,
    onDoorMoveThrottled: moveDoorSync,
  })

  const {
    createRoom,
    createFurniture,
    createDoor,
    updateRoomWithDoorResnap,
    deleteRoom: handleDeleteRoom,
    deleteFurniture: handleDeleteFurniture,
    deleteDoor: handleDeleteDoor,
    getDefaultDoorPlacement,
  } = useEditorActions({
    rooms,
    doors,
    addRoom,
    updateRoom,
    deleteRoom,
    addFurniture,
    updateFurniture,
    deleteFurniture,
    addDoor,
    updateDoor,
    deleteDoor,
    select,
    deselect,
  })

  useEffect(() => {
    if (!selectedId || !selectedType) return

    if (selectedType === "furniture") {
      const f = furniture.find((item) => item.id === selectedId)
      if (f) {
        setExpandedRoomIds((prev) => {
          if (prev.has(f.roomId)) return prev
          return new Set([...prev, f.roomId])
        })
      }
    } else if (selectedType === "door") {
      const d = doors.find((item) => item.id === selectedId)
      if (d) {
        setExpandedRoomIds((prev) => {
          if (prev.has(d.roomId)) return prev
          return new Set([...prev, d.roomId])
        })
      }
    }
  }, [selectedId, selectedType])

  useEffect(() => {
    if (!id) {
      navigate("/")
      return
    }

    getLayout(id)
      .then((layout) => {
        setLayout(layout)
        addVisitedRoom(layout.roomCode)
      })
      .catch(() => navigate("/"))
      .finally(() => setLoading(false))
  }, [id, navigate])

  useEffect(() => {
    return () => {
      if (zoomHideTimeoutRef.current) {
        window.clearTimeout(zoomHideTimeoutRef.current)
      }
    }
  }, [])

  const handleNameChange = useCallback(
    async (name: string) => {
      if (!id) return
      try {
        const updated = await updateLayoutName(id, name)
        setLayout(updated)
      } catch {
      }
    },
    [id]
  )

  const handleMouseMove = (e: React.MouseEvent) => {
    setLocalCursor({ x: e.clientX, y: e.clientY })
    sendCursorMove(e.clientX, e.clientY)
  }

  const handleMouseLeave = () => {
    setLocalCursor({ x: 0, y: 0 })
    sendCursorLeave()
  }

  const handleZoomChange = useCallback((percent: number) => {
    setZoomPercent(percent)
    setShowZoomIndicator(true)
    if (zoomHideTimeoutRef.current) {
      window.clearTimeout(zoomHideTimeoutRef.current)
    }
    zoomHideTimeoutRef.current = window.setTimeout(() => {
      setShowZoomIndicator(false)
    }, 3000)
  }, [])

  const handleClick = (e: React.MouseEvent) => {
    sendClick(e.clientX, e.clientY)
  }

  const handleAddRoom = (name: string, template: ShapeTemplate) => {
    const spawnPos = roomSpawnPosition ?? roomCanvasRef.current?.getViewportCenter() ?? { x: 0, y: 0 }
    const room = createRoom(name, template, spawnPos)
    const vertices = getRoomVertices(room)
    const roomCenterX = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length
    const roomCenterY = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length
    const worldCenter = {
      x: room.position.x + roomCenterX,
      y: room.position.y + roomCenterY,
    }
    handleMouseDown(room.id, "room", localCursor, worldCenter)
    setRoomSpawnPosition(null)
  }

  const handleAddFurniture = (
    roomId: string,
    name: string,
    furnitureType: FurnitureType,
    template: FurnitureShapeTemplate
  ) => {
    const created = createFurniture(roomId, name, furnitureType, template)
    if (created) {
      setExpandedRoomIds((prev) => new Set([...prev, roomId]))
    }
  }

  const handleToggleExpanded = (roomId: string) => {
    setExpandedRoomIds((prev) => {
      const next = new Set(prev)
      if (next.has(roomId)) {
        next.delete(roomId)
      } else {
        next.add(roomId)
      }
      return next
    })
  }

  const handleOpenAddFurnitureModal = (roomId: string) => {
    setAddFurnitureRoomId(roomId)
    setAddFurnitureModalOpen(true)
  }

  const handleRoomNameChange = (roomId: string, name: string) => {
    const room = rooms.find((r) => r.id === roomId)
    if (room) {
      updateRoom({ ...room, name })
    }
  }

  const handleSelectFurniture = (furnitureId: string) => {
    select(furnitureId, "furniture")
    const f = furniture.find((item) => item.id === furnitureId)
    if (f) {
      setExpandedRoomIds((prev) => new Set([...prev, f.roomId]))
    }
  }

  const handleSelectDoor = (doorId: string) => {
    select(doorId, "door")
    const d = doors.find((item) => item.id === doorId)
    if (d) {
      setExpandedRoomIds((prev) => new Set([...prev, d.roomId]))
    }
  }

  const handleStartDoorPlacement = (roomId: string) => {
    const defaults = getDefaultDoorPlacement()
    setPlacingDoor({
      roomId,
      doorWidth: defaults.doorWidth,
      hingeSide: defaults.hingeSide,
    })
    setExpandedRoomIds((prev) => new Set([...prev, roomId]))
  }

  const handleDoorPlace = (roomId: string, wallIndex: number, positionOnWall: number) => {
    if (!placingDoor) return
    createDoor(roomId, wallIndex, positionOnWall, placingDoor.doorWidth, placingDoor.hingeSide)
    setPlacingDoor(null)
  }

  const handleDoorPlaceCancel = () => {
    setPlacingDoor(null)
  }

  const getSelectedDoor = useCallback(() => {
    if (selectedType !== "door" || !selectedId) return null
    return doors.find((d) => d.id === selectedId) ?? null
  }, [selectedType, selectedId, doors])

  const handleCanvasClick = () => {
    if (!isDragging) {
      deselect()
    }
    setContextMenu(null)
  }

  const handleContextMenu = (x: number, y: number, targetRoom: RoomEntity | null) => {
    setContextMenu({ x, y, targetRoom })
  }

  if (loading) {
    return (
      <div className="flex h-full w-full flex-col bg-blueprint">
        <div className="panel-neo flex h-14 items-center gap-3 bg-card px-4 rounded-none">
          <div className="skeleton-bar h-5 w-32 rounded" />
          <div className="skeleton-bar h-4 w-20 rounded" />
        </div>
        <div className="flex flex-1">
          <div className="panel-neo flex w-64 flex-col gap-3 bg-sidebar p-4 rounded-none">
            <div className="skeleton-bar h-8 w-full rounded" />
            <div className="skeleton-bar h-6 w-3/4 rounded" />
            <div className="skeleton-bar h-6 w-1/2 rounded" />
            <div className="skeleton-bar mt-4 h-8 w-full rounded" />
            <div className="skeleton-bar h-6 w-2/3 rounded" />
          </div>
          <div className="relative flex-1 overflow-hidden">
            <div className="loading-grid absolute inset-0" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-2 w-2 rounded-full bg-primary/60"
                      style={{
                        animation: `pulse 1s ease-in-out ${i * 0.15}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!layout) {
    return null
  }

  const selectedRoom = getSelectedRoom()
  const selectedFurniture = getSelectedFurniture()
  const selectedDoor = getSelectedDoor()
  const isPropertyPanelOpen = Boolean(selectedRoom || selectedFurniture || selectedDoor)
  const zoomIndicatorRight = isPropertyPanelOpen ? "17rem" : "0.75rem"

  return (
    <div
      className="flex h-full w-full flex-col cursor-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <LayoutHeader layout={layout} onNameChange={handleNameChange} status={socket.status} clientCount={clientCount} myColor={myColor} />

      <SidebarProvider defaultOpen={true} className="flex-1 min-h-0">
        <RoomSidebar
          rooms={rooms}
          furniture={furniture}
          doors={doors}
          selectedId={selectedId}
          selectedType={selectedType}
          expandedRoomIds={expandedRoomIds}
          onToggleExpanded={handleToggleExpanded}
          onAddRoom={() => setAddRoomModalOpen(true)}
          onAddFurniture={handleOpenAddFurnitureModal}
          onAddDoor={handleStartDoorPlacement}
          onRoomNameChange={handleRoomNameChange}
          onSelectFurniture={handleSelectFurniture}
          onSelectDoor={handleSelectDoor}
        />
        <SidebarInset className="flex flex-col relative overflow-hidden">
          <div
            className="relative flex-1"
            onClick={handleClick}
            onMouseEnter={() => setIsOverCanvas(true)}
            onMouseLeave={() => setIsOverCanvas(false)}
          >
            <RoomCanvas
              ref={roomCanvasRef}
              roomCode={layout.roomCode}
              rooms={rooms}
              furniture={furniture}
              doors={doors}
              selectedId={selectedId}
              selectedType={selectedType}
              draggingRoomId={draggingRoomId}
              draggingFurnitureId={draggingFurnitureId}
              draggingDoorId={draggingDoorId}
              draggingFurnitureOriginalRoomId={draggingFurnitureOriginalRoomId}
              draggingFurniturePendingRoomId={draggingFurniturePendingRoomId}
              placingDoor={placingDoor}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onDragUpdate={updateDragPosition}
              onCanvasClick={handleCanvasClick}
              onContextMenu={handleContextMenu}
              onCursorModeChange={setCursorMode}
              onDoorPlace={handleDoorPlace}
              onDoorPlaceCancel={handleDoorPlaceCancel}
              checkRoomCollision={checkRoomCollision}
              checkFurnitureCollision={checkFurnitureCollision}
              onZoomChange={handleZoomChange}
            />

            {contextMenu && (
              <CanvasContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                targetRoom={contextMenu.targetRoom}
                onAddRoom={() => {
                  const worldPos = roomCanvasRef.current?.screenToWorld(contextMenu.x, contextMenu.y)
                  if (worldPos) setRoomSpawnPosition(worldPos)
                  setAddRoomModalOpen(true)
                }}
                onAddFurniture={handleOpenAddFurnitureModal}
                onAddDoor={handleStartDoorPlacement}
                onClose={() => setContextMenu(null)}
              />
            )}

            <div className="pointer-events-none absolute inset-0">
              <CursorCanvas cursors={cursors} />
              {clicks.map((click) => (
                <ClickRipple key={click.id} click={click} />
              ))}
            </div>


            {zoomPercent !== null && (
              <div
                className={`pointer-events-none absolute top-3 z-20 transition-opacity duration-300 ${
                  showZoomIndicator ? "opacity-100" : "opacity-0"
                }`}
                style={{ right: zoomIndicatorRight }}
              >
                <div className="panel-neo bg-card px-2.5 py-1 text-xs font-medium text-foreground">
                  {zoomPercent}%
                </div>
              </div>
            )}
          </div>

          <PropertyPanel
            selectedRoom={selectedRoom}
            selectedFurniture={selectedFurniture}
            selectedDoor={selectedDoor}
            onRoomUpdate={updateRoomWithDoorResnap}
            onFurnitureUpdate={updateFurniture}
            onDoorUpdate={updateDoor}
            onRoomDelete={handleDeleteRoom}
            onFurnitureDelete={handleDeleteFurniture}
            onDoorDelete={handleDeleteDoor}
          />
        </SidebarInset>
      </SidebarProvider>

      <LocalCursor color={myColor} x={localCursor.x} y={localCursor.y} cursorType={isOverCanvas ? cursorMode : "pointer"} />

      <AddRoomModal open={addRoomModalOpen} onOpenChange={setAddRoomModalOpen} onAdd={handleAddRoom} />

      <AddFurnitureModal
        open={addFurnitureModalOpen}
        roomId={addFurnitureRoomId}
        onOpenChange={setAddFurnitureModalOpen}
        onAdd={handleAddFurniture}
      />
    </div>
  )
}
