"use client";

import { useState } from "react";
import { formatInches } from "../lib/measurement";
import type { Door, Point } from "../types";
import { getWallSegments, getBoundingBox, SHAPE_CONFIGS, getDimensionLabels } from "../lib/shape";

// Standard door configuration interface
interface DoorConfig {
  id: string;
  width: number;
  wallIndex: number; // Index of the wall (between vertices[i] and vertices[i+1])
  position: number; // Position along the wall in inches
  openDirection: Door['openDirection'];
  swingAngle: number;
  pivotSide: 'left' | 'right';
}

interface RoomPreviewProps {
  vertices: Point[];
  doors: DoorConfig[];
  placingDoor: boolean;
  onDoorPlace: (door: DoorConfig) => void;
  onDoorUpdate: (doorId: string, updates: Partial<DoorConfig>) => void;
  onDoorRemove: (doorId: string) => void;
  onCancelPlacing: () => void;
  shapeType?: 'box' | 'L-shape' | 'U-shape' | 'T-shape';
  dimensions?: Record<string, number>;
}

export function RoomPreview({ vertices, doors, placingDoor, onDoorPlace, onDoorUpdate, onDoorRemove, onCancelPlacing, shapeType, dimensions }: RoomPreviewProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [previewDoor, setPreviewDoor] = useState<{ wallIndex: number; position: number } | null>(null);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270 degrees

  if (!vertices || vertices.length < 3) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        <div className="text-center">
          <div className="text-lg mb-2">Enter room dimensions</div>
          <div className="text-sm">to see the preview</div>
        </div>
      </div>
    );
  }

  // Calculate walls and bounding box
  const walls = getWallSegments(vertices);
  const boundingBox = getBoundingBox(vertices);

  // Calculate scale to fit the room in the preview area with padding
  const padding = 60; // Space around the room
  const maxPreviewWidth = 800 - padding * 2; // Wider since it spans full width
  const maxPreviewHeight = 320 - padding * 2;
  const scaleX = maxPreviewWidth / boundingBox.widthInches;
  const scaleY = maxPreviewHeight / boundingBox.heightInches;
  const scale = Math.min(scaleX, scaleY, 3); // Max 3px per inch

  const roomPixelWidth = boundingBox.widthInches * scale;
  const roomPixelHeight = boundingBox.heightInches * scale;

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!placingDoor) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePosition({ x, y });

    // Calculate room center
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Transform mouse coordinates to account for rotation
    const relativeX = x - centerX;
    const relativeY = y - centerY;
    const radians = (-rotation * Math.PI) / 180; // Negative because we want to reverse the rotation
    const rotatedX = relativeX * Math.cos(radians) - relativeY * Math.sin(radians);
    const rotatedY = relativeX * Math.sin(radians) + relativeY * Math.cos(radians);
    const unrotatedX = rotatedX + centerX;
    const unrotatedY = rotatedY + centerY;

    // Convert mouse position to room coordinates
    const roomCenterX = centerX;
    const roomCenterY = centerY;
    const mouseRoomX = (unrotatedX - roomCenterX) / scale + boundingBox.widthInches / 2;
    const mouseRoomY = (unrotatedY - roomCenterY) / scale + boundingBox.heightInches / 2;

    // Find the closest wall
    let closestWallIndex = -1;
    let closestDistance = Infinity;
    let closestPosition = 0;

    for (let i = 0; i < walls.length; i++) {
      const wall = walls[i]!;
      const { distance, position } = getDistanceToWall(mouseRoomX, mouseRoomY, wall);
      
      if (distance < closestDistance && distance < 30) { // 30 pixel threshold
        closestDistance = distance;
        closestWallIndex = i;
        // Clamp hinge position so door doesn't extend beyond wall boundaries
        // Default to left hinge during placement, so hinge can be anywhere from 0 to wall.length - doorWidth
        closestPosition = Math.max(0, Math.min(wall.length - 32, position));
      }
    }

    if (closestWallIndex >= 0) {
      setPreviewDoor({ wallIndex: closestWallIndex, position: closestPosition });
    } else {
      setPreviewDoor(null);
    }
  };

  // Helper function to calculate distance from point to wall segment
  function getDistanceToWall(mouseX: number, mouseY: number, wall: { start: Point; end: Point; length: number }) {
    const { start, end } = wall;
    
    // Vector from start to end
    const wallVecX = end.x - start.x;
    const wallVecY = end.y - start.y;
    
    // Vector from start to mouse
    const mouseVecX = mouseX - start.x;
    const mouseVecY = mouseY - start.y;
    
    // Project mouse vector onto wall vector
    const wallLength = Math.sqrt(wallVecX * wallVecX + wallVecY * wallVecY);
    if (wallLength === 0) return { distance: Infinity, position: 0 };
    
    const normalizedWallX = wallVecX / wallLength;
    const normalizedWallY = wallVecY / wallLength;
    
    const projection = mouseVecX * normalizedWallX + mouseVecY * normalizedWallY;
    const clampedProjection = Math.max(0, Math.min(wallLength, projection));
    
    // Point on wall closest to mouse
    const closestX = start.x + normalizedWallX * clampedProjection;
    const closestY = start.y + normalizedWallY * clampedProjection;
    
    // Distance from mouse to closest point on wall
    const distance = Math.sqrt((mouseX - closestX) ** 2 + (mouseY - closestY) ** 2);
    
    return { distance, position: clampedProjection };
  }

  const handleClick = (e: React.MouseEvent) => {
    if (!placingDoor || !previewDoor) return;

    e.preventDefault();

    const newDoor: DoorConfig = {
      id: `door-${Date.now()}`,
      width: 32,
      wallIndex: previewDoor.wallIndex,
      position: previewDoor.position,
      openDirection: 'inward',
      swingAngle: 90,
      pivotSide: 'left', // Default to left hinge
    };

    onDoorPlace(newDoor);
    setPreviewDoor(null);
  };

  const handleRightClick = (e: React.MouseEvent) => {
    if (placingDoor) {
      e.preventDefault();
      onCancelPlacing();
      setPreviewDoor(null);
    }
  };

  return (
    <div 
      className={`h-full relative flex items-center justify-center ${placingDoor ? 'cursor-crosshair' : ''}`}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onContextMenu={handleRightClick}
    >
      {/* Room polygon */}
      <div
        className="relative"
        style={{
          width: `${roomPixelWidth}px`,
          height: `${roomPixelHeight}px`,
          transform: `rotate(${rotation}deg)`,
          transformOrigin: 'center',
        }}
      >
        {/* Room shape as SVG */}
        <svg
          width={roomPixelWidth}
          height={roomPixelHeight}
          className="absolute inset-0"
        >
          <polygon
            points={vertices.map(v => `${v.x * scale},${v.y * scale}`).join(' ')}
            fill="white"
            stroke="#94a3b8"
            strokeWidth="2"
            className="drop-shadow-sm"
          />
        </svg>

        {/* Wall dimension labels */}
        {shapeType && dimensions && renderWallDimensions(walls, shapeType, dimensions, scale)}

        {/* Existing Doors */}
        {doors.map((door) => renderDoor(door, scale, false))}

        {/* Preview Door */}
        {placingDoor && previewDoor && renderDoor({
          id: 'preview',
          width: 32,
          wallIndex: previewDoor.wallIndex,
          position: previewDoor.position,
          openDirection: 'inward',
          swingAngle: 90,
          pivotSide: 'left',
        }, scale, true)}

        {/* Distance indicators for doors */}
        {doors.map((door) => renderDistanceIndicators(door, scale))}
        {placingDoor && previewDoor && renderDistanceIndicators({
          id: 'preview',
          width: 32,
          wallIndex: previewDoor.wallIndex,
          position: previewDoor.position,
          openDirection: 'inward',
          swingAngle: 90,
          pivotSide: 'left',
        }, scale)}

        {/* Rotation button */}
        <button
          type="button"
          onClick={handleRotate}
          className="absolute top-2 right-2 w-6 h-6 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded flex items-center justify-center text-xs text-slate-600 hover:text-slate-800 transition-colors"
          title="Rotate room"
        >
          ↻
        </button>
      </div>
    </div>
  );
  
  // Helper function to render doors with opening arcs
  function renderDoor(door: DoorConfig, scale: number, isPreview: boolean = false) {
    if (door.wallIndex < 0 || door.wallIndex >= walls.length) return null;
    
    const wall = walls[door.wallIndex]!;
    const doorPixelWidth = door.width * scale;
    
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
    
    // Calculate perpendicular vector for door thickness (inward from wall)
    const perpX = -normalizedWallY; // Perpendicular to wall
    const perpY = normalizedWallX;
    
    const doorThickness = 4; // pixels
    
    // Position door opening directly on the wall
    let doorStyle: React.CSSProperties = {
      position: 'absolute',
      backgroundColor: isPreview ? '#8b5cf688' : '#8b5cf6',
      border: `2px solid ${isPreview ? '#7c3aed88' : '#7c3aed'}`,
    };

    // Calculate the actual pixel dimensions from start to end
    const doorBlockWidth = Math.abs(doorEndX - doorStartX) * scale;
    const doorBlockHeight = Math.abs(doorEndY - doorStartY) * scale;
    
    // Position the door opening directly on the wall edge, spanning from start to end
    if (wall.direction === 'horizontal') {
      doorStyle = {
        ...doorStyle,
        left: `${Math.min(doorStartX, doorEndX) * scale}px`,
        top: `${Math.min(doorStartY, doorEndY) * scale - doorThickness / 2}px`,
        width: `${doorBlockWidth}px`,
        height: `${doorThickness}px`,
      };
    } else {
      doorStyle = {
        ...doorStyle,
        left: `${Math.min(doorStartX, doorEndX) * scale - doorThickness / 2}px`,
        top: `${Math.min(doorStartY, doorEndY) * scale}px`,
        width: `${doorThickness}px`,
        height: `${doorBlockHeight}px`,
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
    
    // Calculate perpendicular to wall (into room direction) - always consistent
    const roomPerpX = -normalizedWallY;
    const roomPerpY = normalizedWallX;
    
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
          left: `${(hingeX * scale) - swingRadius}px`,
          top: `${(hingeY * scale) - swingRadius}px`,
          width: `${swingRadius * 2}px`,
          height: `${swingRadius * 2}px`,
          pointerEvents: 'none',
          overflow: 'visible',
        }}
      >
        <path
          d={createArcPath(swingRadius, swingRadius, swingRadius, startAngle, swingAngle)}
          fill="none"
          stroke={isPreview ? '#8b5cf644' : '#8b5cf688'}
          strokeWidth="1"
          strokeDasharray="3,2"
        />
      </svg>
    );

    return (
      <div key={door.id}>
        {/* Door opening */}
        <div
          style={doorStyle}
          title={isPreview ? "Click to place door" : `${door.width}" door`}
          className={isPreview ? "cursor-pointer" : "cursor-pointer hover:bg-purple-600"}
          onClick={isPreview ? undefined : (e) => {
            e.stopPropagation();
            onDoorRemove(door.id);
          }}
        />
        
        {/* DEBUG: Door start position marker */}
        <div
          style={{
            position: 'absolute',
            left: `${doorStartX * scale - 3}px`,
            top: `${doorStartY * scale - 3}px`,
            width: '6px',
            height: '6px',
            backgroundColor: '#4c1d95',
            borderRadius: '50%',
            border: '1px solid white',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
          title="Door Start"
        />
        
        {/* DEBUG: Door end position marker */}
        <div
          style={{
            position: 'absolute',
            left: `${doorEndX * scale - 3}px`,
            top: `${doorEndY * scale - 3}px`,
            width: '6px',
            height: '6px',
            backgroundColor: '#7c2d12',
            borderRadius: '50%',
            border: '1px solid white',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
          title="Door End"
        />
        
        {/* DEBUG: Hinge position marker */}
        <div
          style={{
            position: 'absolute',
            left: `${hingeX * scale - 4}px`,
            top: `${hingeY * scale - 4}px`,
            width: '8px',
            height: '8px',
            backgroundColor: '#dc2626',
            borderRadius: '50%',
            border: '2px solid white',
            pointerEvents: 'none',
            zIndex: 1001,
          }}
          title={`Hinge (${door.pivotSide})`}
        />
        
        {/* Door swing arc */}
        {swingElement}
      </div>
    );
  }

  // Helper function to render distance indicators
  function renderDistanceIndicators(door: DoorConfig, scale: number) {
    if (door.wallIndex < 0 || door.wallIndex >= walls.length || !door.position) return null;

    const wall = walls[door.wallIndex]!;
    const indicators = [];
    
    const distanceToStart = door.position;
    const distanceToEnd = wall.length - door.position - door.width;
    
    if (distanceToStart <= 0 && distanceToEnd <= 0) return null;

    // Calculate label positions based on wall orientation
    const wallVectorX = wall.end.x - wall.start.x;
    const wallVectorY = wall.end.y - wall.start.y;
    const wallLength = Math.sqrt(wallVectorX * wallVectorX + wallVectorY * wallVectorY);
    
    if (wallLength === 0) return null;
    
    const normalizedWallX = wallVectorX / wallLength;
    const normalizedWallY = wallVectorY / wallLength;
    
    // Perpendicular vector for label offset
    const perpX = -normalizedWallY * 15; // 15px offset from wall
    const perpY = normalizedWallX * 15;

    // Start distance indicator
    if (distanceToStart > 0) {
      const labelX = wall.start.x * scale + perpX;
      const labelY = wall.start.y * scale + perpY;
      
      indicators.push(
        <div
          key={`${door.id}-start`}
          className="absolute text-xs text-slate-500 bg-white/80 px-1 rounded pointer-events-none"
          style={{
            left: `${labelX}px`,
            top: `${labelY}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {Math.round(distanceToStart)}"
        </div>
      );
    }

    // End distance indicator
    if (distanceToEnd > 0) {
      const labelX = wall.end.x * scale + perpX;
      const labelY = wall.end.y * scale + perpY;
      
      indicators.push(
        <div
          key={`${door.id}-end`}
          className="absolute text-xs text-slate-500 bg-white/80 px-1 rounded pointer-events-none"
          style={{
            left: `${labelX}px`,
            top: `${labelY}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {Math.round(distanceToEnd)}"
        </div>
      );
    }

    return indicators;
  }

  // Helper function to render wall dimension labels
  function renderWallDimensions(
    walls: Array<{ start: Point; end: Point; length: number; direction: 'horizontal' | 'vertical'; index: number }>,
    shapeType: string,
    dimensions: Record<string, number>,
    scale: number
  ) {
    if (!SHAPE_CONFIGS[shapeType]) return null;

    const dimensionLabels = getDimensionLabels(shapeType);
    const labels = [];

    // Map user input dimensions to specific walls based on shape type
    const wallMappings = getWallMappings(shapeType, walls, dimensions);

    for (const [dimName, wallIndex] of Object.entries(wallMappings)) {
      if (wallIndex >= 0 && wallIndex < walls.length && dimensions[dimName]) {
        const wall = walls[wallIndex]!;
        const label = dimensionLabels[dimName] || dimName;
        const value = formatInches(dimensions[dimName]!);

        // Calculate label position (middle of the wall, offset outward)
        const midX = (wall.start.x + wall.end.x) / 2;
        const midY = (wall.start.y + wall.end.y) / 2;

        // Calculate offset direction (perpendicular to wall)
        const wallVectorX = wall.end.x - wall.start.x;
        const wallVectorY = wall.end.y - wall.start.y;
        const wallLength = Math.sqrt(wallVectorX * wallVectorX + wallVectorY * wallVectorY);
        
        if (wallLength > 0) {
          const normalizedWallX = wallVectorX / wallLength;
          const normalizedWallY = wallVectorY / wallLength;
          
          // Perpendicular vector (outward from room)
          const perpX = -normalizedWallY;
          const perpY = normalizedWallX;
          
          const offsetDistance = 20; // pixels
          const labelX = midX * scale + perpX * offsetDistance;
          const labelY = midY * scale + perpY * offsetDistance;

          labels.push(
            <div
              key={`wall-dim-${dimName}`}
              className="absolute text-xs font-medium text-slate-700 bg-white/90 px-2 py-1 rounded border border-slate-200 pointer-events-none"
              style={{
                left: `${labelX}px`,
                top: `${labelY}px`,
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
              }}
            >
              {value}
            </div>
          );
        }
      }
    }

    return labels;
  }

  // Helper function to map dimension names to wall indices for each shape type
  function getWallMappings(shapeType: string, walls: any[], dimensions: Record<string, number>): Record<string, number> {
    switch (shapeType) {
      case 'box':
        return {
          width: 0,  // Bottom wall (horizontal)
          height: 1, // Right wall (vertical)
        };
      
      case 'L-shape':
        return {
          mainWidth: 0,   // Bottom horizontal wall of main rectangle
          mainHeight: 1,  // Right vertical wall of main rectangle  
          armWidth: 2,    // Top horizontal wall of arm
          armHeight: 3,   // Vertical wall of arm
        };
        
      case 'U-shape':
        return {
          totalWidth: 0,    // Bottom wall (full width)
          totalHeight: 1,   // Right wall (full height)
          cutoutWidth: 4,   // Inner horizontal wall
          cutoutDepth: 5,   // Inner vertical wall
        };
        
      case 'T-shape':
        return {
          topWidth: 0,     // Top horizontal wall
          topHeight: 1,    // Right edge of top
          stemWidth: 4,    // Bottom of stem
          stemHeight: 5,   // Side of stem
        };
        
      default:
        return {};
    }
  }

  // Helper function to create SVG arc path
  function createArcPath(centerX: number, centerY: number, radius: number, startAngle: number, arcAngle: number): string {
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
}

// Export the DoorConfig interface for reuse
export type { DoorConfig };