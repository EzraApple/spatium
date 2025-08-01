import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { layoutStorage } from "~/lib/layout-storage";
import { useAuth } from "~/hooks/use-auth";
import { toast } from "sonner";
import type { Layout } from "~/app/editor/types";

export function useLayoutOperations() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [isTransferring, setIsTransferring] = useState(false);

  const createLayoutMutation = api.layout.create.useMutation();
  const updateLayoutMutation = api.layout.update.useMutation();

  // Transfer localStorage layout to database after authentication
  const transferToDatabase = useCallback(async (forceAuth: boolean = false): Promise<string | null> => {
    console.log("🔄 transferToDatabase called", { isAuthenticated, forceAuth });
    
    if (!forceAuth && !isAuthenticated) {
      console.log("❌ User not authenticated, aborting transfer");
      return null;
    }

    const storedLayout = layoutStorage.getLayoutForTransfer();
    console.log("📦 Stored layout from localStorage:", storedLayout);
    
    if (!storedLayout) {
      console.log("❌ No stored layout found in localStorage");
      return null;
    }

    setIsTransferring(true);
    try {
      console.log("🚀 Creating layout in database:", {
        title: storedLayout.title,
        roomCount: storedLayout.rooms.length,
        metadata: storedLayout.metadata
      });

      const result = await createLayoutMutation.mutateAsync({
        title: storedLayout.title,
        data: storedLayout,
      });

      console.log("✅ Layout created successfully:", result);
      
      if (!result || !result.id) {
        console.error("❌ Invalid result from createLayout mutation:", result);
        throw new Error("Invalid response from server");
      }

      // Clear localStorage after successful transfer
      layoutStorage.clearLocal();
      console.log("🧹 localStorage cleared");
      
      toast.success("Layout saved to your account!");
      return result.id;
    } catch (error) {
      console.error("❌ Failed to save layout to database:", error);
      toast.error("Failed to save layout to account");
      return null;
    } finally {
      setIsTransferring(false);
    }
  }, [isAuthenticated, createLayoutMutation]);

  // Save layout (for authenticated users)
  const saveLayout = useCallback(async (
    layoutId: string, 
    title: string, 
    layoutData: Layout
  ): Promise<boolean> => {
    if (!isAuthenticated) {
      toast.error("Please sign in to save your layout");
      return false;
    }

    try {
      await updateLayoutMutation.mutateAsync({
        id: layoutId,
        title,
        data: layoutData,
      });

      toast.success("Layout saved successfully!");
      return true;
    } catch (error) {
      toast.error("Failed to save layout");
      return false;
    }
  }, [isAuthenticated, updateLayoutMutation]);

  // Create new layout (for authenticated users)
  const createLayout = useCallback(async (
    title: string,
    layoutData: Layout
  ): Promise<string | null> => {
    if (!isAuthenticated) {
      toast.error("Please sign in to save your layout");
      return null;
    }

    try {
      const result = await createLayoutMutation.mutateAsync({
        title,
        data: layoutData,
      });

      toast.success("Layout created successfully!");
      return result.id;
    } catch (error) {
      toast.error("Failed to create layout");
      return null;
    }
  }, [isAuthenticated, createLayoutMutation]);

  // Handle authentication success (transfer layout if exists)
  const handleAuthSuccess = useCallback(async () => {
    console.log("🎉 handleAuthSuccess called");
    
    try {
      // Small delay to allow session to propagate to tRPC context
      console.log("⏳ Waiting for session to propagate...");
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Force auth to true since we know the user just authenticated
      const layoutId = await transferToDatabase(true);
      console.log("📝 Transfer result:", layoutId);
      
      if (layoutId) {
        console.log("🔀 Redirecting to layout:", `/editor/${layoutId}`);
        router.push(`/editor/${layoutId}`);
      } else {
        console.log("❌ No layout ID returned, staying on current page");
      }
    } catch (error) {
      console.error("❌ Error in handleAuthSuccess:", error);
      toast.error("Something went wrong after signing in");
    }
  }, [transferToDatabase, router]);

  return {
    transferToDatabase,
    saveLayout,
    createLayout,
    handleAuthSuccess,
    isTransferring,
    isLoading: createLayoutMutation.isPending || updateLayoutMutation.isPending,
  };
}