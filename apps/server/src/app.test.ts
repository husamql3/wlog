import { describe, expect, it } from "bun:test";
import { app } from "./app";

describe("app", () => {
	it("GET / returns OK", async () => {
		const res = await app.handle(new Request("http://localhost/"));
		expect(res.status).toBe(200);
		expect(await res.text()).toBe("OK");
	});
});
