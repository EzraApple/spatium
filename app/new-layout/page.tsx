"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRight, Grid3X3 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"

// Generate random 8-letter all-caps code
const generateLayoutCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export default function NewLayoutPage() {
  const [layoutName, setLayoutName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const router = useRouter()
  const createLayoutMutation = useMutation(api.layouts.createLayout)

  const handleCreate = async () => {
    if (layoutName.trim() && !isCreating) {
      setIsCreating(true)
      try {
        const code = generateLayoutCode()
        
        // Create layout in database
        await createLayoutMutation({
          name: layoutName.trim(),
          title: layoutName.trim(),
          code: code
        })
        
        // Redirect to layout editor with the code
        router.push(`/layout?code=${code}`)
      } catch (error) {
        console.error("Failed to create layout:", error)
        setIsCreating(false)
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCreate()
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Grid Background */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.15) 1px, transparent 1px)
          `,
          backgroundSize: "30px 30px",
        }}
      />

      <div className="w-full max-w-md relative">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Grid3X3 className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Create New Layout</CardTitle>
            <CardDescription>Give your layout a name to get started designing your perfect space.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="layout-name">Layout Name</Label>
              <Input
                id="layout-name"
                type="text"
                placeholder="e.g., My Apartment, Studio Layout, Shared House..."
                value={layoutName}
                onChange={(e) => setLayoutName(e.target.value)}
                onKeyPress={handleKeyPress}
                className="text-base"
                autoFocus
                disabled={isCreating}
              />
            </div>

            <div className="space-y-4">
              <Button
                onClick={handleCreate}
                disabled={!layoutName.trim() || isCreating}
                className="w-full bg-black hover:bg-black/90 text-white"
                size="lg"
              >
                {isCreating ? "Creating..." : "Create Layout"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <Button variant="outline" className="w-full" asChild disabled={isCreating}>
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>You can always change the name later in the editor.</p>
        </div>
      </div>
    </div>
  )
}
