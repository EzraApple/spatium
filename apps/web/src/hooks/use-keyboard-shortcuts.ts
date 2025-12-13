import { useEffect, useCallback } from "react"
import type { FurnitureEntity, FurnitureRotation } from "@apartment-planner/shared"

type UseKeyboardShortcutsProps = {
  selectedId: string | null
  selectedType: "room" | "furniture" | "door" | null
  selectedFurniture: FurnitureEntity | null
  copy: () => boolean
  paste: () => boolean
  duplicate: () => boolean
  deleteSelected: () => void
  deselect: () => void
  rotateFurniture: (furniture: FurnitureEntity) => void
  pickUpFurniture: (furnitureId: string) => void
  zoomIn: () => void
  zoomOut: () => void
  openShortcutsModal: () => void
}

function getNextRotation(current: FurnitureRotation): FurnitureRotation {
  const rotations: FurnitureRotation[] = [0, 90, 180, 270]
  const idx = rotations.indexOf(current)
  return rotations[(idx + 1) % 4]
}

export function useKeyboardShortcuts({
  selectedId,
  selectedType,
  selectedFurniture,
  copy,
  paste,
  duplicate,
  deleteSelected,
  deselect,
  rotateFurniture,
  pickUpFurniture,
  zoomIn,
  zoomOut,
  openShortcutsModal,
}: UseKeyboardShortcutsProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInputFocused =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable

      if (isInputFocused) return

      const isMod = e.metaKey || e.ctrlKey

      if (isMod && e.key === "c") {
        e.preventDefault()
        copy()
        return
      }

      if (isMod && e.key === "v") {
        e.preventDefault()
        paste()
        return
      }

      if (isMod && e.key === "d") {
        e.preventDefault()
        duplicate()
        return
      }

      if (e.key === "Escape") {
        e.preventDefault()
        deselect()
        return
      }

      if (e.key === "Backspace" || e.key === "Delete") {
        if (selectedId && selectedType) {
          e.preventDefault()
          deleteSelected()
        }
        return
      }

      if (e.key.toLowerCase() === "r" && !isMod) {
        if (selectedFurniture) {
          e.preventDefault()
          rotateFurniture(selectedFurniture)
        }
        return
      }

      if (e.key.toLowerCase() === "p" && !isMod) {
        if (selectedFurniture) {
          e.preventDefault()
          pickUpFurniture(selectedFurniture.id)
        }
        return
      }

      if (e.key === "=" || e.key === "+") {
        e.preventDefault()
        zoomIn()
        return
      }

      if (e.key === "-" || e.key === "_") {
        e.preventDefault()
        zoomOut()
        return
      }

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault()
        openShortcutsModal()
        return
      }
    },
    [
      selectedId,
      selectedType,
      selectedFurniture,
      copy,
      paste,
      duplicate,
      deleteSelected,
      deselect,
      rotateFurniture,
      pickUpFurniture,
      zoomIn,
      zoomOut,
      openShortcutsModal,
    ]
  )

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown, { capture: true })
    return () => document.removeEventListener("keydown", handleKeyDown, { capture: true })
  }, [handleKeyDown])
}

export { getNextRotation }

