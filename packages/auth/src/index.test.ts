import { expect, it } from "bun:test";

it("auth is exported", async () => {
	const { auth } = await import("./index");
	expect(typeof auth).toBe("object");
});
