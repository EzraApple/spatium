"use client";

import { memo } from "react";
import type { FurnitureItem } from "../types";
import { getFurnitureVertices, FURNITURE_CONFIGS } from "../lib/furniture";
import { inchesToPixels } from "../lib/measurement";

interface FurnitureRendererProps {
  furniture: FurnitureItem;
  isSelected?: boolean;
  isPlacing?: boolean;
  isMoving?: boolean;
  isInvalid?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
}

export const FurnitureRenderer = memo(function FurnitureRenderer({
  furniture,
  isSelected = false,
  isPlacing = false,
  isMoving = false,
  isInvalid = false,
  onClick,
  onDoubleClick
}: FurnitureRendererProps) {
  const config = FURNITURE_CONFIGS[furniture.subtype];
  if (!config) return null;

  // Get vertices for the furniture shape
  const vertices = getFurnitureVertices(furniture);
  if (vertices.length === 0) return null;

  // Convert vertices to pixel coordinates
  const pixelVertices = vertices.map(vertex => ({
    x: inchesToPixels(vertex.x),
    y: inchesToPixels(vertex.y)
  }));

  // Create SVG path for the furniture shape
  const pathData = pixelVertices.reduce((path, vertex, index) => {
    const command = index === 0 ? 'M' : 'L';
    return `${path} ${command} ${vertex.x} ${vertex.y}`;
  }, '') + ' Z';

  // Use SVG path if available, otherwise use vertex-based path
  const finalPath = config.generateSVGPath ? 
    scaleSVGPath(config.generateSVGPath(furniture.dimensions), inchesToPixels(1)) : 
    pathData;

  // Determine visual state styles
  const getStyles = () => {
    let opacity = 1;
    let fillOpacity = 0.8;
    let strokeOpacity = 1;
    let strokeWidth = 2;
    let fill = furniture.color;
    let stroke = furniture.color;
    let filter = '';

    // Placing/moving state
    if (isPlacing || isMoving) {
      opacity = 0.7;
      fillOpacity = 0.3;
      strokeOpacity = 0.6;
      strokeWidth = 3;
      
      // Add dashed stroke for placing/moving
      stroke = isInvalid ? '#ef4444' : '#3b82f6';
      filter = 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))';
    }

    // Invalid placement
    if (isInvalid) {
      fill = '#fca5a5'; // Red tint
      stroke = '#ef4444';
      fillOpacity = 0.5;
    }

    // Selected state
    if (isSelected && !isPlacing && !isMoving) {
      strokeWidth = 3;
      stroke = '#3b82f6';
      filter = 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.5))';
    }

    return {
      opacity,
      fillOpacity,
      strokeOpacity,
      strokeWidth,
      fill,
      stroke,
      filter
    };
  };

  const styles = getStyles();

  // Calculate furniture center for label positioning
  const centerX = inchesToPixels(furniture.position.x + furniture.dimensions.width / 2);
  const centerY = inchesToPixels(furniture.position.y + furniture.dimensions.height / 2);

  return (
    <g
      style={{
        opacity: styles.opacity,
        filter: styles.filter,
        cursor: isPlacing || isMoving ? 'none' : 'pointer'
      }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {/* Main furniture shape */}
      <path
        d={finalPath}
        fill={styles.fill}
        fillOpacity={styles.fillOpacity}
        stroke={styles.stroke}
        strokeWidth={styles.strokeWidth}
        strokeOpacity={styles.strokeOpacity}
        strokeDasharray={isPlacing || isMoving ? '8,4' : undefined}
        transform={`translate(${inchesToPixels(furniture.position.x)}, ${inchesToPixels(furniture.position.y)})`}
      />

      {/* Furniture label (icon + name) */}
      {!isPlacing && !isMoving && (
        <g transform={`translate(${centerX}, ${centerY})`}>
          {/* Background for label */}
          <rect
            x={-25}
            y={-8}
            width={50}
            height={16}
            fill="white"
            fillOpacity={0.9}
            rx={4}
            stroke={styles.stroke}
            strokeWidth={1}
          />
          
          {/* Furniture icon */}
          <text
            x={-15}
            y={3}
            textAnchor="middle"
            fontSize="12"
            fill={styles.stroke}
          >
            {config.icon}
          </text>
          
          {/* Furniture type indicator */}
          <text
            x={8}
            y={3}
            textAnchor="middle"
            fontSize="8"
            fill={styles.stroke}
            fontWeight="medium"
          >
            {config.type.charAt(0).toUpperCase()}
          </text>
        </g>
      )}

      {/* Editing state indicator */}
      {(isPlacing || isMoving) && (
        <g transform={`translate(${centerX}, ${centerY - 15})`}>
          <rect
            x={-30}
            y={-8}
            width={60}
            height={16}
            fill="#3b82f6"
            fillOpacity={0.9}
            rx={4}
          />
          <text
            x={0}
            y={3}
            textAnchor="middle"
            fontSize="10"
            fill="white"
            fontWeight="medium"
          >
            {isMoving ? 'MOVING' : 'PLACING'}
          </text>
        </g>
      )}

      {/* Rotation indicator for non-0 rotation */}
      {furniture.rotation !== 0 && !isPlacing && !isMoving && (
        <g transform={`translate(${centerX + 20}, ${centerY - 20})`}>
          <circle
            cx={0}
            cy={0}
            r={8}
            fill="white"
            fillOpacity={0.9}
            stroke={styles.stroke}
            strokeWidth={1}
          />
          <text
            x={0}
            y={3}
            textAnchor="middle"
            fontSize="8"
            fill={styles.stroke}
            fontWeight="bold"
          >
            {furniture.rotation}°
          </text>
        </g>
      )}

      {/* Selection handles for selected furniture */}
      {isSelected && !isPlacing && !isMoving && (
        <g>
          {/* Corner handles */}
          {getCornerHandles(furniture).map((handle, index) => (
            <rect
              key={index}
              x={inchesToPixels(handle.x) - 3}
              y={inchesToPixels(handle.y) - 3}
              width={6}
              height={6}
              fill="white"
              stroke="#3b82f6"
              strokeWidth={2}
              rx={1}
            />
          ))}
        </g>
      )}

      {/* Invalid placement warning */}
      {isInvalid && (isPlacing || isMoving) && (
        <g transform={`translate(${centerX}, ${centerY + 25})`}>
          <rect
            x={-40}
            y={-8}
            width={80}
            height={16}
            fill="#fee2e2"
            stroke="#ef4444"
            strokeWidth={1}
            rx={4}
          />
          <text
            x={0}
            y={3}
            textAnchor="middle"
            fontSize="10"
            fill="#dc2626"
            fontWeight="medium"
          >
            ⚠ Cannot place here
          </text>
        </g>
      )}
    </g>
  );
});

/**
 * Scale SVG path coordinates by a factor
 */
function scaleSVGPath(path: string, scale: number): string {
  return path.replace(/([ML])\s*([\d.-]+)\s*([\d.-]+)/g, (match, command, x, y) => {
    const scaledX = parseFloat(x) * scale;
    const scaledY = parseFloat(y) * scale;
    return `${command} ${scaledX} ${scaledY}`;
  });
}

/**
 * Get corner handle positions for selected furniture
 */
function getCornerHandles(furniture: FurnitureItem): Array<{ x: number; y: number }> {
  const vertices = getFurnitureVertices(furniture);
  if (vertices.length === 0) return [];

  // For complex shapes, just use bounding box corners
  const xs = vertices.map(v => v.x);
  const ys = vertices.map(v => v.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return [
    { x: minX, y: minY }, // Top-left
    { x: maxX, y: minY }, // Top-right
    { x: maxX, y: maxY }, // Bottom-right
    { x: minX, y: maxY }  // Bottom-left
  ];
}

/**
 * Furniture list renderer for multiple furniture items
 */
interface FurnitureListRendererProps {
  furniture: FurnitureItem[];
  selectedFurnitureId?: string;
  placingFurnitureId?: string;
  movingFurnitureId?: string;
  invalidFurnitureIds?: Set<string>;
  onFurnitureClick?: (furnitureId: string) => void;
  onFurnitureDoubleClick?: (furnitureId: string) => void;
}

export const FurnitureListRenderer = memo(function FurnitureListRenderer({
  furniture,
  selectedFurnitureId,
  placingFurnitureId,
  movingFurnitureId,
  invalidFurnitureIds = new Set(),
  onFurnitureClick,
  onFurnitureDoubleClick
}: FurnitureListRendererProps) {
  // Defensive check for furniture array
  if (!furniture || !Array.isArray(furniture)) {
    return <g />;
  }

  return (
    <g>
      {furniture.map((item) => (
        <FurnitureRenderer
          key={item.id}
          furniture={item}
          isSelected={selectedFurnitureId === item.id}
          isPlacing={placingFurnitureId === item.id}
          isMoving={movingFurnitureId === item.id}
          isInvalid={invalidFurnitureIds.has(item.id)}
          onClick={() => onFurnitureClick?.(item.id)}
          onDoubleClick={() => onFurnitureDoubleClick?.(item.id)}
        />
      ))}
    </g>
  );
});