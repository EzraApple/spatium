import { Skeleton } from "@/components/ui/skeleton"
import { Users, Grid3X3, Move } from "lucide-react"

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      {/* Hero Section */}
      <section className="relative overflow-hidden w-full">
        {/* Grid Background */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.15) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.15) 1px, transparent 1px)
            `,
            backgroundSize: "30px 30px",
          }}
        />

        <div className="container mx-auto px-4 py-20 lg:py-32 relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Title skeleton */}
            <div className="mb-6">
              <Skeleton className="h-12 lg:h-16 w-3/4 mx-auto mb-2" />
              <Skeleton className="h-12 lg:h-16 w-1/2 mx-auto" />
            </div>
            
            {/* Subtitle skeleton */}
            <div className="mb-8 max-w-2xl mx-auto">
              <Skeleton className="h-6 w-full mb-2" />
              <Skeleton className="h-6 w-3/4 mx-auto" />
            </div>

            {/* Button skeleton */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Skeleton className="h-12 w-48 mx-auto sm:mx-0" />
            </div>

            {/* Join Layout Section */}
            <div className="max-w-md mx-auto mb-12">
              <div className="flex flex-col sm:flex-row gap-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-32" />
              </div>
              <div className="mt-2">
                <Skeleton className="h-4 w-64 mx-auto" />
              </div>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                <Users className="h-5 w-5 opacity-30 animate-pulse" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                <Move className="h-5 w-5 opacity-30 animate-pulse" />
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                <Grid3X3 className="h-5 w-5 opacity-30 animate-pulse" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
} 