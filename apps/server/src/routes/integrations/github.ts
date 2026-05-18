import { db } from "@wlog/db";
import { env } from "@wlog/env";
import Elysia, { status, t } from "elysia";
import { sessionPlugin } from "../../middleware/session";

const GH_OAUTH_URL = "https://github.com/login/oauth/authorize";
const GH_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GH_API = "https://api.github.com";

function callbackUrl() {
	return `${env.BETTER_AUTH_URL}/api/integrations/github/callback`;
}

export const githubRoutes = new Elysia({ prefix: "/api/integrations/github" })
	.use(sessionPlugin)
	// Redirect user to GitHub OAuth consent screen
	.get("/connect", ({ user, cookie, redirect }) => {
		if (!user) return status(401, "Unauthorized");

		const state = crypto.randomUUID();
		cookie.github_oauth_state?.set({
			value: state,
			httpOnly: true,
			sameSite: "lax",
			maxAge: 600,
			path: "/",
		});

		const params = new URLSearchParams({
			client_id: env.GITHUB_CLIENT_ID,
			scope: "repo",
			state,
			redirect_uri: callbackUrl(),
		});

		return redirect(`${GH_OAUTH_URL}?${params}`);
	})
	// GitHub redirects here after user approves
	.get(
		"/callback",
		async ({ user, query, cookie, redirect }) => {
			if (!user) return status(401, "Unauthorized");

			const { code, state } = query;
			if (!code || !state) return status(400, "Missing code or state");

			const storedState = cookie.github_oauth_state?.value;
			if (!storedState || state !== storedState)
				return status(400, "State mismatch");

			cookie.github_oauth_state?.remove();

			const tokenRes = await fetch(GH_TOKEN_URL, {
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					client_id: env.GITHUB_CLIENT_ID,
					client_secret: env.GITHUB_CLIENT_SECRET,
					code,
					redirect_uri: callbackUrl(),
				}),
			});

			const tokenData = (await tokenRes.json()) as {
				access_token?: string;
				error?: string;
			};

			if (!tokenData.access_token) {
				return status(502, `GitHub token exchange failed: ${tokenData.error}`);
			}

			await db.connection.upsert({
				where: {
					userId_provider: { userId: user.id, provider: "GITHUB" },
				},
				create: {
					userId: user.id,
					provider: "GITHUB",
					accessToken: tokenData.access_token,
				},
				update: {
					accessToken: tokenData.access_token,
				},
			});

			return redirect(`${env.CORS_ORIGIN}/dashboard`);
		},
		{
			query: t.Object({
				code: t.Optional(t.String()),
				state: t.Optional(t.String()),
			}),
		},
	)
	// List repos visible to the user's GitHub token
	.get("/repos", async ({ user }) => {
		if (!user) return status(401, "Unauthorized");

		const connection = await db.connection.findUnique({
			where: { userId_provider: { userId: user.id, provider: "GITHUB" } },
		});

		if (!connection) return status(404, "GitHub not connected");

		const res = await fetch(
			`${GH_API}/user/repos?per_page=100&sort=pushed&visibility=all`,
			{
				headers: {
					Authorization: `Bearer ${connection.accessToken}`,
					Accept: "application/vnd.github.v3+json",
				},
			},
		);

		if (!res.ok) return status(502, "Failed to fetch GitHub repos");

		const repos = (await res.json()) as Array<{
			id: number;
			full_name: string;
			private: boolean;
			pushed_at: string | null;
		}>;

		return repos.map((r) => ({
			id: String(r.id),
			fullName: r.full_name,
			private: r.private,
			pushedAt: r.pushed_at,
		}));
	})
	// Atomically replace the user's repo scope for this connection
	.post(
		"/scope",
		async ({ user, body }) => {
			if (!user) return status(401, "Unauthorized");

			const connection = await db.connection.findUnique({
				where: { userId_provider: { userId: user.id, provider: "GITHUB" } },
			});

			if (!connection) return status(404, "GitHub not connected");

			await db.$transaction([
				db.connectionScope.deleteMany({
					where: { connectionId: connection.id },
				}),
				db.connectionScope.createMany({
					data: body.repos.map((r) => ({
						connectionId: connection.id,
						externalId: r.id,
						repoFullName: r.fullName,
					})),
				}),
			]);

			return { ok: true, count: body.repos.length };
		},
		{
			body: t.Object({
				repos: t.Array(
					t.Object({
						id: t.String(),
						fullName: t.String(),
					}),
				),
			}),
		},
	);
