/** Excludes `undefined` from value types so `get()` can use `undefined` as the miss sentinel. */
type NonUndefined = {} | null // oxlint-disable-line typescript-eslint/ban-types

export interface CacheAdapter<
	K extends string,
	V extends NonUndefined,
> extends AsyncDisposable {
	get(key: K): Promise<V | undefined>
	set(key: K, value: V, ttl?: number): Promise<void>
	delete(key: K): Promise<void>
}

export interface Cache<
	K extends string,
	V extends NonUndefined,
> extends AsyncDisposable {
	get(key: K): Promise<V | undefined>
	set(key: K, value: V, ttl?: number): Promise<void>
	delete(key: K): Promise<void>
	fetch(key: K, fetcher: () => Promise<V>, ttl?: number): Promise<V>
}

interface Entry<V> {
	value: V
	expiresAt: number | undefined
}

export function memoryAdapter<K extends string, V extends NonUndefined>(
	sweepIntervalMs = 30_000,
): CacheAdapter<K, V> {
	const store = new Map<K, Entry<V>>()

	const sweep = () => {
		const now = Date.now()
		for (const [key, entry] of store) {
			if (entry.expiresAt !== undefined && entry.expiresAt <= now) {
				store.delete(key)
			}
		}
	}

	const timer = setInterval(sweep, sweepIntervalMs)
	if (typeof timer === "object" && "unref" in timer) {
		timer.unref()
	}

	return {
		get(key) {
			const entry = store.get(key)
			if (entry === undefined) {
				return Promise.resolve(undefined)
			}

			if (entry.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
				store.delete(key)
				return Promise.resolve(undefined)
			}

			return Promise.resolve(entry.value)
		},

		set(key, value, ttl) {
			store.set(key, {
				value,
				expiresAt: ttl !== undefined ? Date.now() + ttl : undefined,
			})
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

export function createCache<K extends string, V extends NonUndefined>(
	adapter: CacheAdapter<K, V>,
	defaultTtl?: number,
): Cache<K, V> {
	const store = adapter
	const inFlight = new Map<K, Promise<V>>()

	return {
		get(key) {
			return store.get(key)
		},

		set(key, value, ttl) {
			return store.set(key, value, ttl ?? defaultTtl)
		},

		delete(key) {
			return store.delete(key)
		},

		async fetch(key, fetcher, ttl) {
			const cached = await store.get(key)
			if (cached !== undefined) {
				return cached
			}

			const ongoing = inFlight.get(key)
			if (ongoing !== undefined) {
				return ongoing
			}

			const promise = fetcher().then(async (value) => {
				await store.set(key, value, ttl ?? defaultTtl)
				return value
			})

			inFlight.set(key, promise)

			try {
				return await promise
			} finally {
				inFlight.delete(key)
			}
		},

		[Symbol.asyncDispose]() {
			return store[Symbol.asyncDispose]()
		},
	}
}
