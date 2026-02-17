import { describe, expect, test } from "bun:test"
import { stableKey } from "@suckless/key"
import { memo } from "./index"

// ─── Helpers ────────────────────────────────────────────────────────────────

function counter<A extends unknown[], R>(
	fn: (...args: A) => R,
): { fn: (...args: A) => R; count: () => number } {
	let n = 0
	return {
		fn: (...args: A) => {
			n++
			return fn(...args)
		},
		count: () => n,
	}
}

const identity = (x: number) => x
const numKey: (x: number) => string = String

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("memo", () => {
	test("returns cached value on second call with same key", () => {
		const c = counter((x: number) => x * 2)
		const memoized = memo(c.fn, String)

		expect(memoized(3)).toBe(6)
		expect(memoized(3)).toBe(6)
		expect(c.count()).toBe(1)
	})

	test("calls fn for different keys", () => {
		const c = counter((x: number) => x * 2)
		const memoized = memo(c.fn, String)

		expect(memoized(3)).toBe(6)
		expect(memoized(4)).toBe(8)
		expect(c.count()).toBe(2)
	})

	test("different args producing same key share cache", () => {
		const c = counter((a: number, b: number) => a + b)
		const memoized = memo(c.fn, (a, b) => String(a + b))

		expect(memoized(1, 2)).toBe(3)
		expect(memoized(2, 1)).toBe(3)
		expect(c.count()).toBe(1)
	})

	test("preserves return value reference", () => {
		const obj = { x: 1 }
		const memoized = memo(
			() => obj,
			() => "k",
		)

		expect(memoized()).toBe(obj)
		expect(memoized()).toBe(obj)
	})

	test("caches undefined return values", () => {
		const c = counter((): number | undefined => undefined)
		const memoized = memo(c.fn, () => "k")

		expect(memoized()).toBeUndefined()
		expect(memoized()).toBeUndefined()
		expect(c.count()).toBe(1)
	})

	test("does not cache when fn throws", () => {
		let shouldThrow = true
		const c = counter((x: number) => {
			if (shouldThrow) {
				throw new Error("fail")
			}
			return x
		})
		const memoized = memo(c.fn, String)

		expect(() => memoized(1)).toThrow("fail")
		expect(c.count()).toBe(1)

		shouldThrow = false
		expect(memoized(1)).toBe(1)
		expect(c.count()).toBe(2)
	})

	test("propagates key function errors", () => {
		const memoized = memo(
			() => 1,
			() => {
				throw new Error("bad key")
			},
		)
		expect(() => memoized()).toThrow("bad key")
	})

	test("grows unbounded without max", () => {
		const memoized = memo(identity, String)

		for (let i = 0; i < 1000; i++) {
			memoized(i)
		}
		expect(memoized(0)).toBe(0)
		expect(memoized(999)).toBe(999)
	})
})

describe("LRU eviction", () => {
	test("evicts least recently used entry when max is reached", () => {
		const c = counter((x: number) => x * 10)
		const memoized = memo(c.fn, String, { max: 2 })

		memoized(1) // cache: [1]
		memoized(2) // cache: [1, 2]
		memoized(3) // cache: [2, 3] — evicts 1

		expect(c.count()).toBe(3)

		// 2 and 3 are cached
		expect(memoized(2)).toBe(20)
		expect(memoized(3)).toBe(30)
		expect(c.count()).toBe(3)

		// 1 was evicted — fn is called again
		expect(memoized(1)).toBe(10)
		expect(c.count()).toBe(4)
	})

	test("cache hit updates recency", () => {
		const c = counter((x: number) => x * 10)
		const memoized = memo(c.fn, String, { max: 2 })

		memoized(1) // cache: [1]
		memoized(2) // cache: [1, 2]
		memoized(1) // cache: [2, 1] — hit moves 1 to most recent
		memoized(3) // cache: [1, 3] — evicts 2 (least recent)

		expect(c.count()).toBe(3)

		// 1 is still cached
		expect(memoized(1)).toBe(10)
		expect(c.count()).toBe(3)

		// 2 was evicted
		expect(memoized(2)).toBe(20)
		expect(c.count()).toBe(4)
	})

	test("max: 1 keeps only the most recent entry", () => {
		const c = counter((x: number) => x * 10)
		const memoized = memo(c.fn, String, { max: 1 })

		expect(memoized(1)).toBe(10)
		expect(memoized(1)).toBe(10)
		expect(c.count()).toBe(1)

		// Inserting a new key evicts the only entry
		expect(memoized(2)).toBe(20)
		expect(c.count()).toBe(2)

		// 1 is gone
		expect(memoized(1)).toBe(10)
		expect(c.count()).toBe(3)
	})

	test("repeated same-key calls do not evict", () => {
		const c = counter((x: number) => x)
		const memoized = memo(c.fn, String, { max: 2 })

		memoized(1)
		memoized(2)
		// Hitting existing keys should never cause eviction
		for (let i = 0; i < 100; i++) {
			memoized(1)
			memoized(2)
		}
		expect(c.count()).toBe(2)
	})
})

describe("max validation", () => {
	test("throws RangeError for zero", () => {
		expect(() => memo(identity, numKey, { max: 0 })).toThrow(RangeError)
	})

	test("throws RangeError for negative", () => {
		expect(() => memo(identity, numKey, { max: -1 })).toThrow(RangeError)
	})

	test("throws RangeError for non-integer", () => {
		expect(() => memo(identity, numKey, { max: 1.5 })).toThrow(RangeError)
	})

	test("throws RangeError for Infinity", () => {
		expect(() => memo(identity, numKey, { max: Infinity })).toThrow(RangeError)
	})

	test("throws RangeError for NaN", () => {
		expect(() => memo(identity, numKey, { max: NaN })).toThrow(RangeError)
	})
})

describe("composition with @suckless/key", () => {
	test("works with stableKey as key function", () => {
		const c = counter((a: number, b: string) => `${a}-${b}`)
		const memoized = memo(c.fn, (...args) => stableKey(args))

		expect(memoized(1, "a")).toBe("1-a")
		expect(memoized(1, "a")).toBe("1-a")
		expect(c.count()).toBe(1)

		expect(memoized(2, "b")).toBe("2-b")
		expect(c.count()).toBe(2)
	})
})
