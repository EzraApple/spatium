"use client";

import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Plus, Settings } from "lucide-react";
import type { Room } from "../types";
import { getRoomDimensionsDisplay } from "../lib/room";

interface EditorSidebarProps {
  rooms: Room[];
  selectedRoomId: string | null;
  onAddRoom: () => void;
  onRoomSelect: (roomId: string) => void;
}

export function EditorSidebar({ rooms, selectedRoomId, onAddRoom, onRoomSelect }: EditorSidebarProps) {

  const handleFurnitureSelect = (furnitureType: string) => {
    console.log("Furniture selected:", furnitureType);
  };

  const furnitureItems = [
    { name: "Bed", icon: "🛏️" },
    { name: "Sofa", icon: "🛋️" },
    { name: "Table", icon: "🪑" },
    { name: "Desk", icon: "🗃️" },
    { name: "Wardrobe", icon: "🚪" },
    { name: "TV", icon: "📺" },
  ];

  return (
    <Card className="absolute top-20 left-4 w-64 z-10 bg-white/95 backdrop-blur-sm border-slate-200 shadow-md">
      {/* Rooms Section */}
      <div className="p-4 border-b border-slate-200">
        <h3 className="text-sm font-medium text-slate-900 mb-3">Rooms</h3>
        <Button
          onClick={onAddRoom}
          className="w-full mb-3 bg-slate-900 hover:bg-slate-800 text-white"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Room
        </Button>
        <div className="space-y-2">
          {rooms.length === 0 ? (
            <div className="text-xs text-slate-500">
              No rooms created yet
            </div>
          ) : (
            rooms.map((room) => (
              <div
                key={room.id}
                className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                  selectedRoomId === room.id
                    ? 'bg-slate-100 border border-slate-300'
                    : 'hover:bg-slate-50'
                }`}
                onClick={() => onRoomSelect(room.id)}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded border"
                    style={{ backgroundColor: room.color }}
                  />
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {room.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {getRoomDimensionsDisplay(room).width} × {getRoomDimensionsDisplay(room).height}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log("Edit room:", room.id);
                  }}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                >
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Furniture Section */}
      <div className="p-4">
        <h3 className="text-sm font-medium text-slate-900 mb-3">Furniture</h3>
        <div className="grid grid-cols-2 gap-2">
          {furnitureItems.map((item) => (
            <button
              key={item.name}
              onClick={() => handleFurnitureSelect(item.name)}
              className="flex flex-col items-center p-3 border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors"
            >
              <span className="text-lg mb-1">{item.icon}</span>
              <span className="text-xs text-slate-600">{item.name}</span>
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}