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
import { formatInchesForEditor, parseInchesFromEditor, inchesToEighths } from "@apartment-planner/shared"
import { Circle, Square, RectangleHorizontal, Refrigerator } from "lucide-react"
import { LShapedRoomIcon } from "@/components/sidebar/room-shape-icons"

type FurnitureOption = {
  type: FurnitureType
  label: string
  icon: React.ComponentType<{ className?: string }>
  category: "table" | "desk" | "seating" | "appliance"
}

function CouchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" />
      <path d="M2 11v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
      <path d="M4 17v2" />
      <path d="M20 17v2" />
    </svg>
  )
}

const FURNITURE_OPTIONS: FurnitureOption[] = [
  { type: "square-table", label: "Square Table", icon: Square, category: "table" },
  { type: "circle-table", label: "Circle Table", icon: Circle, category: "table" },
  { type: "rectangle-desk", label: "Rectangle Desk", icon: RectangleHorizontal, category: "desk" },
  { type: "l-shaped-desk", label: "L-Shaped Desk", icon: LShapedRoomIcon, category: "desk" },
  { type: "couch", label: "Couch", icon: CouchIcon, category: "seating" },
  { type: "l-shaped-couch", label: "L-Shaped Couch", icon: LShapedRoomIcon, category: "seating" },
  { type: "fridge", label: "Fridge", icon: Refrigerator, category: "appliance" },
]

const DEFAULT_TABLE_SIZE = inchesToEighths(36)
const DEFAULT_DESK_WIDTH = inchesToEighths(60)
const DEFAULT_DESK_HEIGHT = inchesToEighths(30)
const DEFAULT_COUCH_WIDTH = inchesToEighths(72)
const DEFAULT_COUCH_HEIGHT = inchesToEighths(36)
const DEFAULT_FRIDGE_SIZE = inchesToEighths(36)

const DEFAULT_L_DESK_LENGTH = inchesToEighths(60)
const DEFAULT_L_DESK_WIDTH = inchesToEighths(48)
const DEFAULT_L_DESK_DEPTH = inchesToEighths(24)

const DEFAULT_L_COUCH_LENGTH = inchesToEighths(84)
const DEFAULT_L_COUCH_WIDTH = inchesToEighths(84)
const DEFAULT_L_COUCH_DEPTH = inchesToEighths(36)

type AddFurnitureModalProps = {
  open: boolean
  roomId: string | null
  onOpenChange: (open: boolean) => void
  onAdd: (roomId: string, name: string, furnitureType: FurnitureType, template: FurnitureShapeTemplate) => void
}

export function AddFurnitureModal({ open, roomId, onOpenChange, onAdd }: AddFurnitureModalProps) {
  const [selectedType, setSelectedType] = useState<FurnitureType>("square-table")
  const [name, setName] = useState("Square Table")
  const [width, setWidth] = useState(formatInchesForEditor(DEFAULT_TABLE_SIZE))
  const [height, setHeight] = useState(formatInchesForEditor(DEFAULT_TABLE_SIZE))
  const [radius, setRadius] = useState(formatInchesForEditor(DEFAULT_TABLE_SIZE / 2))
  const [cutCorner, setCutCorner] = useState<Corner>("top-right")

  const [lLength, setLLength] = useState(formatInchesForEditor(DEFAULT_L_DESK_LENGTH))
  const [lWidth, setLWidth] = useState(formatInchesForEditor(DEFAULT_L_DESK_WIDTH))
  const [lDepth, setLDepth] = useState(formatInchesForEditor(DEFAULT_L_DESK_DEPTH))

  useEffect(() => {
    const option = FURNITURE_OPTIONS.find((o) => o.type === selectedType)
    if (option) {
      setName(option.label)
      
      if (option.category === "table") {
        setWidth(formatInchesForEditor(DEFAULT_TABLE_SIZE))
        setHeight(formatInchesForEditor(DEFAULT_TABLE_SIZE))
        setRadius(formatInchesForEditor(DEFAULT_TABLE_SIZE / 2))
      } else if (option.category === "desk") {
        if (selectedType === "l-shaped-desk") {
          setLLength(formatInchesForEditor(DEFAULT_L_DESK_LENGTH))
          setLWidth(formatInchesForEditor(DEFAULT_L_DESK_WIDTH))
          setLDepth(formatInchesForEditor(DEFAULT_L_DESK_DEPTH))
        } else {
          setWidth(formatInchesForEditor(DEFAULT_DESK_WIDTH))
          setHeight(formatInchesForEditor(DEFAULT_DESK_HEIGHT))
        }
      } else if (option.category === "seating") {
        if (selectedType === "l-shaped-couch") {
          setLLength(formatInchesForEditor(DEFAULT_L_COUCH_LENGTH))
          setLWidth(formatInchesForEditor(DEFAULT_L_COUCH_WIDTH))
          setLDepth(formatInchesForEditor(DEFAULT_L_COUCH_DEPTH))
        } else {
          setWidth(formatInchesForEditor(DEFAULT_COUCH_WIDTH))
          setHeight(formatInchesForEditor(DEFAULT_COUCH_HEIGHT))
        }
      } else if (option.category === "appliance") {
        setWidth(formatInchesForEditor(DEFAULT_FRIDGE_SIZE))
        setHeight(formatInchesForEditor(DEFAULT_FRIDGE_SIZE))
      }
    }
  }, [selectedType])

  const resetForm = () => {
    setSelectedType("square-table")
    setName("Square Table")
    setWidth(formatInchesForEditor(DEFAULT_TABLE_SIZE))
    setHeight(formatInchesForEditor(DEFAULT_TABLE_SIZE))
    setRadius(formatInchesForEditor(DEFAULT_TABLE_SIZE / 2))
    setCutCorner("top-right")
    setLLength(formatInchesForEditor(DEFAULT_L_DESK_LENGTH))
    setLWidth(formatInchesForEditor(DEFAULT_L_DESK_WIDTH))
    setLDepth(formatInchesForEditor(DEFAULT_L_DESK_DEPTH))
  }

  const handleAdd = () => {
    if (!roomId) return

    let template: FurnitureShapeTemplate

    switch (selectedType) {
      case "square-table":
        template = {
          type: "rectangle",
          width: parseInchesFromEditor(width) ?? DEFAULT_TABLE_SIZE,
          height: parseInchesFromEditor(height) ?? DEFAULT_TABLE_SIZE,
        }
        break
      case "circle-table":
        template = {
          type: "circle",
          radius: parseInchesFromEditor(radius) ?? DEFAULT_TABLE_SIZE / 2,
        }
        break
      case "rectangle-desk":
        template = {
          type: "rectangle",
          width: parseInchesFromEditor(width) ?? DEFAULT_DESK_WIDTH,
          height: parseInchesFromEditor(height) ?? DEFAULT_DESK_HEIGHT,
        }
        break
      case "l-shaped-desk": {
        const length = parseInchesFromEditor(lLength) ?? DEFAULT_L_DESK_LENGTH
        const lw = parseInchesFromEditor(lWidth) ?? DEFAULT_L_DESK_WIDTH
        const depth = parseInchesFromEditor(lDepth) ?? DEFAULT_L_DESK_DEPTH
        template = {
          type: "l-shaped",
          width: length,
          height: lw,
          cutWidth: length - depth,
          cutHeight: lw - depth,
          cutCorner,
        }
        break
      }
      case "couch":
        template = {
          type: "rectangle",
          width: parseInchesFromEditor(width) ?? DEFAULT_COUCH_WIDTH,
          height: parseInchesFromEditor(height) ?? DEFAULT_COUCH_HEIGHT,
        }
        break
      case "l-shaped-couch": {
        const length = parseInchesFromEditor(lLength) ?? DEFAULT_L_COUCH_LENGTH
        const lw = parseInchesFromEditor(lWidth) ?? DEFAULT_L_COUCH_WIDTH
        const depth = parseInchesFromEditor(lDepth) ?? DEFAULT_L_COUCH_DEPTH
        template = {
          type: "l-shaped",
          width: length,
          height: lw,
          cutWidth: length - depth,
          cutHeight: lw - depth,
          cutCorner,
        }
        break
      }
      case "fridge":
        template = {
          type: "rectangle",
          width: parseInchesFromEditor(width) ?? DEFAULT_FRIDGE_SIZE,
          height: parseInchesFromEditor(height) ?? DEFAULT_FRIDGE_SIZE,
        }
        break
    }

    onAdd(roomId, name, selectedType, template)
    resetForm()
    onOpenChange(false)
  }

  const isCircle = selectedType === "circle-table"
  const isLShaped = selectedType === "l-shaped-desk" || selectedType === "l-shaped-couch"

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
            {isCircle && (
              <div className="space-y-2">
                <Label htmlFor="furniture-radius">Radius (in)</Label>
                <Input
                  id="furniture-radius"
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  placeholder="18"
                />
              </div>
            )}

            {!isCircle && !isLShaped && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="furniture-width">Width (in)</Label>
                  <Input
                    id="furniture-width"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    placeholder="36"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="furniture-height">Height (in)</Label>
                  <Input
                    id="furniture-height"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="36"
                  />
                </div>
              </div>
            )}

            {isLShaped && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="furniture-l-length">Length (in)</Label>
                    <Input
                      id="furniture-l-length"
                      value={lLength}
                      onChange={(e) => setLLength(e.target.value)}
                      placeholder="60"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="furniture-l-width">Width (in)</Label>
                    <Input
                      id="furniture-l-width"
                      value={lWidth}
                      onChange={(e) => setLWidth(e.target.value)}
                      placeholder="48"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="furniture-l-depth">Depth (in)</Label>
                    <Input
                      id="furniture-l-depth"
                      value={lDepth}
                      onChange={(e) => setLDepth(e.target.value)}
                      placeholder="24"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Orientation</Label>
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

