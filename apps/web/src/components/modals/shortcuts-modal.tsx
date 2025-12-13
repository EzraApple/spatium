import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Kbd } from "@/components/ui/kbd"

type Shortcut = {
  keys: string[]
  description: string
}

type ShortcutGroup = {
  label: string
  shortcuts: Shortcut[]
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    label: "General",
    shortcuts: [
      { keys: ["?"], description: "Show keyboard shortcuts" },
      { keys: ["Esc"], description: "Deselect / Cancel" },
    ],
  },
  {
    label: "Editing",
    shortcuts: [
      { keys: ["⌘", "C"], description: "Copy selected item" },
      { keys: ["⌘", "V"], description: "Paste" },
      { keys: ["⌘", "D"], description: "Duplicate selected item" },
      { keys: ["⌫"], description: "Delete selected item" },
      { keys: ["R"], description: "Rotate furniture 90°" },
      { keys: ["P"], description: "Pick up furniture to inventory" },
    ],
  },
  {
    label: "Navigation",
    shortcuts: [
      { keys: ["+"], description: "Zoom in" },
      { keys: ["-"], description: "Zoom out" },
      { keys: ["Scroll"], description: "Zoom at cursor" },
      { keys: ["Drag"], description: "Pan canvas" },
    ],
  },
]

type ShortcutsModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShortcutsModal({ open, onOpenChange }: ShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.label}>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                {group.label}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-foreground">
                      {shortcut.description}
                    </span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, j) => (
                        <Kbd key={j}>{key}</Kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

