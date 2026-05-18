import { cors } from "@elysiajs/cors";
import { auth } from "@wlog/auth";
import { env } from "@wlog/env";
import { Elysia } from "elysia";
import { digestRoutes } from "./routes/digests";
import { githubRoutes } from "./routes/integrations/github";
import { pullRoutes } from "./routes/pulls";

export const app = new Elysia()
	.use(
		cors({
			origin: env.CORS_ORIGIN,
			methods: ["GET", "POST", "OPTIONS"],
			allowedHeaders: ["Content-Type", "Authorization"],
			credentials: true,
		}),
	)
	.mount(auth.handler)
	.use(githubRoutes)
	.use(pullRoutes)
	.use(digestRoutes)
	.get("/api", () => "OK");

export default app;

export type App = typeof app;
