# @suckless/limiter

Token bucket rate limiter. Zero dependencies, runtime-agnostic, pluggable storage.

## Install

```sh
npm install @suckless/limiter
```

## Usage

```ts
import { createLimiter, memoryAdapter } from "@suckless/limiter"

const limiter = createLimiter(100, 60_000, memoryAdapter()) // 100 requests per minute

const { ok, remaining, retryAfter } = await limiter.check("user:123")
if (!ok) {
	// retry after `retryAfter` ms
}
```

## With middleware

```ts
import { createLimiter, memoryAdapter } from "@suckless/limiter"
import { parse } from "@suckless/duration"
import type { Middleware } from "@suckless/middleware"

const limiter = createLimiter(100, parse("1m"), memoryAdapter())

const rateLimit: Middleware<Request, Response> = async (req, next) => {
	const ip = req.headers.get("x-forwarded-for") ?? "unknown"
	const { ok, retryAfter } = await limiter.check(ip)
	if (!ok) {
		return new Response("Too Many Requests", {
			status: 429,
			headers: { "Retry-After": String(Math.ceil(retryAfter / 1000)) },
		})
	}
	return next(req)
}
```

## Custom adapter

By default, state is stored in memory with automatic stale-bucket sweeping. Pass a custom `LimiterAdapter` for external storage (Redis, database, etc.):

```ts
import {
	createLimiter,
	type LimiterAdapter,
	type Bucket,
} from "@suckless/limiter"

const redisAdapter: LimiterAdapter = {
	async get(key) {
		const data = await redis.get(`limiter:${key}`)
		return data ? JSON.parse(data) : undefined
	},
	async set(key, bucket) {
		await redis.set(`limiter:${key}`, JSON.stringify(bucket))
	},
	async delete(key) {
		await redis.del(`limiter:${key}`)
	},
	async [Symbol.asyncDispose]() {
		await redis.quit()
	},
}

const limiter = createLimiter(100, 60_000, redisAdapter)
```

## How it works

Uses a [token bucket](https://en.wikipedia.org/wiki/Token_bucket) algorithm. Each key gets a bucket with `max` tokens. Tokens refill at a constant rate of `max / window` per millisecond. Each `check` consumes one token.

This allows short bursts up to `max` while enforcing the average rate over the window.

## API

### `createLimiter(max, window, adapter): Limiter`

- `max` — maximum tokens (requests) per window
- `window` — time window in milliseconds
- `adapter` — a `LimiterAdapter` storage backend

### `limiter.check(key): Promise<CheckResult>`

Consumes a token and returns:

- `ok` — whether the request is allowed
- `remaining` — tokens left after this check
- `retryAfter` — milliseconds until a token is available (0 if ok)

### `limiter.reset(key): Promise<void>`

Clears the bucket for a key, restoring it to full capacity.

### `memoryAdapter(sweepIntervalMs?): LimiterAdapter`

In-memory adapter with automatic stale-bucket sweeping.

### Cleanup

Stale buckets are swept automatically. The limiter implements `AsyncDisposable` for cleanup:

```ts
await using limiter = createLimiter(100, 60_000, memoryAdapter())
```

## License

MIT
