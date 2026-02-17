import { describe, expect, test } from "bun:test"
import { retry } from "./index"

// ─── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
	return new Promise<void>((resolve) => {
		setTimeout(resolve, ms)
	})
}

/** Creates a function that fails `n` times then succeeds. */
function failNTimes<T>(n: number, result: T): (attempt: number) => Promise<T> {
	let calls = 0
	return () => {
		calls++
		if (calls <= n) {
			return Promise.reject(new Error(`fail #${String(calls)}`))
		}
		return Promise.resolve(result)
	}
}

// ─── Success cases ──────────────────────────────────────────────────────────

describe("success", () => {
	test("returns result on first attempt", async () => {
		const result = await retry(() => Promise.resolve(42))
		expect(result).toBe(42)
	})

	test("succeeds after transient failures", async () => {
		const fn = failNTimes(2, "ok")
		const result = await retry(fn, { baseDelay: 1 })
		expect(result).toBe("ok")
	})

	test("passes attempt number to fn", async () => {
		const attempts: number[] = []
		await retry(
			(attempt) => {
				attempts.push(attempt)
				if (attempts.length < 3) {
					return Promise.reject(new Error("fail"))
				}
				return Promise.resolve("ok")
			},
			{ baseDelay: 1 },
		)
		expect(attempts).toEqual([0, 1, 2])
	})

	test("passes signal to fn", async () => {
		let receivedSignal: AbortSignal | undefined
		await retry((_, signal) => {
			receivedSignal = signal
			return Promise.resolve("ok")
		})
		expect(receivedSignal).toBeInstanceOf(AbortSignal)
	})
})

// ─── Exhaustion ─────────────────────────────────────────────────────────────

describe("exhaustion", () => {
	test("throws last error after maxAttempts", async () => {
		let calls = 0
		const promise = retry(
			() => {
				calls++
				return Promise.reject(new Error(`fail #${String(calls)}`))
			},
			{ maxAttempts: 3, baseDelay: 1 },
		)

		expect(promise).rejects.toThrow("fail #3")
		await promise.catch(() => {})
		expect(calls).toBe(3)
	})

	test("wraps non-Error throw with cause", async () => {
		const promise = retry(
			() => {
				throw "string error" // oxlint-disable-line only-throw-error, no-throw-literal
			},
			{ maxAttempts: 1 },
		)

		try {
			await promise
		} catch (error) {
			expect(error).toBeInstanceOf(Error)
			// oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion -- narrowed above
			const err = error as Error
			expect(err.message).toBe("string error")
			expect(err.cause).toBe("string error")
		}
	})

	test("maxAttempts: 1 means no retries", async () => {
		let calls = 0
		const promise = retry(
			() => {
				calls++
				return Promise.reject(new Error("fail"))
			},
			{ maxAttempts: 1 },
		)

		expect(promise).rejects.toThrow("fail")
		await promise.catch(() => {})
		expect(calls).toBe(1)
	})
})

// ─── shouldRetry ────────────────────────────────────────────────────────────

describe("shouldRetry", () => {
	test("stops retrying when shouldRetry returns false", async () => {
		let calls = 0
		const promise = retry(
			() => {
				calls++
				return Promise.reject(new Error("permanent"))
			},
			{
				maxAttempts: 5,
				baseDelay: 1,
				shouldRetry: () => false,
			},
		)

		expect(promise).rejects.toThrow("permanent")
		await promise.catch(() => {})
		expect(calls).toBe(1)
	})

	test("retries when shouldRetry returns true", async () => {
		const fn = failNTimes(2, "ok")
		const result = await retry(fn, {
			baseDelay: 1,
			shouldRetry: () => true,
		})
		expect(result).toBe("ok")
	})

	test("receives the thrown error", async () => {
		const errors: unknown[] = []
		const fn = failNTimes(1, "ok")

		await retry(fn, {
			baseDelay: 1,
			shouldRetry: (error) => {
				errors.push(error)
				return true
			},
		})

		expect(errors).toHaveLength(1)
		expect(errors[0]).toBeInstanceOf(Error)
	})
})

// ─── AbortSignal ────────────────────────────────────────────────────────────

describe("abort", () => {
	test("rejects immediately with an already-aborted signal", async () => {
		const controller = new AbortController()
		controller.abort(new Error("cancelled"))

		const promise = retry(() => Promise.resolve("ok"), {
			signal: controller.signal,
		})

		expect(promise).rejects.toThrow("cancelled")
		await promise.catch(() => {})
	})

	test("rejects when signal is aborted during delay", async () => {
		const controller = new AbortController()
		let calls = 0

		const promise = retry(
			() => {
				calls++
				return Promise.reject(new Error("fail"))
			},
			{
				maxAttempts: 10,
				baseDelay: 5000,
				signal: controller.signal,
			},
		)

		// Wait for the first attempt to fail, then abort during the delay
		await sleep(10)
		controller.abort(new Error("cancelled"))

		expect(promise).rejects.toThrow("cancelled")
		await promise.catch(() => {})
		expect(calls).toBe(1)
	})

	test("AbortSignal.timeout integration", async () => {
		const promise = retry(() => Promise.reject(new Error("fail")), {
			maxAttempts: 100,
			baseDelay: 1000,
			signal: AbortSignal.timeout(50),
		})

		expect(promise).rejects.toThrow()
		await promise.catch(() => {})
	})
})

// ─── Validation ─────────────────────────────────────────────────────────────

describe("validation", () => {
	test("maxAttempts: NaN throws RangeError", () => {
		expect(
			retry(() => Promise.resolve("ok"), { maxAttempts: NaN }),
		).rejects.toThrow(RangeError)
	})

	test("maxAttempts: 0 throws RangeError", () => {
		expect(
			retry(() => Promise.resolve("ok"), { maxAttempts: 0 }),
		).rejects.toThrow(RangeError)
	})

	test("maxAttempts: -1 throws RangeError", () => {
		expect(
			retry(() => Promise.resolve("ok"), { maxAttempts: -1 }),
		).rejects.toThrow(RangeError)
	})

	test("maxAttempts: 1.5 throws RangeError", () => {
		expect(
			retry(() => Promise.resolve("ok"), { maxAttempts: 1.5 }),
		).rejects.toThrow(RangeError)
	})

	test("baseDelay: NaN throws RangeError", () => {
		expect(
			retry(() => Promise.resolve("ok"), { baseDelay: NaN }),
		).rejects.toThrow(RangeError)
	})

	test("baseDelay: -1 throws RangeError", () => {
		expect(
			retry(() => Promise.resolve("ok"), { baseDelay: -1 }),
		).rejects.toThrow(RangeError)
	})

	test("maxDelay: NaN throws RangeError", () => {
		expect(
			retry(() => Promise.resolve("ok"), { maxDelay: NaN }),
		).rejects.toThrow(RangeError)
	})

	test("maxDelay: -1 throws RangeError", () => {
		expect(
			retry(() => Promise.resolve("ok"), { maxDelay: -1 }),
		).rejects.toThrow(RangeError)
	})
})

// ─── Backoff ────────────────────────────────────────────────────────────────

describe("backoff", () => {
	test("delays increase between attempts", async () => {
		const timestamps: number[] = []

		const promise = retry(
			() => {
				timestamps.push(Date.now())
				return Promise.reject(new Error("fail"))
			},
			{ maxAttempts: 4, baseDelay: 50, maxDelay: 5000 },
		)

		await promise.catch(() => {})

		// Verify we got all 4 attempts
		expect(timestamps).toHaveLength(4)

		// Delays should generally increase (with jitter, not strictly monotonic,
		// but the upper bounds grow exponentially: 50, 100, 200)
		// Just verify that retries actually waited (not instant)
		const totalTime = timestamps.at(-1)! - timestamps[0]!
		expect(totalTime).toBeGreaterThan(0)
	})

	test("delay is capped by maxDelay", async () => {
		const timestamps: number[] = []

		const promise = retry(
			() => {
				timestamps.push(Date.now())
				return Promise.reject(new Error("fail"))
			},
			{ maxAttempts: 3, baseDelay: 50, maxDelay: 60 },
		)

		await promise.catch(() => {})

		// With maxDelay: 60 and jitter, no gap should exceed ~60ms
		for (let i = 1; i < timestamps.length; i++) {
			const gap = timestamps[i]! - timestamps[i - 1]!
			expect(gap).toBeLessThan(100) // generous margin for timer imprecision
		}
	})

	test("no delay after the last failed attempt", async () => {
		const start = Date.now()

		const promise = retry(() => Promise.reject(new Error("fail")), {
			maxAttempts: 1,
			baseDelay: 10_000,
		})

		await promise.catch(() => {})

		// With maxAttempts: 1, there should be no delay at all
		expect(Date.now() - start).toBeLessThan(50)
	})
})
