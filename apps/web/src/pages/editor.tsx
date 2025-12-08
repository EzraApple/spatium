import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { v4 as uuid } from "uuid"
import { LayoutHeader } from "@/components/layout-header"
import { CursorCanvas } from "@/components/cursor-canvas"
import { LocalCursor } from "@/components/local-cursor"
import { ClickRipple } from "@/components/click-ripple"
import { ConnectionStatus } from "@/components/connection-status"
import { RoomSidebar } from "@/components/room-sidebar"
import { RoomCanvas } from "@/components/room-canvas"
import { AddRoomModal } from "@/components/add-room-modal"
import { EditRoomModal } from "@/components/edit-room-modal"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { useCursorSync } from "@/hooks/use-cursor-sync"
import { useLayoutSync } from "@/hooks/use-layout-sync"
import { useCanvasInteraction } from "@/hooks/use-canvas-interaction"
import { getLayout, updateLayoutName } from "@/lib/api"
import { addVisitedRoom } from "@/lib/visited-rooms"
import type { Layout, RoomEntity, ShapeTemplate } from "@apartment-planner/shared"
import { shapeToVertices, feetToEighths } from "@apartment-planner/shared"

export function EditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [layout, setLayout] = useState<Layout | null>(null)
  const [loading, setLoading] = useState(true)
  const [localCursor, setLocalCursor] = useState({ x: 0, y: 0 })

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<RoomEntity | null>(null)

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
    addRoom,
    updateRoom,
    deleteRoom,
    moveRoomLocal,
    moveRoomSync,
  } = useLayoutSync(layout?.roomCode)

  const {
    selectedRoomId,
    movingRoomId,
    isMoving,
    checkCollision,
    startMoving,
    updatePosition,
    place,
    handleClick: handleInteractionClick,
    handleRoomClick,
    deselect,
  } = useCanvasInteraction({
    rooms,
    onRoomMove: moveRoomLocal,
    onRoomMoveThrottled: moveRoomSync,
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
    handleInteractionClick()
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
    startMoving(room.id)
  }

  const handleRoomContextMenu = (roomId: string, e: React.MouseEvent) => {
    e.preventDefault()
    if (isMoving) {
      place()
    }
    const room = rooms.find((r) => r.id === roomId)
    if (room) {
      setEditingRoom(room)
      setEditModalOpen(true)
    }
  }

  const handleCanvasClick = () => {
    if (!isMoving) {
      deselect()
    }
  }

  const handleEditRoom = (roomId: string) => {
    if (isMoving) {
      place()
    }
    const room = rooms.find((r) => r.id === roomId)
    if (room) {
      setEditingRoom(room)
      setEditModalOpen(true)
    }
  }

  const handleDeleteRoom = (roomId: string) => {
    deleteRoom(roomId)
  }

  const handleSaveRoom = (room: RoomEntity) => {
    updateRoom(room)
    setEditingRoom(null)
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

  return (
    <div className="flex h-full w-full flex-col">
      <LayoutHeader layout={layout} onNameChange={handleNameChange} />

      <SidebarProvider defaultOpen={true} className="flex-1">
        <RoomSidebar
          rooms={rooms}
          selectedRoomId={selectedRoomId}
          onRoomSelect={handleRoomClick}
          onAddRoom={() => setAddModalOpen(true)}
          onEditRoom={handleEditRoom}
          onDeleteRoom={handleDeleteRoom}
        />
        <SidebarInset className="flex flex-col">
          <div
            className="relative flex-1 cursor-hidden"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
          >
            <RoomCanvas
              rooms={rooms}
              selectedRoomId={selectedRoomId}
              movingRoomId={movingRoomId}
              onRoomClick={handleRoomClick}
              onRoomContextMenu={handleRoomContextMenu}
              onPositionUpdate={updatePosition}
              onCanvasClick={handleCanvasClick}
              checkCollision={checkCollision}
            />

            <div className="pointer-events-none absolute inset-0">
              <CursorCanvas cursors={cursors} />
              <LocalCursor color={myColor} x={localCursor.x} y={localCursor.y} />
              {clicks.map((click) => (
                <ClickRipple key={click.id} click={click} />
              ))}
            </div>

            <ConnectionStatus status={cursorStatus} clientCount={clientCount} myColor={myColor} />
          </div>
        </SidebarInset>
      </SidebarProvider>

      <AddRoomModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onAdd={handleAddRoom}
      />

      <EditRoomModal
        room={editingRoom}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSave={handleSaveRoom}
      />
    </div>
  )
}
