import { Skeleton } from "@/components/ui/skeleton"
import { Grid3X3 } from "lucide-react"

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {/* Back button skeleton */}
            <Skeleton className="h-9 w-9 rounded-md" />
            
            {/* Title skeleton */}
            <Skeleton className="h-8 w-48" />
            
            {/* Code badge skeleton */}
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>

          <div className="flex items-center gap-2">
            {/* Action buttons skeleton */}
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar */}
        <div className="w-64 border-r bg-muted/30 p-4 overflow-y-auto">
          <div className="space-y-4">
            <div>
              {/* Sidebar header skeleton */}
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-7 w-12" />
              </div>

              {/* Empty state skeleton */}
              <div className="text-center py-4">
                <Grid3X3 className="h-8 w-8 mx-auto mb-2 opacity-20 animate-pulse" />
                <Skeleton className="h-4 w-24 mx-auto mb-1" />
                <Skeleton className="h-3 w-32 mx-auto" />
              </div>
            </div>

            {/* Room list skeleton */}
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  {/* Room item skeleton */}
                  <div className="flex items-center gap-1">
                    <Skeleton className="flex-1 h-8 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                  
                  {/* Furniture items skeleton (for first room) */}
                  {i === 1 && (
                    <div className="ml-4 space-y-1">
                      {[1, 2].map((j) => (
                        <div key={j} className="flex items-center justify-between bg-muted/50 rounded px-2 py-1">
                          <div className="flex items-center gap-1">
                            <Skeleton className="w-2 h-2 rounded-full" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                          <div className="flex items-center gap-1">
                            <Skeleton className="h-2 w-12" />
                            <Skeleton className="h-4 w-4" />
                          </div>
                        </div>
                      ))}
                      <Skeleton className="w-full h-7 rounded" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative overflow-hidden bg-slate-100">
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <Grid3X3 className="h-12 w-12 mx-auto mb-4 opacity-20 animate-spin" />
              <Skeleton className="h-5 w-32 mx-auto mb-2" />
              <Skeleton className="h-4 w-40 mx-auto" />
            </div>
          </div>
          
          {/* Grid background simulation */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
              `,
              backgroundSize: "20px 20px",
            }}
          />
        </div>
      </div>
    </div>
  )
}
