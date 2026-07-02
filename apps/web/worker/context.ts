import type { Context } from "@dnd-weekend/api";
import { createDb } from "./db.js";
import { verifyToken } from "./auth.js";

export async function createContext(req: Request, env: Env): Promise<Context> {
  const db = createDb(env.HYPERDRIVE);

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return { user: null, db };
  }

  const user = await verifyToken(token, env.SUPABASE_URL);
  return { user, db };
}
