"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Grid3X3, Users, MousePointer } from "lucide-react";
import { AccountDropdown } from "~/components/account-dropdown";
import { useAuth } from "~/hooks/use-auth";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  const handleCreateLayout = () => {
    console.log("Navigating to editor");
    if (isAuthenticated) {
      router.push("/editor/new");
    } else {
      router.push("/editor/new");
    }
  };

  useEffect(() => {
    setMounted(true);

    const handleKeyPress = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        handleCreateLayout();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="relative z-20 w-full px-4 py-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Spatium</h1>
          {!isLoading && (
            <>
              {isAuthenticated ? (
                <AccountDropdown />
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => router.push("/auth")}
                  className="flex items-center gap-2"
                >
                  Sign In
                </Button>
              )}
            </>
          )}
        </div>
      </header>

      {/* Graph Paper Background with Vertical Fade */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px)
            `,
            backgroundSize: "20px 20px",
            mask: `linear-gradient(to bottom, 
              transparent 0%, 
              rgba(0,0,0,0.3) 15%, 
              rgba(0,0,0,0.6) 35%, 
              rgba(0,0,0,0.8) 50%, 
              rgba(0,0,0,0.6) 65%, 
              rgba(0,0,0,0.3) 85%, 
              transparent 100%
            )`,
            WebkitMask: `linear-gradient(to bottom, 
              transparent 0%, 
              rgba(0,0,0,0.3) 15%, 
              rgba(0,0,0,0.6) 35%, 
              rgba(0,0,0,0.8) 50%, 
              rgba(0,0,0,0.6) 65%, 
              rgba(0,0,0,0.3) 85%, 
              transparent 100%
            )`,
          }}
        />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 pb-16 md:pt-24 md:pb-24">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            {/* Hero Text */}
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Spatium
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Create and edit apartment layouts with furniture. Design your perfect living space with our intuitive drag-and-drop editor.
            </p>

            {/* Grid Preview */}
            <div className="mb-12 flex justify-center">
              <div className="relative">
                <div className="w-64 h-40 border-2 border-border rounded-lg bg-muted/30 grid grid-cols-8 grid-rows-5 gap-0.5 p-2">
                  <div className="col-span-3 row-span-2 bg-slate-200 rounded border border-slate-300"></div>
                  <div className="col-span-2 row-span-2 bg-slate-300 rounded border border-slate-400"></div>
                  <div className="col-span-3 row-span-3 bg-slate-100 rounded border border-slate-200"></div>
                  <div className="col-span-5 row-span-3 bg-slate-200 rounded border border-slate-300"></div>
                </div>
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-primary rounded-full animate-pulse"></div>
                <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-primary/70 rounded-full animate-pulse"></div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="flex justify-center">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center gap-3"
                onClick={handleCreateLayout}
              >
                <span>Create Layout</span>
                <div className="flex items-center gap-1 text-sm opacity-75">
                  <kbd className="px-1.5 py-0.5 bg-primary-foreground/20 rounded text-xs font-mono">⌘</kbd>
                  <span className="text-xs">+</span>
                  <kbd className="px-1.5 py-0.5 bg-primary-foreground/20 rounded text-xs font-mono">↵</kbd>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to design perfect layouts</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Professional-grade tools that make collaborative design effortless and precise.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                  <MousePointer className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Drag & Drop Editing</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Intuitive drag-and-drop interface lets you place furniture, walls, and fixtures exactly where you want
                  them with pixel-perfect precision.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Real-time Collaboration</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Work together seamlessly with your team. See changes instantly, leave comments, and iterate on designs
                  in real-time.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                  <Grid3X3 className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Smart Snap-to-Grid</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Intelligent grid system ensures perfect alignment and proportions. Toggle between free-form and
                  grid-locked editing modes.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
