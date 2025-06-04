"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight, Users, Grid3X3, Move } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function Landing() {
  const [joinCode, setJoinCode] = useState("")
  const router = useRouter()

  const handleJoinLayout = () => {
    const trimmedCode = joinCode.trim().toUpperCase()
    if (trimmedCode.length === 8) {
      router.push(`/layout?code=${trimmedCode}`)
    }
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow letters and limit to 8 characters
    const value = e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 8)
    setJoinCode(value)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleJoinLayout()
    }
  }

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
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">
              Design Your Perfect
              <span className="text-primary block">Living Space</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Create stunning floor plans, arrange furniture, and collaborate with roommates. All for free, right in
              your browser.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button size="lg" className="text-lg px-8 bg-black hover:bg-black/90 text-white" asChild>
                <Link href="/new-layout">
                  Create Layout
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>

            {/* Join Layout Section */}
            <div className="max-w-md mx-auto mb-12">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="text"
                  placeholder="Enter 8-letter code"
                  value={joinCode}
                  onChange={handleCodeChange}
                  onKeyPress={handleKeyPress}
                  className="text-center text-lg font-mono tracking-wider h-10"
                  maxLength={8}
                />
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={handleJoinLayout}
                  disabled={joinCode.length !== 8}
                  className="whitespace-nowrap h-10"
                >
                  Join Layout
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Have a layout code? Enter it above to join an existing layout.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                <Users className="h-5 w-5" />
                <span>Collaborate with roommates</span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                <Move className="h-5 w-5" />
                <span>Drag & drop furniture</span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                <Grid3X3 className="h-5 w-5" />
                <span>Precise grid system</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
