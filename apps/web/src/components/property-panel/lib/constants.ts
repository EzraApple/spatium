import type { FurnitureEntity } from "@apartment-planner/shared"

export const DEFAULT_FURNITURE_COLORS: Record<FurnitureEntity["furnitureType"], string> = {
  "square-table": "#5D4037",
  "circle-table": "#5D4037",
  "rectangle-desk": "#C4A484",
  "l-shaped-desk": "#C4A484",
  "couch": "#4A4A4A",
  "l-shaped-couch": "#4A4A4A",
  "fridge": "#D3D3D3",
}

export const DOOR_WIDTH_PRESETS = [
  { label: '36"', value: 36 },
  { label: '42"', value: 42 },
  { label: '48"', value: 48 },
]

