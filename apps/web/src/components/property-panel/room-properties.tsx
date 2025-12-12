import { useState, useEffect, useCallback, useRef } from "react"
import { Trash2 } from "lucide-react"
import { HexColorPicker } from "react-colorful"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { PropertySheet } from "./property-sheet"
import type { RoomEntity, ShapeTemplate, Corner } from "@apartment-planner/shared"
import { formatInchesForEditor, parseInchesFromEditor } from "@apartment-planner/shared"

type RoomPropertiesProps = {
  room: RoomEntity
  onUpdate: (room: RoomEntity) => void
  onDelete: (roomId: string) => void
}

export function RoomProperties({ room, onUpdate, onDelete }: RoomPropertiesProps) {
  const [name, setName] = useState("")
  const [roomColor, setRoomColor] = useState("#FFFFFF")
  const [width, setWidth] = useState("")
  const [height, setHeight] = useState("")
  const [cutWidth, setCutWidth] = useState("")
  const [cutHeight, setCutHeight] = useState("")
  const [cutCorner, setCutCorner] = useState<Corner>("top-right")
  const [bevelSize, setBevelSize] = useState("")
  const [bevelCorner, setBevelCorner] = useState<Corner>("top-right")
  const focusedRoomRef = useRef<RoomEntity | null>(null)

  useEffect(() => {
    setName(room.name)
    setRoomColor(room.color ?? "#FFFFFF")
    setWidth(formatInchesForEditor(room.shapeTemplate.width))
    setHeight(formatInchesForEditor(room.shapeTemplate.height))

    if (room.shapeTemplate.type === "l-shaped") {
      setCutWidth(formatInchesForEditor(room.shapeTemplate.cutWidth))
      setCutHeight(formatInchesForEditor(room.shapeTemplate.cutHeight))
      setCutCorner(room.shapeTemplate.cutCorner)
    }

    if (room.shapeTemplate.type === "beveled") {
      setBevelSize(formatInchesForEditor(room.shapeTemplate.bevelSize))
      setBevelCorner(room.shapeTemplate.bevelCorner)
    }
  }, [room])

  const handleFocusCapture = useCallback(() => {
    focusedRoomRef.current = room
  }, [room])

  const handleColorChange = useCallback((newColor: string) => {
    setRoomColor(newColor)
    onUpdate({
      ...room,
      color: newColor,
    })
  }, [room, onUpdate])

  const handleSave = useCallback((overrides?: { cutCorner?: Corner; bevelCorner?: Corner }) => {
    const target = focusedRoomRef.current ?? room
    const widthEighths = parseInchesFromEditor(width) ?? target.shapeTemplate.width
    const heightEighths = parseInchesFromEditor(height) ?? target.shapeTemplate.height

    let template: ShapeTemplate

    switch (target.shapeTemplate.type) {
      case "rectangle":
        template = { type: "rectangle", width: widthEighths, height: heightEighths }
        break
      case "l-shaped":
        template = {
          type: "l-shaped",
          width: widthEighths,
          height: heightEighths,
          cutWidth: parseInchesFromEditor(cutWidth) ?? target.shapeTemplate.cutWidth,
          cutHeight: parseInchesFromEditor(cutHeight) ?? target.shapeTemplate.cutHeight,
          cutCorner: overrides?.cutCorner ?? cutCorner,
        }
        break
      case "beveled":
        template = {
          type: "beveled",
          width: widthEighths,
          height: heightEighths,
          bevelSize: parseInchesFromEditor(bevelSize) ?? target.shapeTemplate.bevelSize,
          bevelCorner: overrides?.bevelCorner ?? bevelCorner,
        }
        break
    }

    onUpdate({
      ...target,
      name,
      shapeTemplate: template,
      color: roomColor,
    })
  }, [room, name, width, height, cutWidth, cutHeight, cutCorner, bevelSize, bevelCorner, roomColor, onUpdate])

  const handleBlur = () => handleSave()

  return (
    <PropertySheet title="Room">
      <div onFocusCapture={handleFocusCapture} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prop-name">Name</Label>
          <Input
            id="prop-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleBlur}
          />
        </div>

        <div className="space-y-2">
          <Label>Color</Label>
          <div className="flex flex-col gap-2">
            <HexColorPicker
              color={roomColor}
              onChange={handleColorChange}
              style={{ width: "100%", height: 150 }}
            />
            <Input
              value={roomColor}
              onChange={(e) => handleColorChange(e.target.value)}
              placeholder="#FFFFFF"
              className="font-mono text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="prop-width">Width (in)</Label>
            <Input
              id="prop-width"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              onBlur={handleBlur}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prop-height">Height (in)</Label>
            <Input
              id="prop-height"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              onBlur={handleBlur}
            />
          </div>
        </div>

        {room.shapeTemplate.type === "l-shaped" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="prop-cut-width">Cut W (in)</Label>
                <Input
                  id="prop-cut-width"
                  value={cutWidth}
                  onChange={(e) => setCutWidth(e.target.value)}
                  onBlur={handleBlur}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prop-cut-height">Cut H (in)</Label>
                <Input
                  id="prop-cut-height"
                  value={cutHeight}
                  onChange={(e) => setCutHeight(e.target.value)}
                  onBlur={handleBlur}
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
                        handleSave({ cutCorner: corner })
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

        {room.shapeTemplate.type === "beveled" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="prop-bevel-size">Bevel Size (in)</Label>
              <Input
                id="prop-bevel-size"
                value={bevelSize}
                onChange={(e) => setBevelSize(e.target.value)}
                onBlur={handleBlur}
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
                        handleSave({ bevelCorner: corner })
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

        <Separator className="my-4" />

        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={() => onDelete(room.id)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Room
        </Button>
      </div>
    </PropertySheet>
  )
}

