import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const isBrowser =
	typeof (globalThis as { window?: unknown }).window !== "undefined";

export const env = createEnv({
	server: {
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url(),
		CORS_ORIGIN: z.url(),
		DATABASE_URL: z.url(),
		DIRECT_URL: z.url(),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
	},
	clientPrefix: "VITE_",
	client: {
		VITE_SERVER_URL: z.url(),
	},
	runtimeEnv: isBrowser ? import.meta.env : process.env,
	emptyStringAsUndefined: true,
});
