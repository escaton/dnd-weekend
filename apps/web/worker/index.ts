import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@dnd-weekend/api";
import { createContext } from "./context.js";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api")) {
      return fetchRequestHandler({
        endpoint: "/api",
        router: appRouter,
        req: request,
        createContext: () => createContext(request, env),
      });
    }

    const response = await env.ASSETS.fetch(request);

    return new HTMLRewriter()
      .on("head", {
        element(el) {
          el.prepend(
            `<script>window.__SUPABASE__=${JSON.stringify({ url: env.SUPABASE_URL!, key: env.SUPABASE_PUBLISHABLE_KEY! })}</script>`,
            { html: true },
          );
        },
      })
      .transform(response);
  },
} satisfies ExportedHandler<Env>;
