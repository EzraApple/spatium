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
  DoorEntity,
  ShapeTemplate,
  FurnitureType,
  FurnitureShapeTemplate,
  HingeSide,
} from "@apartment-planner/shared"
import { shapeToVertices, feetToEighths, furnitureShapeToVertices, inchesToEighths } from "@apartment-planner/shared"

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
  const [placingDoor, setPlacingDoor] = useState<{
    roomId: string
    doorWidth: number
    hingeSide: HingeSide
  } | null>(null)

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
    if (!selectedId || !selectedType) return

    if (selectedType === "furniture") {
      const f = furniture.find((item) => item.id === selectedId)
      if (f) {
        setExpandedRoomIds((prev) => new Set([...prev, f.roomId]))
      }
    } else if (selectedType === "door") {
      const d = doors.find((item) => item.id === selectedId)
      if (d) {
        setExpandedRoomIds((prev) => new Set([...prev, d.roomId]))
      }
    }
  }, [selectedId, selectedType, furniture, doors])

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

  const handleSelectDoor = (doorId: string) => {
    select(doorId, "door")
    const d = doors.find((item) => item.id === doorId)
    if (d) {
      setExpandedRoomIds((prev) => new Set([...prev, d.roomId]))
    }
  }

  const handleStartDoorPlacement = (roomId: string) => {
    setPlacingDoor({
      roomId,
      doorWidth: inchesToEighths(36),
      hingeSide: "left",
    })
    setExpandedRoomIds((prev) => new Set([...prev, roomId]))
  }

  const handleDoorPlace = (roomId: string, wallIndex: number, positionOnWall: number) => {
    if (!placingDoor) return

    const door: DoorEntity = {
      type: "door",
      id: crypto.randomUUID(),
      name: "Door",
      roomId,
      wallIndex,
      positionOnWall,
      width: placingDoor.doorWidth,
      hingeSide: placingDoor.hingeSide,
    }

    addDoor(door)
    select(door.id, "door")
    setPlacingDoor(null)
  }

  const handleDoorPlaceCancel = () => {
    setPlacingDoor(null)
  }

  const handleDeleteDoor = (doorId: string) => {
    deleteDoor(doorId)
    deselect()
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
  const selectedDoor = getSelectedDoor()

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
              roomCode={layout.roomCode}
              rooms={rooms}
              furniture={furniture}
              doors={doors}
              selectedId={selectedId}
              selectedType={selectedType}
              draggingRoomId={draggingRoomId}
              draggingFurnitureId={draggingFurnitureId}
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
            />

            {contextMenu && (
              <CanvasContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                targetRoom={contextMenu.targetRoom}
                onAddRoom={() => setAddRoomModalOpen(true)}
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

            <ConnectionStatus status={cursorStatus} clientCount={clientCount} myColor={myColor} />
          </div>

          <PropertyPanel
            selectedRoom={selectedRoom}
            selectedFurniture={selectedFurniture}
            selectedDoor={selectedDoor}
            onRoomUpdate={updateRoom}
            onFurnitureUpdate={updateFurniture}
            onDoorUpdate={updateDoor}
            onRoomDelete={handleDeleteRoom}
            onFurnitureDelete={handleDeleteFurniture}
            onDoorDelete={handleDeleteDoor}
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
