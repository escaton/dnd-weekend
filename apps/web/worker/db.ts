import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@dnd-weekend/api/db/schema";

export function createDb(hyperdrive: Hyperdrive) {
  const client = postgres(hyperdrive.connectionString, { max: 3 });
  return drizzle(client, { schema });
}

export type DB = ReturnType<typeof createDb>;
