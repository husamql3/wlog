import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { Elysia } from "elysia";

const localEnvPath = fileURLToPath(
	new URL("../packages/env/.env", import.meta.url),
);

if (!process.env.VERCEL && existsSync(localEnvPath)) {
	config({ path: localEnvPath });
}

void Elysia;

const { default: app } = await import("../apps/server/src/app");

export default app;
