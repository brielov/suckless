import { format } from "@suckless/duration"
import { compose, type Middleware } from "@suckless/middleware"
import { handleContactPost, handleNotFound, router } from "./routes.tsx"
import { emitter, requestIPs, startCronScheduler } from "./services.ts"

// ── Middleware ───────────────────────────────────────────────────────

const loggingMiddleware: Middleware<Request, Response> = async (req, next) => {
	const start = performance.now()
	const response = await next(req)
	const ms = Math.round(performance.now() - start)
	const url = new URL(req.url)
	emitter.emit("request", req.method, url.pathname, response.status, ms)
	return response
}

const timingMiddleware: Middleware<Request, Response> = async (req, next) => {
	const start = performance.now()
	const response = await next(req)
	const ms = performance.now() - start
	const headers = new Headers(response.headers)
	headers.set(
		"server-timing",
		`total;dur=${ms.toFixed(1)};desc="${format(Math.round(ms))}"`,
	)
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	})
}

// ── Core handler ────────────────────────────────────────────────────

function coreHandler(req: Request): Response | Promise<Response> {
	const url = new URL(req.url)

	if (req.method === "POST") {
		const [, locale, action] = url.pathname.split("/")
		if (action === "contact" && locale !== undefined) {
			return handleContactPost(req, locale)
		}
		return new Response("Method Not Allowed", {
			status: 405,
		})
	}

	const match = router.find(url.pathname)
	if (match) {
		return match.value(req, match.params)
	}

	return handleNotFound(req)
}

// ── Pipeline & server ───────────────────────────────────────────────

const pipeline = compose(loggingMiddleware, timingMiddleware)(coreHandler)

startCronScheduler()

Bun.serve({
	port: 3000,
	fetch(req, server) {
		const ip = server.requestIP(req)?.address ?? "unknown"
		requestIPs.set(req, ip)
		return pipeline(req)
	},
})

console.log("Server running at http://localhost:3000")
