"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { ScrollArea } from "~/components/ui/scroll-area";
import { X, Plus, Trash2 } from "lucide-react";
import { formatInches, roundToNearestHalfInch } from "../lib/measurement";
import type { Door, Point } from "../types";
import { RoomPreview, type DoorConfig } from "./room-preview";
import { SHAPE_CONFIGS, generateShapeVertices, validateShapeDimensions, getDimensionLabels, getBoundingBox, calculateOrthogonalArea } from "../lib/shape";

// Standard door sizes in inches
const STANDARD_DOOR_SIZES = [
  24, 26, 28, 30, 32, 34, 36, 42, 48
];

interface RoomCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (roomData: {
    name: string;
    shapeType: 'box' | 'L-shape' | 'U-shape' | 'T-shape';
    vertices: Point[];
    boundingBox: { widthInches: number; heightInches: number };
    doors: DoorConfig[];
  }) => void;
}

export function RoomCreationModal({ 
  isOpen, 
  onClose, 
  onCreateRoom
}: RoomCreationModalProps) {
  const [name, setName] = useState("");
  const [shapeType, setShapeType] = useState<'box' | 'L-shape' | 'U-shape' | 'T-shape'>('box');
  const [dimensions, setDimensions] = useState<Record<string, number>>(
    SHAPE_CONFIGS.box?.defaultDimensions || {}
  );
  const [doors, setDoors] = useState<DoorConfig[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [placingDoor, setPlacingDoor] = useState(false);

  // Handle shape type change
  const handleShapeTypeChange = (newShapeType: 'box' | 'L-shape' | 'U-shape' | 'T-shape') => {
    setShapeType(newShapeType);
    setDimensions(SHAPE_CONFIGS[newShapeType]?.defaultDimensions || {});
    setDoors([]); // Clear doors when changing shape
    setErrors([]);
  };

  // Handle dimension change
  const handleDimensionChange = (dimName: string, value: string) => {
    const numValue = parseFloat(value);
    setDimensions(prev => ({
      ...prev,
      [dimName]: isNaN(numValue) ? 0 : numValue
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setErrors(["Room name is required"]);
      return;
    }
    
    // Validate shape dimensions
    const validation = validateShapeDimensions(shapeType, dimensions);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    
    // Generate vertices and bounding box
    const vertices = generateShapeVertices(shapeType, dimensions);
    const boundingBox = getBoundingBox(vertices);
    
    setErrors([]);
    
    onCreateRoom({
      name: name.trim(),
      shapeType,
      vertices,
      boundingBox,
      doors,
    });
    
    // Reset form
    setName("");
    setShapeType('box');
    setDimensions(SHAPE_CONFIGS.box?.defaultDimensions || {});
    setDoors([]);
    setErrors([]);
    setPlacingDoor(false);
    onClose();
  };

  const handleCancel = () => {
    setName("");
    setShapeType('box');
    setDimensions(SHAPE_CONFIGS.box?.defaultDimensions || {});
    setDoors([]);
    setErrors([]);
    setPlacingDoor(false);
    onClose();
  };

  const addDoor = () => {
    setPlacingDoor(true);
  };

  const removeDoor = (doorId: string) => {
    setDoors(prev => prev.filter(door => door.id !== doorId));
  };

  const updateDoor = (doorId: string, updates: Partial<DoorConfig>) => {
    setDoors(prev => prev.map(door => 
      door.id === doorId ? { ...door, ...updates } : door
    ));
  };

  // Generate current shape vertices and calculate area
  const vertices = generateShapeVertices(shapeType, dimensions);
  const boundingBox = getBoundingBox(vertices);
  
  // Calculate area for display (convert from sq inches to sq ft)
  const areaInches = vertices.length > 0 ? calculateOrthogonalArea(vertices) : 0;
  const area = Math.round((areaInches / 144) * 100) / 100;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl h-[90vh] bg-white shadow-xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0">
          <h3 className="text-lg font-semibold text-slate-900">Create New Room</h3>
          <Button 
            onClick={handleCancel}
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <ScrollArea className="flex-1 overflow-hidden">
          <div className="space-y-0 pb-4">
          {/* Top section with inputs */}
          <div className="p-4 border-b border-slate-200 space-y-4">
          <div>
            <label htmlFor="room-name" className="block text-sm font-medium text-slate-700 mb-1">
              Room Name
            </label>
            <input
              id="room-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kitchen, Living Room"
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              autoFocus
            />
          </div>
          
          {/* Shape Type Selection */}
          <div>
            <label htmlFor="shape-type" className="block text-sm font-medium text-slate-700 mb-1">
              Room Shape
            </label>
            <select
              id="shape-type"
              value={shapeType}
              onChange={(e) => handleShapeTypeChange(e.target.value as 'box' | 'L-shape' | 'U-shape' | 'T-shape')}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            >
              {Object.entries(SHAPE_CONFIGS).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Dimension Inputs */}
          <div className="grid grid-cols-2 gap-4">
            {SHAPE_CONFIGS[shapeType]?.minDimensions.map((dimName) => {
              const label = getDimensionLabels(shapeType)[dimName] || dimName;
              return (
                <div key={dimName}>
                  <label htmlFor={`dim-${dimName}`} className="block text-sm font-medium text-slate-700 mb-1">
                    {label} (inches)
                  </label>
                  <input
                    id={`dim-${dimName}`}
                    type="text"
                    value={dimensions[dimName] || ''}
                    onChange={(e) => handleDimensionChange(dimName, e.target.value)}
                    placeholder={SHAPE_CONFIGS[shapeType]?.defaultDimensions[dimName]?.toString() || ''}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  />
                </div>
              );
            }) || []}
          </div>
          
          {/* Dimension confirmation */}
          {vertices.length > 0 && area > 0 && (
            <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md">
              <div className="font-medium mb-1">Confirm Dimensions</div>
              <div>Bounding Box: {formatInches(boundingBox.widthInches)} × {formatInches(boundingBox.heightInches)}</div>
              <div>Area: {area} sq ft</div>
              <div className="text-xs text-slate-500 mt-1">
                Shape: {SHAPE_CONFIGS[shapeType]?.name || shapeType}
              </div>
            </div>
          )}
          </div>

          {/* Scrollable content area - Everything after inputs */}

            {/* Room Preview Section - Full Width */}
            <div className="p-4 border-b border-slate-200">
              <h4 className="text-sm font-medium text-slate-700 mb-3">Room Preview</h4>
              <div className="h-80 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                <RoomPreview
                  vertices={vertices}
                  doors={doors}
                  placingDoor={placingDoor}
                  onDoorPlace={(doorConfig) => {
                    setDoors(prev => [...prev, doorConfig]);
                    setPlacingDoor(false);
                  }}
                  onDoorUpdate={updateDoor}
                  onDoorRemove={removeDoor}
                  onCancelPlacing={() => setPlacingDoor(false)}
                  shapeType={shapeType}
                  dimensions={dimensions}
                />
              </div>
            </div>

            {/* Door Controls Panel */}
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-slate-700">
                  Doors ({doors.length})
                </h4>
                <Button
                  type="button"
                  onClick={addDoor}
                  disabled={placingDoor}
                  size="sm"
                  className="h-8 px-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {placingDoor ? "Placing..." : "Add Door"}
                </Button>
              </div>

              <div className="text-xs text-slate-600 mb-4 p-2 bg-blue-50 rounded">
                {placingDoor 
                  ? "🖱️ Click on a wall to place the door" 
                  : "💡 Click 'Add Door' then click on room walls to place them"
                }
              </div>
              
              {doors.length === 0 ? (
                <div className="text-sm text-slate-500 text-center py-8 border border-dashed border-slate-300 rounded-md">
                  No doors added yet.<br/>Click "Add Door" to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {doors.map((door, index) => (
                    <DoorConfigCard
                      key={door.id}
                      door={door}
                      index={index}
                      onUpdate={updateDoor}
                      onRemove={removeDoor}
                    />
                  ))}
                </div>
              )}
            </div>

              {/* Bottom section with errors and buttons - Now scrollable */}
            <div className="p-4 space-y-4">
          
            {/* Error messages */}
          {errors.length > 0 && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleCancel}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 bg-slate-900 hover:bg-slate-800"
            >
              Create Room
            </Button>
            </div>
            </div>
          </div>
          </ScrollArea>
        </form>
      </Card>
    </div>
  );
}

// Door Configuration Card Component  
interface DoorConfigCardProps {
  door: DoorConfig;
  index: number;
  onUpdate: (doorId: string, updates: Partial<DoorConfig>) => void;
  onRemove: (doorId: string) => void;
}

function DoorConfigCard({ door, index, onUpdate, onRemove }: DoorConfigCardProps) {
  return (
    <div className="border border-slate-200 rounded-md p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-slate-900">
          Door {index + 1} - {door.width}"
        </div>
        <Button
          type="button"
          onClick={() => onRemove(door.id)}
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Door Width */}
        <div>
          <label className="block text-slate-600 mb-1">Width</label>
          <select
            value={door.width}
            onChange={(e) => onUpdate(door.id, { width: parseInt(e.target.value) })}
            className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            {STANDARD_DOOR_SIZES.map(size => (
              <option key={size} value={size}>
                {size}"
              </option>
            ))}
          </select>
        </div>

        {/* Opening Direction */}
        <div>
          <label className="block text-slate-600 mb-1">Opening</label>
          <select
            value={door.openDirection}
            onChange={(e) => onUpdate(door.id, { openDirection: e.target.value as Door['openDirection'] })}
            className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="inward">Inward</option>
            <option value="outward">Outward</option>
          </select>
        </div>

        {/* Pivot Side */}
        <div>
          <label className="block text-slate-600 mb-1">Hinge</label>
          <select
            value={door.pivotSide}
            onChange={(e) => onUpdate(door.id, { pivotSide: e.target.value as 'left' | 'right' })}
            className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </div>

        {/* Swing Angle */}
        <div>
          <label className="block text-slate-600 mb-1">Swing</label>
          <select
            value={door.swingAngle}
            onChange={(e) => onUpdate(door.id, { swingAngle: parseInt(e.target.value) })}
            className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value={90}>90°</option>
            <option value={120}>120°</option>
            <option value={180}>180°</option>
          </select>
        </div>
      </div>
      
      <div className="mt-2 text-xs text-slate-500">
        📍 Wall {door.wallIndex + 1}, {formatInches(door.position)} from start
      </div>
    </div>
  );
}