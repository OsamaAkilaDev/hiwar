import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  casing: "snake_case",
  schema: "./worker/db/schema.ts",
  out: "./worker/db/migrations",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
