"use client";

import { useState } from "react";
import { EditorHeader } from "./components/editor-header";
import { EditorSidebar } from "./components/editor-sidebar";
import { EditorCanvas } from "./components/editor-canvas";
import { RoomCreationModal } from "./components/room-creation-modal";
import type { Room, Point } from "./types";
import { createRoom } from "./lib/room";

export default function EditorPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);

  const selectedRoom = selectedRoomId ? rooms.find(r => r.id === selectedRoomId) : null;

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

  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-50">
      {/* Main canvas background */}
      <EditorCanvas 
        room={selectedRoom}
      />
      
      {/* Floating header */}
      <EditorHeader />
      
      {/* Floating sidebar */}
      <EditorSidebar 
        rooms={rooms}
        selectedRoomId={selectedRoomId}
        onAddRoom={handleAddRoom}
        onRoomSelect={handleRoomSelect}
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