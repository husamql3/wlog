import { cors } from "@elysiajs/cors";
import { env } from "@wlog/env";
import { Elysia } from "elysia";

export const app = new Elysia()
	.use(
		cors({
			origin: env.CORS_ORIGIN,
			methods: ["GET", "POST", "OPTIONS"],
			allowedHeaders: ["Content-Type", "Authorization"],
			credentials: true,
		}),
	)
	.get("/", () => "OK");

export default app;
