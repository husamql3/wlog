import { auth } from "@wlog/auth";
import { Elysia } from "elysia";

export const sessionPlugin = new Elysia({ name: "session" }).derive(
	{ as: "scoped" },
	async ({ request }) => {
		const session = await auth.api
			.getSession({ headers: request.headers })
			.catch(() => null);
		return {
			user: session?.user ?? null,
			session: session?.session ?? null,
		};
	},
);
