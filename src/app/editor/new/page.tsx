"use client";

import { useState, useEffect, useRef } from "react";
import { EditorHeader } from "../components/editor-header";
import { EditorSidebar } from "../components/editor-sidebar";
import { EditorCanvas, type EditorCanvasRef } from "../components/editor-canvas";
import { RoomCreationModal } from "../components/room-creation-modal";
import type { Room, Point, FurnitureItem, FurnitureDimensions } from "../types";
import { createRoom, ensureRoomsHaveFurniture } from "../lib/room";
import { layoutStorage, createAutoSave } from "~/lib/layout-storage";
import { useAuth } from "~/hooks/use-auth";
import { useLayoutOperations } from "~/hooks/use-layout-operations";
import type { FurnitureConfig } from "../lib/furniture";

export default function NewEditorPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [layoutTitle, setLayoutTitle] = useState("Untitled Layout");
  const { isAuthenticated } = useAuth();
  const { handleAuthSuccess } = useLayoutOperations();
  const canvasRef = useRef<EditorCanvasRef>(null);

  // Track authentication state changes
  useEffect(() => {
    console.log("🔐 Authentication state changed:", isAuthenticated);
  }, [isAuthenticated]);

  const selectedRoom = selectedRoomId ? rooms.find(r => r.id === selectedRoomId) : null;

  // Load from localStorage on mount
  useEffect(() => {
    console.log("🏗️ NewEditorPage: Loading from localStorage");
    const stored = layoutStorage.getFromLocal();
    if (stored) {
      console.log("📦 Found existing layout:", { 
        title: stored.title, 
        roomCount: stored.rooms.length,
        hasUnsavedChanges: stored.hasUnsavedChanges 
      });
      // Ensure all rooms have furniture property
      const roomsWithFurniture = ensureRoomsHaveFurniture(stored.rooms);
      setRooms(roomsWithFurniture);
      setHasUnsavedChanges(stored.hasUnsavedChanges);
      setLayoutTitle(stored.title);
    } else {
      console.log("🆕 Creating new empty layout");
      // Create empty layout
      const emptyLayout = layoutStorage.saveToLocal({
        title: "Untitled Layout",
        rooms: [],
        metadata: {
          createdAt: new Date(),
          lastModified: new Date(),
          version: 1,
        },
      });
      setRooms(emptyLayout.rooms);
      setLayoutTitle(emptyLayout.title);
    }
  }, []);

  // Set up auto-save for authenticated users
  useEffect(() => {
    if (!isAuthenticated) return;

    const { triggerAutoSave, cleanup } = createAutoSave(
      async (layout) => {
        // TODO: Implement save to database
        console.log("Auto-saving layout:", layout);
        // Don't show toast for auto-save in new layouts since they're not persisted yet
      },
      isAuthenticated
    );

    return cleanup;
  }, [isAuthenticated]);

  // Update localStorage whenever rooms change
  useEffect(() => {
    if (rooms.length > 0 || layoutStorage.hasTemporaryLayout()) {
      console.log("🏠 Rooms changed, updating localStorage:", rooms.length);
      layoutStorage.updateRooms(rooms);
      setHasUnsavedChanges(true);
    }
  }, [rooms]);

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

  const handleTitleChange = (newTitle: string) => {
    console.log("✏️ Title change requested:", newTitle);
    setLayoutTitle(newTitle);
    layoutStorage.updateTitle(newTitle);
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    console.log("💾 Save button clicked", { isAuthenticated, hasUnsavedChanges });
    if (!isAuthenticated) {
      console.log("❌ User not authenticated, this should trigger auth modal");
      return;
    }
    // For authenticated users, this will be handled by transferring to database
    console.log("✅ User is authenticated, manual save not needed (will auto-transfer)");
  };

  const handleShare = () => {
    console.log("🔗 Share button clicked", { isAuthenticated });
    if (!isAuthenticated) {
      console.log("❌ User not authenticated, this should trigger auth modal");
      return;
    }
    console.log("✅ User is authenticated, showing share functionality");
    // TODO: Implement sharing functionality
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
        onTitleChange={handleTitleChange}
        onSave={handleSave}
        onShare={handleShare}
        onAuthSuccess={handleAuthSuccess}
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