import { env } from "@wlog/env";
import { betterAuth } from "better-auth";

// Phase 1 will wire the Prisma adapter into `database`. Until then,
// `createAuth` is exported as a factory but not instantiated — the server
// does not mount auth routes at Phase 0.
export function createAuth() {
	return betterAuth({
		trustedOrigins: [env.CORS_ORIGIN],
		emailAndPassword: {
			enabled: true,
		},
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		advanced: {
			defaultCookieAttributes: {
				sameSite: "none",
				secure: true,
				httpOnly: true,
			},
		},
	});
}
