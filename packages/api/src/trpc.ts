import { initTRPC, TRPCError } from "@trpc/server";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "./db/schema.js";

export type DB = PostgresJsDatabase<typeof schema>;

export type User = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type Context = {
  user: User | null;
  db: DB;
};

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});
