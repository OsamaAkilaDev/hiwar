import { Hono } from "hono";
import { chat } from "./routes/chat";
import { conversations } from "./routes/conversations";

const app = new Hono<{ Bindings: Env }>().basePath("/api");

app.get("/health", (c) => c.json({ ok: true }));
app.route("/", chat);
app.route("/", conversations);

export default app;
