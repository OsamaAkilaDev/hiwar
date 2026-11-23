import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// node-postgres does the SCRAM login with native WebCrypto, which keeps the
// per-request connection cheap on Workers' CPU budget.
export const createDb = (url: string) =>
  drizzle(new Pool({ connectionString: url, max: 5 }), {
    schema,
    casing: "snake_case",
  });

export const db = (env: Env) => createDb(env.HYPERDRIVE.connectionString);

export type DB = ReturnType<typeof createDb>;
