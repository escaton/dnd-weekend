import type { Context } from "@dnd-weekend/api";
import { db } from "./db.js";
import { verifyToken } from "./auth.js";

export async function createContext(req: Request): Promise<Context> {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return { user: null, db };
  }

  const user = await verifyToken(token);
  return { user, db };
}
