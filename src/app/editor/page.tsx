"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "~/hooks/use-auth";
import { LayoutDashboard } from "~/components/layout-dashboard";

export default function EditorPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Redirect anonymous users to the new editor
    if (!isLoading && !isAuthenticated) {
      router.push("/editor/new");
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading while checking auth status
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  // Show dashboard for authenticated users
  if (isAuthenticated) {
    return <LayoutDashboard />;
  }

  // This will briefly show while redirecting
  return null;
}