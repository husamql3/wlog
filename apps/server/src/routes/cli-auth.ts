import { auth } from "@wlog/auth";
import { env } from "@wlog/env";
import Elysia, { t } from "elysia";

type DeviceCodeEntry = {
	userCode: string;
	expiresAt: Date;
	status: "pending" | "complete" | "expired";
	token?: string;
};

const deviceCodes = new Map<string, DeviceCodeEntry>();

function generateUserCode(): string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	return Array.from(
		{ length: 6 },
		() => chars[Math.floor(Math.random() * chars.length)],
	).join("");
}

function purgeExpired() {
	const now = new Date();
	for (const [key, entry] of deviceCodes) {
		if (entry.expiresAt < now) deviceCodes.delete(key);
	}
}

function findByUserCode(userCode: string): [string, DeviceCodeEntry] | null {
	const now = new Date();
	for (const [key, entry] of deviceCodes) {
		if (
			entry.userCode === userCode &&
			entry.status === "pending" &&
			entry.expiresAt > now
		) {
			return [key, entry];
		}
	}
	return null;
}

export const cliAuthRoutes = new Elysia({ prefix: "/api/cli" })
	.post("/device", () => {
		purgeExpired();
		const deviceCode = crypto.randomUUID();
		const userCode = generateUserCode();
		const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

		deviceCodes.set(deviceCode, { userCode, expiresAt, status: "pending" });

		const verificationUrl = `${env.BETTER_AUTH_URL}/api/cli/verify?code=${userCode}`;
		return {
			deviceCode,
			userCode,
			verificationUrl,
			expiresIn: 900,
			interval: 5,
		};
	})
	.get(
		"/device/:deviceCode",
		({ params }) => {
			const entry = deviceCodes.get(params.deviceCode);
			if (!entry) return { status: "expired" as const };

			if (entry.expiresAt < new Date()) {
				deviceCodes.delete(params.deviceCode);
				return { status: "expired" as const };
			}

			if (entry.status === "complete" && entry.token) {
				const token = entry.token;
				deviceCodes.delete(params.deviceCode);
				return { status: "complete" as const, token };
			}

			return { status: entry.status as "pending" | "complete" | "expired" };
		},
		{ params: t.Object({ deviceCode: t.String() }) },
	)
	.get(
		"/verify",
		async ({ query, request }) => {
			const userCode = (query.code ?? "").toUpperCase();
			const session = await auth.api
				.getSession({ headers: request.headers })
				.catch(() => null);

			return new Response(
				verifyPage({
					userCode,
					isLoggedIn: !!session,
					callbackURL: `${env.BETTER_AUTH_URL}/api/cli/verify?code=${query.code ?? ""}`,
					userName: session?.user.name ?? null,
				}),
				{ headers: { "Content-Type": "text/html" } },
			);
		},
		{ query: t.Object({ code: t.Optional(t.String()) }) },
	)
	.post(
		"/verify",
		async ({ body, request }) => {
			const userCode = body.code.toUpperCase();
			const session = await auth.api
				.getSession({ headers: request.headers })
				.catch(() => null);

			if (!session) {
				return new Response("Unauthorized", { status: 401 });
			}

			const found = findByUserCode(userCode);
			if (!found) {
				return new Response(
					verifyPage({
						userCode,
						isLoggedIn: true,
						callbackURL: "",
						userName: session.user.name ?? null,
						error:
							"Code not found or expired. Return to your terminal and try again.",
					}),
					{ headers: { "Content-Type": "text/html" } },
				);
			}

			const [key] = found;
			deviceCodes.set(key, {
				...deviceCodes.get(key)!,
				status: "complete",
				token: session.session.token,
			});

			return new Response(
				successPage(session.user.name ?? session.user.email),
				{
					headers: { "Content-Type": "text/html" },
				},
			);
		},
		{ body: t.Object({ code: t.String() }) },
	);

function verifyPage({
	userCode,
	isLoggedIn,
	callbackURL,
	userName,
	error,
}: {
	userCode: string;
	isLoggedIn: boolean;
	callbackURL: string;
	userName: string | null;
	error?: string;
}) {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authorize wlog CLI</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#0a0a0a;color:#fafafa}
    .card{background:#111;border:1px solid #222;border-radius:12px;padding:2rem;max-width:400px;width:100%;text-align:center;gap:1rem;display:flex;flex-direction:column}
    h1{font-size:1.25rem}
    p{color:#888;font-size:0.9rem}
    .code{font-size:2rem;font-weight:700;letter-spacing:0.2em;font-family:monospace;color:#fff;padding:1rem 0}
    button{width:100%;padding:0.75rem;border:none;border-radius:8px;font-size:1rem;cursor:pointer;background:#fff;color:#000;font-weight:600}
    button:hover{background:#e5e5e5}
    .error{color:#f87171;font-size:0.85rem}
  </style>
</head>
<body>
  <div class="card">
    <h1>Authorize wlog CLI</h1>
    ${
			!isLoggedIn
				? `
      <p>Sign in to authorize the CLI to access your wlog account.</p>
      <button onclick="signIn()">Sign in with Google</button>
      <script>
        async function signIn() {
          const res = await fetch('/api/auth/sign-in/social', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ provider: 'google', callbackURL: '${callbackURL}' })
          });
          const data = await res.json();
          if (data.url) window.location.href = data.url;
        }
      </script>
    `
				: `
      <p>Signed in as <strong>${userName ?? "you"}</strong>. Confirm the code shown in your terminal:</p>
      <div class="code">${userCode}</div>
      ${error ? `<p class="error">${error}</p>` : ""}
      <button onclick="authorize()">Authorize</button>
      <script>
        async function authorize() {
          const res = await fetch('/api/cli/verify', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            credentials: 'include',
            body: JSON.stringify({ code: '${userCode}' })
          });
          const html = await res.text();
          document.open(); document.write(html); document.close();
        }
      </script>
    `
		}
  </div>
</body>
</html>`;
}

function successPage(name: string) {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Authorized — wlog</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#0a0a0a;color:#fafafa}
    .card{background:#111;border:1px solid #222;border-radius:12px;padding:2rem;max-width:400px;width:100%;text-align:center;display:flex;flex-direction:column;gap:0.75rem}
    h1{font-size:1.25rem;color:#4ade80}
    p{color:#888;font-size:0.9rem}
  </style>
</head>
<body>
  <div class="card">
    <h1>✓ Authorized</h1>
    <p>You're signed in as <strong>${name}</strong>.</p>
    <p>You can close this tab and return to your terminal.</p>
  </div>
</body>
</html>`;
}
