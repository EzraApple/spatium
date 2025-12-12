import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

type PropertySheetProps = {
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function PropertySheet({ title, subtitle, children, footer, className }: PropertySheetProps) {
  return (
    <div
      className={cn(
        "panel-neo absolute right-0 top-0 bottom-0 w-64 bg-sidebar animate-in slide-in-from-right-4 duration-200 cursor-hidden flex flex-col rounded-none border-0 border-l-2",
        className
      )}
    >
      <div className="px-4 pt-4">
        <h3 className="text-sm font-semibold text-sidebar-foreground">{title}</h3>
        {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>

      <Separator className="my-4" />

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">{children}</div>

      {footer ? (
        <div className="border-t-2 border-sidebar-border px-4 py-3">{footer}</div>
      ) : null}
    </div>
  )
}

