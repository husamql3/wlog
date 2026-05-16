import { expect, it } from "bun:test";

it("env schema loads", async () => {
	const { env } = await import("./index");
	expect(env).toBeDefined();
});
