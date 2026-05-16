import { defineConfig } from "tsdown";

export default defineConfig({
	entry: "./src/dev.ts",
	format: "esm",
	outDir: "./dist",
	clean: true,
	noExternal: [/@wlog\/.*/],
});
