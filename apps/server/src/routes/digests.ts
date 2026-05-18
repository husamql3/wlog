import { db } from "@wlog/db";
import Elysia, { status, t } from "elysia";
import { sessionPlugin } from "../middleware/session";

export const digestRoutes = new Elysia({ prefix: "/api/digests" })
	.use(sessionPlugin)
	.get(
		"/",
		async ({ user, query }) => {
			if (!user) return status(401, "Unauthorized");

			const dateFilter = query.date
				? (() => {
						const start = new Date(query.date as string);
						const end = new Date(query.date as string);
						end.setDate(end.getDate() + 1);
						return { gte: start, lt: end };
					})()
				: undefined;

			const typeFilter = query.type
				? (query.type as "STANDUP" | "EOD" | "BRAG_DOC")
				: undefined;

			const digests = await db.digest.findMany({
				where: {
					userId: user.id,
					...(dateFilter && { createdAt: dateFilter }),
					...(typeFilter && { type: typeFilter }),
				},
				orderBy: { createdAt: "desc" },
				select: {
					id: true,
					type: true,
					state: true,
					content: true,
					createdAt: true,
					updatedAt: true,
				},
			});

			return digests;
		},
		{
			query: t.Object({
				date: t.Optional(t.String()),
				type: t.Optional(t.String()),
			}),
		},
	);
