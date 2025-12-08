import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { FurnitureType, FurnitureShapeTemplate, Corner } from "@apartment-planner/shared"
import { formatEighths, parseToEighths, feetToEighths } from "@apartment-planner/shared"
import { Circle, Square, RectangleHorizontal } from "lucide-react"
import { LShapedRoomIcon } from "@/components/room-shape-icons"

type FurnitureOption = {
  type: FurnitureType
  label: string
  icon: React.ComponentType<{ className?: string }>
  category: "table" | "desk"
}

const FURNITURE_OPTIONS: FurnitureOption[] = [
  { type: "square-table", label: "Square Table", icon: Square, category: "table" },
  { type: "circle-table", label: "Circle Table", icon: Circle, category: "table" },
  { type: "rectangle-desk", label: "Rectangle Desk", icon: RectangleHorizontal, category: "desk" },
  { type: "l-shaped-desk", label: "L-Shaped Desk", icon: LShapedRoomIcon, category: "desk" },
]

const DEFAULT_TABLE_SIZE = feetToEighths(3)
const DEFAULT_DESK_WIDTH = feetToEighths(5)
const DEFAULT_DESK_HEIGHT = feetToEighths(2.5)
const DEFAULT_CUT = feetToEighths(2)

type AddFurnitureModalProps = {
  open: boolean
  roomId: string | null
  onOpenChange: (open: boolean) => void
  onAdd: (roomId: string, name: string, furnitureType: FurnitureType, template: FurnitureShapeTemplate) => void
}

export function AddFurnitureModal({ open, roomId, onOpenChange, onAdd }: AddFurnitureModalProps) {
  const [selectedType, setSelectedType] = useState<FurnitureType>("square-table")
  const [name, setName] = useState("Square Table")
  const [width, setWidth] = useState(formatEighths(DEFAULT_TABLE_SIZE))
  const [height, setHeight] = useState(formatEighths(DEFAULT_TABLE_SIZE))
  const [radius, setRadius] = useState(formatEighths(DEFAULT_TABLE_SIZE / 2))
  const [cutWidth, setCutWidth] = useState(formatEighths(DEFAULT_CUT))
  const [cutHeight, setCutHeight] = useState(formatEighths(DEFAULT_CUT))
  const [cutCorner, setCutCorner] = useState<Corner>("top-right")

  useEffect(() => {
    const option = FURNITURE_OPTIONS.find((o) => o.type === selectedType)
    if (option) {
      setName(option.label)
      
      if (option.category === "table") {
        setWidth(formatEighths(DEFAULT_TABLE_SIZE))
        setHeight(formatEighths(DEFAULT_TABLE_SIZE))
        setRadius(formatEighths(DEFAULT_TABLE_SIZE / 2))
      } else {
        setWidth(formatEighths(DEFAULT_DESK_WIDTH))
        setHeight(formatEighths(DEFAULT_DESK_HEIGHT))
      }
    }
  }, [selectedType])

  const resetForm = () => {
    setSelectedType("square-table")
    setName("Square Table")
    setWidth(formatEighths(DEFAULT_TABLE_SIZE))
    setHeight(formatEighths(DEFAULT_TABLE_SIZE))
    setRadius(formatEighths(DEFAULT_TABLE_SIZE / 2))
    setCutWidth(formatEighths(DEFAULT_CUT))
    setCutHeight(formatEighths(DEFAULT_CUT))
    setCutCorner("top-right")
  }

  const handleAdd = () => {
    if (!roomId) return

    let template: FurnitureShapeTemplate

    switch (selectedType) {
      case "square-table":
        template = {
          type: "rectangle",
          width: parseToEighths(width) ?? DEFAULT_TABLE_SIZE,
          height: parseToEighths(height) ?? DEFAULT_TABLE_SIZE,
        }
        break
      case "circle-table":
        template = {
          type: "circle",
          radius: parseToEighths(radius) ?? DEFAULT_TABLE_SIZE / 2,
        }
        break
      case "rectangle-desk":
        template = {
          type: "rectangle",
          width: parseToEighths(width) ?? DEFAULT_DESK_WIDTH,
          height: parseToEighths(height) ?? DEFAULT_DESK_HEIGHT,
        }
        break
      case "l-shaped-desk":
        template = {
          type: "l-shaped",
          width: parseToEighths(width) ?? DEFAULT_DESK_WIDTH,
          height: parseToEighths(height) ?? DEFAULT_DESK_HEIGHT,
          cutWidth: parseToEighths(cutWidth) ?? DEFAULT_CUT,
          cutHeight: parseToEighths(cutHeight) ?? DEFAULT_CUT,
          cutCorner,
        }
        break
    }

    onAdd(roomId, name, selectedType, template)
    resetForm()
    onOpenChange(false)
  }

  const isCircle = selectedType === "circle-table"
  const isLShaped = selectedType === "l-shaped-desk"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Furniture</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="furniture-name">Name</Label>
            <Input
              id="furniture-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Circle Table"
            />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <div className="grid grid-cols-2 gap-3">
              {FURNITURE_OPTIONS.map(({ type, label, icon: Icon }) => (
                <Card
                  key={type}
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary/50",
                    selectedType === type && "border-primary ring-2 ring-primary/20"
                  )}
                  onClick={() => setSelectedType(type)}
                >
                  <CardContent className="flex flex-col items-center gap-2 p-3">
                    <Icon className="size-6 text-muted-foreground" />
                    <span className="text-xs font-medium text-center">{label}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {isCircle ? (
              <div className="space-y-2">
                <Label htmlFor="furniture-radius">Radius</Label>
                <Input
                  id="furniture-radius"
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  placeholder={'1\'6"'}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="furniture-width">Width</Label>
                  <Input
                    id="furniture-width"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    placeholder="3'"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="furniture-height">Height</Label>
                  <Input
                    id="furniture-height"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="3'"
                  />
                </div>
              </div>
            )}

            {isLShaped && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="furniture-cut-width">Cut Width</Label>
                    <Input
                      id="furniture-cut-width"
                      value={cutWidth}
                      onChange={(e) => setCutWidth(e.target.value)}
                      placeholder="2'"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="furniture-cut-height">Cut Height</Label>
                    <Input
                      id="furniture-cut-height"
                      value={cutHeight}
                      onChange={(e) => setCutHeight(e.target.value)}
                      placeholder="2'"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cut Corner</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["top-left", "top-right", "bottom-left", "bottom-right"] as Corner[]).map(
                      (corner) => (
                        <Button
                          key={corner}
                          type="button"
                          variant={cutCorner === corner ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCutCorner(corner)}
                        >
                          {corner.replace("-", " ")}
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd}>Add Furniture</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

