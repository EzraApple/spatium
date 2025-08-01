"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import type { FurnitureConfig } from "../lib/furniture";
import type { FurnitureDimensions } from "../types";
import { validateFurnitureDimensions } from "../lib/furniture";
import { formatInches } from "../lib/measurement";

interface FurnitureDimensionModalProps {
  isOpen: boolean;
  furnitureConfig: FurnitureConfig | null;
  onClose: () => void;
  onConfirm: (dimensions: FurnitureDimensions) => void;
}

export function FurnitureDimensionModal({
  isOpen,
  furnitureConfig,
  onClose,
  onConfirm
}: FurnitureDimensionModalProps) {
  const [dimensions, setDimensions] = useState<FurnitureDimensions>({
    width: 60,
    height: 30,
    depth: 24
  });
  const [errors, setErrors] = useState<string[]>([]);

  // Reset dimensions when config changes
  useEffect(() => {
    if (furnitureConfig) {
      setDimensions({ ...furnitureConfig.defaultDimensions });
      setErrors([]);
    }
  }, [furnitureConfig]);

  // Validate dimensions when they change
  useEffect(() => {
    if (furnitureConfig) {
      const validation = validateFurnitureDimensions(furnitureConfig, dimensions);
      setErrors(validation.errors);
    }
  }, [furnitureConfig, dimensions]);

  const handleInputChange = (field: keyof FurnitureDimensions, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      setDimensions(prev => ({
        ...prev,
        [field]: numValue
      }));
    }
  };

  const handleConfirm = () => {
    if (errors.length === 0) {
      onConfirm(dimensions);
      onClose();
    }
  };

  const handleCancel = () => {
    onClose();
  };

  if (!furnitureConfig) return null;

  // Generate preview shape path
  const generatePreviewPath = (): string => {
    if (furnitureConfig.generateSVGPath) {
      return furnitureConfig.generateSVGPath(dimensions);
    }
    
    // Fallback to rectangle
    return `M 0 0 L ${dimensions.width} 0 L ${dimensions.width} ${dimensions.height} L 0 ${dimensions.height} Z`;
  };

  // Scale dimensions for preview (max 200px wide/tall)
  const getPreviewScale = (): number => {
    const maxDimension = Math.max(dimensions.width, dimensions.height);
    return Math.min(200 / maxDimension, 1);
  };

  const previewScale = getPreviewScale();
  const previewWidth = dimensions.width * previewScale;
  const previewHeight = dimensions.height * previewScale;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{furnitureConfig.icon}</span>
            <span>Configure {furnitureConfig.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preview Section */}
          <div className="flex flex-col items-center space-y-3">
            <h3 className="text-sm font-medium text-slate-900">Preview</h3>
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <svg
                width={Math.max(previewWidth, 50)}
                height={Math.max(previewHeight, 50)}
                viewBox={`0 0 ${Math.max(dimensions.width, 50 / previewScale)} ${Math.max(dimensions.height, 50 / previewScale)}`}
                className="border border-slate-300"
              >
                <path
                  d={generatePreviewPath()}
                  fill={furnitureConfig.color}
                  fillOpacity={0.3}
                  stroke={furnitureConfig.color}
                  strokeWidth={2 / previewScale}
                />
              </svg>
            </div>
            <div className="text-xs text-slate-600 text-center">
              <div>{formatInches(dimensions.width)} × {formatInches(dimensions.height)}</div>
              {dimensions.depth && <div>Depth: {formatInches(dimensions.depth)}</div>}
            </div>
          </div>

          {/* Dimension Inputs */}
          <div className={`grid gap-4 ${furnitureConfig.defaultDimensions.depth ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <div className="space-y-2">
              <Label htmlFor="width">Width (inches)</Label>
              <Input
                id="width"
                type="number"
                value={dimensions.width}
                onChange={(e) => handleInputChange('width', e.target.value)}
                min={furnitureConfig.minDimensions.width || 12}
                max={furnitureConfig.maxDimensions.width || 200}
                step={0.5}
                className={errors.some(e => e.includes('Width')) ? 'border-red-500' : ''}
              />
              {furnitureConfig.minDimensions.width && (
                <div className="text-xs text-slate-500">
                  Min: {furnitureConfig.minDimensions.width}"
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="height">Height (inches)</Label>
              <Input
                id="height"
                type="number"
                value={dimensions.height}
                onChange={(e) => handleInputChange('height', e.target.value)}
                min={furnitureConfig.minDimensions.height || 12}
                max={furnitureConfig.maxDimensions.height || 200}
                step={0.5}
                className={errors.some(e => e.includes('Height')) ? 'border-red-500' : ''}
              />
              {furnitureConfig.minDimensions.height && (
                <div className="text-xs text-slate-500">
                  Min: {furnitureConfig.minDimensions.height}"
                </div>
              )}
            </div>

            {/* Show depth input for 3D furniture */}
            {furnitureConfig.defaultDimensions.depth && (
              <div className="space-y-2">
                <Label htmlFor="depth">Depth (inches)</Label>
                <Input
                  id="depth"
                  type="number"
                  value={dimensions.depth || furnitureConfig.defaultDimensions.depth}
                  onChange={(e) => handleInputChange('depth', e.target.value)}
                  min={furnitureConfig.minDimensions.depth || 12}
                  max={furnitureConfig.maxDimensions.depth || 200}
                  step={0.5}
                  className={errors.some(e => e.includes('Depth')) ? 'border-red-500' : ''}
                />
                {furnitureConfig.minDimensions.depth && (
                  <div className="text-xs text-slate-500">
                    Min: {furnitureConfig.minDimensions.depth}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="space-y-1">
              {errors.map((error, index) => (
                <div key={index} className="text-sm text-red-600 flex items-center gap-1">
                  <span className="text-red-500">⚠</span>
                  {error}
                </div>
              ))}
            </div>
          )}

          {/* Furniture Description */}
          {furnitureConfig.description && (
            <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md">
              {furnitureConfig.description}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={errors.length > 0}
            className="flex-1 bg-slate-900 hover:bg-slate-800"
          >
            Add Furniture
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}