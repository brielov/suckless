/** Bucket state stored by the adapter. */
export interface Bucket {
	tokens: number
	last: number
}

/** Storage backend for rate limit state. */
export interface LimiterAdapter extends AsyncDisposable {
	get(key: string): Promise<Bucket | undefined>
	set(key: string, bucket: Bucket): Promise<void>
	delete(key: string): Promise<void>
}

/** Result of a rate limit check. */
export interface CheckResult {
	ok: boolean
	remaining: number
	retryAfter: number
}

/** Token bucket rate limiter. */
export interface Limiter extends AsyncDisposable {
	check(key: string): Promise<CheckResult>
	reset(key: string): Promise<void>
}

/** In-memory adapter with automatic stale bucket sweeping. */
export function memoryAdapter(sweepIntervalMs = 30_000): LimiterAdapter {
	const store = new Map<string, Bucket>()

	const timer = setInterval(() => {
		const now = Date.now()
		for (const [key, bucket] of store) {
			if (now - bucket.last >= sweepIntervalMs) {
				store.delete(key)
			}
		}
	}, sweepIntervalMs)

	if (typeof timer === "object" && "unref" in timer) {
		timer.unref()
	}

	return {
		get(key) {
			return Promise.resolve(store.get(key))
		},
		set(key, bucket) {
			store.set(key, bucket)
			return Promise.resolve()
		},
		delete(key) {
			store.delete(key)
			return Promise.resolve()
		},
		[Symbol.asyncDispose]() {
			clearInterval(timer)
			store.clear()
			return Promise.resolve()
		},
	}
}

/** Create a rate limiter with a token bucket algorithm. */
export function createLimiter(
	max: number,
	window: number,
	adapter: LimiterAdapter,
): Limiter {
	if (!Number.isInteger(max) || max < 1) {
		throw new RangeError("max must be a positive integer")
	}
	if (window <= 0 || !Number.isFinite(window)) {
		throw new RangeError("window must be a positive finite number")
	}

	const rate = max / window
	const store = adapter

	return {
		async check(key) {
			const now = Date.now()
			let bucket = await store.get(key)

			if (bucket) {
				bucket.tokens = Math.min(
					max,
					bucket.tokens + (now - bucket.last) * rate,
				)
				bucket.last = now
			} else {
				bucket = { tokens: max, last: now }
			}

			if (bucket.tokens >= 1) {
				bucket.tokens -= 1
				await store.set(key, bucket)
				return {
					ok: true,
					remaining: Math.floor(bucket.tokens),
					retryAfter: 0,
				}
			}

			await store.set(key, bucket)
			return {
				ok: false,
				remaining: 0,
				retryAfter: Math.ceil((1 - bucket.tokens) / rate),
			}
		},

		async reset(key) {
			await store.delete(key)
		},

		[Symbol.asyncDispose]() {
			return store[Symbol.asyncDispose]()
		},
	}
}
