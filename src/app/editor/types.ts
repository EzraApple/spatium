export interface Point {
  x: number; // inches from room origin
  y: number; // inches from room origin
}

export interface Room {
  id: string;
  name: string;
  x: number;          // Canvas position (not used in single-room mode)
  y: number;          // Canvas position (not used in single-room mode)
  color: string;
  doors: Door[];      // Array of doors on this room
  
  // Unified representation for all shapes (Box, L, U, T)
  vertices: Point[];   // Ordered vertices (clockwise), all angles are 90°
  shapeType: 'box' | 'L-shape' | 'U-shape' | 'T-shape';
  
  // Keep for easy access and compatibility
  boundingBox: {
    widthInches: number;
    heightInches: number;
  };
}

export interface Door {
  id: string;
  wallIndex: number;   // Index of the wall (between vertices[i] and vertices[i+1])
  position: number;    // Distance from wall start point (inches)
  width: number;       // Door width in inches (supports 0.5 increments)
  openDirection: 'inward' | 'outward';
  swingAngle: number;  // Door swing angle in degrees (90, 180, etc.)
  pivotSide: 'left' | 'right'; // Which side the door hinges from
}

export interface Layout {
  id: string;
  title: string;
  rooms: Room[];
  metadata: {
    createdAt: Date;
    lastModified: Date;
    version: number;
  };
}