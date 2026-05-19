import { requireAuth } from "../lib/client";

type Repo = {
	id: string;
	fullName: string;
	private?: boolean;
	pushedAt?: string | null;
};

export async function reposCommand(
	action: "list" | "add" | "remove",
	name?: string,
) {
	const client = await requireAuth();

	if (action === "list") {
		const [{ data: all, error: allErr }, { data: scoped, error: scopeErr }] =
			await Promise.all([
				client.api.integrations.github.repos.get(),
				client.api.integrations.github.scope.get(),
			]);

		if (allErr) {
			console.error("Error fetching repos:", allErr.value);
			process.exit(1);
		}
		if (scopeErr) {
			console.error("Error fetching scope:", scopeErr.value);
			process.exit(1);
		}

		const scopedIds = new Set((scoped ?? []).map((r) => r.id));

		console.log("");
		for (const repo of all as Repo[]) {
			const marker = scopedIds.has(repo.id) ? "✓" : " ";
			const privacy = repo.private ? " (private)" : "";
			console.log(`  [${marker}] ${repo.fullName}${privacy}`);
		}
		console.log("");
		console.log("  ✓ = tracked   [ ] = not tracked");
		console.log("");
		return;
	}

	if (!name) {
		console.error(`Usage: wlog repos ${action} <repo-full-name>`);
		process.exit(1);
	}

	// Get current scope
	const [{ data: all, error: allErr }, { data: scoped, error: scopeErr }] =
		await Promise.all([
			client.api.integrations.github.repos.get(),
			client.api.integrations.github.scope.get(),
		]);

	if (allErr || scopeErr) {
		console.error("Error fetching data.");
		process.exit(1);
	}

	const repo = (all as Repo[]).find(
		(r) => r.fullName.toLowerCase() === name.toLowerCase(),
	);
	if (!repo) {
		console.error(
			`Repo "${name}" not found. Run \`wlog repos list\` to see available repos.`,
		);
		process.exit(1);
	}

	const currentScope = (scoped ?? []) as { id: string; fullName: string }[];

	let newScope: { id: string; fullName: string }[];
	if (action === "add") {
		if (currentScope.some((r) => r.id === repo.id)) {
			console.log(`${repo.fullName} is already tracked.`);
			return;
		}
		newScope = [...currentScope, { id: repo.id, fullName: repo.fullName }];
	} else {
		newScope = currentScope.filter((r) => r.id !== repo.id);
	}

	const { error } = await client.api.integrations.github.scope.post({
		repos: newScope,
	});
	if (error) {
		console.error("Failed to update scope:", error.value);
		process.exit(1);
	}

	const verb = action === "add" ? "Now tracking" : "Stopped tracking";
	console.log(`${verb} ${repo.fullName}.`);
}
