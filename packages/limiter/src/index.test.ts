import { describe, expect, test } from "bun:test"
import { createLimiter, memoryAdapter } from "."

describe("createLimiter", () => {
	test("allows requests within limit", async () => {
		await using limiter = createLimiter(3, 1000, memoryAdapter())
		const a = await limiter.check("a")
		const b = await limiter.check("a")
		const c = await limiter.check("a")
		expect(a.ok).toBe(true)
		expect(b.ok).toBe(true)
		expect(c.ok).toBe(true)
	})

	test("denies requests exceeding limit", async () => {
		await using limiter = createLimiter(2, 1000, memoryAdapter())
		await limiter.check("a")
		await limiter.check("a")
		const result = await limiter.check("a")
		expect(result.ok).toBe(false)
		expect(result.remaining).toBe(0)
		expect(result.retryAfter).toBeGreaterThan(0)
	})

	test("remaining decreases with each check", async () => {
		await using limiter = createLimiter(3, 1000, memoryAdapter())
		const a = await limiter.check("a")
		const b = await limiter.check("a")
		const c = await limiter.check("a")
		expect(a.remaining).toBe(2)
		expect(b.remaining).toBe(1)
		expect(c.remaining).toBe(0)
	})

	test("keys are independent", async () => {
		await using limiter = createLimiter(1, 1000, memoryAdapter())
		const a1 = await limiter.check("a")
		const b1 = await limiter.check("b")
		const a2 = await limiter.check("a")
		const b2 = await limiter.check("b")
		expect(a1.ok).toBe(true)
		expect(b1.ok).toBe(true)
		expect(a2.ok).toBe(false)
		expect(b2.ok).toBe(false)
	})

	test("reset clears a key", async () => {
		await using limiter = createLimiter(1, 1000, memoryAdapter())
		await limiter.check("a")
		const denied = await limiter.check("a")
		expect(denied.ok).toBe(false)
		await limiter.reset("a")
		const allowed = await limiter.check("a")
		expect(allowed.ok).toBe(true)
	})

	test("tokens refill over time", async () => {
		await using limiter = createLimiter(1, 100, memoryAdapter())
		await limiter.check("a")
		const denied = await limiter.check("a")
		expect(denied.ok).toBe(false)
		await Bun.sleep(120)
		const allowed = await limiter.check("a")
		expect(allowed.ok).toBe(true)
	})

	test("retryAfter reflects refill time", async () => {
		await using limiter = createLimiter(1, 1000, memoryAdapter())
		await limiter.check("a")
		const result = await limiter.check("a")
		expect(result.retryAfter).toBeGreaterThan(0)
		expect(result.retryAfter).toBeLessThanOrEqual(1000)
	})

	test("throws on invalid max", () => {
		const a = memoryAdapter()
		expect(() => createLimiter(0, 1000, a)).toThrow(RangeError)
		expect(() => createLimiter(-1, 1000, a)).toThrow(RangeError)
		expect(() => createLimiter(0.5, 1000, a)).toThrow(RangeError)
		expect(() => createLimiter(1.5, 1000, a)).toThrow(RangeError)
		expect(() => createLimiter(Infinity, 1000, a)).toThrow(RangeError)
		expect(() => createLimiter(NaN, 1000, a)).toThrow(RangeError)
	})

	test("throws on invalid window", () => {
		const a = memoryAdapter()
		expect(() => createLimiter(10, 0, a)).toThrow(RangeError)
		expect(() => createLimiter(10, -1, a)).toThrow(RangeError)
		expect(() => createLimiter(10, Infinity, a)).toThrow(RangeError)
		expect(() => createLimiter(10, NaN, a)).toThrow(RangeError)
	})

	test("async dispose clears state", async () => {
		const limiter = createLimiter(1, 1000, memoryAdapter())
		await limiter.check("a")
		await limiter[Symbol.asyncDispose]()
	})

	test("accepts custom adapter", async () => {
		const store = new Map<string, { tokens: number; last: number }>()
		const adapter = {
			get(key: string) {
				return Promise.resolve(store.get(key))
			},
			set(key: string, bucket: { tokens: number; last: number }) {
				store.set(key, bucket)
				return Promise.resolve()
			},
			delete(key: string) {
				store.delete(key)
				return Promise.resolve()
			},
			[Symbol.asyncDispose]() {
				store.clear()
				return Promise.resolve()
			},
		}

		await using limiter = createLimiter(1, 1000, adapter)
		const first = await limiter.check("a")
		const second = await limiter.check("a")
		expect(first.ok).toBe(true)
		expect(second.ok).toBe(false)
		expect(store.size).toBe(1)
		await limiter.reset("a")
		expect(store.size).toBe(0)
	})
})
