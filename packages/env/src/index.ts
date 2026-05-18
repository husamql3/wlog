import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const isBrowser =
	typeof (globalThis as { window?: unknown }).window !== "undefined";

export const env = createEnv({
	server: {
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),

		// Better Auth
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url(),

		// Database
		DATABASE_URL: z.url(),
		DIRECT_URL: z.url(),

		// CORS
		CORS_ORIGIN: z.url(),

		// Polar
		POLAR_ACCESS_TOKEN: z.string(),
		POLAR_SUCCESS_URL: z.url(),

		// OAuth
		GOOGLE_CLIENT_ID: z.string(),
		GOOGLE_CLIENT_SECRET: z.string(),
		GITHUB_CLIENT_ID: z.string(),
		GITHUB_CLIENT_SECRET: z.string(),

		// Gemini
		GEMINI_API_KEY: z.string(),

		// Trigger.dev
		TRIGGER_SECRET_KEY: z.string(),
	},
	clientPrefix: "VITE_",
	client: {
		VITE_SERVER_URL: z.url(),
	},
	runtimeEnv: isBrowser ? import.meta.env : process.env,
	emptyStringAsUndefined: true,
});
