import type { 
  FurnitureItem, 
  FurnitureDimensions, 
  FurnitureType, 
  FurnitureSubtype, 
  Point, 
  Room 
} from "../types";
import { roundToNearestHalfInch } from "./measurement";

/**
 * Configuration for each furniture type with reusable shape generators
 */
export interface FurnitureConfig {
  type: FurnitureType;
  subtype: FurnitureSubtype;
  name: string;
  description: string;
  icon: string;
  color: string;
  defaultDimensions: FurnitureDimensions;
  minDimensions: Partial<FurnitureDimensions>;
  maxDimensions: Partial<FurnitureDimensions>;
  generateShape: (dimensions: FurnitureDimensions) => Point[];
  generateSVGPath?: (dimensions: FurnitureDimensions) => string;
}

/**
 * Reusable shape generators
 */
const ShapeGenerators = {
  rectangle: (width: number, height: number): Point[] => [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height }
  ],
  
  lShape: (mainWidth: number, mainHeight: number, armWidth: number, armHeight: number): Point[] => [
    { x: 0, y: 0 },
    { x: mainWidth, y: 0 },
    { x: mainWidth, y: armHeight },
    { x: armWidth, y: armHeight },
    { x: armWidth, y: mainHeight },
    { x: 0, y: mainHeight }
  ]
};

/**
 * SVG Path generators for more detailed rendering
 */
const SVGPathGenerators = {
  rectangle: (width: number, height: number): string => 
    `M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z`,
    
  lShape: (mainWidth: number, mainHeight: number, armWidth: number, armHeight: number): string =>
    `M 0 0 L ${mainWidth} 0 L ${mainWidth} ${armHeight} L ${armWidth} ${armHeight} L ${armWidth} ${mainHeight} L 0 ${mainHeight} Z`
};

/**
 * Complete furniture configurations
 */
export const FURNITURE_CONFIGS: Record<FurnitureSubtype, FurnitureConfig> = {
  // DESKS
  'rectangular-desk': {
    type: 'desk',
    subtype: 'rectangular-desk',
    name: 'Rectangular Desk',
    description: 'Standard rectangular desk',
    icon: '🗃️',
    color: '#8b4513',
    defaultDimensions: { width: 60, height: 30, depth: 24 },
    minDimensions: { width: 36, height: 20 },
    maxDimensions: { width: 96, height: 48 },
    generateShape: ({ width, height }) => ShapeGenerators.rectangle(width, height),
    generateSVGPath: ({ width, height }) => SVGPathGenerators.rectangle(width, height)
  },
  
  'l-shaped-desk': {
    type: 'desk',
    subtype: 'l-shaped-desk',
    name: 'L-Shaped Desk',
    description: 'Corner desk with L-shape',
    icon: '📐',
    color: '#8b4513',
    defaultDimensions: { width: 72, height: 48, depth: 24 },
    minDimensions: { width: 48, height: 36, depth: 18 },
    maxDimensions: { width: 96, height: 72, depth: 36 },
    generateShape: ({ width, height, depth = 24 }) => {
      // L-shape: main section uses full width and depth, arm extends from there
      const mainWidth = width;
      const mainHeight = depth; // Main section depth
      const armWidth = depth; // Arm width is the depth
      const armHeight = height; // Arm extends the full height
      return ShapeGenerators.lShape(mainWidth, armHeight, armWidth, mainHeight);
    },
    generateSVGPath: ({ width, height, depth = 24 }) => {
      const mainWidth = width;
      const mainHeight = depth;
      const armWidth = depth;
      const armHeight = height;
      return SVGPathGenerators.lShape(mainWidth, armHeight, armWidth, mainHeight);
    }
  },
  
  // TABLES
  'rectangular-table': {
    type: 'table',
    subtype: 'rectangular-table',
    name: 'Rectangular Table',
    description: 'Standard rectangular table',
    icon: '🪑',
    color: '#654321',
    defaultDimensions: { width: 60, height: 36, depth: 30 },
    minDimensions: { width: 30, height: 30 },
    maxDimensions: { width: 120, height: 60 },
    generateShape: ({ width, height }) => ShapeGenerators.rectangle(width, height),
    generateSVGPath: ({ width, height }) => SVGPathGenerators.rectangle(width, height)
  },
  
  // COUCHES
  'rectangular-couch': {
    type: 'couch',
    subtype: 'rectangular-couch',
    name: 'Rectangular Sofa',
    description: 'Standard rectangular sofa',
    icon: '🛋️',
    color: '#4a5568',
    defaultDimensions: { width: 84, height: 36, depth: 36 },
    minDimensions: { width: 60, height: 30 },
    maxDimensions: { width: 120, height: 48 },
    generateShape: ({ width, height }) => ShapeGenerators.rectangle(width, height),
    generateSVGPath: ({ width, height }) => SVGPathGenerators.rectangle(width, height)
  },
  
  'l-shaped-couch': {
    type: 'couch',
    subtype: 'l-shaped-couch',
    name: 'L-Shaped Sofa',
    description: 'Sectional L-shaped sofa',
    icon: '🛏️',
    color: '#4a5568',
    defaultDimensions: { width: 96, height: 72, depth: 36 },
    minDimensions: { width: 72, height: 60, depth: 30 },
    maxDimensions: { width: 144, height: 96, depth: 48 },
    generateShape: ({ width, height, depth = 36 }) => {
      // L-shape: main section uses full width and depth, arm extends from there
      const mainWidth = width;
      const mainHeight = depth; // Main section depth
      const armWidth = depth; // Arm width is the depth
      const armHeight = height; // Arm extends the full height
      return ShapeGenerators.lShape(mainWidth, armHeight, armWidth, mainHeight);
    },
    generateSVGPath: ({ width, height, depth = 36 }) => {
      const mainWidth = width;
      const mainHeight = depth;
      const armWidth = depth;
      const armHeight = height;
      return SVGPathGenerators.lShape(mainWidth, armHeight, armWidth, mainHeight);
    }
  }
};

/**
 * Get furniture configs grouped by type
 */
export function getFurnitureConfigsByType(): Record<FurnitureType, FurnitureConfig[]> {
  const grouped: Record<FurnitureType, FurnitureConfig[]> = {
    desk: [],
    table: [],
    couch: []
  };
  
  Object.values(FURNITURE_CONFIGS).forEach(config => {
    grouped[config.type].push(config);
  });
  
  return grouped;
}

/**
 * Generate furniture ID
 */
export function generateFurnitureId(): string {
  return `furniture-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new furniture item
 */
export function createFurniture(
  config: FurnitureConfig,
  dimensions: FurnitureDimensions,
  position: Point,
  rotation: number = 0
): FurnitureItem {
  // Round dimensions to nearest half inch
  const roundedDimensions: FurnitureDimensions = {
    width: roundToNearestHalfInch(dimensions.width),
    height: roundToNearestHalfInch(dimensions.height),
    depth: dimensions.depth ? roundToNearestHalfInch(dimensions.depth) : undefined
  };
  
  return {
    id: generateFurnitureId(),
    type: config.type,
    subtype: config.subtype,
    name: config.name,
    position: {
      x: roundToNearestHalfInch(position.x),
      y: roundToNearestHalfInch(position.y)
    },
    rotation: Math.round(rotation / 90) * 90, // Snap to 90-degree increments
    dimensions: roundedDimensions,
    color: config.color
  };
}

/**
 * Get furniture shape vertices with rotation and position applied
 */
export function getFurnitureVertices(furniture: FurnitureItem): Point[] {
  const config = FURNITURE_CONFIGS[furniture.subtype];
  if (!config) return [];
  
  // Generate base shape
  const baseVertices = config.generateShape(furniture.dimensions);
  
  // Apply rotation around center
  const rotatedVertices = applyRotation(baseVertices, furniture.rotation, furniture.dimensions);
  
  // Apply position offset
  return rotatedVertices.map(vertex => ({
    x: vertex.x + furniture.position.x,
    y: vertex.y + furniture.position.y
  }));
}

/**
 * Apply rotation to vertices around the center of the furniture
 */
function applyRotation(vertices: Point[], rotation: number, dimensions: FurnitureDimensions): Point[] {
  if (rotation === 0) return vertices;
  
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  
  return vertices.map(vertex => {
    // Rotate around origin (vertices are already centered for circles/ovals)
    const rotatedX = vertex.x * cos - vertex.y * sin;
    const rotatedY = vertex.x * sin + vertex.y * cos;
    
    return {
      x: rotatedX + dimensions.width / 2,
      y: rotatedY + dimensions.height / 2
    };
  });
}

/**
 * Get furniture bounding box (axis-aligned, after rotation)
 */
export function getFurnitureBoundingBox(furniture: FurnitureItem): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  const vertices = getFurnitureVertices(furniture);
  
  if (vertices.length === 0) {
    return {
      minX: furniture.position.x,
      minY: furniture.position.y,
      maxX: furniture.position.x,
      maxY: furniture.position.y,
      width: 0,
      height: 0
    };
  }
  
  const xs = vertices.map(v => v.x);
  const ys = vertices.map(v => v.y);
  
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Validate furniture dimensions against config constraints
 */
export function validateFurnitureDimensions(
  config: FurnitureConfig,
  dimensions: FurnitureDimensions
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check width
  if (config.minDimensions.width && dimensions.width < config.minDimensions.width) {
    errors.push(`Width must be at least ${config.minDimensions.width} inches`);
  }
  if (config.maxDimensions.width && dimensions.width > config.maxDimensions.width) {
    errors.push(`Width cannot exceed ${config.maxDimensions.width} inches`);
  }
  
  // Check height
  if (config.minDimensions.height && dimensions.height < config.minDimensions.height) {
    errors.push(`Height must be at least ${config.minDimensions.height} inches`);
  }
  if (config.maxDimensions.height && dimensions.height > config.maxDimensions.height) {
    errors.push(`Height cannot exceed ${config.maxDimensions.height} inches`);
  }
  
  // Check depth if applicable
  if (dimensions.depth) {
    if (config.minDimensions.depth && dimensions.depth < config.minDimensions.depth) {
      errors.push(`Depth must be at least ${config.minDimensions.depth} inches`);
    }
    if (config.maxDimensions.depth && dimensions.depth > config.maxDimensions.depth) {
      errors.push(`Depth cannot exceed ${config.maxDimensions.depth} inches`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Snap furniture position to half-inch grid
 */
export function snapFurniturePosition(position: Point): Point {
  return {
    x: roundToNearestHalfInch(position.x),
    y: roundToNearestHalfInch(position.y)
  };
}