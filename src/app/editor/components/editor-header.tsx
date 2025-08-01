"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { 
  Save, 
  Share2, 
  AlertCircle, 
  Check,
  Home,
  Clock
} from "lucide-react";
import { useAuth } from "~/hooks/use-auth";
import { AuthComponent } from "~/components/auth-component";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { AccountDropdown } from "~/components/account-dropdown";

interface EditorHeaderProps {
  hasUnsavedChanges?: boolean;
  layoutTitle?: string;
  onTitleChange?: (title: string) => void;
  onSave?: () => void;
  onShare?: () => void;
  isAuthenticated?: boolean;
  onAuthSuccess?: () => void;
}

export function EditorHeader({ 
  hasUnsavedChanges = false,
  layoutTitle = "Untitled Layout",
  onTitleChange,
  onSave,
  onShare,
  isAuthenticated: propIsAuthenticated,
  onAuthSuccess
}: EditorHeaderProps) {
  const router = useRouter();
  const { isAuthenticated: authIsAuthenticated, user } = useAuth();
  const [title, setTitle] = useState(layoutTitle);
  const [isEditing, setIsEditing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Use prop if provided, otherwise use auth hook
  const isAuthenticated = propIsAuthenticated ?? authIsAuthenticated;

  const createdAt = new Date().toLocaleDateString();

  const handleTitleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
    onTitleChange?.(title);
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
  };

  const handleSaveClick = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    onSave?.();
  };

  const handleShareClick = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    onShare?.();
  };

  const handleGoHome = () => {
    router.push("/");
  };

  const handleGoToDashboard = () => {
    router.push("/editor");
  };

  return (
    <>
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
        {/* Left side - Title and status */}
        <div className="flex items-center gap-4">
          {/* Home/Dashboard button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={isAuthenticated ? handleGoToDashboard : handleGoHome}
            className="text-slate-600 hover:text-slate-900"
          >
            <Home className="h-4 w-4" />
          </Button>

          {/* Title editing */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <form onSubmit={handleTitleSubmit} className="flex items-center gap-2">
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  onBlur={() => setIsEditing(false)}
                  className="text-xl font-semibold bg-transparent border-none outline-none focus:ring-0 h-8 px-0"
                  autoFocus
                />
              </form>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="text-xl font-semibold text-slate-900 hover:text-slate-700 transition-colors"
                disabled={!isAuthenticated && !onTitleChange}
              >
                {title}
              </button>
            )}

            {/* Unsaved changes indicator */}
            {hasUnsavedChanges && (
              <div className="flex items-center gap-1 text-amber-600">
                <Clock className="h-3 w-3" />
                <span className="text-xs">Unsaved</span>
              </div>
            )}

            {/* Saved indicator */}
            {!hasUnsavedChanges && isAuthenticated && (
              <div className="flex items-center gap-1 text-green-600">
                <Check className="h-3 w-3" />
                <span className="text-xs">Saved</span>
              </div>
            )}
          </div>

          <span className="text-sm text-slate-500 whitespace-nowrap">
            Created {createdAt}
          </span>
        </div>

        {/* Right side - Actions and auth */}
        <div className="flex items-center gap-2">
          {/* Save and Share buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveClick}
              className="flex items-center gap-2"
              disabled={!hasUnsavedChanges && isAuthenticated}
            >
              <Save className="h-4 w-4" />
              Save
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleShareClick}
              className="flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>

          {/* Auth section */}
          {isAuthenticated ? (
            <AccountDropdown />
          ) : (
            hasUnsavedChanges && (
              <div className="flex items-center gap-1 text-amber-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Changes not saved</span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Auth Modal */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Sign in to save your layout</DialogTitle>
          </DialogHeader>
          <AuthComponent 
            onSuccess={() => {
              console.log("📱 Auth modal success, closing modal and calling onAuthSuccess");
              setShowAuthModal(false);
              if (onAuthSuccess) {
                console.log("🚀 Calling onAuthSuccess callback");
                onAuthSuccess();
              } else {
                console.log("❌ No onAuthSuccess callback provided");
              }
            }}
            showTitle={false}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}