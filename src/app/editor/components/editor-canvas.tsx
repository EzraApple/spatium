"use client";

import { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from "react";
import type { Room, FurnitureItem, FurnitureDimensions } from "../types";
import { inchesToPixels } from "../lib/measurement";
import { getRoomDimensionsDisplay } from "../lib/room";
import { getWallSegments, calculateOrthogonalArea } from "../lib/shape";
import { FurnitureListRenderer } from "./furniture-renderer";
import { useFurniturePlacement } from "../hooks/use-furniture-placement";
import type { FurnitureConfig } from "../lib/furniture";

interface CanvasProps {
  room: Room | null;
  onFurnitureAdd?: (furniture: FurnitureItem) => void;
  onFurnitureUpdate?: (furniture: FurnitureItem) => void;
  onFurnitureRemove?: (furnitureId: string) => void;
}

export interface EditorCanvasRef {
  startFurniturePlacement: (config: FurnitureConfig, dimensions: FurnitureDimensions) => void;
  startFurnitureMoving: (furnitureId: string) => void;
}

export const EditorCanvas = forwardRef<EditorCanvasRef, CanvasProps>(function EditorCanvas({ 
  room, 
  onFurnitureAdd,
  onFurnitureUpdate,
  onFurnitureRemove
}, ref) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Furniture placement hook
  const furniturePlacement = useFurniturePlacement({
    room,
    furniture: room?.furniture || [],
    onFurnitureAdd: onFurnitureAdd || (() => {}),
    onFurnitureUpdate: onFurnitureUpdate || (() => {}),
    onFurnitureRemove: onFurnitureRemove || (() => {})
  });

  // Expose furniture placement function to parent via ref
  useImperativeHandle(ref, () => ({
    startFurniturePlacement: (config: FurnitureConfig, dimensions: FurnitureDimensions) => {
      furniturePlacement.startPlacement(config, dimensions);
    },
    startFurnitureMoving: (furnitureId: string) => {
      furniturePlacement.startMoving(furnitureId);
    }
  }), [furniturePlacement]);

  const minZoom = 0.5;  // 50%
  const maxZoom = 2.0;  // 200%

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    if (!canvasRef.current) return;
    
    // Slower zoom factor for better control
    const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05;
    const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom * zoomFactor));
    
    // If zoom didn't change, don't update anything
    if (newZoom === zoom) return;
    
    // Get cursor position relative to canvas
    const rect = canvasRef.current.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;
    
    // Calculate world position under cursor before zoom
    const worldX = (cursorX - pan.x) / zoom;
    const worldY = (cursorY - pan.y) / zoom;
    
    // Calculate new pan to keep world position under cursor
    const newPanX = cursorX - worldX * newZoom;
    const newPanY = cursorY - worldY * newZoom;
    
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
    
    console.log("Zoom:", Math.round(newZoom * 100) + "%");
  }, [zoom, pan]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only handle left mouse button for panning when not placing furniture
    if (e.button === 0 && !furniturePlacement.isActive) { // Left mouse button
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan, furniturePlacement.isActive]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && !furniturePlacement.isActive) {
      const newPan = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      };
      setPan(newPan);
    }
    
    // Handle furniture placement mouse movement
    if (furniturePlacement.isActive && canvasRef.current) {
      furniturePlacement.handleCanvasMouseMove(e.clientX, e.clientY, canvasRef.current, zoom, pan);
    }
  }, [isDragging, dragStart, furniturePlacement]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setIsDragging(false);
      console.log("Stopped panning");
    }
    
    // Handle furniture placement clicks
    if (furniturePlacement.isActive && canvasRef.current) {
      furniturePlacement.handleCanvasClick(e.clientX, e.clientY, canvasRef.current, zoom, pan);
    }
  }, [isDragging, furniturePlacement]);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Auto-center on room when it changes
  useEffect(() => {
    if (room && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const canvasWidth = rect.width;
      const canvasHeight = rect.height;
      
      // Center the room in the viewport
      const roomPixelWidth = inchesToPixels(room.widthInches);
      const roomPixelHeight = inchesToPixels(room.heightInches);
      
      // Calculate pan to center the room
      const centerX = canvasWidth / 2;
      const centerY = canvasHeight / 2;
      
      // The room is positioned at the center of the 4000x4000 canvas (2000, 2000)
      // We want to pan so that position (2000, 2000) appears at the center of the viewport
      const targetPanX = centerX - 2000 * zoom;
      const targetPanY = centerY - 2000 * zoom;
      
      setPan({ x: targetPanX, y: targetPanY });
    }
  }, [room?.id, zoom]); // Re-center when room changes or zoom changes

  return (
    <div 
      ref={canvasRef}
      className="absolute inset-0 bg-slate-100 overflow-hidden cursor-move"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}

      style={{
        cursor: furniturePlacement.isActive ? 'crosshair' : (isDragging ? 'grabbing' : 'grab')
      }}
    >
      {/* Grid Background */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          backgroundImage: `
            linear-gradient(to right, #e2e8f0 1px, transparent 1px),
            linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0',
        }}
      >
        {/* Canvas content area */}
        <div className="w-[4000px] h-[4000px] relative flex items-center justify-center">
          {room ? (
            <div className="relative">
              {/* Room polygon */}
              <div
                className="relative"
                style={{
                  width: `${inchesToPixels(room.boundingBox.widthInches)}px`,
                  height: `${inchesToPixels(room.boundingBox.heightInches)}px`,
                }}
              >
                {/* Room shape as SVG */}
                <svg
                  width={inchesToPixels(room.boundingBox.widthInches)}
                  height={inchesToPixels(room.boundingBox.heightInches)}
                  className="absolute inset-0"
                >
                  <polygon
                    points={room.vertices.map(v => `${inchesToPixels(v.x)},${inchesToPixels(v.y)}`).join(' ')}
                    fill={`${room.color}33`}
                    stroke={room.color}
                    strokeWidth="3"
                    className="drop-shadow-lg"
                  />
                </svg>

                {/* Room name */}
                <div className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-slate-800 pointer-events-none">
                  {room.name}
                </div>
                
                {/* Room dimensions */}
                <div className="absolute bottom-2 right-2 text-sm text-slate-600 pointer-events-none bg-white/80 px-2 py-1 rounded">
                  {getRoomDimensionsDisplay(room).width} × {getRoomDimensionsDisplay(room).height}
                </div>
                
                {/* Room area */}
                <div className="absolute top-2 left-2 text-sm text-slate-600 pointer-events-none bg-white/80 px-2 py-1 rounded">
                  {getRoomDimensionsDisplay(room).area}
                </div>

                {/* Furniture rendering */}
                <svg
                  width={inchesToPixels(room.boundingBox.widthInches)}
                  height={inchesToPixels(room.boundingBox.heightInches)}
                  className="absolute inset-0 pointer-events-none"
                  style={{ pointerEvents: furniturePlacement.isActive ? 'none' : 'auto' }}
                >
                  {/* Existing furniture (exclude the one being moved) */}
                  <FurnitureListRenderer
                    furniture={(room.furniture || []).filter(f => 
                      !furniturePlacement.placementState.furnitureBeingPlaced || 
                      f.id !== furniturePlacement.placementState.furnitureBeingPlaced.id
                    )}
                    selectedFurnitureId={selectedFurnitureId}
                    placingFurnitureId={furniturePlacement.isPlacing ? furniturePlacement.placementState.furnitureBeingPlaced?.id : undefined}
                    movingFurnitureId={furniturePlacement.isMoving ? furniturePlacement.placementState.furnitureBeingPlaced?.id : undefined}
                    invalidFurnitureIds={new Set()}
                    onFurnitureClick={(furnitureId) => {
                      if (furniturePlacement.isActive) return;
                      if (selectedFurnitureId === furnitureId) {
                        // Double-click behavior: start moving
                        furniturePlacement.handleFurnitureClick(furnitureId);
                      } else {
                        // Single-click: select
                        setSelectedFurnitureId(furnitureId);
                      }
                    }}
                    onFurnitureDoubleClick={(furnitureId) => {
                      furniturePlacement.handleFurnitureClick(furnitureId);
                    }}
                  />
                  
                  {/* Furniture being placed */}
                  {furniturePlacement.placementState.furnitureBeingPlaced && (
                    <FurnitureListRenderer
                      furniture={[furniturePlacement.placementState.furnitureBeingPlaced]}
                      placingFurnitureId={furniturePlacement.isPlacing ? furniturePlacement.placementState.furnitureBeingPlaced.id : undefined}
                      movingFurnitureId={furniturePlacement.isMoving ? furniturePlacement.placementState.furnitureBeingPlaced.id : undefined}
                      invalidFurnitureIds={furniturePlacement.placementState.isValidPlacement ? new Set() : new Set([furniturePlacement.placementState.furnitureBeingPlaced.id])}
                    />
                  )}
                </svg>
              </div>
              
              {/* Doors */}
              {room.doors.map((door) => {
                const walls = getWallSegments(room.vertices);
                if (door.wallIndex < 0 || door.wallIndex >= walls.length) return null;
                
                const wall = walls[door.wallIndex]!;
                const doorPixelWidth = inchesToPixels(door.width);
                
                // Calculate door position along the wall
                const wallVectorX = wall.end.x - wall.start.x;
                const wallVectorY = wall.end.y - wall.start.y;
                const wallLength = Math.sqrt(wallVectorX * wallVectorX + wallVectorY * wallVectorY);
                
                if (wallLength === 0) return null;
                
                // Normalize wall vector
                const normalizedWallX = wallVectorX / wallLength;
                const normalizedWallY = wallVectorY / wallLength;
                
                // Calculate door start and end positions (door.position is the start of the door span)
                const doorStartX = wall.start.x + normalizedWallX * door.position;
                const doorStartY = wall.start.y + normalizedWallY * door.position;
                const doorEndX = wall.start.x + normalizedWallX * (door.position + door.width);
                const doorEndY = wall.start.y + normalizedWallY * (door.position + door.width);
                
                // Calculate hinge position based on pivot side (hinge is either at start or end)
                let hingeX, hingeY;
                if (door.pivotSide === 'left') {
                  // Left hinge: hinge is at the start of the door
                  hingeX = doorStartX;
                  hingeY = doorStartY;
                } else {
                  // Right hinge: hinge is at the end of the door
                  hingeX = doorEndX;
                  hingeY = doorEndY;
                }
                
                // Calculate perpendicular vector for door thickness
                const perpX = -normalizedWallY; // Perpendicular to wall
                const perpY = normalizedWallX;
                
                const doorThickness = 6; // pixels
                
                // Position door opening directly on the wall
                let doorStyle: React.CSSProperties = {
                  position: 'absolute',
                  backgroundColor: '#8b5cf6',
                  border: '2px solid #7c3aed',
                };

                // Calculate the actual pixel dimensions from start to end
                const doorBlockWidth = Math.abs(doorEndX - doorStartX);
                const doorBlockHeight = Math.abs(doorEndY - doorStartY);
                
                // Position the door opening directly on the wall edge, spanning from start to end
                if (wall.direction === 'horizontal') {
                  doorStyle = {
                    ...doorStyle,
                    left: `${inchesToPixels(Math.min(doorStartX, doorEndX))}px`,
                    top: `${inchesToPixels(Math.min(doorStartY, doorEndY)) - doorThickness / 2}px`,
                    width: `${inchesToPixels(doorBlockWidth)}px`,
                    height: `${doorThickness}px`,
                  };
                } else {
                  doorStyle = {
                    ...doorStyle,
                    left: `${inchesToPixels(Math.min(doorStartX, doorEndX)) - doorThickness / 2}px`,
                    top: `${inchesToPixels(Math.min(doorStartY, doorEndY))}px`,
                    width: `${doorThickness}px`,
                    height: `${inchesToPixels(doorBlockHeight)}px`,
                  };
                }

                // Calculate swing arc for both inward and outward opening doors
                let swingElement = null;
                const swingRadius = doorPixelWidth; // Use door width as radius
                
                // Calculate the door direction (from hinge toward free end)
                let doorDirX, doorDirY;
                if (door.pivotSide === 'left') {
                  // Door extends in wall direction from left hinge
                  doorDirX = normalizedWallX;
                  doorDirY = normalizedWallY;
                } else {
                  // Door extends opposite to wall direction from right hinge
                  doorDirX = -normalizedWallX;
                  doorDirY = -normalizedWallY;
                }
                
                // Calculate the door's direction angle (from hinge toward free end)
                const doorAngle = Math.atan2(doorDirY, doorDirX) * 180 / Math.PI;
                
                // Calculate swing direction - need to adjust for hinge side flipping the door direction
                let effectiveOpenDirection = door.openDirection;
                if (door.pivotSide === 'right') {
                  // For right hinge, flip the opening direction since door direction is flipped
                  effectiveOpenDirection = door.openDirection === 'inward' ? 'outward' : 'inward';
                }
                
                let swingStartAngle;
                if (effectiveOpenDirection === 'inward') {
                  // Start from door line, sweep inward
                  swingStartAngle = doorAngle;
                } else {
                  // Start adjusted so sweep ends at door line
                  swingStartAngle = doorAngle - door.swingAngle;
                }
                
                // Always use positive swing angle for consistent rendering
                const swingAngle = Math.abs(door.swingAngle);
                const startAngle = swingStartAngle;
                
                swingElement = (
                  <svg
                    style={{
                      position: 'absolute',
                      left: `${inchesToPixels(hingeX) - swingRadius}px`,
                      top: `${inchesToPixels(hingeY) - swingRadius}px`,
                      width: `${swingRadius * 2}px`,
                      height: `${swingRadius * 2}px`,
                      pointerEvents: 'none',
                      overflow: 'visible',
                    }}
                  >
                    <path
                      d={createCanvasArcPath(swingRadius, swingRadius, swingRadius, startAngle, swingAngle)}
                      fill="none"
                      stroke="#8b5cf688"
                      strokeWidth="2"
                      strokeDasharray="4,3"
                    />
                  </svg>
                );
                
                return (
                  <div key={door.id}>
                    {/* Door opening */}
                    <div
                      style={doorStyle}
                      title={`Door: ${door.width}" wide, ${door.openDirection}, ${door.swingAngle}°`}
                    />
                    {/* Door swing arc */}
                    {swingElement}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-slate-500">
              <div className="text-lg mb-2">No room selected</div>
              <div className="text-sm">Create a room to get started</div>
            </div>
          )}
        </div>
      </div>

      {/* Furniture placement status */}
      {furniturePlacement.isActive && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-md px-4 py-2 text-sm shadow-md z-20">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${furniturePlacement.isPlacing ? 'bg-blue-500' : 'bg-orange-500'}`}></span>
              <span className="text-slate-700 font-medium">
                {furniturePlacement.isPlacing ? 'Placing' : 'Moving'} {furniturePlacement.placementState.furnitureBeingPlaced?.name || 'furniture'}
              </span>
            </span>
            {!furniturePlacement.placementState.isValidPlacement && (
              <span className="text-red-600 text-xs">
                ⚠ {furniturePlacement.placementState.placementReasons[0]}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Click to place • ← → to rotate • ESC to cancel
          </div>
        </div>
      )}

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-md px-3 py-1 text-sm text-slate-600 shadow-md">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
});

// Helper function to create SVG arc path for canvas
function createCanvasArcPath(centerX: number, centerY: number, radius: number, startAngle: number, arcAngle: number): string {
  const startAngleRad = (startAngle * Math.PI) / 180;
  const endAngleRad = ((startAngle + arcAngle) * Math.PI) / 180;
  
  const startX = centerX + radius * Math.cos(startAngleRad);
  const startY = centerY + radius * Math.sin(startAngleRad);
  const endX = centerX + radius * Math.cos(endAngleRad);
  const endY = centerY + radius * Math.sin(endAngleRad);
  
  const largeArcFlag = arcAngle > 180 ? 1 : 0;
  
  return [
    'M', centerX, centerY,
    'L', startX, startY,
    'A', radius, radius, 0, largeArcFlag, 1, endX, endY,
    'Z'
  ].join(' ');
}