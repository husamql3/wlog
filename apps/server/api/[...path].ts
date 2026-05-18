import { app } from "../src/app";

export default function handler(req: Request): Response | Promise<Response> {
	return app.handle(req);
}
