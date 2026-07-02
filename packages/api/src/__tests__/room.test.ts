import { describe, it, expect } from "vitest";
import { appRouter } from "../index";
import type { Context } from "../trpc";
import { roomMembers, rooms } from "../db/schema";

const ROOM_ID = "00000000-0000-0000-0000-000000000000";
const USER_ID = "00000000-0000-0000-0000-000000000000";

function createMockContext(
  db: Partial<Context["db"]>,
  user: Context["user"] = {
    id: USER_ID,
    email: "debug@dnd-weekend.local",
    displayName: null,
    avatarUrl: null,
  },
): Context {
  return {
    user,
    db: db as unknown as Context["db"],
  };
}

function createMockDb(opts: {
  memberships?: Array<{ status: string }>;
  room?: Record<string, unknown> | undefined;
  members?: Record<string, unknown>[];
}): Pick<Context["db"], "select"> {
  const room = opts.room;
  const select = (_fields?: unknown) => ({
    from: (table: unknown) => {
      if (table === roomMembers) {
        return {
          where: async () => opts.memberships ?? [],
          leftJoin: (_t1: unknown) => ({
            leftJoin: (_t2: unknown) => ({
              where: async () => opts.members ?? [],
            }),
          }),
        };
      }
      if (table === rooms) {
        return {
          where: async () => (room ? [room] : []),
        };
      }
      return { where: async () => [] };
    },
  });
  return { select } as unknown as Pick<Context["db"], "select">;
}

describe("room.get", () => {
  it("returns viewerStatus 'active' with members for an active member", async () => {
    const db = createMockDb({
      memberships: [{ status: "active" }],
      room: { id: ROOM_ID, title: "Tavern", gameMasterId: USER_ID },
      members: [
        {
          id: "m1",
          userId: USER_ID,
          email: "debug@dnd-weekend.local",
          role: "game-master",
          status: "active",
          characterId: null,
          characterName: null,
          invitedBy: null,
          joinedAt: new Date(),
          displayName: "Debug",
          avatarUrl: null,
        },
      ],
    });
    const caller = appRouter.createCaller(createMockContext(db));
    const result = await caller.room.get({ id: ROOM_ID });
    expect(result.viewerStatus).toBe("active");
    if (result.viewerStatus === "active") {
      expect(result.id).toBe(ROOM_ID);
      expect(result.title).toBe("Tavern");
      expect(result.members).toHaveLength(1);
      expect(result.members[0]?.email).toBe("debug@dnd-weekend.local");
    }
  });

  it("returns viewerStatus 'pending' with id and title only for a pending invitee", async () => {
    const db = createMockDb({
      memberships: [{ status: "pending" }],
      room: { id: ROOM_ID, title: "Tavern", gameMasterId: USER_ID },
    });
    const caller = appRouter.createCaller(createMockContext(db));
    const result = await caller.room.get({ id: ROOM_ID });
    expect(result.viewerStatus).toBe("pending");
    if (result.viewerStatus === "pending") {
      expect(result.id).toBe(ROOM_ID);
      expect(result.title).toBe("Tavern");
      expect(result).not.toHaveProperty("members");
    }
  });

  it("throws FORBIDDEN for a non-member", async () => {
    const db = createMockDb({ memberships: [] });
    const caller = appRouter.createCaller(createMockContext(db));
    await expect(caller.room.get({ id: ROOM_ID })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("prefers active over pending when both rows match", async () => {
    const db = createMockDb({
      memberships: [{ status: "pending" }, { status: "active" }],
      room: { id: ROOM_ID, title: "Tavern", gameMasterId: USER_ID },
      members: [],
    });
    const caller = appRouter.createCaller(createMockContext(db));
    const result = await caller.room.get({ id: ROOM_ID });
    expect(result.viewerStatus).toBe("active");
  });

  it("throws NOT_FOUND when the room is soft-deleted even with a membership", async () => {
    const db = createMockDb({
      memberships: [{ status: "active" }],
      room: undefined,
    });
    const caller = appRouter.createCaller(createMockContext(db));
    await expect(caller.room.get({ id: ROOM_ID })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws UNAUTHORIZED when not authenticated", async () => {
    const db = createMockDb({ memberships: [] });
    const caller = appRouter.createCaller(
      createMockContext(db, null as unknown as Context["user"]),
    );
    await expect(caller.room.get({ id: ROOM_ID })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
