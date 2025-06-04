"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Table, Circle, Bed, Sofa } from "lucide-react"

export type FurnitureType = "table" | "l-shaped-desk" | "circular-table" | "bed" | "couch" | "l-shaped-couch"

export interface FurnitureItem {
  id: string
  type: FurnitureType
  name: string
  length: number
  width: number
  diameter?: number
  depth?: number
  rotation: 0 | 90 | 180 | 270
  x: number
  y: number
  isSelected?: boolean
}

interface FurnitureTemplate {
  type: FurnitureType
  name: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  defaultLength?: number
  defaultWidth?: number
  defaultDiameter?: number
  defaultDepth?: number
  hasLength: boolean
  hasWidth: boolean
  hasDiameter: boolean
  hasDepth: boolean
}

const FURNITURE_TEMPLATES: FurnitureTemplate[] = [
  {
    type: "table",
    name: "Table",
    icon: Table,
    description: "Rectangular dining or work table",
    defaultLength: 60,
    defaultWidth: 30,
    hasLength: true,
    hasWidth: true,
    hasDiameter: false,
    hasDepth: false,
  },
  {
    type: "l-shaped-desk",
    name: "L-Shaped Desk",
    icon: Table,
    description: "L-shaped work desk with two connected surfaces",
    defaultLength: 60,
    defaultWidth: 48,
    defaultDepth: 24,
    hasLength: true,
    hasWidth: true,
    hasDiameter: false,
    hasDepth: true,
  },
  {
    type: "circular-table",
    name: "Circular Table",
    icon: Circle,
    description: "Round dining or coffee table",
    defaultDiameter: 48,
    hasLength: false,
    hasWidth: false,
    hasDiameter: true,
    hasDepth: false,
  },
  {
    type: "bed",
    name: "Bed",
    icon: Bed,
    description: "Sleeping bed with headboard",
    defaultLength: 60,
    defaultWidth: 80,
    hasLength: true,
    hasWidth: true,
    hasDiameter: false,
    hasDepth: false,
  },
  {
    type: "couch",
    name: "Couch",
    icon: Sofa,
    description: "Living room sofa",
    defaultLength: 84,
    defaultWidth: 36,
    hasLength: true,
    hasWidth: true,
    hasDiameter: false,
    hasDepth: false,
  },
  {
    type: "l-shaped-couch",
    name: "L-Shaped Couch",
    icon: Sofa,
    description: "L-shaped sectional couch with two connected sections",
    defaultLength: 84,
    defaultWidth: 84,
    defaultDepth: 36,
    hasLength: true,
    hasWidth: true,
    hasDiameter: false,
    hasDepth: true,
  },
]

const FURNITURE_CATEGORIES = [
  {
    name: "Seating",
    items: ["couch", "l-shaped-couch"]
  },
  {
    name: "Tables", 
    items: ["table", "l-shaped-desk", "circular-table"]
  },
  {
    name: "Bedroom",
    items: ["bed"]
  }
]

interface FurnitureEditorProps {
  isOpen: boolean
  onClose: () => void
  roomId: string | null
  onPlaceFurniture?: (furniture: FurnitureItem) => void
}

const FurnitureEditor: React.FC<FurnitureEditorProps> = ({ 
  isOpen, 
  onClose, 
  roomId,
  onPlaceFurniture 
}) => {
  const [currentScreen, setCurrentScreen] = useState<"library" | "settings">("library")
  const [selectedTemplate, setSelectedTemplate] = useState<FurnitureTemplate | null>(null)
  const [furnitureName, setFurnitureName] = useState("")
  const [dimensions, setDimensions] = useState({
    length: 0,
    width: 0,
    diameter: 0,
    depth: 0,
  })

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setCurrentScreen("library")
      setSelectedTemplate(null)
      setFurnitureName("")
      setDimensions({
        length: 0,
        width: 0,
        diameter: 0,
        depth: 0,
      })
    }
  }, [isOpen])

  const handleSelectTemplate = (template: FurnitureTemplate) => {
    setSelectedTemplate(template)
    setFurnitureName(template.name)
    setDimensions({
      length: template.defaultLength || 0,
      width: template.defaultWidth || 0,
      diameter: template.defaultDiameter || 0,
      depth: template.defaultDepth || 0,
    })
    setCurrentScreen("settings")
  }

  const handleBackToLibrary = () => {
    setCurrentScreen("library")
    setSelectedTemplate(null)
  }

  const handleConfirmDimensions = () => {
    if (!selectedTemplate || !roomId) return

    const newFurniture: FurnitureItem = {
      id: `furniture-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: selectedTemplate.type,
      name: furnitureName,
      length: dimensions.length,
      width: dimensions.width,
      diameter: dimensions.diameter,
      depth: dimensions.depth,
      x: 0, // Will be set during placement
      y: 0, // Will be set during placement
      rotation: 0,
    }

    onPlaceFurniture?.(newFurniture)
    onClose()
  }

  const renderLibrary = () => (
    <>
      <DialogHeader className="p-6 pb-2">
        <DialogTitle>Furniture Library</DialogTitle>
      </DialogHeader>
      
      <div className="flex-grow overflow-y-auto p-6 pt-2">
        {FURNITURE_CATEGORIES.map((category) => (
          <div key={category.name} className="mb-6">
            <h3 className="text-lg font-semibold mb-3">{category.name}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {category.items.map((itemType) => {
                const template = FURNITURE_TEMPLATES.find(t => t.type === itemType)
                if (!template) return null
                
                const IconComponent = template.icon
                
                return (
                  <Card 
                    key={template.type}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-center w-12 h-12 mx-auto bg-primary/10 rounded-lg mb-2">
                        <IconComponent className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-sm text-center">{template.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <CardDescription className="text-xs text-center">
                        {template.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <DialogFooter className="p-6 pt-2 border-t">
        <DialogClose asChild>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogClose>
      </DialogFooter>
    </>
  )

  const renderSettings = () => {
    if (!selectedTemplate) return null

    return (
      <>
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBackToLibrary}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle>Configure {selectedTemplate.name}</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="flex-grow flex">
          {/* Left side - Settings */}
          <div className="w-1/3 p-6 border-r space-y-4">
            <div>
              <Label htmlFor="furnitureName">Name</Label>
              <Input
                id="furnitureName"
                value={furnitureName}
                onChange={(e) => setFurnitureName(e.target.value)}
                placeholder="Enter furniture name"
              />
            </div>

            {selectedTemplate.hasLength && (
              <div>
                <Label htmlFor="length">
                  {selectedTemplate.type === "bed" ? "Width" : "Length"} (inches)
                </Label>
                <Input
                  id="length"
                  type="number"
                  value={dimensions.length}
                  onChange={(e) => setDimensions(prev => ({ ...prev, length: parseInt(e.target.value) || 0 }))}
                  placeholder={selectedTemplate.type === "bed" ? "Width" : "Length"}
                />
              </div>
            )}

            {selectedTemplate.hasWidth && (
              <div>
                <Label htmlFor="width">
                  {selectedTemplate.type === "bed" ? "Length" : "Width"} (inches)
                </Label>
                <Input
                  id="width"
                  type="number"
                  value={dimensions.width}
                  onChange={(e) => setDimensions(prev => ({ ...prev, width: parseInt(e.target.value) || 0 }))}
                  placeholder={selectedTemplate.type === "bed" ? "Length" : "Width"}
                />
              </div>
            )}

            {selectedTemplate.hasDiameter && (
              <div>
                <Label htmlFor="diameter">Diameter (inches)</Label>
                <Input
                  id="diameter"
                  type="number"
                  value={dimensions.diameter}
                  onChange={(e) => setDimensions(prev => ({ ...prev, diameter: parseInt(e.target.value) || 0 }))}
                  placeholder="Diameter"
                />
              </div>
            )}

            {selectedTemplate.hasDepth && (
              <div>
                <Label htmlFor="depth">Depth (inches)</Label>
                <Input
                  id="depth"
                  type="number"
                  value={dimensions.depth}
                  onChange={(e) => setDimensions(prev => ({ ...prev, depth: parseInt(e.target.value) || 0 }))}
                  placeholder="Depth"
                />
              </div>
            )}
          </div>

          {/* Right side - Preview Grid */}
          <div className="flex-1 p-6 bg-slate-50">
            <h3 className="font-semibold mb-4">Preview</h3>
            <div className="relative bg-white border rounded-lg p-4" style={{ minHeight: "300px" }}>
              <svg
                width="100%"
                height="300"
                viewBox="0 0 400 300"
                className="border-2 border-dashed border-gray-300"
              >
                {/* Grid lines */}
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                
                {/* Furniture preview */}
                {selectedTemplate.hasDiameter ? (
                  <circle
                    cx="200"
                    cy="150"
                    r={Math.min(dimensions.diameter * 2, 100)}
                    fill="#d2b48c"
                    stroke="#8b7355"
                    strokeWidth="2"
                  />
                ) : selectedTemplate.type === "l-shaped-desk" || selectedTemplate.type === "l-shaped-couch" ? (
                  // L-shaped furniture preview
                  <g>
                    {/* Horizontal leg of the L (bottom) */}
                    <rect
                      x={200 - Math.min(dimensions.length * 1.5, 150) / 2}
                      y={150 + Math.min(dimensions.width * 1.5, 120) / 2 - Math.min(dimensions.depth * 1.5, 50)}
                      width={Math.min(dimensions.length * 1.5, 150)}
                      height={Math.min(dimensions.depth * 1.5, 50)}
                      fill={selectedTemplate.type === "l-shaped-couch" ? "#8b4513" : "#d2b48c"}
                      stroke={selectedTemplate.type === "l-shaped-couch" ? "#654321" : "#8b7355"}
                      strokeWidth="2"
                    />
                    {/* Vertical leg of the L (right) */}
                    <rect
                      x={200 + Math.min(dimensions.length * 1.5, 150) / 2 - Math.min(dimensions.depth * 1.5, 50)}
                      y={150 - Math.min(dimensions.width * 1.5, 120) / 2}
                      width={Math.min(dimensions.depth * 1.5, 50)}
                      height={Math.min(dimensions.width * 1.5, 120)}
                      fill={selectedTemplate.type === "l-shaped-couch" ? "#8b4513" : "#d2b48c"}
                      stroke={selectedTemplate.type === "l-shaped-couch" ? "#654321" : "#8b7355"}
                      strokeWidth="2"
                    />
                  </g>
                ) : (
                  <rect
                    x={200 - Math.min(dimensions.length * 1.5, 150) / 2}
                    y={150 - Math.min(dimensions.width * 1.5, 100) / 2}
                    width={Math.min(dimensions.length * 1.5, 150)}
                    height={Math.min(dimensions.width * 1.5, 100)}
                    fill={selectedTemplate.type === "bed" ? "#20b2aa" : 
                          selectedTemplate.type === "couch" ? "#8b4513" : "#d2b48c"}
                    stroke={selectedTemplate.type === "bed" ? "#178b75" : 
                           selectedTemplate.type === "couch" ? "#654321" : "#8b7355"}
                    strokeWidth="2"
                  />
                )}
                
                {/* Bed headboard */}
                {selectedTemplate.type === "bed" && (
                  <rect
                    x={200 - Math.min(dimensions.length * 1.5, 150) / 2}
                    y={150 - Math.min(dimensions.width * 1.5, 100) / 2}
                    width={Math.min(dimensions.length * 1.5, 150)}
                    height={Math.min(dimensions.width * 1.5, 100) * 0.2}
                    fill="white"
                  />
                )}
              </svg>
              <div className="mt-2 text-xs text-muted-foreground text-center">
                {selectedTemplate.hasDiameter 
                  ? `Diameter: ${dimensions.diameter}"`
                  : selectedTemplate.hasDepth
                  ? `${dimensions.length}" × ${dimensions.width}" × ${dimensions.depth}"`
                  : `${dimensions.length}" × ${dimensions.width}"`}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-2 border-t">
          <Button variant="outline" onClick={handleBackToLibrary}>Back</Button>
          <Button onClick={handleConfirmDimensions}>Confirm Dimensions</Button>
        </DialogFooter>
      </>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); }}}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        {currentScreen === "library" ? renderLibrary() : renderSettings()}
      </DialogContent>
    </Dialog>
  )
}

export default FurnitureEditor 