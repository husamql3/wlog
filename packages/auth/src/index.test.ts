import { expect, it } from "bun:test";

it("createAuth is exported", async () => {
	const { createAuth } = await import("./index");
	expect(typeof createAuth).toBe("function");
});
