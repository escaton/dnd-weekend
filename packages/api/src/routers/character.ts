import { TRPCError } from "@trpc/server";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";
import { characters } from "../db/schema.js";
import { protectedProcedure, router } from "../trpc.js";

export const characterRouter = router({
  create: protectedProcedure
    .input(z.object({ content: z.record(z.string(), z.unknown()).default({}) }))
    .mutation(async ({ ctx, input }) => {
      const [character] = await ctx.db
        .insert(characters)
        .values({
          userId: ctx.user.id,
          content: input.content,
        })
        .returning();

      return character;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select()
      .from(characters)
      .where(and(eq(characters.userId, ctx.user.id), isNull(characters.deletedAt)));

    return result;
  }),

  softDelete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(characters)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(characters.id, input.id),
            eq(characters.userId, ctx.user.id),
            isNull(characters.deletedAt),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return { id: updated.id };
    }),
});
