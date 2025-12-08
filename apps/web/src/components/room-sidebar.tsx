import { Plus } from "lucide-react"
import type { RoomEntity } from "@apartment-planner/shared"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { getRoomShapeIcon } from "@/components/room-shape-icons"

type RoomSidebarProps = {
  rooms: RoomEntity[]
  selectedRoomId: string | null
  onRoomSelect: (id: string) => void
  onAddRoom: () => void
  onEditRoom: (id: string) => void
  onDeleteRoom: (id: string) => void
}

export function RoomSidebar({
  rooms,
  selectedRoomId,
  onRoomSelect,
  onAddRoom,
  onEditRoom,
  onDeleteRoom,
}: RoomSidebarProps) {
  return (
    <Sidebar collapsible="none" className="border-r border-sidebar-border">
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
                return (
                  <ContextMenu key={room.id}>
                    <ContextMenuTrigger asChild>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          isActive={selectedRoomId === room.id}
                          onClick={() => onRoomSelect(room.id)}
                        >
                          <Icon className="size-4" />
                          <span>{room.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => onEditRoom(room.id)}>
                        Edit Dimensions
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() => onDeleteRoom(room.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        Delete Room
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

