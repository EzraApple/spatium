import type { Room, Door, Point } from "../types";
import { formatInches, roundToNearestHalfInch } from "./measurement";
import { calculateOrthogonalArea, getBoundingBox, getWallSegments } from "./shape";

/**
 * Generate a unique room ID
 */
export function generateRoomId(): string {
  return `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a unique door ID
 */
export function generateDoorId(): string {
  return `door-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Room color palette following the user's preference for simple slate-based colors
 */
export const ROOM_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald  
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#f97316", // orange
  "#ec4899", // pink
  "#6b7280", // gray
] as const;

/**
 * Get the next color in the palette
 */
export function getNextRoomColor(existingRooms: Room[]): string {
  return ROOM_COLORS[existingRooms.length % ROOM_COLORS.length]!;
}

/**
 * Create a new room with the given parameters
 */
export function createRoom(
  name: string,
  shapeType: 'box' | 'L-shape' | 'U-shape' | 'T-shape',
  vertices: Point[],
  doorConfigs: Array<{
    id: string;
    width: number;
    wallIndex: number;
    position: number;
    openDirection: Door['openDirection'];
    swingAngle: number;
    pivotSide: 'left' | 'right';
  }>,
  existingRooms: Room[]
): Room {
  // Convert door configs to actual doors
  const doors: Door[] = doorConfigs.map(config => ({
    id: generateDoorId(),
    wallIndex: config.wallIndex,
    position: roundToNearestHalfInch(config.position),
    width: roundToNearestHalfInch(config.width),
    openDirection: config.openDirection,
    swingAngle: config.swingAngle,
    pivotSide: config.pivotSide,
  }));

  const boundingBox = getBoundingBox(vertices);

  return {
    id: generateRoomId(),
    name: name.trim(),
    x: 0, // Always center the single room
    y: 0,
    color: getNextRoomColor(existingRooms),
    doors,
    vertices: vertices.map(v => ({
      x: roundToNearestHalfInch(v.x),
      y: roundToNearestHalfInch(v.y)
    })),
    shapeType,
    boundingBox,
  };
}

/**
 * Add a door to a room
 */
export function addDoorToRoom(
  room: Room,
  wallIndex: number,
  positionInches: number,
  widthInches: number,
  openDirection: Door['openDirection'],
  swingAngle: number,
  pivotSide: 'left' | 'right' = 'left'
): Room {
  const newDoor: Door = {
    id: generateDoorId(),
    wallIndex,
    position: roundToNearestHalfInch(positionInches),
    width: roundToNearestHalfInch(widthInches),
    openDirection,
    swingAngle,
    pivotSide,
  };

  return {
    ...room,
    doors: [...room.doors, newDoor],
  };
}

/**
 * Remove a door from a room
 */
export function removeDoorFromRoom(room: Room, doorId: string): Room {
  return {
    ...room,
    doors: room.doors.filter(door => door.id !== doorId),
  };
}

/**
 * Update room vertices and recalculate bounding box
 */
export function updateRoomVertices(
  room: Room,
  vertices: Point[]
): Room {
  const boundingBox = getBoundingBox(vertices);
  
  return {
    ...room,
    vertices: vertices.map(v => ({
      x: roundToNearestHalfInch(v.x),
      y: roundToNearestHalfInch(v.y)
    })),
    boundingBox,
    // TODO: Validate and potentially remove doors that are now outside the shape
  };
}

/**
 * Update room name
 */
export function updateRoomName(room: Room, name: string): Room {
  return {
    ...room,
    name: name.trim(),
  };
}

/**
 * Get room display name with fallback
 */
export function getRoomDisplayName(room: Room): string {
  return room.name.trim() || "Unnamed Room";
}

/**
 * Calculate room area in square inches
 */
export function calculateRoomAreaInches(room: Room): number {
  return calculateOrthogonalArea(room.vertices);
}

/**
 * Calculate room area in square feet
 */
export function calculateRoomAreaFeet(room: Room): number {
  return calculateRoomAreaInches(room) / 144; // 144 square inches per square foot
}

/**
 * Get room dimensions as display strings
 */
export function getRoomDimensionsDisplay(room: Room): {
  width: string;
  height: string;
  area: string;
} {
  return {
    width: formatInches(room.boundingBox.widthInches),
    height: formatInches(room.boundingBox.heightInches),
    area: `${Math.round(calculateRoomAreaFeet(room))} sq ft`,
  };
}

/**
 * Validate door placement on a room
 */
export function validateDoorPlacement(
  room: Room,
  wallIndex: number,
  positionInches: number,
  widthInches: number
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Get wall segments
  const walls = getWallSegments(room.vertices);
  
  if (wallIndex < 0 || wallIndex >= walls.length) {
    errors.push("Invalid wall index");
    return { isValid: false, errors };
  }

  const wall = walls[wallIndex]!;
  
  if (positionInches < 0) {
    errors.push("Door position cannot be negative");
  }
  
  if (positionInches + widthInches > wall.length) {
    errors.push(`Door extends beyond wall (wall is ${formatInches(wall.length)})`);
  }

  if (widthInches < 24) {
    errors.push("Door width must be at least 24 inches");
  }

  if (widthInches > 60) {
    errors.push("Door width cannot exceed 60 inches");
  }

  // Check for overlaps with existing doors on the same wall
  const existingDoorsOnWall = room.doors.filter(door => door.wallIndex === wallIndex);
  for (const door of existingDoorsOnWall) {
    // Door.position now always represents the start of the door span
    const existingDoorStart = door.position;
    const existingDoorEnd = door.position + door.width;

    // Calculate new door's start and end
    const newDoorStart = positionInches;
    const newDoorEnd = positionInches + widthInches;

    if (!(newDoorEnd <= existingDoorStart || newDoorStart >= existingDoorEnd)) {
      errors.push(`Door overlaps with existing door`);
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}