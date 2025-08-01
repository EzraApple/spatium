import type { Point } from "../types";
import { roundToNearestHalfInch } from "./measurement";

/**
 * Orthogonal polygon utilities for rooms with 90-degree angles only
 */

export interface ShapeConfig {
  name: string;
  minDimensions: string[]; // Required dimensions to define the shape
  defaultDimensions: Record<string, number>;
  generateVertices: (dimensions: Record<string, number>) => Point[];
}

/**
 * Calculate wall segments from vertices
 */
export function getWallSegments(vertices: Point[]): Array<{
  start: Point;
  end: Point;
  length: number;
  direction: 'horizontal' | 'vertical';
  index: number;
}> {
  if (vertices.length < 3) return [];
  
  const walls = [];
  for (let i = 0; i < vertices.length; i++) {
    const start = vertices[i]!;
    const end = vertices[(i + 1) % vertices.length]!;
    
    const isHorizontal = Math.abs(start.y - end.y) < 0.1;
    const length = isHorizontal 
      ? Math.abs(end.x - start.x)
      : Math.abs(end.y - start.y);
    
    walls.push({
      start,
      end,
      length: roundToNearestHalfInch(length),
      direction: isHorizontal ? 'horizontal' : 'vertical',
      index: i
    });
  }
  
  return walls;
}

/**
 * Calculate area of orthogonal polygon using shoelace formula
 */
export function calculateOrthogonalArea(vertices: Point[]): number {
  if (vertices.length < 3) return 0;
  
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const current = vertices[i]!;
    const next = vertices[(i + 1) % vertices.length]!;
    area += current.x * next.y - next.x * current.y;
  }
  
  return Math.abs(area) / 2;
}

/**
 * Get bounding box of vertices
 */
export function getBoundingBox(vertices: Point[]): { widthInches: number; heightInches: number } {
  if (vertices.length === 0) return { widthInches: 0, heightInches: 0 };
  
  const xs = vertices.map(v => v.x);
  const ys = vertices.map(v => v.y);
  
  return {
    widthInches: Math.max(...xs) - Math.min(...xs),
    heightInches: Math.max(...ys) - Math.min(...ys)
  };
}

/**
 * Shape Templates - Each shape is defined by minimum required dimensions
 */
export const SHAPE_CONFIGS: Record<string, ShapeConfig> = {
  box: {
    name: "Rectangle",
    minDimensions: ['width', 'height'],
    defaultDimensions: { width: 144, height: 120 },
    generateVertices: ({ width, height }) => [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height }
    ]
  },
  
  'L-shape': {
    name: "L-Shape (Elbow)",
    minDimensions: ['mainWidth', 'mainHeight', 'armWidth', 'armHeight'],
    defaultDimensions: { 
      mainWidth: 144,   // Main rectangle width
      mainHeight: 120,  // Main rectangle height  
      armWidth: 72,     // Extension width
      armHeight: 60     // Extension height
    },
    generateVertices: ({ mainWidth, mainHeight, armWidth, armHeight }) => [
      { x: 0, y: 0 },
      { x: mainWidth, y: 0 },
      { x: mainWidth, y: armHeight },
      { x: armWidth, y: armHeight },
      { x: armWidth, y: mainHeight },
      { x: 0, y: mainHeight }
    ]
  },
  
  'U-shape': {
    name: "U-Shape",
    minDimensions: ['totalWidth', 'totalHeight', 'cutoutWidth', 'cutoutDepth'],
    defaultDimensions: {
      totalWidth: 200,   // Total width
      totalHeight: 120,  // Total height
      cutoutWidth: 80,   // Width of center cutout
      cutoutDepth: 60    // Depth of center cutout from top
    },
    generateVertices: ({ totalWidth, totalHeight, cutoutWidth, cutoutDepth }) => {
      const sideWidth = (totalWidth - cutoutWidth) / 2;
      return [
        { x: 0, y: 0 },
        { x: totalWidth, y: 0 },
        { x: totalWidth, y: totalHeight },
        { x: totalWidth - sideWidth, y: totalHeight },
        { x: totalWidth - sideWidth, y: cutoutDepth },
        { x: sideWidth, y: cutoutDepth },
        { x: sideWidth, y: totalHeight },
        { x: 0, y: totalHeight }
      ];
    }
  },
  
  'T-shape': {
    name: "T-Shape", 
    minDimensions: ['topWidth', 'topHeight', 'stemWidth', 'stemHeight'],
    defaultDimensions: {
      topWidth: 200,     // Width of top bar
      topHeight: 60,     // Height of top bar
      stemWidth: 80,     // Width of vertical stem
      stemHeight: 120    // Height of vertical stem
    },
    generateVertices: ({ topWidth, topHeight, stemWidth, stemHeight }) => {
      const stemOffset = (topWidth - stemWidth) / 2;
      return [
        { x: 0, y: 0 },
        { x: topWidth, y: 0 },
        { x: topWidth, y: topHeight },
        { x: stemOffset + stemWidth, y: topHeight },
        { x: stemOffset + stemWidth, y: topHeight + stemHeight },
        { x: stemOffset, y: topHeight + stemHeight },
        { x: stemOffset, y: topHeight },
        { x: 0, y: topHeight }
      ];
    }
  }
};

/**
 * Validate shape dimensions
 */
export function validateShapeDimensions(
  shapeType: string, 
  dimensions: Record<string, number>
): { isValid: boolean; errors: string[] } {
  const config = SHAPE_CONFIGS[shapeType];
  const errors: string[] = [];
  
  if (!config) {
    errors.push("Invalid shape type");
    return { isValid: false, errors };
  }
  
  // Check all required dimensions are provided and positive
  for (const dimName of config.minDimensions) {
    const value = dimensions[dimName];
    if (value === undefined || value === null) {
      errors.push(`${dimName} is required`);
    } else if (value <= 0) {
      errors.push(`${dimName} must be positive`);
    } else if (value < 12) {
      errors.push(`${dimName} must be at least 12 inches`);
    } else if (value > 1200) {
      errors.push(`${dimName} cannot exceed 1200 inches (100 feet)`);
    }
  }
  
  // Shape-specific validations
  if (shapeType === 'L-shape') {
    const { mainWidth, mainHeight, armWidth, armHeight } = dimensions;
    if (armWidth >= mainWidth) {
      errors.push("Arm width must be less than main width");
    }
    if (armHeight >= mainHeight) {
      errors.push("Arm height must be less than main height");
    }
  }
  
  if (shapeType === 'U-shape') {
    const { totalWidth, cutoutWidth, cutoutDepth, totalHeight } = dimensions;
    if (cutoutWidth >= totalWidth) {
      errors.push("Cutout width must be less than total width");
    }
    if (cutoutDepth >= totalHeight) {
      errors.push("Cutout depth must be less than total height");
    }
    if ((totalWidth - cutoutWidth) < 24) {
      errors.push("Side walls must be at least 12 inches each (24 inches total)");
    }
  }
  
  if (shapeType === 'T-shape') {
    const { topWidth, stemWidth } = dimensions;
    if (stemWidth >= topWidth) {
      errors.push("Stem width must be less than top width");
    }
    if ((topWidth - stemWidth) < 24) {
      errors.push("Top overhang must be at least 12 inches on each side");
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

/**
 * Generate vertices for a shape with given dimensions
 */
export function generateShapeVertices(
  shapeType: string, 
  dimensions: Record<string, number>
): Point[] {
  const config = SHAPE_CONFIGS[shapeType];
  if (!config) return [];
  
  // Round all dimensions to nearest half inch
  const roundedDimensions: Record<string, number> = {};
  for (const [key, value] of Object.entries(dimensions)) {
    roundedDimensions[key] = roundToNearestHalfInch(value);
  }
  
  return config.generateVertices(roundedDimensions);
}

/**
 * Get friendly dimension labels for UI
 */
export function getDimensionLabels(shapeType: string): Record<string, string> {
  const labels: Record<string, Record<string, string>> = {
    box: {
      width: "Width",
      height: "Height"
    },
    'L-shape': {
      mainWidth: "Main Width", 
      mainHeight: "Main Height",
      armWidth: "Arm Width",
      armHeight: "Arm Height"
    },
    'U-shape': {
      totalWidth: "Total Width",
      totalHeight: "Total Height", 
      cutoutWidth: "Cutout Width",
      cutoutDepth: "Cutout Depth"
    },
    'T-shape': {
      topWidth: "Top Width",
      topHeight: "Top Height",
      stemWidth: "Stem Width", 
      stemHeight: "Stem Height"
    }
  };
  
  return labels[shapeType] || {};
}