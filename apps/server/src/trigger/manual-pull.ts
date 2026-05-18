import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { logger, schemaTask } from "@trigger.dev/sdk";
import { db, type Prisma } from "@wlog/db";
import { env } from "@wlog/env";
import { generateObject } from "ai";
import { z } from "zod";

// ─── GitHub API types ─────────────────────────────────────────────────────────

interface GhCommit {
	sha: string;
	commit: { message: string; author: { date: string } };
	html_url: string;
}

interface GhPr {
	node_id: string;
	number: number;
	title: string;
	state: string;
	merged_at: string | null;
	created_at: string;
	html_url: string;
}

interface GhReview {
	id: number;
	state: string;
	submitted_at: string;
	pull_request_url: string;
}

// ─── Digest output schema ─────────────────────────────────────────────────────

const digestSchema = z.object({
	standup: z
		.string()
		.describe("Short, present-tense summary for verbal delivery"),
	eod: z.string().describe("Longer written end-of-day summary"),
});

// ─── Task ─────────────────────────────────────────────────────────────────────

export const manualPull = schemaTask({
	id: "manual-pull",
	schema: z.object({
		pullId: z.string(),
		userId: z.string(),
		connectionId: z.string(),
	}),
	retry: {
		maxAttempts: 3,
		minTimeoutInMs: 2000,
		maxTimeoutInMs: 30000,
		factor: 2,
	},
	run: async ({ pullId, userId, connectionId }) => {
		// Mark pull as running
		await db.pull.update({
			where: { id: pullId },
			data: { status: "RUNNING", startedAt: new Date() },
		});

		try {
			const connection = await db.connection.findUniqueOrThrow({
				where: { id: connectionId },
				include: { scopes: true },
			});

			if (connection.scopes.length === 0) {
				logger.warn("No scopes configured — nothing to pull", { connectionId });
				await db.pull.update({
					where: { id: pullId },
					data: { status: "COMPLETED", completedAt: new Date() },
				});
				return { digestCount: 0 };
			}

			// Determine fetch window: since last completed pull for this connection
			const lastPull = await db.pull.findFirst({
				where: {
					connectionId,
					status: "COMPLETED",
					id: { not: pullId },
				},
				orderBy: { completedAt: "desc" },
			});

			const since =
				lastPull?.completedAt ?? new Date(Date.now() - 24 * 60 * 60 * 1000);
			logger.info("Fetching activity", {
				since,
				scopes: connection.scopes.length,
			});

			// ── Fetch activity for each scoped repo ──────────────────────────

			const activities: Array<{
				type: "COMMIT" | "PR_OPENED" | "PR_MERGED" | "PR_CLOSED" | "PR_REVIEW";
				externalId: string;
				repoId: string;
				repoFullName: string;
				title: string;
				occurredAt: Date;
				metadata: Prisma.InputJsonValue;
			}> = [];

			const ghHeaders = {
				Authorization: `Bearer ${connection.accessToken}`,
				Accept: "application/vnd.github.v3+json",
			};

			for (const scope of connection.scopes) {
				const [owner, repo] = scope.repoFullName.split("/");
				const sinceIso = since.toISOString();

				// Commits authored by this user
				const commitsRes = await fetch(
					`https://api.github.com/repos/${owner}/${repo}/commits?since=${sinceIso}&per_page=100`,
					{ headers: ghHeaders },
				);
				if (commitsRes.ok) {
					const commits = (await commitsRes.json()) as GhCommit[];
					for (const c of commits) {
						const firstLine =
							c.commit.message.split("\n")[0] ?? c.commit.message;
						activities.push({
							type: "COMMIT",
							externalId: c.sha,
							repoId: scope.externalId,
							repoFullName: scope.repoFullName,
							title: firstLine,
							occurredAt: new Date(c.commit.author.date),
							metadata: { url: c.html_url },
						});
					}
				}

				// PRs authored (opened/merged/closed)
				const prsRes = await fetch(
					`https://api.github.com/repos/${owner}/${repo}/pulls?state=all&sort=updated&direction=desc&per_page=50`,
					{ headers: ghHeaders },
				);
				if (prsRes.ok) {
					const prs = (await prsRes.json()) as GhPr[];
					for (const pr of prs) {
						const createdAt = new Date(pr.created_at);
						if (createdAt < since && !pr.merged_at) continue;

						if (createdAt >= since) {
							activities.push({
								type: "PR_OPENED",
								externalId: `${pr.node_id}:opened`,
								repoId: scope.externalId,
								repoFullName: scope.repoFullName,
								title: pr.title,
								occurredAt: createdAt,
								metadata: { url: pr.html_url, number: pr.number },
							});
						}
						if (pr.merged_at && new Date(pr.merged_at) >= since) {
							activities.push({
								type: "PR_MERGED",
								externalId: `${pr.node_id}:merged`,
								repoId: scope.externalId,
								repoFullName: scope.repoFullName,
								title: pr.title,
								occurredAt: new Date(pr.merged_at),
								metadata: { url: pr.html_url, number: pr.number },
							});
						}
						if (pr.state === "closed" && !pr.merged_at && createdAt >= since) {
							activities.push({
								type: "PR_CLOSED",
								externalId: `${pr.node_id}:closed`,
								repoId: scope.externalId,
								repoFullName: scope.repoFullName,
								title: pr.title,
								occurredAt: createdAt,
								metadata: { url: pr.html_url, number: pr.number },
							});
						}
					}
				}

				// Reviews given
				const reviewsRes = await fetch(
					`https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=50`,
					{ headers: ghHeaders },
				);
				if (reviewsRes.ok) {
					const reviewedPrs = (await reviewsRes.json()) as GhPr[];
					for (const pr of reviewedPrs) {
						const prReviewsRes = await fetch(
							`https://api.github.com/repos/${owner}/${repo}/pulls/${pr.number}/reviews`,
							{ headers: ghHeaders },
						);
						if (!prReviewsRes.ok) continue;
						const reviews = (await prReviewsRes.json()) as GhReview[];
						for (const review of reviews) {
							if (!review.submitted_at) continue;
							const submittedAt = new Date(review.submitted_at);
							if (submittedAt < since) continue;
							if (
								!["APPROVED", "CHANGES_REQUESTED", "COMMENTED"].includes(
									review.state,
								)
							)
								continue;
							activities.push({
								type: "PR_REVIEW",
								externalId: `review:${review.id}`,
								repoId: scope.externalId,
								repoFullName: scope.repoFullName,
								title: `Review on #${pr.number}: ${pr.title}`,
								occurredAt: submittedAt,
								metadata: {
									reviewState: review.state,
									prUrl: review.pull_request_url,
								},
							});
						}
					}
				}
			}

			logger.info("Fetched activities", { count: activities.length });

			// ── Persist activities (upsert for dedup) ────────────────────────

			let persistedCount = 0;
			for (const activity of activities) {
				await db.activity.upsert({
					where: {
						connectionId_externalId_type: {
							connectionId,
							externalId: activity.externalId,
							type: activity.type,
						},
					},
					create: {
						pullId,
						connectionId,
						...activity,
					},
					update: {},
				});
				persistedCount++;
			}

			// ── Build ActivitySummary ─────────────────────────────────────────

			const today = new Date();
			today.setHours(0, 0, 0, 0);

			const summary = {
				date: today.toISOString().split("T")[0],
				byRepo: Object.fromEntries(
					connection.scopes.map((s) => {
						const repoActivities = activities.filter(
							(a) => a.repoId === s.externalId,
						);
						return [
							s.repoFullName,
							{
								commits: repoActivities
									.filter((a) => a.type === "COMMIT")
									.map((a) => a.title),
								prsOpened: repoActivities
									.filter((a) => a.type === "PR_OPENED")
									.map((a) => a.title),
								prsMerged: repoActivities
									.filter((a) => a.type === "PR_MERGED")
									.map((a) => a.title),
								prsClosed: repoActivities
									.filter((a) => a.type === "PR_CLOSED")
									.map((a) => a.title),
								reviews: repoActivities
									.filter((a) => a.type === "PR_REVIEW")
									.map((a) => ({
										title: a.title,
										state: (a.metadata as { reviewState?: string }).reviewState,
									})),
							},
						];
					}),
				),
			};

			const activitySummary = await db.activitySummary.create({
				data: {
					pullId,
					userId,
					date: today,
					summary,
				},
			});

			// ── Generate digests via Gemini ───────────────────────────────────

			const googleAI = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });

			const { object: digests } = await generateObject({
				model: googleAI("gemini-2.5-flash"),
				schema: digestSchema,
				system: `You are wlog, an assistant that summarizes an engineer's daily GitHub activity.
Standup: 2-4 bullet points, present tense ("Merged X", "Opened PR for Y"), for verbal delivery. Be specific and concrete.
EOD: 3-6 sentences, past tense, reflective. Highlight what shipped, what's in progress, and any blockers. Suitable for written async communication.
Do not invent work not present in the activity. If there is no activity, say so honestly.`,
				prompt: `Summarize this engineer's GitHub activity for ${summary.date}:\n\n${JSON.stringify(summary.byRepo, null, 2)}`,
			});

			// ── Persist digests ───────────────────────────────────────────────

			await db.digest.createMany({
				data: [
					{
						userId,
						pullId,
						activitySummaryId: activitySummary.id,
						type: "STANDUP",
						state: "GENERATED",
						content: digests.standup,
					},
					{
						userId,
						pullId,
						activitySummaryId: activitySummary.id,
						type: "EOD",
						state: "GENERATED",
						content: digests.eod,
					},
				],
			});

			await db.pull.update({
				where: { id: pullId },
				data: { status: "COMPLETED", completedAt: new Date() },
			});

			logger.info("Pull completed", { pullId, activities: persistedCount });
			return { digestCount: 2, activities: persistedCount };
		} catch (err) {
			await db.pull.update({
				where: { id: pullId },
				data: {
					status: "FAILED",
					completedAt: new Date(),
					errorMessage: err instanceof Error ? err.message : String(err),
				},
			});
			throw err;
		}
	},
});
