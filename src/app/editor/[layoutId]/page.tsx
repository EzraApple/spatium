"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { EditorHeader } from "../components/editor-header";
import { EditorSidebar } from "../components/editor-sidebar";
import { EditorCanvas, type EditorCanvasRef } from "../components/editor-canvas";
import { RoomCreationModal } from "../components/room-creation-modal";
import type { Room, Point, FurnitureItem, FurnitureDimensions } from "../types";
import { createRoom, ensureRoomsHaveFurniture } from "../lib/room";
import { api } from "~/trpc/react";
import { useAuth } from "~/hooks/use-auth";
import { toast } from "sonner";
import type { FurnitureConfig } from "../lib/furniture";

export default function LayoutEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const layoutId = params.layoutId as string;

  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [layoutTitle, setLayoutTitle] = useState("");
  const canvasRef = useRef<EditorCanvasRef>(null);

  const selectedRoom = selectedRoomId ? rooms.find(r => r.id === selectedRoomId) : null;

  // Fetch layout data
  const { 
    data: layout, 
    isLoading: layoutLoading, 
    error 
  } = api.layout.getById.useQuery(
    { id: layoutId },
    { 
      enabled: isAuthenticated && !!layoutId,
      retry: false,
    }
  );

  // Update layout mutation
  const updateLayoutMutation = api.layout.update.useMutation({
    onSuccess: (data, variables, context) => {
      // Only show toast for manual saves, not auto-saves
      if (!(context as any)?.isAutoSave) {
        toast.success("Layout saved successfully");
      }
      setHasUnsavedChanges(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save layout");
    },
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth");
    }
  }, [isAuthenticated, authLoading, router]);

  // Load layout data when it arrives
  useEffect(() => {
    if (layout) {
      const layoutData = layout.data as any;
      // Ensure all rooms have furniture property
      const roomsWithFurniture = ensureRoomsHaveFurniture(layoutData.rooms || []);
      setRooms(roomsWithFurniture);
      setLayoutTitle(layout.title);
    }
  }, [layout]);

  // Handle API errors
  useEffect(() => {
    if (error) {
      toast.error("Failed to load layout");
      router.push("/editor");
    }
  }, [error, router]);

  // Auto-save functionality
  useEffect(() => {
    if (!hasUnsavedChanges || !layout) return;

    const timeoutId = setTimeout(() => {
      handleAutoSave();
    }, 5000); // Auto-save after 5 seconds of no changes

    return () => clearTimeout(timeoutId);
  }, [hasUnsavedChanges, rooms, layoutTitle]);

  const handleAutoSave = async () => {
    if (!layout) return;

    const layoutData = {
      id: layout.id,
      title: layoutTitle,
      rooms,
      metadata: {
        createdAt: layout.createdAt,
        lastModified: new Date(),
        version: ((layout.data as any)?.metadata?.version || 0) + 1,
      },
    };

    updateLayoutMutation.mutate({
      id: layout.id,
      title: layoutTitle,
      data: layoutData,
    }, {
      context: { isAutoSave: true } // Mark as auto-save to suppress toast
    });
  };

  // Update hasUnsavedChanges when rooms change
  useEffect(() => {
    if (layout && rooms !== (layout.data as any)?.rooms) {
      setHasUnsavedChanges(true);
    }
  }, [rooms, layout]);

  const handleSave = async () => {
    if (!layout) return;

    const layoutData = {
      id: layout.id,
      title: layoutTitle,
      rooms,
      metadata: {
        createdAt: layout.createdAt,
        lastModified: new Date(),
        version: ((layout.data as any)?.metadata?.version || 0) + 1,
      },
    };

    updateLayoutMutation.mutate({
      id: layout.id,
      title: layoutTitle,
      data: layoutData,
    });
  };

  const handleAddRoom = () => {
    setIsCreationModalOpen(true);
  };

  const handleCreateRoom = (roomData: {
    name: string;
    shapeType: 'box' | 'L-shape' | 'U-shape' | 'T-shape';
    vertices: Point[];
    boundingBox: { widthInches: number; heightInches: number };
    doors: Array<{
      id: string;
      width: number;
      wallIndex: number;
      position: number;
      openDirection: 'inward' | 'outward';
      swingAngle: number;
      pivotSide: 'left' | 'right';
    }>;
  }) => {
    const newRoom = createRoom(
      roomData.name,
      roomData.shapeType,
      roomData.vertices,
      roomData.doors,
      rooms
    );

    setRooms(prev => {
      const updatedRooms = [...prev, newRoom];
      console.log(`Created room "${newRoom.name}" - ${roomData.shapeType} shape with ${roomData.doors.length} doors`);
      return updatedRooms;
    });
    setSelectedRoomId(newRoom.id);
  };

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
  };

  // Furniture management functions
  const handleFurnitureAdd = (furniture: FurnitureItem) => {
    if (!selectedRoomId) return;
    
    setRooms(prev => prev.map(room => 
      room.id === selectedRoomId 
        ? { ...room, furniture: [...room.furniture, furniture] }
        : room
    ));
    setHasUnsavedChanges(true);
    console.log(`Added furniture "${furniture.name}" to room`);
  };

  const handleFurnitureUpdate = (updatedFurniture: FurnitureItem) => {
    if (!selectedRoomId) return;
    
    setRooms(prev => prev.map(room => 
      room.id === selectedRoomId 
        ? { 
            ...room, 
            furniture: room.furniture.map(f => 
              f.id === updatedFurniture.id ? updatedFurniture : f
            )
          }
        : room
    ));
    setHasUnsavedChanges(true);
    console.log(`Updated furniture "${updatedFurniture.name}"`);
  };

  const handleFurnitureRemove = (furnitureId: string) => {
    if (!selectedRoomId) return;
    
    setRooms(prev => prev.map(room => 
      room.id === selectedRoomId 
        ? { ...room, furniture: room.furniture.filter(f => f.id !== furnitureId) }
        : room
    ));
    setHasUnsavedChanges(true);
    console.log(`Removed furniture with ID: ${furnitureId}`);
  };

  const handleFurniturePlace = (config: FurnitureConfig, dimensions: FurnitureDimensions) => {
    if (canvasRef.current) {
      canvasRef.current.startFurniturePlacement(config, dimensions);
    }
  };

  // Show loading state
  if (authLoading || layoutLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading layout...</div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-50">
      {/* Main canvas background */}
      <EditorCanvas 
        ref={canvasRef}
        room={selectedRoom}
        onFurnitureAdd={handleFurnitureAdd}
        onFurnitureUpdate={handleFurnitureUpdate}
        onFurnitureRemove={handleFurnitureRemove}
      />
      
      {/* Floating header */}
      <EditorHeader 
        hasUnsavedChanges={hasUnsavedChanges}
        layoutTitle={layoutTitle}
        onTitleChange={setLayoutTitle}
        onSave={handleSave}
        isAuthenticated={true}
      />
      
      {/* Floating sidebar */}
      <EditorSidebar 
        rooms={rooms}
        selectedRoomId={selectedRoomId}
        onAddRoom={handleAddRoom}
        onRoomSelect={handleRoomSelect}
        onFurniturePlace={handleFurniturePlace}
        onFurnitureDelete={handleFurnitureRemove}
        onFurnitureEdit={(furnitureId) => {
          // Start moving the furniture when edit is clicked
          if (canvasRef.current) {
            canvasRef.current.startFurnitureMoving(furnitureId);
          }
        }}
      />

      {/* Room creation modal */}
      <RoomCreationModal 
        isOpen={isCreationModalOpen}
        onClose={() => setIsCreationModalOpen(false)}
        onCreateRoom={handleCreateRoom}
      />
    </div>
  );
}