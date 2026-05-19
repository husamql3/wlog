import { treaty } from "@elysiajs/eden";
import type { App } from "@wlog/server";
import { getServerUrl, getToken } from "./config";

export async function createClient() {
	const [token, serverUrl] = await Promise.all([getToken(), getServerUrl()]);
	return treaty<App>(serverUrl, {
		headers: token ? { authorization: `Bearer ${token}` } : {},
	});
}

export async function requireAuth() {
	const token = await getToken();
	if (!token) {
		console.error("Not logged in. Run: wlog login");
		process.exit(1);
	}
	return createClient();
}
