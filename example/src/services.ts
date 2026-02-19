import {
	createCache,
	memoryAdapter as cacheMemoryAdapter,
} from "@suckless/cache"
import { parse as parseCron, sequence } from "@suckless/cron"
import { parse as parseDuration } from "@suckless/duration"
import { createEmitter } from "@suckless/emitter"
import {
	createLimiter,
	memoryAdapter as limiterMemoryAdapter,
} from "@suckless/limiter"
import {
	createQueue,
	memoryAdapter as queueMemoryAdapter,
} from "@suckless/queue"
import { retry } from "@suckless/retry"

// ── Event bus ───────────────────────────────────────────────────────

interface ServerEvents {
	request: [method: string, path: string, status: number, ms: number]
	"form:submit": [name: string, email: string]
	"email:sent": [to: string]
	"email:failed": [to: string, error: string]
	"cache:purge": []
}

export const emitter = createEmitter<ServerEvents>()

emitter.on("request", (method, path, status, ms) => {
	console.log(`${method} ${path} ${String(status)} ${String(ms)}ms`)
})

emitter.on("form:submit", (name, email) => {
	console.log(`Contact form: ${name} <${email}>`)
})

emitter.on("email:sent", (to) => {
	console.log(`Email sent to ${to}`)
})

emitter.on("email:failed", (to, error) => {
	console.error(`Email failed for ${to}: ${error}`)
})

emitter.on("cache:purge", () => {
	console.log("Cache purged")
})

// ── Page cache ──────────────────────────────────────────────────────

export const pageCache = createCache<string, string>(
	cacheMemoryAdapter(),
	parseDuration("5m"),
)

// ── Rate limiter ────────────────────────────────────────────────────

export const contactLimiter = createLimiter(
	5,
	parseDuration("1m"),
	limiterMemoryAdapter(),
)

// ── Email queue ─────────────────────────────────────────────────────

interface EmailJob {
	to: string
	name: string
	message: string
}

async function sendEmail(to: string, message: string): Promise<void> {
	await retry(
		() => {
			// Simulated unreliable SMTP — fails ~30% of the time
			if (Math.random() < 0.3) {
				return Promise.reject(new Error("SMTP connection failed"))
			}
			const preview =
				message.length > 50 ? `${message.slice(0, 50)}...` : message
			console.log(`[Email API] Delivered to ${to}: ${preview}`)
			return Promise.resolve()
		},
		{ maxAttempts: 3, baseDelay: 200 },
	)
}

export const emailQueue = createQueue<EmailJob>(
	async (job) => {
		try {
			await sendEmail(job.to, job.message)
			emitter.emit("email:sent", job.to)
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error)
			emitter.emit("email:failed", job.to, msg)
		}
	},
	queueMemoryAdapter<EmailJob>(),
	{ concurrency: 2 },
)

// ── Request IP storage ──────────────────────────────────────────────

export const requestIPs = new WeakMap<Request, string>()

// ── Cron scheduler ──────────────────────────────────────────────────

export function startCronScheduler(): void {
	const schedule = parseCron("0 * * * *")

	async function run(): Promise<void> {
		for (const date of sequence(schedule)) {
			const delay = date.getTime() - Date.now()
			if (delay > 0) {
				// oxlint-disable-next-line no-await-in-loop -- Sequential by design: each iteration waits for the next cron tick
				await new Promise<void>((resolve) => {
					setTimeout(resolve, delay)
				})
			}
			emitter.emit("cache:purge")
		}
	}

	run().catch(console.error)
}
