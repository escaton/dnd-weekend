import { protectedProcedure, router } from "../trpc.js";

export const authRouter = router({
  me: protectedProcedure.query(({ ctx }) => {
    return {
      id: ctx.user.id,
      email: ctx.user.email,
      displayName: ctx.user.displayName,
      avatarUrl: ctx.user.avatarUrl,
    };
  }),
});
