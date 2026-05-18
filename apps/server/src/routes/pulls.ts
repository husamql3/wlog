import { tasks } from "@trigger.dev/sdk";
import { db } from "@wlog/db";
import Elysia, { status, t } from "elysia";
import { sessionPlugin } from "../middleware/session";
import type { manualPull } from "../trigger/manual-pull";

export const pullRoutes = new Elysia({ prefix: "/api/pulls" })
	.use(sessionPlugin)
	.post("/manual", async ({ user }) => {
		if (!user) return status(401, "Unauthorized");

		const connection = await db.connection.findUnique({
			where: { userId_provider: { userId: user.id, provider: "GITHUB" } },
		});

		if (!connection) return status(404, "GitHub not connected");

		const pull = await db.pull.create({
			data: {
				userId: user.id,
				connectionId: connection.id,
				status: "PENDING",
			},
		});

		await tasks.trigger<typeof manualPull>("manual-pull", {
			pullId: pull.id,
			userId: user.id,
			connectionId: connection.id,
		});

		return { pullId: pull.id, status: "PENDING" as const };
	})
	.get(
		"/:id",
		async ({ user, params }) => {
			if (!user) return status(401, "Unauthorized");

			const pull = await db.pull.findUnique({
				where: { id: params.id, userId: user.id },
				select: {
					id: true,
					status: true,
					startedAt: true,
					completedAt: true,
					errorMessage: true,
					createdAt: true,
				},
			});

			if (!pull) return status(404, "Pull not found");
			return pull;
		},
		{ params: t.Object({ id: t.String() }) },
	);
