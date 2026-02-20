import { describe, expect, test } from "bun:test"
import { createCache, type CacheAdapter, memoryAdapter } from "./index"

// ─── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
	return new Promise<void>((resolve) => {
		setTimeout(resolve, ms)
	})
}

/** Creates a cache adapter that records calls for assertion. */
// oxlint-disable-next-line typescript-eslint/ban-types
function spyAdapter<K extends string, V extends {} | null>(): CacheAdapter<
	K,
	V
> & {
	calls: { method: string; args: unknown[] }[]
	store: Map<K, V>
} {
	const store = new Map<K, V>()
	const calls: { method: string; args: unknown[] }[] = []

	return {
		store,
		calls,
		get(key) {
			calls.push({ method: "get", args: [key] })
			const value = store.get(key)
			if (!store.has(key)) {
				return Promise.resolve(undefined)
			}
			return Promise.resolve(value)
		},
		set(key, value, ttl) {
			calls.push({ method: "set", args: [key, value, ttl] })
			store.set(key, value)
			return Promise.resolve()
		},
		delete(key) {
			calls.push({ method: "delete", args: [key] })
			store.delete(key)
			return Promise.resolve()
		},
		[Symbol.asyncDispose]() {
			calls.push({ method: "dispose", args: [] })
			store.clear()
			return Promise.resolve()
		},
	}
}

// ─── memoryAdapter (standalone) ─────────────────────────────────────────────

describe("memoryAdapter", () => {
	test("get returns undefined for missing key", async () => {
		await using adapter = memoryAdapter<string, number>()
		expect(await adapter.get("missing")).toBeUndefined()
	})

	test("set then get returns the value", async () => {
		await using adapter = memoryAdapter<string, string>()
		await adapter.set("key", "value")
		expect(await adapter.get("key")).toBe("value")
	})

	test("delete removes the value", async () => {
		await using adapter = memoryAdapter<string, string>()
		await adapter.set("key", "value")
		await adapter.delete("key")
		expect(await adapter.get("key")).toBeUndefined()
	})

	test("expires entries after TTL", async () => {
		await using adapter = memoryAdapter<string, string>()
		await adapter.set("key", "value", 50)
		expect(await adapter.get("key")).toBe("value")
		await sleep(60)
		expect(await adapter.get("key")).toBeUndefined()
	})

	test("sweep cleans up expired entries", async () => {
		await using adapter = memoryAdapter<string, string>(10)
		await adapter.set("key", "value", 20)
		await sleep(50)
		expect(await adapter.get("key")).toBeUndefined()
	})
})

// ─── createCache with memory adapter ────────────────────────────────────────

describe("createCache with memory adapter", () => {
	test("get returns undefined for missing key", async () => {
		await using cache = createCache(memoryAdapter<string, number>())
		expect(await cache.get("missing")).toBeUndefined()
	})

	test("set then get returns the value", async () => {
		await using cache = createCache(memoryAdapter<string, string>())
		await cache.set("key", "value")
		expect(await cache.get("key")).toBe("value")
	})

	test("delete removes the value", async () => {
		await using cache = createCache(memoryAdapter<string, string>())
		await cache.set("key", "value")
		await cache.delete("key")
		expect(await cache.get("key")).toBeUndefined()
	})

	test("delete on missing key does not throw", async () => {
		await using cache = createCache(memoryAdapter<string, string>())
		await cache.delete("missing")
	})

	test("set overwrites existing value", async () => {
		await using cache = createCache(memoryAdapter<string, number>())
		await cache.set("key", 1)
		await cache.set("key", 2)
		expect(await cache.get("key")).toBe(2)
	})

	test("stores different keys independently", async () => {
		await using cache = createCache(memoryAdapter<string, number>())
		await cache.set("a", 1)
		await cache.set("b", 2)
		expect(await cache.get("a")).toBe(1)
		expect(await cache.get("b")).toBe(2)
	})

	test("stores complex values", async () => {
		await using cache =
			createCache(memoryAdapter<string, { name: string; age: number }>())
		const obj = { name: "Alice", age: 30 }
		await cache.set("user", obj)
		expect(await cache.get("user")).toEqual(obj)
	})
})

// ─── TTL ────────────────────────────────────────────────────────────────────

describe("TTL expiration", () => {
	test("entry expires after ttl", async () => {
		await using cache = createCache(memoryAdapter<string, string>())
		await cache.set("key", "value", 50)
		expect(await cache.get("key")).toBe("value")
		await sleep(60)
		expect(await cache.get("key")).toBeUndefined()
	})

	test("entry without ttl does not expire", async () => {
		await using cache = createCache(memoryAdapter<string, string>())
		await cache.set("key", "value")
		await sleep(60)
		expect(await cache.get("key")).toBe("value")
	})

	test("defaultTtl applies when no per-key ttl is given", async () => {
		await using cache = createCache(memoryAdapter<string, string>(), 50)
		await cache.set("key", "value")
		expect(await cache.get("key")).toBe("value")
		await sleep(60)
		expect(await cache.get("key")).toBeUndefined()
	})

	test("per-key ttl overrides defaultTtl", async () => {
		await using cache = createCache(memoryAdapter<string, string>(), 200)
		await cache.set("key", "value", 50)
		await sleep(60)
		expect(await cache.get("key")).toBeUndefined()
	})
})

// ─── fetch ──────────────────────────────────────────────────────────────────

describe("fetch", () => {
	test("calls fetcher on cache miss and caches result", async () => {
		await using cache = createCache(memoryAdapter<string, number>())
		let calls = 0
		const result = await cache.fetch("key", () => {
			calls++
			return Promise.resolve(42)
		})
		expect(result).toBe(42)
		expect(calls).toBe(1)
		expect(await cache.get("key")).toBe(42)
	})

	test("returns cached value without calling fetcher", async () => {
		await using cache = createCache(memoryAdapter<string, number>())
		await cache.set("key", 42)
		let calls = 0
		const result = await cache.fetch("key", () => {
			calls++
			return Promise.resolve(99)
		})
		expect(result).toBe(42)
		expect(calls).toBe(0)
	})

	test("deduplicates concurrent fetches for the same key", async () => {
		await using cache = createCache(memoryAdapter<string, number>())
		let calls = 0

		const fetcher = async () => {
			calls++
			await sleep(50)
			return 42
		}

		const [a, b, c] = await Promise.all([
			cache.fetch("key", fetcher),
			cache.fetch("key", fetcher),
			cache.fetch("key", fetcher),
		])

		expect(a).toBe(42)
		expect(b).toBe(42)
		expect(c).toBe(42)
		expect(calls).toBe(1)
	})

	test("does not deduplicate fetches for different keys", async () => {
		await using cache = createCache(memoryAdapter<string, number>())
		let calls = 0

		const fetcher = async () => {
			calls++
			await sleep(10)
			return calls
		}

		await Promise.all([cache.fetch("a", fetcher), cache.fetch("b", fetcher)])

		expect(calls).toBe(2)
	})

	test("applies ttl to fetched value", async () => {
		await using cache = createCache(memoryAdapter<string, string>())
		await cache.fetch("key", () => Promise.resolve("value"), 50)
		expect(await cache.get("key")).toBe("value")
		await sleep(60)
		expect(await cache.get("key")).toBeUndefined()
	})

	test("applies defaultTtl to fetched value", async () => {
		await using cache = createCache(memoryAdapter<string, string>(), 50)
		await cache.fetch("key", () => Promise.resolve("value"))
		expect(await cache.get("key")).toBe("value")
		await sleep(60)
		expect(await cache.get("key")).toBeUndefined()
	})

	test("cleans up in-flight entry after fetcher rejects", async () => {
		await using cache = createCache(memoryAdapter<string, number>())

		const fetchPromise = cache.fetch("key", () =>
			Promise.reject(new Error("fail")),
		)
		expect(fetchPromise).rejects.toThrow("fail")
		await fetchPromise.catch(() => {})

		expect(await cache.get("key")).toBeUndefined()

		const result = await cache.fetch("key", () => Promise.resolve(42))
		expect(result).toBe(42)
	})

	test("concurrent callers all reject when fetcher fails", async () => {
		await using cache = createCache(memoryAdapter<string, number>())

		const fetcher = async () => {
			await sleep(20)
			throw new Error("fail")
		}

		const results = await Promise.allSettled([
			cache.fetch("key", fetcher),
			cache.fetch("key", fetcher),
		])

		expect(results[0]?.status).toBe("rejected")
		expect(results[1]?.status).toBe("rejected")
	})
})

// ─── Custom adapter ─────────────────────────────────────────────────────────

describe("custom adapter", () => {
	test("delegates get to adapter", async () => {
		const adapter = spyAdapter<string, number>()
		const cache = createCache(adapter)

		await cache.get("key")
		expect(adapter.calls).toEqual([{ method: "get", args: ["key"] }])
	})

	test("delegates set to adapter", async () => {
		const adapter = spyAdapter<string, number>()
		const cache = createCache(adapter)

		await cache.set("key", 42)
		expect(adapter.calls).toEqual([
			{ method: "set", args: ["key", 42, undefined] },
		])
	})

	test("delegates set with defaultTtl to adapter", async () => {
		const adapter = spyAdapter<string, number>()
		const cache = createCache(adapter, 5000)

		await cache.set("key", 42)
		expect(adapter.calls).toEqual([{ method: "set", args: ["key", 42, 5000] }])
	})

	test("delegates set with explicit ttl over defaultTtl", async () => {
		const adapter = spyAdapter<string, number>()
		const cache = createCache(adapter, 5000)

		await cache.set("key", 42, 1000)
		expect(adapter.calls).toEqual([{ method: "set", args: ["key", 42, 1000] }])
	})

	test("delegates delete to adapter", async () => {
		const adapter = spyAdapter<string, number>()
		const cache = createCache(adapter)

		await cache.delete("key")
		expect(adapter.calls).toEqual([{ method: "delete", args: ["key"] }])
	})

	test("fetch uses adapter for get and set", async () => {
		const adapter = spyAdapter<string, number>()
		const cache = createCache(adapter)

		const result = await cache.fetch("key", () => Promise.resolve(42), 1000)
		expect(result).toBe(42)
		expect(adapter.calls).toEqual([
			{ method: "get", args: ["key"] },
			{ method: "set", args: ["key", 42, 1000] },
		])
	})

	test("fetch skips fetcher when adapter has value", async () => {
		const adapter = spyAdapter<string, number>()
		adapter.store.set("key", 42)
		const cache = createCache(adapter)

		let called = false
		const result = await cache.fetch("key", () => {
			called = true
			return Promise.resolve(99)
		})

		expect(result).toBe(42)
		expect(called).toBeFalse()
	})

	test("dispose delegates to adapter", async () => {
		const adapter = spyAdapter<string, number>()
		const cache = createCache(adapter)

		await cache[Symbol.asyncDispose]()
		expect(adapter.calls).toEqual([{ method: "dispose", args: [] }])
	})
})

// ─── Dispose ────────────────────────────────────────────────────────────────

describe("dispose", () => {
	test("memory adapter clears store on dispose", async () => {
		await using cache = createCache(memoryAdapter<string, number>())
		await cache.set("a", 1)
		await cache.set("b", 2)

		await cache[Symbol.asyncDispose]()

		expect(await cache.get("a")).toBeUndefined()
		expect(await cache.get("b")).toBeUndefined()
	})

	test("memory adapter stops sweep timer on dispose", async () => {
		await using cache = createCache(memoryAdapter<string, string>())
		await cache.set("key", "value", 50)

		await cache[Symbol.asyncDispose]()
	})
})
