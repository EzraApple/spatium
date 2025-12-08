import { useState, useEffect, useCallback } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import type { RoomEntity, FurnitureEntity, ShapeTemplate, FurnitureShapeTemplate, Corner } from "@apartment-planner/shared"
import { formatInchesForEditor, parseInchesFromEditor, shapeToVertices } from "@apartment-planner/shared"

type PropertyPanelProps = {
  selectedRoom: RoomEntity | null
  selectedFurniture: FurnitureEntity | null
  onRoomUpdate: (room: RoomEntity) => void
  onFurnitureUpdate: (furniture: FurnitureEntity) => void
  onRoomDelete: (roomId: string) => void
  onFurnitureDelete: (furnitureId: string) => void
}

export function PropertyPanel({
  selectedRoom,
  selectedFurniture,
  onRoomUpdate,
  onFurnitureUpdate,
  onRoomDelete,
  onFurnitureDelete,
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

  useEffect(() => {
    if (selectedRoom) {
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
  }, [selectedRoom, selectedFurniture])

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
    }

    onFurnitureUpdate(updatedFurniture)
  }, [selectedFurniture, name, width, height, cutWidth, cutHeight, cutCorner, radius, onFurnitureUpdate])

  const handleNameBlur = () => {
    if (selectedRoom) {
      handleRoomSave()
    } else if (selectedFurniture) {
      handleFurnitureSave()
    }
  }

  const handleDimensionBlur = () => {
    if (selectedRoom) {
      handleRoomSave()
    } else if (selectedFurniture) {
      handleFurnitureSave()
    }
  }

  const handleDelete = () => {
    if (selectedRoom) {
      onRoomDelete(selectedRoom.id)
    } else if (selectedFurniture) {
      onFurnitureDelete(selectedFurniture.id)
    }
  }

  if (!selectedRoom && !selectedFurniture) {
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
      }[selectedFurniture.furnitureType]
    : null

  return (
    <div className="absolute right-0 top-0 bottom-0 w-64 border-l border-sidebar-border bg-sidebar p-4 flex flex-col gap-4 shadow-lg animate-in slide-in-from-right-4 duration-200 cursor-hidden">
      <div>
        <h3 className="text-sm font-semibold text-sidebar-foreground mb-1">
          {selectedRoom ? "Room" : "Furniture"}
        </h3>
        {furnitureTypeLabel && (
          <p className="text-xs text-muted-foreground">{furnitureTypeLabel}</p>
        )}
      </div>

      <Separator />

      <div className="space-y-4 flex-1">
        <div className="space-y-2">
          <Label htmlFor="prop-name">Name</Label>
          <Input
            id="prop-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameBlur}
          />
        </div>

        {shapeType === "circle" ? (
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

        {shapeType === "l-shaped" && (
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

        {shapeType === "beveled" && selectedRoom && (
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
      </div>

      <Separator />

      <Button
        variant="destructive"
        size="sm"
        className="w-full"
        onClick={handleDelete}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete {selectedRoom ? "Room" : "Furniture"}
      </Button>
    </div>
  )
}

