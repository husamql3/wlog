import { checkout, polar } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { db } from "@wlog/db";
import { env } from "@wlog/env";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer, magicLink } from "better-auth/plugins";

const polarClient = new Polar({
	accessToken: env.POLAR_ACCESS_TOKEN,
});

export const auth = betterAuth({
	database: prismaAdapter(db, { provider: "postgresql" }),
	trustedOrigins: [env.CORS_ORIGIN],
	secret: env.BETTER_AUTH_SECRET,
	baseURL: env.BETTER_AUTH_URL,
	advanced: {
		defaultCookieAttributes: {
			sameSite: "none",
			secure: true,
			httpOnly: true,
		},
	},
	socialProviders: {
		google: {
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
		},
	},
	plugins: [
		bearer(),
		magicLink({
			sendMagicLink: async ({ email, url }) => {
				// TODO Phase 3: replace with chosen email provider (Resend/Postmark)
				console.log(`[magic-link] ${email} → ${url}`);
			},
		}),
		polar({
			client: polarClient,
			createCustomerOnSignUp: true,
			use: [
				checkout({
					products: [
						{
							productId: "8337e00d-2cc6-4c8e-80c3-7e9f60d08075",
							slug: "wlog",
						},
					],
					successUrl: env.POLAR_SUCCESS_URL,
					authenticatedUsersOnly: true,
				}),
			],
		}),
	],
});

export type Auth = typeof auth;
