import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// node-postgres does the SCRAM login with native WebCrypto, which keeps the
// per-request connection cheap on Workers' CPU budget.
// max 3: Workers allow 6 open connections per request, and the chat stream,
// title and memory calls to the model need theirs while pool sockets idle.
export const createDb = (url: string) =>
  drizzle(new Pool({ connectionString: url, max: 3 }), {
    schema,
    casing: "snake_case",
  });

export const db = (env: Env) => createDb(env.HYPERDRIVE.connectionString);

export type DB = ReturnType<typeof createDb>;
