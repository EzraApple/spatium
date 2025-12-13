import { useState, useRef, useEffect } from "react"
import { Plus, ChevronRight, Circle, Square, Armchair, DoorOpen } from "lucide-react"
import type { RoomEntity, FurnitureEntity, DoorEntity } from "@apartment-planner/shared"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
import { SocialIcons } from "./social-icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { getRoomShapeIcon } from "./room-shape-icons"
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
  onShowShortcuts: () => void
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
  onShowShortcuts,
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

  const getDoorsByRoom = (roomId: string) => {
    return doors.filter((d) => d.roomId === roomId)
  }

  return (
    <Sidebar collapsible="none" className="border-r-2 border-sidebar-border cursor-hidden">
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
                const isRoomSelected = selectedType === "room" && selectedId === room.id
                const roomFurniture = getFurnitureByRoom(room.id)
                const roomDoors = getDoorsByRoom(room.id)
                const hasContents = roomFurniture.length > 0 || roomDoors.length > 0

                return (
                  <SidebarMenuItem key={room.id}>
                    <SidebarMenuButton
                      isActive={isRoomSelected}
                      onClick={() => onToggleExpanded(room.id)}
                      onDoubleClick={() => handleDoubleClick(room)}
                      className={cn(
                        isRoomSelected &&
                          "relative after:absolute after:left-0 after:top-1 after:bottom-1 after:w-[3px] after:rounded-r-sm after:bg-ring"
                      )}
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuAction title="Add to room">
                          <Plus className="h-4 w-4" />
                        </SidebarMenuAction>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="right" align="start">
                        <DropdownMenuItem onSelect={() => onAddFurniture(room.id)}>
                          <Armchair />
                          Furniture
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onAddDoor(room.id)}>
                          <DoorOpen />
                          Door
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {isExpanded && hasContents && (
                      <SidebarMenuSub>
                        {roomFurniture.map((f) => {
                          const FurnitureIcon = getFurnitureIcon(f.furnitureType)
                          const isFurnitureSelected =
                            selectedType === "furniture" && selectedId === f.id
                          return (
                            <SidebarMenuSubItem key={f.id}>
                              <SidebarMenuSubButton
                                isActive={isFurnitureSelected}
                                onClick={() => onSelectFurniture(f.id)}
                                className={cn(
                                  isFurnitureSelected &&
                                    "relative after:absolute after:left-0 after:top-1 after:bottom-1 after:w-[3px] after:rounded-r-sm after:bg-ring"
                                )}
                              >
                                <FurnitureIcon className="size-3" />
                                <span className="truncate">{f.name}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )
                        })}
                        {roomDoors.map((d) => {
                          const isDoorSelected = selectedType === "door" && selectedId === d.id
                          return (
                            <SidebarMenuSubItem key={d.id}>
                              <SidebarMenuSubButton
                                isActive={isDoorSelected}
                                onClick={() => onSelectDoor(d.id)}
                                className={cn(
                                  isDoorSelected &&
                                    "relative after:absolute after:left-0 after:top-1 after:bottom-1 after:w-[3px] after:rounded-r-sm after:bg-ring"
                                )}
                              >
                                <DoorOpen className="size-3" />
                                <span className="truncate">{d.name}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )
                        })}
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
      <SidebarFooter className="items-center border-t-2 border-sidebar-border p-3">
        <SocialIcons onShowShortcuts={onShowShortcuts} />
      </SidebarFooter>
    </Sidebar>
  )
}

