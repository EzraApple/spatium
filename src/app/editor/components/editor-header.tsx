"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";

export function EditorHeader() {
  const [title, setTitle] = useState("Untitled Layout");
  const [isEditing, setIsEditing] = useState(false);
  const createdAt = new Date().toLocaleDateString();

  const handleTitleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
    console.log("Title saved:", title);
  };

  const handleSignInClick = () => {
    console.log("Sign in to save clicked");
  };

  return (
    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
      <div className="flex items-center gap-4">
        {isEditing ? (
          <form onSubmit={handleTitleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setIsEditing(false)}
              className="text-xl font-semibold bg-transparent border-none outline-none focus:ring-0"
              autoFocus
            />
          </form>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-xl font-semibold text-slate-900 hover:text-slate-700 transition-colors"
          >
            {title}
          </button>
        )}
        <span className="text-sm text-slate-500 whitespace-nowrap">Created {createdAt}</span>
      </div>

      <Button 
        onClick={handleSignInClick}
        className="bg-slate-900 hover:bg-slate-800 text-white whitespace-nowrap"
      >
        Sign in to save
      </Button>
    </div>
  );
}