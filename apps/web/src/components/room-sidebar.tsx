import { useState, useRef, useEffect } from "react"
import { Plus, ChevronRight, Circle, Square } from "lucide-react"
import type { RoomEntity, FurnitureEntity } from "@apartment-planner/shared"
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
  selectedId: string | null
  selectedType: "room" | "furniture" | null
  expandedRoomIds: Set<string>
  onToggleExpanded: (roomId: string) => void
  onAddRoom: () => void
  onAddFurniture: (roomId: string) => void
  onRoomNameChange: (roomId: string, name: string) => void
  onSelectFurniture: (furnitureId: string) => void
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
  selectedId,
  selectedType,
  expandedRoomIds,
  onToggleExpanded,
  onAddRoom,
  onAddFurniture,
  onRoomNameChange,
  onSelectFurniture,
}: RoomSidebarProps) {
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

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

  const getFurnitureByRoom = (roomId: string) => {
    return furniture.filter((f) => f.roomId === roomId)
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
                      onClick={() => onAddFurniture(room.id)}
                      title="Add furniture"
                    >
                      <Plus className="h-4 w-4" />
                    </SidebarMenuAction>

                    {isExpanded && roomFurniture.length > 0 && (
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
                      </SidebarMenuSub>
                    )}

                    {isExpanded && roomFurniture.length === 0 && (
                      <SidebarMenuSub>
                        <div className="px-2 py-2 text-xs text-muted-foreground">
                          No furniture. Click + to add.
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
