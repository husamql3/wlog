import { clearAuth, getServerUrl, saveAuth } from "../lib/config";

export async function loginCommand(opts: { logout?: boolean }) {
	if (opts.logout) {
		await clearAuth();
		console.log("Logged out.");
		return;
	}

	const serverUrl = await getServerUrl();

	// Request a device code
	const res = await fetch(`${serverUrl}/api/cli/device`, { method: "POST" });
	if (!res.ok) {
		console.error("Failed to reach server:", res.statusText);
		process.exit(1);
	}

	const { deviceCode, userCode, verificationUrl, expiresIn, interval } =
		(await res.json()) as {
			deviceCode: string;
			userCode: string;
			verificationUrl: string;
			expiresIn: number;
			interval: number;
		};

	console.log("");
	console.log("  Your authorization code:  " + userCode);
	console.log("  Open this URL to approve:  " + verificationUrl);
	console.log("");

	// Try to open browser automatically
	const opener =
		process.platform === "darwin"
			? "open"
			: process.platform === "win32"
				? "start"
				: "xdg-open";
	Bun.spawn([opener, verificationUrl], { stdout: null, stderr: null }).unref();

	// Poll until approved or expired
	const deadline = Date.now() + expiresIn * 1000;
	const pollMs = interval * 1000;

	process.stdout.write("  Waiting for authorization");

	while (Date.now() < deadline) {
		await Bun.sleep(pollMs);
		process.stdout.write(".");

		const poll = await fetch(`${serverUrl}/api/cli/device/${deviceCode}`).catch(
			() => null,
		);
		if (!poll?.ok) continue;

		const result = (await poll.json()) as
			| { status: "pending" }
			| { status: "expired" }
			| { status: "complete"; token: string };

		if (result.status === "expired") {
			console.log("\n  Code expired. Run wlog login again.");
			process.exit(1);
		}

		if (result.status === "complete") {
			// Fetch user info with the new token
			const meRes = await fetch(`${serverUrl}/api/auth/get-session`, {
				headers: { authorization: `Bearer ${result.token}` },
			}).catch(() => null);

			let email = "";
			let name = "";
			if (meRes?.ok) {
				const session = (await meRes.json()) as {
					user?: { email?: string; name?: string };
				};
				email = session.user?.email ?? "";
				name = session.user?.name ?? "";
			}

			await saveAuth({ token: result.token, serverUrl, email, name });
			console.log(`\n\n  Logged in as ${name || email}\n`);
			return;
		}
	}

	console.log("\n  Timed out. Run wlog login again.");
	process.exit(1);
}
