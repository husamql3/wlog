import { db } from "./index";

async function seed() {
	console.log("Seeding database...");

	// Upsert a dev user (bypasses Better Auth — for local dev only)
	const user = await db.user.upsert({
		where: { email: "dev@wlog.local" },
		create: {
			id: "dev-user-seed",
			name: "Dev User",
			email: "dev@wlog.local",
			emailVerified: true,
			createdAt: new Date(),
			updatedAt: new Date(),
			plan: "FREE",
		},
		update: {},
	});

	console.log("User:", user.id);

	// Upsert a stub GitHub connection
	const connection = await db.connection.upsert({
		where: { userId_provider: { userId: user.id, provider: "GITHUB" } },
		create: {
			userId: user.id,
			provider: "GITHUB",
			accessToken: "stub-token-replace-for-real-use",
		},
		update: {},
	});

	console.log("Connection:", connection.id);

	// Seed two scoped repos
	const repos = [
		{ externalId: "123456", repoFullName: "dev/example-api" },
		{ externalId: "789012", repoFullName: "dev/example-web" },
	];

	for (const repo of repos) {
		await db.connectionScope.upsert({
			where: {
				connectionId_externalId: {
					connectionId: connection.id,
					externalId: repo.externalId,
				},
			},
			create: { connectionId: connection.id, ...repo },
			update: {},
		});
	}

	console.log("Scopes seeded:", repos.length);

	// Seed a completed pull with sample digests
	const pull = await db.pull.create({
		data: {
			userId: user.id,
			connectionId: connection.id,
			status: "COMPLETED",
			startedAt: new Date(),
			completedAt: new Date(),
		},
	});

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const summary = await db.activitySummary.create({
		data: {
			pullId: pull.id,
			userId: user.id,
			date: today,
			summary: {
				date: today.toISOString().split("T")[0],
				byRepo: {
					"dev/example-api": {
						commits: ["feat: add user endpoint", "fix: handle null session"],
						prsOpened: ["Add rate limiting"],
						prsMerged: [],
						prsClosed: [],
						reviews: [],
					},
				},
			},
		},
	});

	await db.digest.createMany({
		data: [
			{
				userId: user.id,
				pullId: pull.id,
				activitySummaryId: summary.id,
				type: "STANDUP",
				state: "GENERATED",
				content:
					"• Pushed two commits to example-api (new user endpoint + null session fix)\n• Opened PR for rate limiting",
			},
			{
				userId: user.id,
				pullId: pull.id,
				activitySummaryId: summary.id,
				type: "EOD",
				state: "GENERATED",
				content:
					"Today I added a user endpoint to the example-api and fixed a null session bug. I also opened a pull request to add rate limiting. The rate limiting PR is ready for review.",
			},
		],
	});

	console.log("Pull + digests seeded:", pull.id);
	console.log("Done.");
}

seed()
	.catch(console.error)
	.finally(() => db.$disconnect());
