import { TRPCError } from "@trpc/server";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { characters, rooms, roomMembers, authUsers } from "../db/schema.js";
import { protectedProcedure, router } from "../trpc.js";
import type { DB } from "../trpc.js";

async function requireActiveMember(roomId: string, userId: string, db: DB) {
  const [member] = await db
    .select()
    .from(roomMembers)
    .where(
      and(
        eq(roomMembers.roomId, roomId),
        eq(roomMembers.userId, userId),
        eq(roomMembers.status, "active"),
        isNull(roomMembers.deletedAt),
      ),
    );
  if (!member) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return member;
}

async function findMembership(roomId: string, userId: string, email: string, db: DB) {
  const rows = await db
    .select({
      id: roomMembers.id,
      userId: roomMembers.userId,
      email: roomMembers.email,
      status: roomMembers.status,
    })
    .from(roomMembers)
    .where(
      and(
        eq(roomMembers.roomId, roomId),
        or(eq(roomMembers.userId, userId), eq(roomMembers.email, email)),
        isNull(roomMembers.deletedAt),
      ),
    );
  return (
    rows.find((r) => r.status === "active") ?? rows.find((r) => r.status === "pending") ?? null
  );
}

async function requireGM(roomId: string, userId: string, db: DB) {
  const [room] = await db
    .select()
    .from(rooms)
    .where(and(eq(rooms.id, roomId), isNull(rooms.deletedAt)));
  if (!room) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }
  if (room.gameMasterId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return room;
}

export const roomRouter = router({
  create: protectedProcedure
    .input(z.object({ title: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [room] = await ctx.db
        .insert(rooms)
        .values({
          title: input.title,
          gameMasterId: ctx.user.id,
        })
        .returning();

      if (!room) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      await ctx.db.insert(roomMembers).values({
        roomId: room.id,
        userId: ctx.user.id,
        email: ctx.user.email,
        role: "game-master",
        status: "active",
        joinedAt: new Date(),
      });

      return room;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({
        id: rooms.id,
        title: rooms.title,
        gameMasterId: rooms.gameMasterId,
        role: roomMembers.role,
        memberCount: sql<number>`(
          SELECT COUNT(*) FROM ${roomMembers} rm2
          WHERE rm2.room_id = ${rooms.id}
          AND rm2.status = 'active'
          AND rm2.deleted_at IS NULL
        )`.as("member_count"),
      })
      .from(rooms)
      .innerJoin(
        roomMembers,
        and(eq(roomMembers.roomId, rooms.id), eq(roomMembers.userId, ctx.user.id)),
      )
      .where(
        and(
          eq(roomMembers.status, "active"),
          isNull(roomMembers.deletedAt),
          isNull(rooms.deletedAt),
        ),
      );

    return result;
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const membership = await findMembership(input.id, ctx.user.id, ctx.user.email, ctx.db);

      if (!membership) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const [room] = await ctx.db
        .select()
        .from(rooms)
        .where(and(eq(rooms.id, input.id), isNull(rooms.deletedAt)));

      if (!room) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (membership.status === "pending") {
        return {
          viewerStatus: "pending" as const,
          id: room.id,
          title: room.title,
        };
      }

      const members = await ctx.db
        .select({
          id: roomMembers.id,
          userId: roomMembers.userId,
          email: roomMembers.email,
          role: roomMembers.role,
          status: roomMembers.status,
          characterId: roomMembers.characterId,
          characterName: characters.content,
          invitedBy: roomMembers.invitedBy,
          joinedAt: roomMembers.joinedAt,
          displayName: sql<string>`coalesce(${authUsers.rawUserMetaData}->>'full_name', ${authUsers.rawUserMetaData}->>'name', ${roomMembers.email})`,
          avatarUrl: sql<
            string | null
          >`coalesce(${authUsers.rawUserMetaData}->>'avatar_url', ${authUsers.rawUserMetaData}->>'picture')`,
        })
        .from(roomMembers)
        .leftJoin(characters, eq(characters.id, roomMembers.characterId))
        .leftJoin(authUsers, eq(authUsers.id, roomMembers.userId))
        .where(and(eq(roomMembers.roomId, input.id), isNull(roomMembers.deletedAt)));

      return { viewerStatus: "active" as const, ...room, members };
    }),

  invite: protectedProcedure
    .input(z.object({ roomId: z.string().uuid(), email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      await requireGM(input.roomId, ctx.user.id, ctx.db);

      const [existing] = await ctx.db
        .select()
        .from(roomMembers)
        .where(
          and(
            eq(roomMembers.roomId, input.roomId),
            eq(roomMembers.email, input.email),
            isNull(roomMembers.deletedAt),
          ),
        );
      if (existing) {
        throw new TRPCError({ code: "CONFLICT" });
      }

      const [invite] = await ctx.db
        .insert(roomMembers)
        .values({
          roomId: input.roomId,
          email: input.email,
          role: "player",
          status: "pending",
          invitedBy: ctx.user.id,
          invitedAt: new Date(),
        })
        .returning();

      return invite;
    }),

  join: protectedProcedure
    .input(z.object({ roomId: z.string().uuid(), characterId: z.string().uuid().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const [pending] = await ctx.db
        .select()
        .from(roomMembers)
        .where(
          and(
            eq(roomMembers.roomId, input.roomId),
            eq(roomMembers.email, ctx.user.email),
            eq(roomMembers.status, "pending"),
            isNull(roomMembers.deletedAt),
          ),
        );
      if (!pending) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (input.characterId) {
        const [character] = await ctx.db
          .select()
          .from(characters)
          .where(
            and(
              eq(characters.id, input.characterId),
              eq(characters.userId, ctx.user.id),
              isNull(characters.deletedAt),
            ),
          );
        if (!character) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }

      const [updated] = await ctx.db
        .update(roomMembers)
        .set({
          userId: ctx.user.id,
          status: "active",
          joinedAt: new Date(),
          characterId: input.characterId,
          updatedAt: new Date(),
        })
        .where(eq(roomMembers.id, pending.id))
        .returning();

      return updated;
    }),

  setCharacter: protectedProcedure
    .input(
      z.object({
        roomId: z.string().uuid(),
        characterId: z.string().uuid().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const member = await requireActiveMember(input.roomId, ctx.user.id, ctx.db);

      if (input.characterId) {
        const [character] = await ctx.db
          .select()
          .from(characters)
          .where(
            and(
              eq(characters.id, input.characterId),
              eq(characters.userId, ctx.user.id),
              isNull(characters.deletedAt),
            ),
          );
        if (!character) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }

      const [updated] = await ctx.db
        .update(roomMembers)
        .set({ characterId: input.characterId, updatedAt: new Date() })
        .where(eq(roomMembers.id, member.id))
        .returning();

      return updated;
    }),

  transfer: protectedProcedure
    .input(z.object({ roomId: z.string().uuid(), newGMUserId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await requireGM(input.roomId, ctx.user.id, ctx.db);

      const [newGM] = await ctx.db
        .select()
        .from(roomMembers)
        .where(
          and(
            eq(roomMembers.roomId, input.roomId),
            eq(roomMembers.userId, input.newGMUserId),
            eq(roomMembers.status, "active"),
            isNull(roomMembers.deletedAt),
          ),
        );
      if (!newGM) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      await ctx.db.transaction(async (tx) => {
        await tx
          .update(roomMembers)
          .set({ role: "player", updatedAt: new Date() })
          .where(and(eq(roomMembers.roomId, input.roomId), eq(roomMembers.userId, ctx.user.id)));
        await tx
          .update(roomMembers)
          .set({ role: "game-master", updatedAt: new Date() })
          .where(eq(roomMembers.id, newGM.id));
        await tx
          .update(rooms)
          .set({ gameMasterId: input.newGMUserId, updatedAt: new Date() })
          .where(eq(rooms.id, input.roomId));
      });

      return { success: true };
    }),

  remove: protectedProcedure
    .input(z.object({ roomId: z.string().uuid(), memberToRemoveId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await requireGM(input.roomId, ctx.user.id, ctx.db);

      if (input.memberToRemoveId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      const [removed] = await ctx.db
        .update(roomMembers)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(roomMembers.id, input.memberToRemoveId),
            eq(roomMembers.roomId, input.roomId),
            isNull(roomMembers.deletedAt),
          ),
        )
        .returning();

      if (!removed) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return { id: removed.id };
    }),

  leave: protectedProcedure
    .input(z.object({ roomId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireActiveMember(input.roomId, ctx.user.id, ctx.db);

      const [room] = await ctx.db
        .select()
        .from(rooms)
        .where(and(eq(rooms.id, input.roomId), isNull(rooms.deletedAt)));

      if (!room) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (room.gameMasterId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      await ctx.db
        .update(roomMembers)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(roomMembers.id, member.id));

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ roomId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await requireGM(input.roomId, ctx.user.id, ctx.db);

      await ctx.db.transaction(async (tx) => {
        await tx
          .update(rooms)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(eq(rooms.id, input.roomId));
        await tx
          .update(roomMembers)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(and(eq(roomMembers.roomId, input.roomId), isNull(roomMembers.deletedAt)));
      });

      return { success: true };
    }),
});
