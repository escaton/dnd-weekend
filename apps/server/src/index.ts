import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { appRouter } from "@dnd-weekend/api";
import { createContext } from "./context.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..", "..", "..");

const app = new Hono();

const isProd = process.env.NODE_ENV === "production";

if (!isProd) {
  app.use(
    "/api/*",
    cors({
      origin: "http://localhost:5173",
      credentials: true,
    }),
  );
}

app.get("/healthz", (c) => c.json({ ok: true }));

app.all("/api/*", (c) => {
  return fetchRequestHandler({
    endpoint: "/api",
    router: appRouter,
    req: c.req.raw,
    createContext: () => createContext(c.req.raw),
  });
});

if (isProd) {
  let indexHtml: string | null = null;

  const getIndexHtml = () => {
    if (!indexHtml) {
      indexHtml = readFileSync(join(rootDir, "apps/web/dist/index.html"), "utf-8");
    }
    return indexHtml;
  };

  app.use("/*", serveStatic({ root: join(rootDir, "apps/web/dist") }));

  app.get("*", (c) => c.html(getIndexHtml()));
}

app.onError((err, c) => {
  console.error(err);
  const message = isProd ? "Internal Server Error" : err.message;
  return c.json({ error: message }, 500);
});

const port = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});
