/**
 * Deterministic serialization of complex values into stable string keys.
 * Enables composable caching, deduplication, and memoization patterns.
 */

function serializeObject(value: object, seen: Set<object>): string {
	if (seen.has(value)) {
		throw new TypeError("Circular reference detected")
	}
	seen.add(value)
	if (Array.isArray(value)) {
		const items = value.map((v) => serialize(v, seen)).join(",")
		seen.delete(value)
		return `[${items}]`
	}
	const proto = Object.getPrototypeOf(value) as unknown
	if (proto !== Object.prototype && proto !== null) {
		throw new TypeError(`Non-serializable type: ${value.constructor.name}`)
	}
	const keys = Object.keys(value).toSorted()
	const entries = keys
		.map((k) => {
			const v = Object.getOwnPropertyDescriptor(value, k)?.value as unknown
			return `${JSON.stringify(k)}:${serialize(v, seen)}`
		})
		.join(",")
	seen.delete(value)
	return `{${entries}}`
}

function serialize(value: unknown, seen: Set<object>): string {
	switch (typeof value) {
		case "string": {
			return `s${JSON.stringify(value)}`
		}
		case "number": {
			if (Number.isNaN(value)) {
				return "Z"
			}
			if (value === Infinity) {
				return "I"
			}
			if (value === -Infinity) {
				return "J"
			}
			if (Object.is(value, -0)) {
				return "K"
			}
			return `n${value}`
		}
		case "boolean": {
			return value ? "T" : "F"
		}
		case "bigint": {
			return `b${value}`
		}
		case "undefined": {
			return "U"
		}
		case "object": {
			if (value === null) {
				return "N"
			}
			return serializeObject(value, seen)
		}
		case "symbol":
		case "function": {
			throw new TypeError(`Non-serializable type: ${typeof value}`)
		}
	}
}

export function stableKey(value: unknown): string {
	return serialize(value, new Set())
}
