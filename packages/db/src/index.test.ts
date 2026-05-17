import { expect, test } from "bun:test";
import { db } from ".";

test("db client is exported", () => {
	expect(db).toBeDefined();
});
