import { requireAuth } from "../lib/client";
import { getServerUrl } from "../lib/config";

export async function statusCommand() {
	const client = await requireAuth();
	const serverUrl = await getServerUrl();

	// Fetch session info
	const sessionRes = await fetch(`${serverUrl}/api/auth/get-session`, {
		headers: {
			authorization: `Bearer ${(await import("../lib/config")).getToken().then((t) => t ?? "")}`,
		},
	}).catch(() => null);

	const session = sessionRes?.ok
		? ((await sessionRes.json()) as {
				user?: { email?: string; name?: string };
			})
		: null;

	const [{ data: repos, error: reposErr }, { data: scoped }] =
		await Promise.all([
			client.api.integrations.github.repos.get(),
			client.api.integrations.github.scope.get(),
		]);

	console.log("");
	console.log(
		`  Account:  ${session?.user?.name ?? session?.user?.email ?? "unknown"}`,
	);
	console.log(`  Server:   ${serverUrl}`);
	console.log("");

	if (reposErr) {
		console.log("  GitHub:   not connected");
	} else {
		const scopeCount = scoped?.length ?? 0;
		const repoCount = Array.isArray(repos) ? repos.length : 0;
		console.log(
			`  GitHub:   connected  (${scopeCount} of ${repoCount} repos tracked)`,
		);
	}

	console.log("");
}
