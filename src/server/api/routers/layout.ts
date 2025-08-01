import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

// Zod schemas for validation
const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const DoorSchema = z.object({
  id: z.string(),
  wallIndex: z.number(),
  position: z.number(),
  width: z.number(),
  openDirection: z.enum(["inward", "outward"]),
  swingAngle: z.number(),
  pivotSide: z.enum(["left", "right"]),
});

const FurnitureDimensionsSchema = z.object({
  width: z.number(),
  height: z.number(),
  depth: z.number().optional(),
});

const FurnitureItemSchema = z.object({
  id: z.string(),
  type: z.enum(["desk", "table", "couch"]),
  subtype: z.enum([
    "rectangular-desk", "l-shaped-desk",
    "rectangular-table",
    "rectangular-couch", "l-shaped-couch"
  ]),
  name: z.string(),
  position: PointSchema,
  rotation: z.number(),
  dimensions: FurnitureDimensionsSchema,
  color: z.string(),
});

const RoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  x: z.number(),
  y: z.number(),
  color: z.string(),
  doors: z.array(DoorSchema),
  furniture: z.array(FurnitureItemSchema),
  vertices: z.array(PointSchema),
  shapeType: z.enum(["box", "L-shape", "U-shape", "T-shape"]),
  boundingBox: z.object({
    widthInches: z.number(),
    heightInches: z.number(),
  }),
});

const LayoutDataSchema = z.object({
  id: z.string(),
  title: z.string(),
  rooms: z.array(RoomSchema),
  metadata: z.object({
    createdAt: z.date(),
    lastModified: z.date(),
    version: z.number(),
  }),
});

const CreateLayoutSchema = z.object({
  title: z.string().min(1).max(255),
  data: LayoutDataSchema,
});

const UpdateLayoutSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(255).optional(),
  data: LayoutDataSchema.optional(),
});

export const layoutRouter = createTRPCRouter({
  /**
   * Create a new layout
   */
  create: protectedProcedure
    .input(CreateLayoutSchema)
    .mutation(async ({ ctx, input }) => {
      const layout = await ctx.db.layout.create({
        data: {
          title: input.title,
          data: input.data,
          userId: ctx.session.user.id,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return layout;
    }),

  /**
   * Get all layouts for the current user
   */
  getByUser: protectedProcedure.query(async ({ ctx }) => {
    const layouts = await ctx.db.layout.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return layouts;
  }),

  /**
   * Get a specific layout by ID (with permission check)
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const layout = await ctx.db.layout.findFirst({
        where: {
          id: input.id,
          OR: [
            { userId: ctx.session.user.id }, // User owns the layout
            { 
              permissions: {
                some: {
                  userId: ctx.session.user.id,
                  role: { in: ["owner", "editor", "viewer"] },
                },
              },
            }, // User has permission to access
          ],
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          permissions: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!layout) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Layout not found or you don't have permission to access it",
        });
      }

      return layout;
    }),

  /**
   * Update a layout (owner or editor permission required)
   */
  update: protectedProcedure
    .input(UpdateLayoutSchema)
    .mutation(async ({ ctx, input }) => {
      // First check if user has permission to edit
      const existingLayout = await ctx.db.layout.findFirst({
        where: {
          id: input.id,
          OR: [
            { userId: ctx.session.user.id }, // User owns the layout
            {
              permissions: {
                some: {
                  userId: ctx.session.user.id,
                  role: { in: ["owner", "editor"] },
                },
              },
            }, // User has edit permission
          ],
        },
      });

      if (!existingLayout) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Layout not found or you don't have permission to edit it",
        });
      }

      const updateData: any = {};
      if (input.title !== undefined) {
        updateData.title = input.title;
      }
      if (input.data !== undefined) {
        updateData.data = input.data;
      }

      const updatedLayout = await ctx.db.layout.update({
        where: {
          id: input.id,
        },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return updatedLayout;
    }),

  /**
   * Delete a layout (owner permission required)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Only the owner can delete
      const layout = await ctx.db.layout.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });

      if (!layout) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Layout not found or you don't have permission to delete it",
        });
      }

      await ctx.db.layout.delete({
        where: {
          id: input.id,
        },
      });

      return { success: true };
    }),

  /**
   * Share a layout with another user (owner permission required)
   */
  share: protectedProcedure
    .input(
      z.object({
        layoutId: z.string(),
        userEmail: z.string().email(),
        role: z.enum(["editor", "viewer"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user owns the layout
      const layout = await ctx.db.layout.findFirst({
        where: {
          id: input.layoutId,
          userId: ctx.session.user.id,
        },
      });

      if (!layout) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Layout not found or you don't have permission to share it",
        });
      }

      // Find the user to share with
      const targetUser = await ctx.db.user.findUnique({
        where: {
          email: input.userEmail,
        },
      });

      if (!targetUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Check if permission already exists
      const existingPermission = await ctx.db.layoutPermission.findUnique({
        where: {
          layoutId_userId: {
            layoutId: input.layoutId,
            userId: targetUser.id,
          },
        },
      });

      if (existingPermission) {
        // Update existing permission
        await ctx.db.layoutPermission.update({
          where: {
            id: existingPermission.id,
          },
          data: {
            role: input.role,
          },
        });
      } else {
        // Create new permission
        await ctx.db.layoutPermission.create({
          data: {
            layoutId: input.layoutId,
            userId: targetUser.id,
            role: input.role,
          },
        });
      }

      return { success: true };
    }),

  /**
   * Remove sharing permission (owner permission required)
   */
  unshare: protectedProcedure
    .input(
      z.object({
        layoutId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user owns the layout
      const layout = await ctx.db.layout.findFirst({
        where: {
          id: input.layoutId,
          userId: ctx.session.user.id,
        },
      });

      if (!layout) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Layout not found or you don't have permission to modify sharing",
        });
      }

      await ctx.db.layoutPermission.deleteMany({
        where: {
          layoutId: input.layoutId,
          userId: input.userId,
        },
      });

      return { success: true };
    }),
});