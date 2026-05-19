import { requireAuth } from "../lib/client";

export async function todayCommand() {
	const client = await requireAuth();

	const today = new Date().toISOString().slice(0, 10);
	const { data, error } = await client.api.digests.get({
		query: { date: today, type: "STANDUP" },
	});

	if (error) {
		console.error("Error:", error.value);
		process.exit(1);
	}

	if (!data.length) {
		console.log("No standup for today yet. Run `wlog sync` to generate one.");
		return;
	}

	const digest = data[0]!;
	console.log("");
	console.log("── Standup · " + today + " ─────────────────────────");
	console.log("");
	console.log(digest.content);
	console.log("");
}
