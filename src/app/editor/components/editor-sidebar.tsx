"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Plus, Settings, Trash2 } from "lucide-react";
import type { Room, FurnitureDimensions, FurnitureItem } from "../types";
import { getRoomDimensionsDisplay } from "../lib/room";
import { getFurnitureConfigsByType, type FurnitureConfig, FURNITURE_CONFIGS } from "../lib/furniture";
import { FurnitureDimensionModal } from "./furniture-dimension-modal";
import { formatInches } from "../lib/measurement";

interface EditorSidebarProps {
  rooms: Room[];
  selectedRoomId: string | null;
  onAddRoom: () => void;
  onRoomSelect: (roomId: string) => void;
  onFurniturePlace?: (config: FurnitureConfig, dimensions: FurnitureDimensions) => void;
  onFurnitureDelete?: (furnitureId: string) => void;
  onFurnitureEdit?: (furnitureId: string) => void;
}

export function EditorSidebar({ 
  rooms, 
  selectedRoomId, 
  onAddRoom, 
  onRoomSelect,
  onFurniturePlace,
  onFurnitureDelete,
  onFurnitureEdit
}: EditorSidebarProps) {
  const [isDimensionModalOpen, setIsDimensionModalOpen] = useState(false);
  const [selectedFurnitureConfig, setSelectedFurnitureConfig] = useState<FurnitureConfig | null>(null);

  const furnitureConfigsByType = getFurnitureConfigsByType();
  const selectedRoom = selectedRoomId ? rooms.find(r => r.id === selectedRoomId) : null;

  const handleFurnitureSelect = (config: FurnitureConfig) => {
    if (!selectedRoom) {
      console.log("No room selected for furniture placement");
      return;
    }
    
    setSelectedFurnitureConfig(config);
    setIsDimensionModalOpen(true);
  };

  const handleDimensionConfirm = (dimensions: FurnitureDimensions) => {
    if (selectedFurnitureConfig && onFurniturePlace) {
      onFurniturePlace(selectedFurnitureConfig, dimensions);
    }
    setSelectedFurnitureConfig(null);
  };

  const handleDimensionCancel = () => {
    setIsDimensionModalOpen(false);
    setSelectedFurnitureConfig(null);
  };

  return (
    <>
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

        {/* Room Furniture List */}
        {selectedRoom && selectedRoom.furniture && selectedRoom.furniture.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-200">
            <h4 className="text-xs font-medium text-slate-700 mb-2 uppercase tracking-wide">
              Furniture ({selectedRoom.furniture.length})
            </h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {selectedRoom.furniture.map((furniture) => {
                const config = FURNITURE_CONFIGS[furniture.subtype];
                return (
                  <div
                    key={furniture.id}
                    className="group flex items-center justify-between p-2 rounded-md hover:bg-slate-50 text-xs"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm">{config?.icon || '📦'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 truncate">
                          {furniture.name}
                        </div>
                        <div className="text-slate-500">
                          {formatInches(furniture.dimensions.width)} × {formatInches(furniture.dimensions.height)}
                          {furniture.rotation !== 0 && ` • ${furniture.rotation}°`}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onFurnitureEdit && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            onFurnitureEdit(furniture.id);
                          }}
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 hover:bg-blue-50 hover:text-blue-600"
                          title="Edit furniture"
                        >
                          <Settings className="h-3 w-3" />
                        </Button>
                      )}
                      {onFurnitureDelete && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            onFurnitureDelete(furniture.id);
                          }}
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
                          title="Delete furniture"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Furniture Section */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-900">Furniture</h3>
          {!selectedRoom && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
              Select room first
            </span>
          )}
        </div>
        
        {selectedRoom ? (
          <div className="space-y-4">
            {/* Desks */}
            <div>
              <h4 className="text-xs font-medium text-slate-700 mb-2 uppercase tracking-wide">
                Desks
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {furnitureConfigsByType.desk.map((config) => (
                  <button
                    key={config.subtype}
                    onClick={() => handleFurnitureSelect(config)}
                    className="flex flex-col items-center p-2 border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors group"
                    title={config.description}
                  >
                    <span className="text-lg mb-1 group-hover:scale-110 transition-transform">
                      {config.icon}
                    </span>
                    <span className="text-xs text-slate-600 text-center leading-tight">
                      {config.name.replace('Desk', '').trim()}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tables */}
            <div>
              <h4 className="text-xs font-medium text-slate-700 mb-2 uppercase tracking-wide">
                Tables
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {furnitureConfigsByType.table.map((config) => (
                  <button
                    key={config.subtype}
                    onClick={() => handleFurnitureSelect(config)}
                    className="flex flex-col items-center p-2 border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors group"
                    title={config.description}
                  >
                    <span className="text-lg mb-1 group-hover:scale-110 transition-transform">
                      {config.icon}
                    </span>
                    <span className="text-xs text-slate-600 text-center leading-tight">
                      {config.name.replace('Table', '').trim()}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Couches */}
            <div>
              <h4 className="text-xs font-medium text-slate-700 mb-2 uppercase tracking-wide">
                Sofas
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {furnitureConfigsByType.couch.map((config) => (
                  <button
                    key={config.subtype}
                    onClick={() => handleFurnitureSelect(config)}
                    className="flex flex-col items-center p-2 border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors group"
                    title={config.description}
                  >
                    <span className="text-lg mb-1 group-hover:scale-110 transition-transform">
                      {config.icon}
                    </span>
                    <span className="text-xs text-slate-600 text-center leading-tight">
                      {config.name.replace('Sofa', '').trim()}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-500 py-8">
            <div className="text-2xl mb-2">🪑</div>
            <div className="text-xs">Select a room to add furniture</div>
          </div>
        )}
      </div>
    </Card>

    {/* Furniture Dimension Modal */}
    <FurnitureDimensionModal
      isOpen={isDimensionModalOpen}
      furnitureConfig={selectedFurnitureConfig}
      onClose={handleDimensionCancel}
      onConfirm={handleDimensionConfirm}
    />
  </>
  );
}