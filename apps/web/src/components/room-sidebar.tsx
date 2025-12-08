import { useState, useRef, useEffect } from "react"
import { Plus, ChevronRight, Circle, Square, Armchair, DoorOpen } from "lucide-react"
import type { RoomEntity, FurnitureEntity, DoorEntity } from "@apartment-planner/shared"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import { Input } from "@/components/ui/input"
import { getRoomShapeIcon } from "@/components/room-shape-icons"
import { cn } from "@/lib/utils"

type RoomSidebarProps = {
  rooms: RoomEntity[]
  furniture: FurnitureEntity[]
  doors: DoorEntity[]
  selectedId: string | null
  selectedType: "room" | "furniture" | "door" | null
  expandedRoomIds: Set<string>
  onToggleExpanded: (roomId: string) => void
  onAddRoom: () => void
  onAddFurniture: (roomId: string) => void
  onAddDoor: (roomId: string) => void
  onRoomNameChange: (roomId: string, name: string) => void
  onSelectFurniture: (furnitureId: string) => void
  onSelectDoor: (doorId: string) => void
}

function getFurnitureIcon(furnitureType: FurnitureEntity["furnitureType"]) {
  if (furnitureType === "circle-table") {
    return Circle
  }
  return Square
}

export function RoomSidebar({
  rooms,
  furniture,
  doors,
  selectedId,
  selectedType,
  expandedRoomIds,
  onToggleExpanded,
  onAddRoom,
  onAddFurniture,
  onAddDoor,
  onRoomNameChange,
  onSelectFurniture,
  onSelectDoor,
}: RoomSidebarProps) {
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [addMenuRoomId, setAddMenuRoomId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const addMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editingRoomId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingRoomId])

  const handleDoubleClick = (room: RoomEntity) => {
    setEditingRoomId(room.id)
    setEditingName(room.name)
  }

  const handleNameSubmit = () => {
    if (editingRoomId && editingName.trim()) {
      onRoomNameChange(editingRoomId, editingName.trim())
    }
    setEditingRoomId(null)
    setEditingName("")
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNameSubmit()
    } else if (e.key === "Escape") {
      setEditingRoomId(null)
      setEditingName("")
    }
  }

  useEffect(() => {
    if (!addMenuRoomId) return

    const handleClickOutside = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddMenuRoomId(null)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAddMenuRoomId(null)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [addMenuRoomId])

  const getFurnitureByRoom = (roomId: string) => {
    return furniture.filter((f) => f.roomId === roomId)
  }

  const getDoorsByRoom = (roomId: string) => {
    return doors.filter((d) => d.roomId === roomId)
  }

  return (
    <Sidebar collapsible="none" className="border-r border-sidebar-border cursor-hidden">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Rooms</SidebarGroupLabel>
          <SidebarGroupAction onClick={onAddRoom} title="Add Room">
            <Plus />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {rooms.length === 0 && (
                <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                  No rooms yet. Click + to add one.
                </div>
              )}
              {rooms.map((room) => {
                const Icon = getRoomShapeIcon(room.shapeTemplate.type)
                const isExpanded = expandedRoomIds.has(room.id)
                const roomFurniture = getFurnitureByRoom(room.id)
                const roomDoors = getDoorsByRoom(room.id)
                const hasContents = roomFurniture.length > 0 || roomDoors.length > 0

                return (
                  <SidebarMenuItem key={room.id}>
                    <SidebarMenuButton
                      isActive={selectedType === "room" && selectedId === room.id}
                      onClick={() => onToggleExpanded(room.id)}
                      onDoubleClick={() => handleDoubleClick(room)}
                    >
                      <ChevronRight
                        className={cn(
                          "size-4 shrink-0 transition-transform",
                          isExpanded && "rotate-90"
                        )}
                      />
                      <Icon className="size-4 shrink-0" />
                      {editingRoomId === room.id ? (
                        <Input
                          ref={inputRef}
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={handleNameSubmit}
                          onKeyDown={handleNameKeyDown}
                          className="h-5 px-1 py-0 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="truncate">{room.name}</span>
                      )}
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      onClick={() => setAddMenuRoomId(addMenuRoomId === room.id ? null : room.id)}
                      title="Add to room"
                    >
                      <Plus className="h-4 w-4" />
                    </SidebarMenuAction>
                    {addMenuRoomId === room.id && (
                      <div
                        ref={addMenuRef}
                        className="absolute right-1 top-8 z-50 min-w-[140px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
                      >
                        <button
                          className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                          onClick={() => {
                            onAddFurniture(room.id)
                            setAddMenuRoomId(null)
                          }}
                        >
                          <Armchair className="h-4 w-4" />
                          Furniture
                        </button>
                        <button
                          className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                          onClick={() => {
                            onAddDoor(room.id)
                            setAddMenuRoomId(null)
                          }}
                        >
                          <DoorOpen className="h-4 w-4" />
                          Door
                        </button>
                      </div>
                    )}

                    {isExpanded && hasContents && (
                      <SidebarMenuSub>
                        {roomFurniture.map((f) => {
                          const FurnitureIcon = getFurnitureIcon(f.furnitureType)
                          return (
                            <SidebarMenuSubItem key={f.id}>
                              <SidebarMenuSubButton
                                isActive={selectedType === "furniture" && selectedId === f.id}
                                onClick={() => onSelectFurniture(f.id)}
                              >
                                <FurnitureIcon className="size-3" />
                                <span className="truncate">{f.name}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )
                        })}
                        {roomDoors.map((d) => (
                          <SidebarMenuSubItem key={d.id}>
                            <SidebarMenuSubButton
                              isActive={selectedType === "door" && selectedId === d.id}
                              onClick={() => onSelectDoor(d.id)}
                            >
                              <DoorOpen className="size-3" />
                              <span className="truncate">{d.name}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    )}

                    {isExpanded && !hasContents && (
                      <SidebarMenuSub>
                        <div className="px-2 py-2 text-xs text-muted-foreground">
                          No items. Click + to add.
                        </div>
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
