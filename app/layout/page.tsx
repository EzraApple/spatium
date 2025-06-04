// app/layout/page.tsx (or wherever your page component is)
"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ArrowLeft,
  Grid3X3,
  Save,
  Share,
  Users,
  Plus,
  ChevronDown,
  Armchair,
  MoreHorizontal,
  Copy,
  Check,
  Minus,
  Eye,
  EyeOff,
} from "lucide-react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { Suspense, useState, useRef, useEffect } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import RoomEditor from "./components/room-editor"
// Import the new RoomDisplayCanvas (assuming you named the file room-canvas.tsx)
import RoomCanvas from "./components/room-canvas"
import FurnitureEditor from "./components/furniture-editor"
import type { Layout, LayoutRoom } from "./types/layout"
import { createEmptyLayout, createLayoutRoom } from "./types/layout"
import type { RoomShape } from "./components/room-editor"
import type { FurnitureItem, FurnitureType } from "./components/furniture-editor"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import Loading from "./loading"

function LayoutEditorContent() {
  const searchParams = useSearchParams()
  const layoutName = searchParams.get("name") || "Untitled Layout"
  const layoutCode = searchParams.get("code") || null
  const router = useRouter()

  // State to track if we're on the client side
  const [isClient, setIsClient] = useState(false)

  // Set client state after hydration
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Redirect to new-layout if no code is provided (only on client)
  useEffect(() => {
    if (isClient && !layoutCode) {
      router.push("/new-layout")
      return
    }
  }, [layoutCode, router, isClient])

  // Convex mutations
  const updateLayoutInfoMutation = useMutation(api.layouts.updateLayoutInfo)
  const addRoomMutation = useMutation(api.rooms.addRoom)
  const updateRoomMutation = useMutation(api.rooms.updateRoom)
  const addFurnitureMutation = useMutation(api.furniture.addFurniture)
  const updateRoomFurnitureMutation = useMutation(api.furniture.updateRoomFurniture)
  const selectFurnitureMutation = useMutation(api.furniture.selectFurniture)
  const deselectFurnitureMutation = useMutation(api.furniture.deselectFurniture)
  const updateFurniturePositionMutation = useMutation(api.furniture.updateFurniturePosition)
  const deleteFurnitureMutation = useMutation(api.furniture.deleteFurniture)

  // Convex queries
  const existingLayout = useQuery(api.layouts.getLayoutByCode, 
    layoutCode ? { code: layoutCode } : "skip"
  )

  // Layout state
  const [layout, setLayout] = useState<Layout>(() => createEmptyLayout(layoutName))
  const [layoutId, setLayoutId] = useState<Id<"layouts"> | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  
  // Temporary states (not stored in layout)
  const [showRoomEditor, setShowRoomEditor] = useState(false)
  const [roomToEdit, setRoomToEdit] = useState<RoomShape | null>(null)
  const [showFurnitureEditor, setShowFurnitureEditor] = useState(false)
  const [furnitureRoomId, setFurnitureRoomId] = useState<string | null>(null)
  const [furnitureBeingPlaced, setFurnitureBeingPlaced] = useState<FurnitureItem | null>(null)
  
  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editingTitle, setEditingTitle] = useState(layout.title)
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Copy state
  const [isCopied, setIsCopied] = useState(false)

  // Code blur state
  const [isCodeBlurred, setIsCodeBlurred] = useState(true)

  // Delete confirmation state
  const [furnitureToDelete, setFurnitureToDelete] = useState<{
    furnitureId: string
    furnitureName: string
    roomId: string
  } | null>(null)

  // Initialize layout from database if code is provided
  useEffect(() => {
    if (existingLayout && layoutCode) {
      // Convert database layout to local layout format
      const convertedLayout: Layout = {
        id: existingLayout._id,
        name: existingLayout.name,
        title: existingLayout.title,
        code: existingLayout.code,
        createdAt: new Date(existingLayout.createdAt),
        updatedAt: new Date(existingLayout.updatedAt),
        rooms: existingLayout.rooms.map(room => ({
          ...room,
          furniture: room.furniture.map(furniture => ({
            ...furniture,
            type: furniture.type as FurnitureType
          }))
        }))
      }
      setLayout(convertedLayout)
      setLayoutId(existingLayout._id)
      setEditingTitle(existingLayout.title)
    }
  }, [existingLayout, layoutCode])

  const selectedRoom = layout.rooms.find(room => room.id === selectedRoomId) || null

  const handleTitleDoubleClick = () => {
    setIsEditingTitle(true)
    setEditingTitle(layout.title)
    setTimeout(() => {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    }, 0)
  }

  const handleTitleSave = async () => {
    const trimmedTitle = editingTitle.trim() || "Untitled Layout"
    setLayout(prevLayout => ({
      ...prevLayout,
      title: trimmedTitle,
      updatedAt: new Date()
    }))
    setIsEditingTitle(false)

    // Update in database
    if (layoutId) {
      try {
        await updateLayoutInfoMutation({
          id: layoutId,
          title: trimmedTitle
        })
      } catch (error) {
        console.error("Failed to update layout title:", error)
      }
    }
  }

  const handleTitleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      handleTitleSave()
    } else if (event.key === "Escape") {
      setEditingTitle(layout.title)
      setIsEditingTitle(false)
    }
  }

  const handleTitleBlur = () => {
    handleTitleSave()
  }

  const handleCreateRoom = () => {
    setRoomToEdit(null)
    setShowRoomEditor(true)
  }

  const handleEditRoom = (room: LayoutRoom) => {
    // Convert LayoutRoom to RoomShape for the editor
    const roomShape: RoomShape = {
      id: room.id,
      name: room.name,
      vertices: room.vertices,
      segments: room.segments,
      doors: room.doors
    }
    setRoomToEdit(roomShape)
    setShowRoomEditor(true)
  }

  const handleAddFurniture = (roomId: string) => {
    setFurnitureRoomId(roomId)
    setShowFurnitureEditor(true)
  }

  const handlePlaceFurniture = (furniture: FurnitureItem) => {
    if (!furnitureRoomId) return
    setFurnitureBeingPlaced(furniture)
  }

  const handleConfirmFurniturePlacement = async (placedFurniture: FurnitureItem) => {
    if (!furnitureRoomId || !layoutId) return
    
    // Update local state
    setLayout(prevLayout => ({
      ...prevLayout,
      updatedAt: new Date(),
      rooms: prevLayout.rooms.map(room => 
        room.id === furnitureRoomId 
          ? { ...room, furniture: [...room.furniture, placedFurniture] }
          : room
      )
    }))
    
    // Update database
    try {
      await addFurnitureMutation({
        layoutId,
        roomId: furnitureRoomId,
        furniture: placedFurniture
      })
    } catch (error) {
      console.error("Failed to add furniture:", error)
    }
    
    setFurnitureBeingPlaced(null)
  }

  const handleCancelFurniturePlacement = () => {
    setFurnitureBeingPlaced(null)
  }

  const handleUpdateFurniture = async (updatedFurniture: FurnitureItem[]) => {
    if (!selectedRoomId || !layoutId) return
    
    // Update local state
    setLayout(prevLayout => ({
      ...prevLayout,
      updatedAt: new Date(),
      rooms: prevLayout.rooms.map(room => 
        room.id === selectedRoomId 
          ? { ...room, furniture: updatedFurniture }
          : room
      )
    }))

    // Update database
    try {
      await updateRoomFurnitureMutation({
        layoutId,
        roomId: selectedRoomId,
        furniture: updatedFurniture
      })
    } catch (error) {
      console.error("Failed to update furniture:", error)
    }
  }

  const handleEnterPlacementMode = (furniture: FurnitureItem) => {
    setFurnitureBeingPlaced(furniture)
  }

  const handleUpdateFurnitureBeingPlaced = (updatedFurniture: FurnitureItem) => {
    setFurnitureBeingPlaced(updatedFurniture)
  }

  const handleSelectFurniture = async (furnitureId: string) => {
    if (!layoutId || !selectedRoomId) return

    try {
      await selectFurnitureMutation({
        layoutId,
        roomId: selectedRoomId,
        furnitureId
      })
    } catch (error) {
      console.error("Failed to select furniture:", error)
    }
  }

  const handleDeselectFurniture = async (furnitureId: string) => {
    if (!layoutId || !selectedRoomId) return

    try {
      await deselectFurnitureMutation({
        layoutId,
        roomId: selectedRoomId,
        furnitureId
      })
    } catch (error) {
      console.error("Failed to deselect furniture:", error)
    }
  }

  const handleUpdateFurniturePosition = async (furnitureId: string, x: number, y: number, rotation?: 0 | 90 | 180 | 270) => {
    if (!layoutId || !selectedRoomId) return

    try {
      await updateFurniturePositionMutation({
        layoutId,
        roomId: selectedRoomId,
        furnitureId,
        x,
        y,
        rotation
      })
    } catch (error) {
      console.error("Failed to update furniture position:", error)
    }
  }

  const handleSaveRoom = async (savedRoom: RoomShape) => {
    if (!layoutId) return

    const isNewRoom = !roomToEdit || !layout.rooms.find(room => room.id === savedRoom.id)
    
    // Update local state
    setLayout(prevLayout => {
      const newLayout = { ...prevLayout, updatedAt: new Date() }
      
      if (roomToEdit && roomToEdit.id === savedRoom.id) {
        // Update existing room
        newLayout.rooms = prevLayout.rooms.map(room => 
          room.id === savedRoom.id 
            ? { ...room, name: savedRoom.name, vertices: savedRoom.vertices, segments: savedRoom.segments, doors: savedRoom.doors }
            : room
        )
        
        // Update selected room if it's the one being edited
        if (selectedRoomId === savedRoom.id) {
          setSelectedRoomId(savedRoom.id)
        }
      } else {
        // Add new room using the helper function
        const newLayoutRoom = createLayoutRoom(savedRoom.name, savedRoom.vertices, savedRoom.segments, savedRoom.doors)
        newLayout.rooms = [...prevLayout.rooms, newLayoutRoom]
        setSelectedRoomId(newLayoutRoom.id) // Select the newly created room
      }
      
      return newLayout
    })

    // Update database
    try {
      if (isNewRoom) {
        const newLayoutRoom = createLayoutRoom(savedRoom.name, savedRoom.vertices, savedRoom.segments, savedRoom.doors)
        await addRoomMutation({
          layoutId,
          room: newLayoutRoom
        })
      } else {
        await updateRoomMutation({
          layoutId,
          roomId: savedRoom.id,
          updates: {
            name: savedRoom.name,
            vertices: savedRoom.vertices,
            segments: savedRoom.segments,
            doors: savedRoom.doors
          }
        })
      }
    } catch (error) {
      console.error("Failed to save room:", error)
    }
    
    setRoomToEdit(null)
    setShowRoomEditor(false)
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(layout.code)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000) // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  const handleToggleCodeBlur = () => {
    setIsCodeBlurred(!isCodeBlurred)
  }

  const handleDeleteFurniture = (furnitureId: string, furnitureName: string, roomId: string) => {
    setFurnitureToDelete({ furnitureId, furnitureName, roomId })
  }

  const handleConfirmDeleteFurniture = async () => {
    if (!furnitureToDelete || !layoutId) return

    // Update local state - remove furniture from the room
    setLayout(prevLayout => ({
      ...prevLayout,
      updatedAt: new Date(),
      rooms: prevLayout.rooms.map(room => 
        room.id === furnitureToDelete.roomId 
          ? { ...room, furniture: room.furniture.filter(f => f.id !== furnitureToDelete.furnitureId) }
          : room
      )
    }))

    // Update database
    try {
      await deleteFurnitureMutation({
        layoutId,
        roomId: furnitureToDelete.roomId,
        furnitureId: furnitureToDelete.furnitureId
      })
    } catch (error) {
      console.error("Failed to delete furniture:", error)
    }

    setFurnitureToDelete(null)
  }

  const handleCancelDeleteFurniture = () => {
    setFurnitureToDelete(null)
  }

  // Show loading state until client is ready or if redirecting
  if (!isClient || !layoutCode) {
    return <Loading />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <div className="flex items-center space-x-2">
              <Grid3X3 className="h-5 w-5 text-primary" />
              {isEditingTitle ? (
                <Input
                  ref={titleInputRef}
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={handleTitleKeyDown}
                  onBlur={handleTitleBlur}
                  className="text-lg font-semibold bg-transparent border-none p-0 h-auto focus:ring-1 focus:ring-primary"
                  style={{ width: `${Math.max(editingTitle.length, 10)}ch` }}
                />
              ) : (
                <div className="flex items-center space-x-2">
                  <h1 
                    className="text-lg font-semibold cursor-pointer hover:text-primary transition-colors"
                    onDoubleClick={handleTitleDoubleClick}
                    title="Double-click to edit"
                  >
                    {layout.title}
                  </h1>
                  <Badge variant="secondary" className="text-xs">
                    Saved
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleToggleCodeBlur}
                className="h-8 w-8 p-0"
              >
                {isCodeBlurred ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
              <span className={`font-bold text-lg transition-all duration-200 ${isCodeBlurred ? 'blur-xl select-none' : ''}`}>
                {layout.code}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCopyCode}
                className="h-8 w-8 p-0"
              >
                {isCopied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout Editor */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar */}
        <div className="w-64 border-r bg-muted/30 p-4 overflow-y-auto">
          <div className="space-y-4">
            {/* Rooms Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Rooms</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCreateRoom}
                  className="h-7 px-2"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>

              {layout.rooms.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  <Grid3X3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No rooms yet</p>
                  <p className="text-xs">
                    Click "Add" to create your first room
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {layout.rooms.map((room) => (
                    <div key={room.id} className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Button
                          variant={
                            selectedRoomId === room.id
                              ? "secondary"
                              : "ghost"
                          }
                          size="sm"
                          className="flex-1 justify-start h-8"
                          onClick={() =>
                            setSelectedRoomId(
                              selectedRoomId === room.id ? null : room.id,
                            )
                          }
                        >
                          <div className="w-3 h-3 rounded-sm bg-primary/20 mr-2"></div>
                          {room.name}
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditRoom(room)}>
                              <Grid3X3 className="h-3 w-3 mr-2" />
                              Edit Room
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {selectedRoomId === room.id && (
                        <div className="ml-4 space-y-1">
                          {/* Furniture List */}
                          {room.furniture.map((furniture) => (
                            <div
                              key={furniture.id}
                              className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1"
                            >
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-primary/60"></div>
                                <span className="truncate">{furniture.name}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="text-muted-foreground text-[10px]">
                                  {furniture.type === "circular-table" 
                                    ? `${furniture.diameter}"⌀`
                                    : furniture.depth
                                    ? `${furniture.length}" × ${furniture.width}" × ${furniture.depth}"`
                                    : `${furniture.length}" × ${furniture.width}"`}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0 text-muted-foreground hover:text-red-600"
                                  onClick={() => handleDeleteFurniture(furniture.id, furniture.name, room.id)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-7 text-xs"
                            onClick={() => handleAddFurniture(room.id)}
                          >
                            <Armchair className="h-3 w-3 mr-2" />
                            Add Furniture
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative overflow-hidden bg-slate-100">
          {selectedRoom ? (
            <RoomCanvas
              room={selectedRoom}
              furnitureBeingPlaced={furnitureBeingPlaced}
              onConfirmFurniturePlacement={handleConfirmFurniturePlacement}
              onCancelFurniturePlacement={handleCancelFurniturePlacement}
              onUpdateFurniture={handleUpdateFurniture}
              onEnterPlacementMode={handleEnterPlacementMode}
              onUpdateFurnitureBeingPlaced={handleUpdateFurnitureBeingPlaced}
              onSelectFurniture={handleSelectFurniture}
              onDeselectFurniture={handleDeselectFurniture}
              onUpdateFurniturePosition={handleUpdateFurniturePosition}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Grid3X3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Select a room to view it.</p>
                <p className="text-sm">
                  Or, click "Add" in the sidebar to create a new room.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Room Editor Modal */}
      <RoomEditor
        isOpen={showRoomEditor}
        onClose={() => setShowRoomEditor(false)}
        onSave={handleSaveRoom}
        initialRoom={roomToEdit} // This will be RoomShape | null
      />

      {/* Furniture Editor Modal */}
      <FurnitureEditor
        isOpen={showFurnitureEditor}
        onClose={() => setShowFurnitureEditor(false)}
        roomId={furnitureRoomId}
        onPlaceFurniture={handlePlaceFurniture}
      />

      {/* Delete Furniture Confirmation Modal */}
      <Dialog open={!!furnitureToDelete} onOpenChange={(open) => { if (!open) handleCancelDeleteFurniture(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Furniture</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete "{furnitureToDelete?.furnitureName}"?</p>
            <p className="text-sm text-muted-foreground mt-2">This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDeleteFurniture}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteFurniture}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function LayoutEditorPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LayoutEditorContent />
    </Suspense>
  )
}