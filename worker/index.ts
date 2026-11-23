import { Hono } from "hono";
import { chat } from "./routes/chat";
import { conversations } from "./routes/conversations";
import { memory } from "./routes/memory";

const app = new Hono<{ Bindings: Env }>().basePath("/api");

app.get("/health", (c) => c.json({ ok: true }));
app.route("/", chat);
app.route("/", conversations);
app.route("/", memory);

export default app;
