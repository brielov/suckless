# @suckless/cache

Minimal, type-safe cache with pluggable adapters. Ships with an in-memory adapter. ~120 lines, zero dependencies.

## Install

```sh
npm install @suckless/cache
```

## Usage

```ts
import { createCache } from "@suckless/cache"

const cache = createCache<string, number>()

await cache.set("counter", 1)
await cache.get("counter") // 1
await cache.delete("counter")
await cache.get("counter") // undefined
```

### TTL

Pass a TTL in milliseconds per entry or as a default for the entire cache:

```ts
// Per-entry TTL
await cache.set("key", "value", 5000) // expires in 5s

// Default TTL for all entries
const cache = createCache<string, string>(undefined, 5000)
await cache.set("key", "value") // uses default 5s TTL
await cache.set("key", "value", 1000) // overrides with 1s TTL
```

### Fetch

`fetch` combines a cache lookup with a fallback. On a miss, it calls the fetcher, caches the result, and returns it. Concurrent calls for the same key are deduplicated — the fetcher runs once and all callers receive the same result.

```ts
const user = await cache.fetch(
	"user:42",
	async () => {
		const res = await fetch("https://api.example.com/users/42")
		return res.json()
	},
	60_000,
)
```

### Teardown

Both the cache and adapters implement `AsyncDisposable`. Use `await using` for automatic cleanup, or call `[Symbol.asyncDispose]()` directly:

```ts
{
	await using cache = createCache<string, string>()
	await cache.set("key", "value")
	// cache is disposed when scope exits
}

// or manually
const cache = createCache<string, string>()
// ...
await cache[Symbol.asyncDispose]()
```

For the built-in memory adapter, dispose clears the store and stops the background sweep timer. For custom adapters, dispose is where you close connections or release resources.

## Custom Adapters

An adapter is any object that implements `CacheAdapter`:

```ts
import type { CacheAdapter } from "@suckless/cache"

interface CacheAdapter<K extends string, V> extends AsyncDisposable {
	get(key: K): Promise<V | undefined>
	set(key: K, value: V, ttl?: number): Promise<void>
	delete(key: K): Promise<void>
}
```

The adapter is responsible for TTL enforcement. If your backend handles expiration natively (Redis, Postgres), pass the `ttl` through. If not, implement it yourself.

### Redis adapter example (Bun)

```ts
import { createClient } from "bun"
import { createCache, type CacheAdapter } from "@suckless/cache"

function redisAdapter<K extends string, V>(url: string): CacheAdapter<K, V> {
	const client = createClient(url)

	return {
		async get(key) {
			const raw = await client.get(key)
			if (raw === null) return undefined
			return JSON.parse(raw) as V
		},

		async set(key, value, ttl) {
			const serialized = JSON.stringify(value)
			if (ttl !== undefined) {
				await client.set(key, serialized, { PX: ttl })
			} else {
				await client.set(key, serialized)
			}
		},

		async delete(key) {
			await client.del(key)
		},

		async [Symbol.asyncDispose]() {
			await client.close()
		},
	}
}

const cache = createCache(redisAdapter("redis://localhost:6379"))
```

### Postgres adapter example (Bun)

```ts
import { SQL } from "bun"
import { createCache, type CacheAdapter } from "@suckless/cache"

function postgresAdapter<K extends string, V>(url: string): CacheAdapter<K, V> {
	const sql = new SQL(url)

	return {
		async get(key) {
			const [row] = await sql`
        SELECT value FROM cache
        WHERE key = ${key}
        AND (expires_at IS NULL OR expires_at > NOW())
      `
			if (row === undefined) return undefined
			return row.value as V
		},

		async set(key, value, ttl) {
			const expiresAt = ttl !== undefined ? new Date(Date.now() + ttl) : null

			await sql`
        INSERT INTO cache (key, value, expires_at)
        VALUES (${key}, ${JSON.stringify(value)}, ${expiresAt})
        ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at
      `
		},

		async delete(key) {
			await sql`DELETE FROM cache WHERE key = ${key}`
		},

		async [Symbol.asyncDispose]() {
			await sql.close()
		},
	}
}

const cache = createCache(postgresAdapter("postgres://localhost:5432/mydb"))
```

## API

### `createCache<K, V>(adapter?, defaultTtl?)`

Creates a cache instance.

- `adapter` — a `CacheAdapter<K, V>`. Defaults to `memoryAdapter()`.
- `defaultTtl` — default TTL in milliseconds. Applied when `set` or `fetch` is called without an explicit TTL.

Returns a `Cache<K, V>`.

### `memoryAdapter<K, V>(sweepIntervalMs?)`

Creates an in-memory `CacheAdapter`.

- `sweepIntervalMs` — interval for background expiry cleanup. Defaults to 30,000 (30s).

### `Cache<K, V>`

- `get(key)` — returns the cached value or `undefined`
- `set(key, value, ttl?)` — stores a value with optional TTL in ms
- `delete(key)` — removes a value
- `fetch(key, fetcher, ttl?)` — get-or-set with deduplication
- `[Symbol.asyncDispose]()` — teardown

## License

MIT
