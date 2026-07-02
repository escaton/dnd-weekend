import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@dnd-weekend/api";
import { createContext } from "./context.js";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return fetchRequestHandler({
      endpoint: "/api",
      router: appRouter,
      req: request,
      createContext: () => createContext(request, env),
    });
  },
} satisfies ExportedHandler<Env>;
