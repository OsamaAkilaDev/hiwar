import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export const createDb = (url: string) =>
  drizzle(postgres(url, { max: 5, fetch_types: false }), {
    schema,
    casing: "snake_case",
  });

export const db = (env: Env) => createDb(env.HYPERDRIVE.connectionString);

export type DB = ReturnType<typeof createDb>;
