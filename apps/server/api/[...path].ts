import { app } from "../src/app";

export default function handler(req: Request): Response | Promise<Response> {
	const url = new URL(req.url);
	url.pathname = url.pathname.replace(/^\/api/, "") || "/";
	return app.handle(new Request(url.toString(), req));
}
