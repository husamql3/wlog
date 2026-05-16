import { expect, it } from "bun:test";
import { cn } from "./utils";

it("cn merges classnames", () => {
	expect(cn("a", "b")).toBe("a b");
});
