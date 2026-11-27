import { Hono } from "hono";
import { type AppEnv, session } from "./auth";
import { auth } from "./routes/auth";
import { chat } from "./routes/chat";
import { conversations } from "./routes/conversations";
import { memory } from "./routes/memory";

const app = new Hono<AppEnv>().basePath("/api");

app.get("/health", (c) => c.json({ ok: true }));
app.use("*", session);
app.route("/", auth);
app.route("/", chat);
app.route("/", conversations);
app.route("/", memory);

export default app;
