import { describe, it, expect, vi } from "vitest";
import { appRouter } from "../index";
import type { Context } from "../trpc";

function createMockContext(overrides: Partial<Context> = {}): Context {
  return {
    user: { id: "test-user", email: "test@test.com" },
    db: {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([])),
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(() =>
            Promise.resolve([
              {
                id: "test-id",
                userId: "test-user",
                content: {},
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
              },
            ]),
          ),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(() =>
              Promise.resolve([{ id: "00000000-0000-0000-0000-000000000000" }]),
            ),
          })),
        })),
      })),
    },
    ...overrides,
  } as unknown as Context;
}

describe("appRouter", () => {
  it("returns user info from auth.me", async () => {
    const caller = appRouter.createCaller(createMockContext());
    const result = await caller.auth.me();
    expect(result).toEqual({
      id: "test-user",
      email: "test@test.com",
    });
  });

  it("throws UNAUTHORIZED when not authenticated", async () => {
    const caller = appRouter.createCaller(createMockContext({ user: null }));
    await expect(caller.character.list()).rejects.toThrow();
  });

  it("lists characters for authenticated user", async () => {
    const caller = appRouter.createCaller(createMockContext());
    const result = await caller.character.list();
    expect(result).toEqual([]);
  });

  it("creates a character with default content", async () => {
    const caller = appRouter.createCaller(createMockContext());
    const result = await caller.character.create({ content: {} });
    expect(result).toMatchObject({
      id: "test-id",
      userId: "test-user",
      content: {},
    });
  });

  it("creates a character with provided content", async () => {
    const caller = appRouter.createCaller(createMockContext());
    const result = await caller.character.create({
      content: { name: "Aragorn" },
    });
    expect(result).toMatchObject({
      id: "test-id",
      userId: "test-user",
    });
  });

  it("soft-deletes a character", async () => {
    const caller = appRouter.createCaller(createMockContext());
    const result = await caller.character.softDelete({
      id: "00000000-0000-0000-0000-000000000000",
    });
    expect(result).toEqual({ id: "00000000-0000-0000-0000-000000000000" });
  });
});
