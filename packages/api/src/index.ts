import { characterRouter } from "./routers/character.js";
import { authRouter } from "./routers/auth.js";
import { roomRouter } from "./routers/room.js";
import { router } from "./trpc.js";

export const appRouter = router({
  character: characterRouter,
  auth: authRouter,
  room: roomRouter,
});

export type AppRouter = typeof appRouter;
export type { Context, User, DB } from "./trpc.js";
