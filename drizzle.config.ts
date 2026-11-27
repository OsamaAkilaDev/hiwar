import { defineConfig } from "drizzle-kit";

// Fail loudly: in CI a missing URL must stop the deploy, not skip migrations.
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

export default defineConfig({
  dialect: "postgresql",
  casing: "snake_case",
  schema: "./worker/db/schema.ts",
  out: "./worker/db/migrations",
  dbCredentials: { url: process.env.DATABASE_URL },
});
