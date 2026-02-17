/* oxlint-disable unicorn/no-null -- Tests must pass null to stableKey since
   null is a valid input value that the serializer handles. */
import { describe, expect, test } from "bun:test"
import * as fc from "fast-check"
import { stableKey } from "./index.ts"

// ─── Unit tests ─────────────────────────────────────────────────────────────

describe("stableKey", () => {
	describe("primitives", () => {
		test("strings", () => {
			expect(stableKey("hello")).toBe('s"hello"')
			expect(stableKey("")).toBe('s""')
			expect(stableKey("null")).toBe('s"null"')
		})

		test("strings with special characters", () => {
			expect(stableKey('a"b')).toBe(String.raw`s"a\"b"`)
			expect(stableKey(String.raw`a\b`)).toBe(String.raw`s"a\\b"`)
			expect(stableKey("a\nb")).toBe(String.raw`s"a\nb"`)
			expect(stableKey("a\tb")).toBe(String.raw`s"a\tb"`)
		})

		test("numbers", () => {
			expect(stableKey(42)).toBe("n42")
			expect(stableKey(0)).toBe("n0")
			expect(stableKey(-1)).toBe("n-1")
			expect(stableKey(3.14)).toBe("n3.14")
		})

		test("booleans", () => {
			expect(stableKey(true)).toBe("T")
			expect(stableKey(false)).toBe("F")
		})

		test("null", () => {
			expect(stableKey(null)).toBe("N")
		})

		test("undefined", () => {
			expect(stableKey(undefined)).toBe("U")
		})

		test("bigint", () => {
			expect(stableKey(42n)).toBe("b42")
			expect(stableKey(0n)).toBe("b0")
			expect(stableKey(-1n)).toBe("b-1")
		})
	})

	describe("special numbers", () => {
		test("NaN", () => {
			expect(stableKey(NaN)).toBe("Z")
		})

		test("Infinity", () => {
			expect(stableKey(Infinity)).toBe("I")
		})

		test("-Infinity", () => {
			expect(stableKey(-Infinity)).toBe("J")
		})

		test("-0", () => {
			expect(stableKey(-0)).toBe("K")
		})

		test("all special numbers are distinct", () => {
			const keys = new Set([
				stableKey(NaN),
				stableKey(Infinity),
				stableKey(-Infinity),
				stableKey(-0),
				stableKey(0),
				stableKey(1),
			])
			expect(keys.size).toBe(6)
		})
	})

	describe("arrays", () => {
		test("empty array", () => {
			expect(stableKey([])).toBe("[]")
		})

		test("array with elements", () => {
			expect(stableKey([1, "a"])).toBe('[n1,s"a"]')
		})

		test("nested arrays", () => {
			expect(stableKey([[1], [2]])).toBe("[[n1],[n2]]")
		})
	})

	describe("objects", () => {
		test("empty object", () => {
			expect(stableKey({})).toBe("{}")
		})

		test("sorted keys", () => {
			expect(stableKey({ b: 2, a: 1 })).toBe('{"a":n1,"b":n2}')
		})

		test("nested objects", () => {
			expect(stableKey({ a: { b: 1 } })).toBe('{"a":{"b":n1}}')
		})

		test("null prototype objects", () => {
			const obj = Object.fromEntries([["a", 1]])
			Object.setPrototypeOf(obj, null)
			expect(stableKey(obj)).toBe('{"a":n1}')
		})

		test("keys with special characters", () => {
			expect(stableKey({ 'a"b': 1 })).toBe(String.raw`{"a\"b":n1}`)
			expect(stableKey({ "a:b": 1 })).toBe('{"a:b":n1}')
			expect(stableKey({ "a,b": 1 })).toBe('{"a,b":n1}')
		})
	})

	describe("determinism", () => {
		test("key order does not affect output", () => {
			expect(stableKey({ a: 1, b: 2 })).toBe(stableKey({ b: 2, a: 1 }))
		})

		test("identical structures produce same key", () => {
			const a = { users: [{ name: "alice", age: 30 }], page: 1 }
			const b = { page: 1, users: [{ name: "alice", age: 30 }] }
			expect(stableKey(a)).toBe(stableKey(b))
		})

		test("structuredClone produces same key", () => {
			const value = { a: [1, "two", true, null], b: { c: 3 } }
			expect(stableKey(value)).toBe(stableKey(structuredClone(value)))
		})
	})

	describe("type collisions", () => {
		test("string 'null' vs null", () => {
			expect(stableKey("null")).not.toBe(stableKey(null))
		})

		test("string 'undefined' vs undefined", () => {
			expect(stableKey("undefined")).not.toBe(stableKey(undefined))
		})

		test("string 'true' vs true", () => {
			expect(stableKey("true")).not.toBe(stableKey(true))
		})

		test("string '42' vs number 42", () => {
			expect(stableKey("42")).not.toBe(stableKey(42))
		})

		test("number 42 vs bigint 42n", () => {
			expect(stableKey(42)).not.toBe(stableKey(42n))
		})
	})

	describe("string injection resistance", () => {
		test("string containing format characters does not collide", () => {
			// A single-element array with an adversarial string must not
			// collide with a two-element array.
			expect(stableKey(['a",s"b'])).not.toBe(stableKey(["a", "b"]))
		})

		test("object key injection does not collide", () => {
			// An object with a key containing ":" must not collide with
			// an object with separate keys.
			expect(stableKey({ "a:n1,b": 2 })).not.toBe(stableKey({ a: 1, b: 2 }))
		})
	})

	describe("circular references", () => {
		test("circular object throws TypeError", () => {
			const obj: Record<string, unknown> = {}
			obj.self = obj
			expect(() => stableKey(obj)).toThrow(TypeError)
			expect(() => stableKey(obj)).toThrow("Circular reference detected")
		})

		test("circular array throws TypeError", () => {
			const arr: unknown[] = []
			arr.push(arr)
			expect(() => stableKey(arr)).toThrow(TypeError)
		})
	})

	describe("non-serializable types", () => {
		test("function throws TypeError", () => {
			expect(() => stableKey(() => {})).toThrow(TypeError)
		})

		test("symbol throws TypeError", () => {
			expect(() => stableKey(Symbol("x"))).toThrow(TypeError)
		})

		test("Date throws TypeError", () => {
			expect(() => stableKey(new Date())).toThrow(TypeError)
		})

		test("RegExp throws TypeError", () => {
			expect(() => stableKey(/abc/)).toThrow(TypeError)
		})

		test("Map throws TypeError", () => {
			expect(() => stableKey(new Map())).toThrow(TypeError)
		})

		test("Set throws TypeError", () => {
			expect(() => stableKey(new Set())).toThrow(TypeError)
		})

		test("nested non-serializable throws TypeError", () => {
			expect(() => stableKey({ a: new Date() })).toThrow(TypeError)
		})
	})
})

// ─── Property-based tests ───────────────────────────────────────────────────

// Arbitrary that generates values stableKey can serialize: primitives,
// plain objects, and arrays, nested to bounded depth.
const serializableArb: fc.Arbitrary<unknown> = fc.letrec((tie) => ({
	tree: fc.oneof(
		{ depthSize: "small" },
		tie("primitive"),
		tie("array"),
		tie("object"),
	),
	primitive: fc.oneof(
		fc.string(),
		fc.double({
			noDefaultInfinity: true,
			noNaN: true,
		}),
		fc.integer(),
		fc.boolean(),
		fc.constant(null),
		fc.constant(undefined),
		fc.bigInt(),
	),
	array: fc.array(tie("tree"), { maxLength: 5 }),
	object: fc.dictionary(fc.string(), tie("tree"), { maxKeys: 5 }),
})).tree

// Subset without bigint for structuredClone compatibility.
const cloneableArb: fc.Arbitrary<unknown> = fc.letrec((tie) => ({
	tree: fc.oneof(
		{ depthSize: "small" },
		tie("primitive"),
		tie("array"),
		tie("object"),
	),
	primitive: fc.oneof(
		fc.string(),
		fc.double({
			noDefaultInfinity: true,
			noNaN: true,
		}),
		fc.integer(),
		fc.boolean(),
		fc.constant(null),
		fc.constant(undefined),
	),
	array: fc.array(tie("tree"), { maxLength: 5 }),
	object: fc.dictionary(fc.string(), tie("tree"), { maxKeys: 5 }),
})).tree

describe("stableKey properties", () => {
	test("deterministic: same structure always produces same key", () => {
		fc.assert(
			fc.property(serializableArb, (value) => {
				const a = stableKey(value)
				const b = stableKey(value)
				return a === b
			}),
			{ numRuns: 1000 },
		)
	})

	test("deterministic: structuredClone produces same key", () => {
		fc.assert(
			fc.property(
				cloneableArb,
				(value) => stableKey(value) === stableKey(structuredClone(value)),
			),
			{ numRuns: 1000 },
		)
	})

	test("no collisions between distinct primitive types", () => {
		const pairs: [unknown, unknown][] = [
			["0", 0],
			["1", 1],
			["true", true],
			["false", false],
			["null", null],
			["undefined", undefined],
			[0, 0n],
			[1, 1n],
			[0, false],
			[1, true],
			["", false],
		]
		for (const [a, b] of pairs) {
			expect(stableKey(a)).not.toBe(stableKey(b))
		}
	})

	test("injective for strings: different strings produce different keys", () => {
		fc.assert(
			fc.property(fc.string(), fc.string(), (a, b) => {
				if (a === b) {
					return true
				}
				return stableKey(a) !== stableKey(b)
			}),
			{ numRuns: 1000 },
		)
	})

	test("injective for numbers: different numbers produce different keys", () => {
		fc.assert(
			fc.property(
				fc.double({ noNaN: true }),
				fc.double({ noNaN: true }),
				(a, b) => {
					if (Object.is(a, b)) {
						return true
					}
					return stableKey(a) !== stableKey(b)
				},
			),
			{ numRuns: 1000 },
		)
	})

	test("injective for flat arrays: different arrays produce different keys", () => {
		fc.assert(
			fc.property(
				fc.array(fc.integer(), { maxLength: 8 }),
				fc.array(fc.integer(), { maxLength: 8 }),
				(a, b) => {
					if (a.length === b.length && a.every((v, i) => v === b[i])) {
						return true
					}
					return stableKey(a) !== stableKey(b)
				},
			),
			{ numRuns: 1000 },
		)
	})

	test("object key order does not matter", () => {
		fc.assert(
			fc.property(
				fc.dictionary(fc.string(), fc.integer(), { maxKeys: 6 }),
				(obj) => {
					const keys = Object.keys(obj)
					const reversed = Object.fromEntries(
						keys.toReversed().map((k) => [k, obj[k]]),
					)
					return stableKey(obj) === stableKey(reversed)
				},
			),
			{ numRuns: 1000 },
		)
	})

	test("string values in arrays resist injection", () => {
		fc.assert(
			fc.property(
				fc.string(),
				fc.string(),
				fc.string(),
				(s, a, b) => stableKey([s]) !== stableKey([a, b]),
			),
			{ numRuns: 1000 },
		)
	})
})
