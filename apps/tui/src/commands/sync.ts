import { requireAuth } from "../lib/client";

export async function syncCommand() {
	const client = await requireAuth();

	console.log("Triggering pull...");

	const { data, error } = await client.api.pulls.manual.post();
	if (error) {
		console.error("Failed:", error.value);
		process.exit(1);
	}

	const { pullId } = data;
	console.log(`Pull started (${pullId})`);
	process.stdout.write("Fetching activity");

	// Poll until complete or failed
	while (true) {
		await Bun.sleep(3000);
		process.stdout.write(".");

		const { data: pull, error: pollErr } = await client.api
			.pulls({ id: pullId })
			.get();

		if (pollErr) continue;

		if (pull.status === "COMPLETED") {
			console.log("\nDone! Run `wlog today` or `wlog eod` to see your digest.");
			return;
		}

		if (pull.status === "FAILED") {
			console.error(`\nPull failed: ${pull.errorMessage ?? "unknown error"}`);
			process.exit(1);
		}
	}
}
