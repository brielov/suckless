/**
 * Memoization with explicit key functions and optional LRU eviction.
 * Uses Map insertion-order semantics for O(1) LRU without extra data
 * structures.
 */

export function memo<A extends unknown[], R>(
	fn: (...args: A) => R,
	key: (...args: A) => string,
	options?: { max?: number },
): (...args: A) => R {
	const max = options?.max
	if (max !== undefined && (!Number.isInteger(max) || max < 1)) {
		throw new RangeError(`max must be a positive integer, got ${String(max)}`)
	}

	// Wrap values in a tuple to distinguish "cached undefined" from
	// "not in cache" without type assertions.
	const cache = new Map<string, [R]>()

	return (...args: A): R => {
		const k = key(...args)
		const entry = cache.get(k)
		if (entry !== undefined) {
			cache.delete(k)
			cache.set(k, entry)
			return entry[0]
		}
		const v = fn(...args)
		if (max !== undefined && cache.size >= max) {
			const oldest = cache.keys().next()
			if (oldest.done !== true) {
				cache.delete(oldest.value)
			}
		}
		cache.set(k, [v])
		return v
	}
}
