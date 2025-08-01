import { useState, useCallback, useEffect, useRef } from "react";
import type { FurnitureItem, Room, Point, FurnitureDimensions } from "../types";
import { 
  createFurniture, 
  snapFurniturePosition, 
  FURNITURE_CONFIGS, 
  type FurnitureConfig 
} from "../lib/furniture";
import { pixelsToInches, inchesToPixels } from "../lib/measurement";
import { 
  isValidFurniturePlacement, 
  findNearestValidPosition,
  canRotateFurniture
} from "../lib/furniture-collision";

export type PlacementMode = 'idle' | 'placing' | 'moving';

export interface FurniturePlacementState {
  mode: PlacementMode;
  furnitureBeingPlaced: FurnitureItem | null;
  mousePosition: Point;
  isValidPlacement: boolean;
  placementReasons: string[];
}

export interface UseFurniturePlacementProps {
  room: Room | null;
  furniture: FurnitureItem[];
  onFurnitureAdd: (furniture: FurnitureItem) => void;
  onFurnitureUpdate: (furniture: FurnitureItem) => void;
  onFurnitureRemove: (furnitureId: string) => void;
}

export function useFurniturePlacement({
  room,
  furniture,
  onFurnitureAdd,
  onFurnitureUpdate,
  onFurnitureRemove
}: UseFurniturePlacementProps) {
  const [placementState, setPlacementState] = useState<FurniturePlacementState>({
    mode: 'idle',
    furnitureBeingPlaced: null,
    mousePosition: { x: 0, y: 0 },
    isValidPlacement: false,
    placementReasons: []
  });

  const mousePositionRef = useRef<Point>({ x: 0, y: 0 });
  const lastValidPositionRef = useRef<Point | null>(null);

  // Update mouse position and validate placement
  const updateMousePosition = useCallback((clientX: number, clientY: number, canvasElement: HTMLElement, zoom: number = 1, pan: { x: number; y: number } = { x: 0, y: 0 }) => {
    if (!room) return;

    // Convert screen coordinates to canvas coordinates
    const rect = canvasElement.getBoundingClientRect();
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;

    // Account for zoom and pan transforms to get world coordinates
    const worldX = (canvasX - pan.x) / zoom;
    const worldY = (canvasY - pan.y) / zoom;

    // The room is centered in a 4000x4000 canvas at position 2000,2000
    // The room's CENTER is at (2000, 2000), so we need to calculate the room's top-left corner
    const canvasCenterX = 2000;
    const canvasCenterY = 2000;
    
    // Calculate room's top-left corner in canvas coordinates
    const roomWidthPixels = inchesToPixels(room.boundingBox.widthInches);
    const roomHeightPixels = inchesToPixels(room.boundingBox.heightInches);
    const roomTopLeftX = canvasCenterX - (roomWidthPixels / 2);
    const roomTopLeftY = canvasCenterY - (roomHeightPixels / 2);
    
    // Room coordinates relative to room's top-left corner (in pixels)
    const roomPixelX = worldX - roomTopLeftX;
    const roomPixelY = worldY - roomTopLeftY;
    
    // Convert pixels to inches for room coordinates
    const roomX = pixelsToInches(roomPixelX);
    const roomY = pixelsToInches(roomPixelY);

    const snappedPosition = snapFurniturePosition({ x: roomX, y: roomY });
    mousePositionRef.current = snappedPosition;

    // Update placement state if we're in placing or moving mode
    if ((placementState.mode === 'placing' || placementState.mode === 'moving') && placementState.furnitureBeingPlaced) {
      // Center the furniture on the mouse cursor
      const centeredPosition = {
        x: snappedPosition.x - placementState.furnitureBeingPlaced.dimensions.width / 2,
        y: snappedPosition.y - placementState.furnitureBeingPlaced.dimensions.height / 2
      };

      const updatedFurniture: FurnitureItem = {
        ...placementState.furnitureBeingPlaced,
        position: centeredPosition
      };

      const validation = isValidFurniturePlacement(updatedFurniture, room, furniture);
      
      setPlacementState(prev => ({
        ...prev,
        furnitureBeingPlaced: updatedFurniture,
        mousePosition: snappedPosition,
        isValidPlacement: validation.isValid,
        placementReasons: validation.reasons
      }));

      // Store last valid position for fallback
      if (validation.isValid) {
        lastValidPositionRef.current = snappedPosition;
      }
    } else {
      setPlacementState(prev => ({
        ...prev,
        mousePosition: snappedPosition
      }));
    }
  }, [room, furniture, placementState.mode, placementState.furnitureBeingPlaced]);

  // Start placing new furniture
  const startPlacement = useCallback((config: FurnitureConfig, dimensions: FurnitureDimensions) => {
    if (!room) return;



    // Center the furniture on the current mouse position
    const centeredPosition = {
      x: mousePositionRef.current.x - dimensions.width / 2,
      y: mousePositionRef.current.y - dimensions.height / 2
    };

    const newFurniture = createFurniture(
      config,
      dimensions,
      centeredPosition,
      0 // Initial rotation
    );

    const validation = isValidFurniturePlacement(newFurniture, room, furniture);

    setPlacementState({
      mode: 'placing',
      furnitureBeingPlaced: newFurniture,
      mousePosition: mousePositionRef.current,
      isValidPlacement: validation.isValid,
      placementReasons: validation.reasons
    });

    lastValidPositionRef.current = validation.isValid ? centeredPosition : null;

  }, [room, furniture]);

  // Start moving existing furniture
  const startMoving = useCallback((furnitureId: string) => {
    const existingFurniture = furniture.find(f => f.id === furnitureId);
    if (!existingFurniture || !room) return;



    // Remove from current list for collision checking
    const otherFurniture = furniture.filter(f => f.id !== furnitureId);

    const validation = isValidFurniturePlacement(existingFurniture, room, otherFurniture);

    setPlacementState({
      mode: 'moving',
      furnitureBeingPlaced: existingFurniture,
      mousePosition: existingFurniture.position,
      isValidPlacement: validation.isValid,
      placementReasons: validation.reasons
    });

    lastValidPositionRef.current = existingFurniture.position;

  }, [furniture, room]);

  // Confirm placement
  const confirmPlacement = useCallback(() => {
    if (!placementState.furnitureBeingPlaced || !room) return;

    const furnitureToPlace = placementState.furnitureBeingPlaced;

    // Try to place at current position, or find nearest valid position
    let finalPosition = furnitureToPlace.position;
    
    if (!placementState.isValidPlacement) {
      const otherFurniture = placementState.mode === 'moving' 
        ? furniture.filter(f => f.id !== furnitureToPlace.id)
        : furniture;
        
      const nearestValid = findNearestValidPosition(furnitureToPlace, room, otherFurniture);
      
      if (nearestValid) {
        finalPosition = nearestValid;
      } else if (lastValidPositionRef.current) {
        finalPosition = lastValidPositionRef.current;
      } else {
        // Cannot place furniture anywhere
        cancelPlacement();
        return;
      }
    }

    const finalFurniture: FurnitureItem = {
      ...furnitureToPlace,
      position: finalPosition
    };

    if (placementState.mode === 'placing') {
      onFurnitureAdd(finalFurniture);
    } else if (placementState.mode === 'moving') {
      onFurnitureUpdate(finalFurniture);
    }

    // Reset state
    setPlacementState({
      mode: 'idle',
      furnitureBeingPlaced: null,
      mousePosition: mousePositionRef.current,
      isValidPlacement: false,
      placementReasons: []
    });

    lastValidPositionRef.current = null;
  }, [placementState, room, furniture, onFurnitureAdd, onFurnitureUpdate]);

  // Cancel placement
  const cancelPlacement = useCallback(() => {
    setPlacementState({
      mode: 'idle',
      furnitureBeingPlaced: null,
      mousePosition: mousePositionRef.current,
      isValidPlacement: false,
      placementReasons: []
    });
    lastValidPositionRef.current = null;
  }, []);

  // Rotate furniture being placed
  const rotateFurniture = useCallback((direction: 'clockwise' | 'counterclockwise') => {
    if (!placementState.furnitureBeingPlaced || !room) return;

    const currentRotation = placementState.furnitureBeingPlaced.rotation;
    const rotationChange = direction === 'clockwise' ? 90 : -90;
    const newRotation = (currentRotation + rotationChange + 360) % 360;

    const rotatedFurniture: FurnitureItem = {
      ...placementState.furnitureBeingPlaced,
      rotation: newRotation
    };

    // Check if rotation is valid at current position
    const otherFurniture = placementState.mode === 'moving' 
      ? furniture.filter(f => f.id !== rotatedFurniture.id)
      : furniture;

    const canRotate = canRotateFurniture(rotatedFurniture, newRotation, room, otherFurniture);

    if (canRotate) {
      const validation = isValidFurniturePlacement(rotatedFurniture, room, otherFurniture);
      
      setPlacementState(prev => ({
        ...prev,
        furnitureBeingPlaced: rotatedFurniture,
        isValidPlacement: validation.isValid,
        placementReasons: validation.reasons
      }));

      if (validation.isValid) {
        lastValidPositionRef.current = rotatedFurniture.position;
      }
    }
  }, [placementState.furnitureBeingPlaced, room, furniture, placementState.mode]);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (placementState.mode === 'idle') return;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        cancelPlacement();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        event.stopPropagation();
        rotateFurniture('counterclockwise');
        break;
      case 'ArrowRight':
        event.preventDefault();
        event.stopPropagation();
        rotateFurniture('clockwise');
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        event.stopPropagation();
        confirmPlacement();
        break;
    }
  }, [placementState.mode, cancelPlacement, rotateFurniture, confirmPlacement]);

  // Handle mouse clicks
  const handleCanvasClick = useCallback((clientX: number, clientY: number, canvasElement: HTMLElement, zoom: number = 1, pan: { x: number; y: number } = { x: 0, y: 0 }) => {
    updateMousePosition(clientX, clientY, canvasElement, zoom, pan);

    if (placementState.mode === 'placing' || placementState.mode === 'moving') {
      confirmPlacement();
    }
  }, [placementState.mode, updateMousePosition, confirmPlacement]);

  // Handle furniture clicks
  const handleFurnitureClick = useCallback((furnitureId: string) => {
    if (placementState.mode !== 'idle') {
      // If we're already placing/moving something, confirm current placement first
      confirmPlacement();
    }
    
    // Start moving the clicked furniture
    setTimeout(() => {
      startMoving(furnitureId);
    }, 0);
  }, [placementState.mode, confirmPlacement, startMoving]);

  // Handle mouse move
  const handleCanvasMouseMove = useCallback((clientX: number, clientY: number, canvasElement: HTMLElement, zoom: number = 1, pan: { x: number; y: number } = { x: 0, y: 0 }) => {
    updateMousePosition(clientX, clientY, canvasElement, zoom, pan);
  }, [updateMousePosition]);

  // Set up keyboard event listeners
  useEffect(() => {
    if (placementState.mode !== 'idle') {
      // Use capture phase to ensure we get the events first
      document.addEventListener('keydown', handleKeyDown, { capture: true });
      
      // Also try adding to window as fallback
      window.addEventListener('keydown', handleKeyDown, { capture: true });
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown, { capture: true });
        window.removeEventListener('keydown', handleKeyDown, { capture: true });
      };
    }
  }, [placementState.mode, handleKeyDown]);

  // Delete furniture
  const deleteFurniture = useCallback((furnitureId: string) => {
    onFurnitureRemove(furnitureId);
  }, [onFurnitureRemove]);

  // Check if a specific furniture item is being placed/moved
  const isFurnitureActive = useCallback((furnitureId: string): boolean => {
    return placementState.furnitureBeingPlaced?.id === furnitureId;
  }, [placementState.furnitureBeingPlaced]);

  // Get furniture item for rendering (with potential position updates during placement)
  const getFurnitureForRendering = useCallback((furnitureId: string): FurnitureItem | null => {
    if (placementState.furnitureBeingPlaced?.id === furnitureId) {
      return placementState.furnitureBeingPlaced;
    }
    return furniture.find(f => f.id === furnitureId) || null;
  }, [furniture, placementState.furnitureBeingPlaced]);

  return {
    // State
    placementState,
    
    // Actions
    startPlacement,
    startMoving,
    confirmPlacement,
    cancelPlacement,
    rotateFurniture,
    deleteFurniture,
    
    // Event handlers
    handleCanvasClick,
    handleCanvasMouseMove,
    handleFurnitureClick,
    
    // Utilities
    isFurnitureActive,
    getFurnitureForRendering,
    
    // For external components to check state
    isPlacing: placementState.mode === 'placing',
    isMoving: placementState.mode === 'moving',
    isActive: placementState.mode !== 'idle'
  };
}