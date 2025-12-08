import { useState, useEffect, useCallback } from "react"
import { Trash2 } from "lucide-react"
import { HexColorPicker } from "react-colorful"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import type { RoomEntity, FurnitureEntity, DoorEntity, ShapeTemplate, FurnitureShapeTemplate, Corner, HingeSide } from "@apartment-planner/shared"
import { formatInchesForEditor, parseInchesFromEditor, shapeToVertices, inchesToEighths } from "@apartment-planner/shared"

const DEFAULT_FURNITURE_COLORS: Record<FurnitureEntity["furnitureType"], string> = {
  "square-table": "#5D4037",
  "circle-table": "#5D4037",
  "rectangle-desk": "#C4A484",
  "l-shaped-desk": "#C4A484",
  "couch": "#4A4A4A",
  "l-shaped-couch": "#4A4A4A",
  "fridge": "#D3D3D3",
}

const DOOR_WIDTH_PRESETS = [
  { label: '36"', value: 36 },
  { label: '42"', value: 42 },
  { label: '48"', value: 48 },
]

type PropertyPanelProps = {
  selectedRoom: RoomEntity | null
  selectedFurniture: FurnitureEntity | null
  selectedDoor: DoorEntity | null
  onRoomUpdate: (room: RoomEntity) => void
  onFurnitureUpdate: (furniture: FurnitureEntity) => void
  onDoorUpdate: (door: DoorEntity) => void
  onRoomDelete: (roomId: string) => void
  onFurnitureDelete: (furnitureId: string) => void
  onDoorDelete: (doorId: string) => void
}

export function PropertyPanel({
  selectedRoom,
  selectedFurniture,
  selectedDoor,
  onRoomUpdate,
  onFurnitureUpdate,
  onDoorUpdate,
  onRoomDelete,
  onFurnitureDelete,
  onDoorDelete,
}: PropertyPanelProps) {
  const [name, setName] = useState("")
  const [width, setWidth] = useState("")
  const [height, setHeight] = useState("")
  const [cutWidth, setCutWidth] = useState("")
  const [cutHeight, setCutHeight] = useState("")
  const [cutCorner, setCutCorner] = useState<Corner>("top-right")
  const [bevelSize, setBevelSize] = useState("")
  const [bevelCorner, setBevelCorner] = useState<Corner>("top-right")
  const [radius, setRadius] = useState("")
  const [doorWidth, setDoorWidth] = useState("")
  const [hingeSide, setHingeSide] = useState<HingeSide>("left")
  const [furnitureColor, setFurnitureColor] = useState("#4A4A4A")

  useEffect(() => {
    if (selectedDoor) {
      setName(selectedDoor.name)
      setDoorWidth(formatInchesForEditor(selectedDoor.width))
      setHingeSide(selectedDoor.hingeSide)
    } else if (selectedRoom) {
      setName(selectedRoom.name)
      setWidth(formatInchesForEditor(selectedRoom.shapeTemplate.width))
      setHeight(formatInchesForEditor(selectedRoom.shapeTemplate.height))

      if (selectedRoom.shapeTemplate.type === "l-shaped") {
        setCutWidth(formatInchesForEditor(selectedRoom.shapeTemplate.cutWidth))
        setCutHeight(formatInchesForEditor(selectedRoom.shapeTemplate.cutHeight))
        setCutCorner(selectedRoom.shapeTemplate.cutCorner)
      }

      if (selectedRoom.shapeTemplate.type === "beveled") {
        setBevelSize(formatInchesForEditor(selectedRoom.shapeTemplate.bevelSize))
        setBevelCorner(selectedRoom.shapeTemplate.bevelCorner)
      }
    } else if (selectedFurniture) {
      setName(selectedFurniture.name)
      setFurnitureColor(selectedFurniture.color ?? DEFAULT_FURNITURE_COLORS[selectedFurniture.furnitureType])
      
      if (selectedFurniture.shapeTemplate.type === "circle") {
        setRadius(formatInchesForEditor(selectedFurniture.shapeTemplate.radius))
      } else {
        setWidth(formatInchesForEditor(selectedFurniture.shapeTemplate.width))
        setHeight(formatInchesForEditor(selectedFurniture.shapeTemplate.height))
        
        if (selectedFurniture.shapeTemplate.type === "l-shaped") {
          setCutWidth(formatInchesForEditor(selectedFurniture.shapeTemplate.cutWidth))
          setCutHeight(formatInchesForEditor(selectedFurniture.shapeTemplate.cutHeight))
          setCutCorner(selectedFurniture.shapeTemplate.cutCorner)
        }
      }
    }
  }, [selectedRoom, selectedFurniture, selectedDoor])

  const handleRoomSave = useCallback(() => {
    if (!selectedRoom) return

    const widthEighths = parseInchesFromEditor(width) ?? selectedRoom.shapeTemplate.width
    const heightEighths = parseInchesFromEditor(height) ?? selectedRoom.shapeTemplate.height

    let template: ShapeTemplate

    switch (selectedRoom.shapeTemplate.type) {
      case "rectangle":
        template = { type: "rectangle", width: widthEighths, height: heightEighths }
        break
      case "l-shaped":
        template = {
          type: "l-shaped",
          width: widthEighths,
          height: heightEighths,
          cutWidth: parseInchesFromEditor(cutWidth) ?? selectedRoom.shapeTemplate.cutWidth,
          cutHeight: parseInchesFromEditor(cutHeight) ?? selectedRoom.shapeTemplate.cutHeight,
          cutCorner,
        }
        break
      case "beveled":
        template = {
          type: "beveled",
          width: widthEighths,
          height: heightEighths,
          bevelSize: parseInchesFromEditor(bevelSize) ?? selectedRoom.shapeTemplate.bevelSize,
          bevelCorner,
        }
        break
    }

    const updatedRoom: RoomEntity = {
      ...selectedRoom,
      name,
      shapeTemplate: template,
      vertices: shapeToVertices(template),
    }

    onRoomUpdate(updatedRoom)
  }, [selectedRoom, name, width, height, cutWidth, cutHeight, cutCorner, bevelSize, bevelCorner, onRoomUpdate])

  const handleFurnitureSave = useCallback(() => {
    if (!selectedFurniture) return

    let template: FurnitureShapeTemplate

    if (selectedFurniture.shapeTemplate.type === "circle") {
      template = {
        type: "circle",
        radius: parseInchesFromEditor(radius) ?? selectedFurniture.shapeTemplate.radius,
      }
    } else if (selectedFurniture.shapeTemplate.type === "l-shaped") {
      template = {
        type: "l-shaped",
        width: parseInchesFromEditor(width) ?? selectedFurniture.shapeTemplate.width,
        height: parseInchesFromEditor(height) ?? selectedFurniture.shapeTemplate.height,
        cutWidth: parseInchesFromEditor(cutWidth) ?? selectedFurniture.shapeTemplate.cutWidth,
        cutHeight: parseInchesFromEditor(cutHeight) ?? selectedFurniture.shapeTemplate.cutHeight,
        cutCorner,
      }
    } else {
      template = {
        type: "rectangle",
        width: parseInchesFromEditor(width) ?? selectedFurniture.shapeTemplate.width,
        height: parseInchesFromEditor(height) ?? selectedFurniture.shapeTemplate.height,
      }
    }

    const updatedFurniture: FurnitureEntity = {
      ...selectedFurniture,
      name,
      shapeTemplate: template,
      color: furnitureColor,
    }

    onFurnitureUpdate(updatedFurniture)
  }, [selectedFurniture, name, width, height, cutWidth, cutHeight, cutCorner, radius, furnitureColor, onFurnitureUpdate])

  const handleColorChange = useCallback((newColor: string) => {
    setFurnitureColor(newColor)
    if (!selectedFurniture) return
    
    const updatedFurniture: FurnitureEntity = {
      ...selectedFurniture,
      color: newColor,
    }
    onFurnitureUpdate(updatedFurniture)
  }, [selectedFurniture, onFurnitureUpdate])

  const handleDoorSave = useCallback(() => {
    if (!selectedDoor) return

    const updatedDoor: DoorEntity = {
      ...selectedDoor,
      name,
      width: parseInchesFromEditor(doorWidth) ?? selectedDoor.width,
      hingeSide,
    }

    onDoorUpdate(updatedDoor)
  }, [selectedDoor, name, doorWidth, hingeSide, onDoorUpdate])

  const handleDoorWidthPreset = useCallback((widthInches: number) => {
    if (!selectedDoor) return
    setDoorWidth(String(widthInches))
    const updatedDoor: DoorEntity = {
      ...selectedDoor,
      width: inchesToEighths(widthInches),
    }
    onDoorUpdate(updatedDoor)
  }, [selectedDoor, onDoorUpdate])

  const handleHingeSideChange = useCallback((side: HingeSide) => {
    if (!selectedDoor) return
    setHingeSide(side)
    const updatedDoor: DoorEntity = {
      ...selectedDoor,
      hingeSide: side,
    }
    onDoorUpdate(updatedDoor)
  }, [selectedDoor, onDoorUpdate])

  const handleNameBlur = () => {
    if (selectedDoor) {
      handleDoorSave()
    } else if (selectedRoom) {
      handleRoomSave()
    } else if (selectedFurniture) {
      handleFurnitureSave()
    }
  }

  const handleDimensionBlur = () => {
    if (selectedDoor) {
      handleDoorSave()
    } else if (selectedRoom) {
      handleRoomSave()
    } else if (selectedFurniture) {
      handleFurnitureSave()
    }
  }

  const handleDelete = () => {
    if (selectedDoor) {
      onDoorDelete(selectedDoor.id)
    } else if (selectedRoom) {
      onRoomDelete(selectedRoom.id)
    } else if (selectedFurniture) {
      onFurnitureDelete(selectedFurniture.id)
    }
  }

  if (!selectedRoom && !selectedFurniture && !selectedDoor) {
    return null
  }

  const shapeType = selectedRoom
    ? selectedRoom.shapeTemplate.type
    : selectedFurniture?.shapeTemplate.type

  const furnitureTypeLabel = selectedFurniture
    ? {
        "square-table": "Square Table",
        "circle-table": "Circle Table",
        "rectangle-desk": "Rectangle Desk",
        "l-shaped-desk": "L-Shaped Desk",
        "couch": "Couch",
        "l-shaped-couch": "L-Shaped Couch",
        "fridge": "Fridge",
      }[selectedFurniture.furnitureType]
    : null

  const entityType = selectedDoor ? "Door" : selectedRoom ? "Room" : "Furniture"

  return (
    <div className="absolute right-0 top-0 bottom-0 w-64 border-l border-sidebar-border bg-sidebar shadow-lg animate-in slide-in-from-right-4 duration-200 cursor-hidden flex flex-col">
      <div className="p-4 pb-0">
        <h3 className="text-sm font-semibold text-sidebar-foreground mb-1">
          {entityType}
        </h3>
        {furnitureTypeLabel && (
          <p className="text-xs text-muted-foreground">{furnitureTypeLabel}</p>
        )}
      </div>

      <Separator className="my-4" />

      <div className="flex-1 overflow-y-auto px-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prop-name">Name</Label>
          <Input
            id="prop-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameBlur}
          />
        </div>

        {selectedDoor ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="prop-door-width">Width (in)</Label>
              <div className="flex gap-1 mb-2">
                {DOOR_WIDTH_PRESETS.map((preset) => (
                  <Button
                    key={preset.value}
                    type="button"
                    variant={parseFloat(doorWidth) === preset.value ? "default" : "outline"}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => handleDoorWidthPreset(preset.value)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <Input
                id="prop-door-width"
                value={doorWidth}
                onChange={(e) => setDoorWidth(e.target.value)}
                onBlur={handleDimensionBlur}
                placeholder="Custom width"
              />
            </div>
            <div className="space-y-2">
              <Label>Hinge Side</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["left", "right"] as HingeSide[]).map((side) => (
                  <Button
                    key={side}
                    type="button"
                    variant={hingeSide === side ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleHingeSideChange(side)}
                  >
                    {side.charAt(0).toUpperCase() + side.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </>
        ) : shapeType === "circle" ? (
          <div className="space-y-2">
            <Label htmlFor="prop-radius">Radius (in)</Label>
            <Input
              id="prop-radius"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              onBlur={handleDimensionBlur}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="prop-width">Width (in)</Label>
              <Input
                id="prop-width"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                onBlur={handleDimensionBlur}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-height">Height (in)</Label>
              <Input
                id="prop-height"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                onBlur={handleDimensionBlur}
              />
            </div>
          </div>
        )}

        {!selectedDoor && shapeType === "l-shaped" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="prop-cut-width">Cut W (in)</Label>
                <Input
                  id="prop-cut-width"
                  value={cutWidth}
                  onChange={(e) => setCutWidth(e.target.value)}
                  onBlur={handleDimensionBlur}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prop-cut-height">Cut H (in)</Label>
                <Input
                  id="prop-cut-height"
                  value={cutHeight}
                  onChange={(e) => setCutHeight(e.target.value)}
                  onBlur={handleDimensionBlur}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cut Corner</Label>
              <div className="grid grid-cols-2 gap-1">
                {(["top-left", "top-right", "bottom-left", "bottom-right"] as Corner[]).map(
                  (corner) => (
                    <Button
                      key={corner}
                      type="button"
                      variant={cutCorner === corner ? "default" : "outline"}
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setCutCorner(corner)
                        setTimeout(handleDimensionBlur, 0)
                      }}
                    >
                      {corner.replace("-", " ")}
                    </Button>
                  )
                )}
              </div>
            </div>
          </>
        )}

        {!selectedDoor && shapeType === "beveled" && selectedRoom && (
          <>
            <div className="space-y-2">
              <Label htmlFor="prop-bevel-size">Bevel Size (in)</Label>
              <Input
                id="prop-bevel-size"
                value={bevelSize}
                onChange={(e) => setBevelSize(e.target.value)}
                onBlur={handleDimensionBlur}
              />
            </div>
            <div className="space-y-2">
              <Label>Bevel Corner</Label>
              <div className="grid grid-cols-2 gap-1">
                {(["top-left", "top-right", "bottom-left", "bottom-right"] as Corner[]).map(
                  (corner) => (
                    <Button
                      key={corner}
                      type="button"
                      variant={bevelCorner === corner ? "default" : "outline"}
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setBevelCorner(corner)
                        setTimeout(handleDimensionBlur, 0)
                      }}
                    >
                      {corner.replace("-", " ")}
                    </Button>
                  )
                )}
              </div>
            </div>
          </>
        )}

        {selectedFurniture && (
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-col gap-2">
              <HexColorPicker
                color={furnitureColor}
                onChange={handleColorChange}
                style={{ width: "100%", height: 150 }}
              />
              <Input
                value={furnitureColor}
                onChange={(e) => handleColorChange(e.target.value)}
                placeholder="#4A4A4A"
                className="font-mono text-xs"
              />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 pt-0 mt-auto">
        <Separator className="mb-4" />
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={handleDelete}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete {entityType}
        </Button>
      </div>
    </div>
  )
}

