import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_DIR = join(homedir(), ".config", "wlog");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

type Config = {
	token?: string;
	serverUrl?: string;
	email?: string;
	name?: string;
};

async function readConfig(): Promise<Config> {
	try {
		const file = Bun.file(CONFIG_FILE);
		return (await file.json()) as Config;
	} catch {
		return {};
	}
}

async function writeConfig(config: Config): Promise<void> {
	await mkdir(CONFIG_DIR, { recursive: true });
	await Bun.write(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export async function getToken(): Promise<string | undefined> {
	return (await readConfig()).token;
}

export async function saveAuth(opts: {
	token: string;
	serverUrl: string;
	email: string;
	name: string;
}): Promise<void> {
	const existing = await readConfig();
	await writeConfig({ ...existing, ...opts });
}

export async function clearAuth(): Promise<void> {
	const existing = await readConfig();
	const { token: _, ...rest } = existing;
	await writeConfig(rest);
}

export async function getServerUrl(): Promise<string> {
	const config = await readConfig();
	return config.serverUrl ?? "http://localhost:3001";
}
