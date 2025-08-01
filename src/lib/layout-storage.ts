"use client";

import type { Layout, Room } from "~/app/editor/types";

const LAYOUT_STORAGE_KEY = "spatium_layout";
const AUTOSAVE_INTERVAL = 30000; // 30 seconds

export interface StoredLayout extends Layout {
  isTemporary: boolean;
  hasUnsavedChanges: boolean;
}

// Functional utilities for localStorage management
export const layoutStorage = {
  /**
   * Save layout to localStorage for anonymous users
   */
  saveToLocal: (layout: Omit<Layout, "id"> & { id?: string }): StoredLayout => {
    const storedLayout: StoredLayout = {
      id: layout.id || crypto.randomUUID(),
      title: layout.title,
      rooms: layout.rooms,
      metadata: {
        ...layout.metadata,
        lastModified: new Date(),
      },
      isTemporary: true,
      hasUnsavedChanges: false,
    };

    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(storedLayout));
      console.log("💾 Layout saved to localStorage:", { 
        title: storedLayout.title, 
        roomCount: storedLayout.rooms.length 
      });
      return storedLayout;
    } catch (error) {
      console.error("Failed to save layout to localStorage:", error);
      throw new Error("Failed to save layout locally");
    }
  },

  /**
   * Get layout from localStorage
   */
  getFromLocal: (): StoredLayout | null => {
    try {
      const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
      console.log("📖 Getting layout from localStorage:", stored ? "found" : "not found");
      if (!stored) return null;

      const layout = JSON.parse(stored) as StoredLayout;
      // Ensure dates are properly parsed
      layout.metadata.createdAt = new Date(layout.metadata.createdAt);
      layout.metadata.lastModified = new Date(layout.metadata.lastModified);
      
      console.log("📖 Parsed layout:", { 
        title: layout.title, 
        roomCount: layout.rooms.length, 
        hasUnsavedChanges: layout.hasUnsavedChanges 
      });
      return layout;
    } catch (error) {
      console.error("Failed to get layout from localStorage:", error);
      return null;
    }
  },

  /**
   * Check if there's a temporary layout in localStorage
   */
  hasTemporaryLayout: (): boolean => {
    const layout = layoutStorage.getFromLocal();
    return layout?.isTemporary ?? false;
  },

  /**
   * Mark layout as having unsaved changes
   */
  markUnsaved: (): void => {
    const layout = layoutStorage.getFromLocal();
    if (layout) {
      layout.hasUnsavedChanges = true;
      layout.metadata.lastModified = new Date();
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    }
  },

  /**
   * Mark layout as saved
   */
  markSaved: (): void => {
    const layout = layoutStorage.getFromLocal();
    if (layout) {
      layout.hasUnsavedChanges = false;
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    }
  },

  /**
   * Update rooms in the stored layout
   */
  updateRooms: (rooms: Room[]): StoredLayout => {
    const layout = layoutStorage.getFromLocal();
    if (!layout) {
      // Create new layout if none exists
      return layoutStorage.saveToLocal({
        title: "Untitled Layout",
        rooms,
        metadata: {
          createdAt: new Date(),
          lastModified: new Date(),
          version: 1,
        },
      });
    }

    layout.rooms = rooms;
    layout.hasUnsavedChanges = true;
    layout.metadata.lastModified = new Date();
    layout.metadata.version += 1;

    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    return layout;
  },

  /**
   * Update layout title
   */
  updateTitle: (title: string): void => {
    console.log("✏️ Updating title in localStorage:", title);
    const layout = layoutStorage.getFromLocal();
    if (layout) {
      layout.title = title;
      layout.hasUnsavedChanges = true;
      layout.metadata.lastModified = new Date();
      try {
        localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
        console.log("✅ Title updated successfully");
      } catch (error) {
        console.error("❌ Failed to save title to localStorage:", error);
      }
    } else {
      console.log("❌ No layout found to update title");
    }
  },

  /**
   * Clear localStorage layout
   */
  clearLocal: (): void => {
    try {
      localStorage.removeItem(LAYOUT_STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear localStorage:", error);
    }
  },

  /**
   * Get layout data prepared for database transfer
   */
  getLayoutForTransfer: (): Omit<StoredLayout, "isTemporary" | "hasUnsavedChanges"> | null => {
    const layout = layoutStorage.getFromLocal();
    if (!layout) return null;

    const { isTemporary, hasUnsavedChanges, ...layoutData } = layout;
    return layoutData;
  },
};

// Auto-save functionality for authenticated users
export const createAutoSave = (
  saveFunction: (layout: Layout) => Promise<void>,
  isAuthenticated: boolean
) => {
  let timeoutId: NodeJS.Timeout | null = null;

  const scheduleAutoSave = () => {
    if (!isAuthenticated) return; // No auto-save for anonymous users

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(async () => {
      const layout = layoutStorage.getFromLocal();
      if (layout?.hasUnsavedChanges) {
        try {
          const layoutData = layoutStorage.getLayoutForTransfer();
          if (layoutData) {
            await saveFunction(layoutData);
            layoutStorage.markSaved();
          }
        } catch (error) {
          console.error("Auto-save failed:", error);
        }
      }
    }, AUTOSAVE_INTERVAL);
  };

  const triggerAutoSave = () => {
    layoutStorage.markUnsaved();
    scheduleAutoSave();
  };

  const cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return {
    triggerAutoSave,
    cleanup,
  };
};

// Utility for creating a new empty layout
export const createEmptyLayout = (): StoredLayout => {
  return {
    id: crypto.randomUUID(),
    title: "Untitled Layout",
    rooms: [],
    metadata: {
      createdAt: new Date(),
      lastModified: new Date(),
      version: 1,
    },
    isTemporary: true,
    hasUnsavedChanges: false,
  };
};