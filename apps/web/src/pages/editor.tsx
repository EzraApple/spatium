import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { v4 as uuid } from "uuid"
import { LayoutHeader } from "@/components/layout-header"
import { CursorCanvas } from "@/components/cursor-canvas"
import { LocalCursor } from "@/components/local-cursor"
import { ClickRipple } from "@/components/click-ripple"
import { ConnectionStatus } from "@/components/connection-status"
import { RoomSidebar } from "@/components/room-sidebar"
import { RoomCanvas, type CursorMode } from "@/components/room-canvas"
import { PropertyPanel } from "@/components/property-panel"
import { AddRoomModal } from "@/components/add-room-modal"
import { AddFurnitureModal } from "@/components/add-furniture-modal"
import { CanvasContextMenu } from "@/components/canvas-context-menu"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { useCursorSync } from "@/hooks/use-cursor-sync"
import { useLayoutSync } from "@/hooks/use-layout-sync"
import { useCanvasInteraction } from "@/hooks/use-canvas-interaction"
import { getLayout, updateLayoutName } from "@/lib/api"
import { addVisitedRoom } from "@/lib/visited-rooms"
import type {
  Layout,
  RoomEntity,
  FurnitureEntity,
  ShapeTemplate,
  FurnitureType,
  FurnitureShapeTemplate,
} from "@apartment-planner/shared"
import { shapeToVertices, feetToEighths, furnitureShapeToVertices } from "@apartment-planner/shared"

export function EditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [layout, setLayout] = useState<Layout | null>(null)
  const [loading, setLoading] = useState(true)
  const [localCursor, setLocalCursor] = useState({ x: 0, y: 0 })

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

  const {
    cursors,
    clicks,
    status: cursorStatus,
    myColor,
    clientCount,
    sendCursorMove,
    sendCursorLeave,
    sendClick,
  } = useCursorSync(layout?.roomCode)

  const {
    rooms,
    furniture,
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
  } = useLayoutSync(layout?.roomCode)

  const {
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
  } = useCanvasInteraction({
    rooms,
    furniture,
    onRoomMove: moveRoomLocal,
    onRoomMoveThrottled: moveRoomSync,
    onFurnitureMove: moveFurnitureLocal,
    onFurnitureMoveThrottled: moveFurnitureSync,
  })

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

  const handleNameChange = useCallback(async (name: string) => {
    if (!id) return
    try {
      const updated = await updateLayoutName(id, name)
      setLayout(updated)
    } catch {
    }
  }, [id])

  const handleMouseMove = (e: React.MouseEvent) => {
    setLocalCursor({ x: e.clientX, y: e.clientY })
    sendCursorMove(e.clientX, e.clientY)
  }

  const handleMouseLeave = () => {
    setLocalCursor({ x: 0, y: 0 })
    sendCursorLeave()
  }

  const handleClick = (e: React.MouseEvent) => {
    sendClick(e.clientX, e.clientY)
  }

  const handleAddRoom = (name: string, template: ShapeTemplate) => {
    const vertices = shapeToVertices(template)
    const room: RoomEntity = {
      type: "room",
      id: uuid(),
      name,
      position: { x: feetToEighths(5), y: feetToEighths(5) },
      vertices,
      shapeTemplate: template,
    }
    addRoom(room)
    select(room.id, "room")
    handleMouseDown(room.id, "room", localCursor)
  }

  const handleAddFurniture = (
    roomId: string,
    name: string,
    furnitureType: FurnitureType,
    template: FurnitureShapeTemplate
  ) => {
    const room = rooms.find((r) => r.id === roomId)
    if (!room) return

    let centerX = 0
    let centerY = 0
    if (template.type === "circle") {
      centerX = template.radius
      centerY = template.radius
    } else {
      const vertices = furnitureShapeToVertices(template)
      centerX = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length
      centerY = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length
    }

    const roomCenterX = room.vertices.reduce((sum, v) => sum + v.x, 0) / room.vertices.length
    const roomCenterY = room.vertices.reduce((sum, v) => sum + v.y, 0) / room.vertices.length

    const f: FurnitureEntity = {
      type: "furniture",
      id: uuid(),
      name,
      furnitureType,
      roomId,
      position: {
        x: roomCenterX - centerX,
        y: roomCenterY - centerY,
      },
      shapeTemplate: template,
    }

    addFurniture(f)
    setExpandedRoomIds((prev) => new Set([...prev, roomId]))
    select(f.id, "furniture")
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

  const handleCanvasClick = () => {
    if (!isDragging) {
      deselect()
    }
    setContextMenu(null)
  }

  const handleContextMenu = (x: number, y: number, targetRoom: RoomEntity | null) => {
    setContextMenu({ x, y, targetRoom })
  }

  const handleDeleteRoom = (roomId: string) => {
    deleteRoom(roomId)
    deselect()
  }

  const handleDeleteFurniture = (furnitureId: string) => {
    deleteFurniture(furnitureId)
    deselect()
  }

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-blueprint">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!layout) {
    return null
  }

  const selectedRoom = getSelectedRoom()
  const selectedFurniture = getSelectedFurniture()

  return (
    <div
      className="flex h-full w-full flex-col cursor-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <LayoutHeader layout={layout} onNameChange={handleNameChange} />

      <SidebarProvider defaultOpen={true} className="flex-1">
        <RoomSidebar
          rooms={rooms}
          furniture={furniture}
          selectedId={selectedId}
          selectedType={selectedType}
          expandedRoomIds={expandedRoomIds}
          onToggleExpanded={handleToggleExpanded}
          onAddRoom={() => setAddRoomModalOpen(true)}
          onAddFurniture={handleOpenAddFurnitureModal}
          onRoomNameChange={handleRoomNameChange}
          onSelectFurniture={handleSelectFurniture}
        />
        <SidebarInset className="flex flex-col relative">
          <div
            className="relative flex-1"
            onClick={handleClick}
            onMouseEnter={() => setIsOverCanvas(true)}
            onMouseLeave={() => setIsOverCanvas(false)}
          >
            <RoomCanvas
              rooms={rooms}
              furniture={furniture}
              selectedId={selectedId}
              selectedType={selectedType}
              draggingRoomId={draggingRoomId}
              draggingFurnitureId={draggingFurnitureId}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onDragUpdate={updateDragPosition}
              onCanvasClick={handleCanvasClick}
              onContextMenu={handleContextMenu}
              onCursorModeChange={setCursorMode}
              checkRoomCollision={checkRoomCollision}
              checkFurnitureCollision={checkFurnitureCollision}
            />

            {contextMenu && (
              <CanvasContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                targetRoom={contextMenu.targetRoom}
                onAddRoom={() => setAddRoomModalOpen(true)}
                onAddFurniture={handleOpenAddFurnitureModal}
                onClose={() => setContextMenu(null)}
              />
            )}

            <div className="pointer-events-none absolute inset-0">
              <CursorCanvas cursors={cursors} />
              {clicks.map((click) => (
                <ClickRipple key={click.id} click={click} />
              ))}
            </div>

            <ConnectionStatus status={cursorStatus} clientCount={clientCount} myColor={myColor} />
          </div>

          <PropertyPanel
            selectedRoom={selectedRoom}
            selectedFurniture={selectedFurniture}
            onRoomUpdate={updateRoom}
            onFurnitureUpdate={updateFurniture}
            onRoomDelete={handleDeleteRoom}
            onFurnitureDelete={handleDeleteFurniture}
          />
        </SidebarInset>
      </SidebarProvider>

      <LocalCursor color={myColor} x={localCursor.x} y={localCursor.y} cursorType={isOverCanvas ? cursorMode : "pointer"} />

      <AddRoomModal
        open={addRoomModalOpen}
        onOpenChange={setAddRoomModalOpen}
        onAdd={handleAddRoom}
      />

      <AddFurnitureModal
        open={addFurnitureModalOpen}
        roomId={addFurnitureRoomId}
        onOpenChange={setAddFurnitureModalOpen}
        onAdd={handleAddFurniture}
      />
    </div>
  )
}
