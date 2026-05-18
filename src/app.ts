import { Elysia } from "elysia";

void Elysia;

const { default: app } = await import("../apps/server/src/app.js");

export default app;
