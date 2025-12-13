import { useEffect, useRef, useState } from "react"
import { useLocation } from "react-router-dom"

const DURATION_MS = 1750

function isEditRoute(pathname: string) {
  return /^\/edit\/[^/]+$/.test(pathname)
}

export function RouteTransition() {
  const { pathname } = useLocation()
  const prevPathnameRef = useRef<string | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [runToken, setRunToken] = useState(0)

  useEffect(() => {
    const wasEdit = prevPathnameRef.current ? isEditRoute(prevPathnameRef.current) : false
    const isEdit = isEditRoute(pathname)
    const shouldPlay = isEdit && (!wasEdit || prevPathnameRef.current !== pathname)

    prevPathnameRef.current = pathname

    if (!shouldPlay) return

    setRunToken((t) => t + 1)
    setIsActive(true)
  }, [pathname])

  useEffect(() => {
    if (!isActive) return

    const timeout = window.setTimeout(() => {
      setIsActive(false)
    }, DURATION_MS)

    return () => window.clearTimeout(timeout)
  }, [isActive, runToken])

  if (!isActive) return null

  return (
    <div
      key={runToken}
      className="route-transition-overlay bg-blueprint"
      role="status"
      aria-live="polite"
      aria-label="Loading editor"
    >
      <div className="route-transition-grid grid-blueprint-large opacity-70" />
      <div className="route-transition-gradient" />

      <div className="route-transition-content">
        <div className="panel-neo bg-card px-5 py-4">
          <div className="flex items-center gap-3">
            <img src="/android-chrome-192x192.png" alt="" className="h-10 w-10" />
            <div className="flex flex-col">
              <div className="text-sm font-semibold leading-tight text-foreground">Spatium</div>
              <div className="text-xs text-muted-foreground">Opening editor</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="route-transition-bar panel-neo bg-background">
              <div className="route-transition-bar-fill bg-primary" />
              <div className="route-transition-bar-scanner" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


