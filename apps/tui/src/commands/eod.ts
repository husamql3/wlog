import { writeFile } from "node:fs/promises";
import { requireAuth } from "../lib/client";

export async function eodCommand(opts: { export?: boolean }) {
	const client = await requireAuth();

	const today = new Date().toISOString().slice(0, 10);
	const { data, error } = await client.api.digests.get({
		query: { date: today, type: "EOD" },
	});

	if (error) {
		console.error("Error:", error.value);
		process.exit(1);
	}

	if (!data.length) {
		console.log("No EOD for today yet. Run `wlog sync` to generate one.");
		return;
	}

	const digest = data[0]!;
	const content = digest.content;

	console.log("");
	console.log("── EOD · " + today + " ─────────────────────────────────");
	console.log("");
	console.log(content);
	console.log("");

	if (opts.export) {
		const filename = `eod-${today}.md`;
		await writeFile(filename, content, "utf-8");
		console.log(`Saved to ${filename}`);
	}
}
