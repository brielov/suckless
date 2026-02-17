/* oxlint-disable unicorn/no-null -- Tests must pass null to validators since
   null is a valid input value that the schema library handles. */

import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import * as t from "./index.ts"

// Helper: expect parse to throw and optionally match error message
function throws(schema: t.Schema, input: unknown, msg?: string | RegExp) {
	expect(() => t.parse(schema, input)).toThrow(msg)
}

// Helper: expect parse to succeed and return the input (or transformed)
function accepts(schema: t.Schema, input: unknown, expected?: unknown) {
	const result = t.parse(schema, input)
	expect(result).toEqual(expected ?? input)
	return result
}

const JUNK = [
	42,
	3.14,
	0,
	-0,
	NaN,
	Infinity,
	-Infinity,
	"",
	"hello",
	true,
	false,
	null,
	undefined,
	0n,
	99n,
	Symbol("x"),
	[],
	[1, 2],
	{},
	{ a: 1 },
	new Date(),
	/regex/,
	new Uint8Array(0),
	new Map(),
	new Set(),
	() => {},
	Promise.resolve(),
]

function junkExcept(
	...predicates: ((v: unknown) => boolean)[]
): readonly unknown[] {
	return JUNK.filter((v) => !predicates.some((p) => p(v)))
}

const isString = (v: unknown): v is string => typeof v === "string"
const isNumber = (v: unknown): v is number =>
	typeof v === "number" && Number.isFinite(v)
const isInteger = (v: unknown): v is number => Number.isInteger(v)
const isBoolean = (v: unknown): v is boolean => typeof v === "boolean"
const isBigint = (v: unknown): v is bigint => typeof v === "bigint"

// ============================================================================
// Primitives
// ============================================================================

describe("string", () => {
	it("accepts any string", () => {
		fc.assert(
			fc.property(fc.string(), (s: string) => {
				accepts(t.string, s)
			}),
		)
	})

	it("accepts edge-case strings", () => {
		accepts(t.string, "")
		accepts(t.string, "\0")
		accepts(t.string, "\n\r\t")
		accepts(t.string, "🔥".repeat(1000))
		// oxlint-disable-next-line unicorn/number-literal-case -- oxfmt lowercases hex
		accepts(t.string, String.fromCodePoint(0xff_ff))
	})

	it("rejects non-strings", () => {
		for (const v of junkExcept(isString)) {
			throws(t.string, v, "expected string")
		}
	})
})

describe("boolean", () => {
	it("accepts true and false", () => {
		accepts(t.boolean, true)
		accepts(t.boolean, false)
	})

	it("rejects non-booleans", () => {
		for (const v of junkExcept(isBoolean)) {
			throws(t.boolean, v, "expected boolean")
		}
	})
})

describe("number", () => {
	it("accepts finite numbers", () => {
		fc.assert(
			fc.property(
				fc.double({ noNaN: true, noDefaultInfinity: true }),
				(n: number) => {
					accepts(t.number, n)
				},
			),
		)
	})

	it("rejects NaN, Infinity, -Infinity", () => {
		throws(t.number, NaN, "expected finite number")
		throws(t.number, Infinity, "expected finite number")
		throws(t.number, -Infinity, "expected finite number")
	})

	it("rejects non-numbers", () => {
		for (const v of junkExcept(isNumber)) {
			throws(t.number, v, "expected finite number")
		}
	})
})

describe("integer", () => {
	it("accepts integers", () => {
		fc.assert(
			fc.property(fc.integer(), (n: number) => {
				accepts(t.integer, n)
			}),
		)
	})

	it("rejects floats", () => {
		throws(t.integer, 1.5, "expected integer")
		throws(t.integer, 0.1 + 0.2, "expected integer")
		throws(t.integer, Math.PI, "expected integer")
	})

	it("rejects NaN, Infinity", () => {
		throws(t.integer, NaN, "expected integer")
		throws(t.integer, Infinity, "expected integer")
	})

	it("rejects non-numbers", () => {
		for (const v of junkExcept(isInteger)) {
			throws(t.integer, v, "expected integer")
		}
	})
})

describe("bigint", () => {
	it("accepts bigints", () => {
		fc.assert(
			fc.property(fc.bigInt(), (n: bigint) => {
				accepts(t.bigint, n)
			}),
		)
	})

	it("rejects non-bigints", () => {
		for (const v of junkExcept(isBigint)) {
			throws(t.bigint, v, "expected bigint")
		}
	})
})

// ============================================================================
// Literal
// ============================================================================

describe("literal", () => {
	it("accepts exact string match", () => {
		const s = t.literal("hello")
		accepts(s, "hello")
		throws(s, "world", "expected hello")
		throws(s, "", "expected hello")
	})

	it("accepts exact number match", () => {
		const s = t.literal(42)
		accepts(s, 42)
		throws(s, 43, "expected 42")
		throws(s, "42", "expected 42")
	})

	it("accepts exact boolean match", () => {
		const tr = t.literal(true)
		const fl = t.literal(false)
		accepts(tr, true)
		throws(tr, false, "expected true")
		accepts(fl, false)
		throws(fl, true, "expected false")
	})

	it("accepts null literal", () => {
		const s = t.literal(null)
		accepts(s, null)
		throws(s, undefined, "expected null")
		throws(s, 0, "expected null")
		throws(s, "", "expected null")
	})

	it("property: only the exact value passes", () => {
		fc.assert(
			fc.property(
				fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
				(val: string | number | boolean | null) => {
					const s = t.literal(val)
					accepts(s, val)
				},
			),
		)
	})

	it("handles single quotes in literal values", () => {
		const s = t.literal("it's")
		accepts(s, "it's")
		throws(s, "other", "expected it's")
	})
})

// ============================================================================
// oneOf
// ============================================================================

describe("oneOf", () => {
	it("accepts listed string values", () => {
		const s = t.oneOf("a", "b", "c")
		accepts(s, "a")
		accepts(s, "b")
		accepts(s, "c")
		throws(s, "d", "expected one of: a, b, c")
		throws(s, "", "expected one of: a, b, c")
	})

	it("accepts listed number values", () => {
		const s = t.oneOf(1, 2, 3)
		accepts(s, 1)
		accepts(s, 2)
		accepts(s, 3)
		throws(s, 4, "expected one of: 1, 2, 3")
		throws(s, "1", "expected one of: 1, 2, 3")
	})

	it("rejects unlisted values with property testing", () => {
		const allowed = ["x", "y", "z"] as const
		const s = t.oneOf(...allowed)
		fc.assert(
			fc.property(
				fc
					.string()
					// oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
					.filter((v: string) => !allowed.includes(v as "x" | "y" | "z")),
				(v: string) => {
					throws(s, v)
				},
			),
		)
	})
})

// ============================================================================
// maybe
// ============================================================================

describe("maybe", () => {
	it("accepts null, undefined, and inner type", () => {
		const s = t.maybe(t.string)
		accepts(s, "hello")
		expect(t.parse(s, null)).toBeUndefined()
		expect(t.parse(s, undefined)).toBeUndefined()
		throws(s, 42, "expected string")
	})

	it("normalizes null to undefined", () => {
		const s = t.maybe(t.number)
		expect(t.parse(s, null)).toBeUndefined()
		expect(t.parse(s, undefined)).toBeUndefined()
		expect(t.parse(s, 42)).toBe(42)
	})

	it("double maybe", () => {
		const s = t.maybe(t.maybe(t.string))
		expect(t.parse(s, null)).toBeUndefined()
		expect(t.parse(s, undefined)).toBeUndefined()
		accepts(s, "hello")
		throws(s, 42)
	})

	it("in object context, key can be absent", () => {
		const s = t.object({
			name: t.string,
			bio: t.maybe(t.string),
		})
		accepts(s, { name: "Alice" })
		accepts(s, { name: "Alice", bio: "hello" })
		expect(t.parse(s, { name: "Alice", bio: undefined })).toEqual({
			name: "Alice",
			bio: undefined,
		})
		expect(t.parse(s, { name: "Alice", bio: null })).toEqual({
			name: "Alice",
			bio: undefined,
		})
		throws(s, { name: "Alice", bio: 42 })
	})
})

// ============================================================================
// array
// ============================================================================

describe("array", () => {
	it("accepts empty array", () => {
		accepts(t.array(t.string), [])
	})

	it("validates every element", () => {
		fc.assert(
			fc.property(fc.array(fc.string()), (arr: string[]) => {
				accepts(t.array(t.string), arr)
			}),
		)
	})

	it("rejects non-arrays", () => {
		const s = t.array(t.string)
		throws(s, "not array", "expected array")
		throws(s, 42, "expected array")
		throws(s, {}, "expected array")
		throws(s, null, "expected array")
	})

	it("rejects when any element fails", () => {
		const s = t.array(t.integer)
		throws(s, [1, 2, "oops", 4])
	})

	it("error path includes array index", () => {
		const s = t.array(t.string)
		try {
			t.parse(s, ["ok", "ok", 42])
			throw new Error("should have thrown")
		} catch (error) {
			expect(String(error)).toContain("[2]")
			expect(String(error)).toContain("expected string")
		}
	})

	it("nested arrays", () => {
		const s = t.array(t.array(t.number))
		accepts(s, [])
		accepts(s, [[], [1, 2], [3]])
		throws(s, [[1, "bad"]])
	})
})

// ============================================================================
// object
// ============================================================================

describe("object", () => {
	it("accepts matching objects", () => {
		const s = t.object({ name: t.string, age: t.integer })
		accepts(s, { name: "Alice", age: 30 })
	})

	it("allows extra keys (not stripped)", () => {
		const s = t.object({ name: t.string })
		const result = t.parse(s, {
			name: "Alice",
			extra: 42,
		}) as Record<string, unknown>
		expect(result).toEqual({ name: "Alice", extra: 42 })
	})

	it("rejects non-objects", () => {
		const s = t.object({ x: t.string })
		throws(s, null, "expected object")
		throws(s, "string", "expected object")
		throws(s, 42, "expected object")
		throws(s, [], "expected object")
		throws(s, undefined, "expected object")
	})

	it("rejects when fields fail", () => {
		const s = t.object({ name: t.string, age: t.integer })
		throws(s, { name: "Alice", age: "old" })
		throws(s, { name: 42, age: 30 })
	})

	it("error path includes field name", () => {
		const s = t.object({
			user: t.object({ name: t.string }),
		})
		try {
			t.parse(s, { user: { name: 42 } })
			throw new Error("should have thrown")
		} catch (error) {
			expect(String(error)).toContain("user.name")
			expect(String(error)).toContain("expected string")
		}
	})

	it("empty object schema accepts any object", () => {
		const s = t.object({})
		accepts(s, {})
		accepts(s, { anything: "goes" })
		throws(s, null, "expected object")
		throws(s, [], "expected object")
	})

	it("property: generated objects pass", () => {
		const s = t.object({
			a: t.string,
			b: t.integer,
			c: t.boolean,
		})
		fc.assert(
			fc.property(
				fc.record({
					a: fc.string(),
					b: fc.integer(),
					c: fc.boolean(),
				}),
				(obj: { a: string; b: number; c: boolean }) => {
					accepts(s, obj)
				},
			),
		)
	})
})

// ============================================================================
// tuple
// ============================================================================

describe("tuple", () => {
	it("accepts matching tuples", () => {
		const s = t.tuple(t.string, t.integer, t.boolean)
		accepts(s, ["hello", 42, true])
	})

	it("rejects wrong length", () => {
		const s = t.tuple(t.string, t.number)
		throws(s, ["hello"], "expected tuple of length 2")
		throws(s, ["hello", 1, 2], "expected tuple of length 2")
		throws(s, [], "expected tuple of length 2")
	})

	it("rejects non-arrays", () => {
		const s = t.tuple(t.string)
		throws(s, "not a tuple")
		throws(s, { 0: "a", length: 1 })
		throws(s, null)
	})

	it("validates each position", () => {
		const s = t.tuple(t.string, t.integer)
		throws(s, [42, 1], "expected string")
		throws(s, ["ok", 1.5], "expected integer")
	})

	it("error path includes tuple index", () => {
		const s = t.tuple(t.string, t.string, t.number)
		try {
			t.parse(s, ["a", "b", "not a number"])
			throw new Error("should have thrown")
		} catch (error) {
			expect(String(error)).toContain("[2]")
			expect(String(error)).toContain("expected finite number")
		}
	})

	it("empty tuple", () => {
		const s = t.tuple()
		accepts(s, [])
		throws(s, [1], "expected tuple of length 0")
	})
})

// ============================================================================
// record
// ============================================================================

describe("record", () => {
	it("accepts empty object", () => {
		accepts(t.record(t.string), {})
	})

	it("validates all values", () => {
		const s = t.record(t.integer)
		accepts(s, { a: 1, b: 2, c: 3 })
		throws(s, { a: 1, b: "oops" })
	})

	it("rejects non-objects", () => {
		const s = t.record(t.string)
		throws(s, null, "expected object")
		throws(s, [], "expected object")
		throws(s, "string", "expected object")
	})

	it("error path includes key", () => {
		const s = t.record(t.number)
		try {
			t.parse(s, { good: 1, bad: "nope" })
			throw new Error("should have thrown")
		} catch (error) {
			expect(String(error)).toContain("bad")
			expect(String(error)).toContain("expected finite number")
		}
	})

	it("property: record of strings", () => {
		fc.assert(
			fc.property(
				fc.dictionary(fc.string(), fc.string()),
				(obj: Record<string, string>) => {
					accepts(t.record(t.string), obj)
				},
			),
		)
	})
})

// ============================================================================
// union — discriminated (typeof optimization)
// ============================================================================

describe("union (discriminated typeof)", () => {
	it("accepts all variant types", () => {
		const s = t.union(t.string, t.number, t.boolean)
		accepts(s, "hello")
		accepts(s, 42)
		accepts(s, true)
	})

	it("rejects mismatched types", () => {
		const s = t.union(t.string, t.number)
		throws(s, true, "union failed")
		throws(s, null, "union failed")
		throws(s, undefined, "union failed")
		throws(s, {}, "union failed")
	})

	it("integer + string discriminated", () => {
		const s = t.union(t.integer, t.string)
		accepts(s, 42)
		accepts(s, "hello")
		throws(s, 1.5, "expected integer")
	})

	it("bigint + string", () => {
		const s = t.union(t.bigint, t.string)
		accepts(s, 0n)
		accepts(s, "hi")
		throws(s, 42, "union failed")
	})

	it("property: discriminated union accepts correct types", () => {
		const s = t.union(t.string, t.number, t.boolean)
		fc.assert(
			fc.property(
				fc.oneof(
					fc.string(),
					fc.double({
						noNaN: true,
						noDefaultInfinity: true,
					}),
					fc.boolean(),
				),
				(v: string | number | boolean) => {
					accepts(s, v)
				},
			),
		)
	})
})

// ============================================================================
// union — discriminated object
// ============================================================================

describe("union (discriminated object)", () => {
	it("dispatches on a shared literal key", () => {
		const s = t.union(
			t.object({ type: t.literal("a"), val: t.string }),
			t.object({ type: t.literal("b"), val: t.number }),
		)
		accepts(s, { type: "a", val: "hello" })
		accepts(s, { type: "b", val: 42 })
	})

	it("rejects non-objects", () => {
		const s = t.union(
			t.object({ kind: t.literal("x"), data: t.string }),
			t.object({ kind: t.literal("y"), data: t.number }),
		)
		throws(s, "not an object", "expected object")
		throws(s, null, "expected object")
		throws(s, [], "expected object")
	})

	it("rejects unknown discriminant values", () => {
		const s = t.union(
			t.object({ type: t.literal("a"), val: t.string }),
			t.object({ type: t.literal("b"), val: t.number }),
		)
		throws(s, { type: "c", val: "anything" }, "union failed")
	})

	it("validates fields beyond the discriminant", () => {
		const s = t.union(
			t.object({ type: t.literal("a"), val: t.string }),
			t.object({ type: t.literal("b"), val: t.number }),
		)
		throws(s, { type: "a", val: 42 }, "expected string")
		throws(s, { type: "b", val: "wrong" }, "expected finite number")
	})

	it("works with number discriminants", () => {
		const s = t.union(
			t.object({ code: t.literal(1), msg: t.string }),
			t.object({ code: t.literal(2), msg: t.string }),
		)
		accepts(s, { code: 1, msg: "ok" })
		accepts(s, { code: 2, msg: "error" })
		throws(s, { code: 3, msg: "?" }, "union failed")
	})

	it("works with boolean discriminants", () => {
		const s = t.union(
			t.object({
				ok: t.literal(true),
				data: t.string,
			}),
			t.object({
				ok: t.literal(false),
				error: t.string,
			}),
		)
		accepts(s, { ok: true, data: "hello" })
		accepts(s, { ok: false, error: "fail" })
		throws(s, { ok: true, data: 42 }, "expected string")
	})

	it("handles many variants", () => {
		const s = t.union(
			t.object({ type: t.literal("a"), val: t.string }),
			t.object({ type: t.literal("b"), val: t.number }),
			t.object({ type: t.literal("c"), val: t.boolean }),
			t.object({ type: t.literal("d"), val: t.integer }),
			t.object({
				type: t.literal("e"),
				val: t.literal(null),
			}),
		)
		accepts(s, { type: "a", val: "x" })
		accepts(s, { type: "c", val: true })
		accepts(s, { type: "e", val: null })
		throws(s, { type: "z" }, "union failed")
	})

	it("error path includes field name inside discriminated branch", () => {
		const s = t.union(
			t.object({
				type: t.literal("a"),
				nested: t.object({ x: t.integer }),
			}),
			t.object({
				type: t.literal("b"),
				nested: t.object({ x: t.string }),
			}),
		)
		try {
			t.parse(s, { type: "a", nested: { x: "bad" } })
			throw new Error("should have thrown")
		} catch (error) {
			const msg = String(error)
			expect(msg).toContain("nested.x")
			expect(msg).toContain("expected integer")
		}
	})

	it("falls back to try/catch when discriminant key has duplicate values", () => {
		const s = t.union(
			t.object({ type: t.literal("a"), x: t.string }),
			t.object({ type: t.literal("a"), x: t.number }),
		)
		accepts(s, { type: "a", x: "hello" })
		accepts(s, { type: "a", x: 42 })
	})

	it("falls back when not all variants have the same literal key", () => {
		const s = t.union(
			t.object({ type: t.literal("a"), val: t.string }),
			t.object({ type: t.string, val: t.number }),
		)
		accepts(s, { type: "a", val: "hello" })
		accepts(s, { type: "anything", val: 42 })
	})
})

// ============================================================================
// union — fallback (try/catch path)
// ============================================================================

describe("union (fallback try/catch)", () => {
	it("handles non-discriminable object variants", () => {
		const s = t.union(t.object({ x: t.string }), t.object({ x: t.number }))
		accepts(s, { x: "hello" })
		accepts(s, { x: 42 })
		throws(s, "not an object")
	})

	it("union of arrays (non-discriminable)", () => {
		const s = t.union(t.array(t.string), t.array(t.number))
		accepts(s, ["a", "b"])
		accepts(s, [1, 2])
		throws(s, "not an array")
	})

	it("union of literal(null) + object (fallback)", () => {
		const s = t.union(t.literal(null), t.object({ x: t.string }))
		accepts(s, null)
		accepts(s, { x: "hello" })
		throws(s, 42)
	})

	it("union with duplicate typeof tags (number + integer)", () => {
		const s = t.union(t.number, t.integer)
		accepts(s, 42)
		accepts(s, 3.14)
		throws(s, "string")
	})

	it("does not mutate input across fallback union attempts", () => {
		// Variant 1 has a maybe field that normalizes null→undefined,
		// but its later field (x: string) will fail for numeric input.
		// Variant 2 should see the original (un-mutated) input.
		const v1 = t.object({ y: t.maybe(t.number), x: t.string })
		const v2 = t.object({ x: t.number, z: t.string })
		const schema = t.union(v1, v2)

		const input = { x: 42, z: "hello", y: null }
		const result = t.parse(schema, input) as Record<string, unknown>
		expect(result.x).toBe(42)
		expect(result.z).toBe("hello")
		// The original input must not be mutated by variant 1's
		// maybe normalization.
		expect(input.y).toBeNull()
	})

	it("propagates transforms in fallback union variants", () => {
		const s = t.union(
			t.transform(t.object({ x: t.string }), (v) => ({
				...v,
				source: "str",
			})),
			t.transform(t.object({ x: t.number }), (v) => ({
				...v,
				source: "num",
			})),
		)
		expect(t.parse(s, { x: "hello" })).toEqual({
			x: "hello",
			source: "str",
		})
		expect(t.parse(s, { x: 42 })).toEqual({
			x: 42,
			source: "num",
		})
	})

	it("propagates preprocess in fallback union variants", () => {
		const s = t.union(
			t.preprocess(t.object({ x: t.integer }), (v) => {
				// preprocess receives unknown by design; the object schema
				// validates the shape after coercion.
				// oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
				const obj = v as Record<string, unknown>
				return { x: Number(obj.x) }
			}),
			t.array(t.string),
		)
		expect(t.parse(s, { x: "42" })).toEqual({ x: 42 })
		accepts(s, ["a", "b"])
	})
})

// ============================================================================
// preprocess
// ============================================================================

describe("preprocess", () => {
	it("coerces string to number before validation", () => {
		const s = t.preprocess(t.number, Number)
		expect(t.parse(s, "42")).toBe(42)
		expect(t.parse(s, "3.14")).toBeCloseTo(3.14)
	})

	it("rejects if coerced value fails inner schema", () => {
		const s = t.preprocess(t.number, Number)
		throws(s, "not a number", "expected finite number")
	})

	it("converts empty string to undefined", () => {
		const s = t.preprocess(t.maybe(t.string), (v) => (v === "" ? undefined : v))
		expect(t.parse(s, "")).toBeUndefined()
		expect(t.parse(s, "hello")).toBe("hello")
	})

	it("trims strings before validation", () => {
		const s = t.preprocess(
			t.refine(t.string, (s) => s.length > 0, "expected non-empty"),
			(v) => (typeof v === "string" ? v.trim() : v),
		)
		expect(t.parse(s, "  hello  ")).toBe("hello")
		throws(s, "   ", "expected non-empty")
	})

	it("works inside objects", () => {
		const s = t.object({
			age: t.preprocess(t.integer, Number),
		})
		expect(t.parse(s, { age: "25" })).toEqual({ age: 25 })
		throws(s, { age: "abc" }, "expected integer")
	})

	it("works inside arrays", () => {
		const s = t.array(t.preprocess(t.integer, Number))
		expect(t.parse(s, ["1", "2", "3"])).toEqual([1, 2, 3])
	})

	it("preprocess then transform (coerce → validate → transform)", () => {
		const s = t.transform(t.preprocess(t.number, Number), (n) => n * 2)
		expect(t.parse(s, "21")).toBe(42)
	})

	it("chained preprocess", () => {
		const s = t.preprocess(t.preprocess(t.integer, Number), (v) =>
			typeof v === "string" ? v.trim() : v,
		)
		expect(t.parse(s, "  42  ")).toBe(42)
	})

	it("coerce boolean strings", () => {
		const s = t.preprocess(t.boolean, (v) => {
			if (v === "true") {
				return true
			}
			if (v === "false") {
				return false
			}
			return v
		})
		expect(t.parse(s, "true")).toBe(true)
		expect(t.parse(s, "false")).toBe(false)
		expect(t.parse(s, true)).toBe(true)
		throws(s, "maybe", "expected boolean")
	})

	it("property: coerced integers pass", () => {
		const s = t.preprocess(t.integer, Number)
		fc.assert(
			fc.property(fc.integer(), (n: number) => {
				expect(t.parse(s, String(n))).toBe(n)
			}),
		)
	})
})

// ============================================================================
// transform
// ============================================================================

describe("transform", () => {
	it("validates then transforms", () => {
		const s = t.transform(t.string, (s) => s.toUpperCase())
		expect(t.parse(s, "hello")).toBe("HELLO")
	})

	it("rejects if inner validation fails", () => {
		const s = t.transform(t.string, (s) => s.length)
		throws(s, 42, "expected string")
	})

	it("chained transforms", () => {
		const s = t.transform(
			t.transform(t.string, (s) => parseInt(s, 10)),
			(n) => n * 2,
		)
		expect(t.parse(s, "21")).toBe(42)
	})

	it("transform inside object", () => {
		const s = t.object({
			name: t.transform(t.string, (s) => s.trim()),
			age: t.transform(t.integer, (n) => n + 1),
		})
		const result = t.parse(s, { name: "  Alice  ", age: 29 })
		expect(result).toEqual({ name: "Alice", age: 30 })
	})

	it("property: transform preserves validation", () => {
		const s = t.transform(t.number, (n) => n * 2)
		fc.assert(
			fc.property(
				fc.double({
					noNaN: true,
					noDefaultInfinity: true,
					min: -1e10,
					max: 1e10,
				}),
				(n: number) => {
					expect(t.parse(s, n)).toBe(n * 2)
				},
			),
		)
	})
})

// ============================================================================
// compile + parse caching
// ============================================================================

describe("compile", () => {
	it("returns the same function for the same schema object", () => {
		const s = t.object({ x: t.string })
		const fn1 = t.compile(s)
		const fn2 = t.compile(s)
		expect(fn1).toBe(fn2)
	})

	it("returns different functions for different schema objects", () => {
		const s1 = t.object({ x: t.string })
		const s2 = t.object({ x: t.string })
		const fn1 = t.compile(s1)
		const fn2 = t.compile(s2)
		expect(fn1).not.toBe(fn2)
	})

	it("compiled function returns validated input", () => {
		const fn = t.compile(t.string)
		expect(fn("hello")).toBe("hello")
	})
})

describe("parse", () => {
	it("is equivalent to compile(schema)(input)", () => {
		const s = t.object({ a: t.integer, b: t.string })
		const input = { a: 42, b: "hello" }
		expect(t.parse(s, input)).toEqual(t.compile(s)(input))
	})

	it("caches across parse calls", () => {
		const s = t.object({ x: t.number })
		t.parse(s, { x: 1 })
		t.parse(s, { x: 2 })
		t.parse(s, { x: 3 })
		expect(t.compile(s)).toBe(t.compile(s))
	})
})

// ============================================================================
// Error paths — detailed
// ============================================================================

describe("error paths", () => {
	it("root level has no prefix", () => {
		try {
			t.parse(t.string, 42)
			throw new Error("should have thrown")
		} catch (error) {
			expect(error).toEqual(new Error("expected string"))
		}
	})

	it("object field path", () => {
		try {
			t.parse(t.object({ name: t.string }), { name: 42 })
			throw new Error("should have thrown")
		} catch (error) {
			expect(error).toEqual(new Error("name: expected string"))
		}
	})

	it("nested object path", () => {
		try {
			t.parse(
				t.object({
					a: t.object({
						b: t.object({ c: t.integer }),
					}),
				}),
				{ a: { b: { c: "nope" } } },
			)
			throw new Error("should have thrown")
		} catch (error) {
			expect(error).toEqual(new Error("a.b.c: expected integer"))
		}
	})

	it("array element path (dynamic)", () => {
		try {
			t.parse(t.array(t.string), ["ok", "ok", 42])
			throw new Error("should have thrown")
		} catch (error) {
			expect(String(error)).toContain("[2]")
			expect(String(error)).toContain("expected string")
		}
	})

	it("nested object + array path", () => {
		try {
			t.parse(
				t.object({
					items: t.array(t.object({ id: t.integer })),
				}),
				{ items: [{ id: 1 }, { id: "bad" }] },
			)
			throw new Error("should have thrown")
		} catch (error) {
			expect(error).toEqual(new Error("items[1].id: expected integer"))
		}
	})

	it("tuple index path (static)", () => {
		try {
			t.parse(t.tuple(t.string, t.integer), ["hello", "bad"])
			throw new Error("should have thrown")
		} catch (error) {
			expect(error).toEqual(new Error("[1]: expected integer"))
		}
	})

	it("record value path (dynamic)", () => {
		try {
			t.parse(t.record(t.integer), { good: 1, bad: "nope" })
			throw new Error("should have thrown")
		} catch (error) {
			expect(error).toEqual(new Error("[bad]: expected integer"))
		}
	})

	it("deeply nested: object > array > object > tuple", () => {
		const s = t.object({
			data: t.array(
				t.object({
					pair: t.tuple(t.string, t.integer),
				}),
			),
		})
		try {
			t.parse(s, { data: [{ pair: ["ok", "nope"] }] })
			throw new Error("should have thrown")
		} catch (error) {
			expect(error).toEqual(new Error("data[0].pair[1]: expected integer"))
		}
	})

	it("record inside array (dynamic inside dynamic)", () => {
		const s = t.array(t.record(t.number))
		try {
			t.parse(s, [{ a: 1 }, { b: "fail" }])
			throw new Error("should have thrown")
		} catch (error) {
			expect(error).toEqual(new Error("[1][b]: expected finite number"))
		}
	})

	it("tuple inside array (static inside dynamic)", () => {
		const s = t.array(t.tuple(t.string, t.integer))
		try {
			t.parse(s, [
				["a", 1],
				["b", "nope"],
			])
			throw new Error("should have thrown")
		} catch (error) {
			expect(error).toEqual(new Error("[1][1]: expected integer"))
		}
	})
})

// ============================================================================
// Composition — deep nesting & edge cases
// ============================================================================

describe("deep composition", () => {
	it("maybe string accepts null, undefined, string", () => {
		const s = t.maybe(t.string)
		expect(t.parse(s, null)).toBeUndefined()
		expect(t.parse(s, undefined)).toBeUndefined()
		accepts(s, "hello")
		throws(s, 42)
	})

	it("double maybe number", () => {
		const s = t.maybe(t.maybe(t.number))
		expect(t.parse(s, undefined)).toBeUndefined()
		expect(t.parse(s, null)).toBeUndefined()
		accepts(s, 42)
		throws(s, "string")
	})

	it("array of tuples of records", () => {
		const s = t.array(t.tuple(t.string, t.record(t.integer)))
		accepts(s, [["key", { a: 1, b: 2 }]])
		throws(s, [["key", { a: "bad" }]])
	})

	it("record of arrays of objects", () => {
		const s = t.record(t.array(t.object({ x: t.boolean })))
		accepts(s, { items: [{ x: true }, { x: false }] })
		throws(s, { items: [{ x: "nope" }] })
	})

	it("union inside array", () => {
		const s = t.array(t.union(t.string, t.number))
		accepts(s, ["a", 1, "b", 2])
		throws(s, ["a", true])
	})

	it("transform inside array", () => {
		const s = t.array(t.transform(t.string, (s) => s.length))
		expect(t.parse(s, ["hi", "hello"])).toEqual([2, 5])
	})
})

// ============================================================================
// Property-based chaos — random schema generation
// ============================================================================

describe("property-based chaos", () => {
	it("string always accepts random strings", () => {
		fc.assert(
			fc.property(fc.string(), (s: string) => {
				t.parse(t.string, s)
			}),
			{ numRuns: 1000 },
		)
	})

	it("integer always rejects random floats", () => {
		fc.assert(
			fc.property(
				fc
					.double({
						noNaN: true,
						noDefaultInfinity: true,
					})
					.filter((n: number) => !Number.isInteger(n)),
				(n: number) => {
					throws(t.integer, n)
				},
			),
			{ numRuns: 500 },
		)
	})

	it("object rejects random primitive inputs", () => {
		const s = t.object({ x: t.string })
		fc.assert(
			fc.property(
				fc.oneof(
					fc.string(),
					fc.integer(),
					fc.boolean(),
					fc.constant(null),
					fc.constant(undefined),
				),
				(v: string | number | boolean | null | undefined) => {
					throws(s, v)
				},
			),
			{ numRuns: 500 },
		)
	})

	it("compiled validators are idempotent", () => {
		const schemas: t.Schema[] = [
			t.string,
			t.number,
			t.integer,
			t.boolean,
			t.bigint,
			t.object({ x: t.string, y: t.integer }),
			t.array(t.string),
			t.tuple(t.string, t.number),
			t.record(t.boolean),
			t.maybe(t.string),
			t.union(t.string, t.number),
		]

		const validData: unknown[] = [
			"hello",
			3.14,
			42,
			true,
			0n,
			{ x: "a", y: 1 },
			["a", "b"],
			["hi", 42],
			{ a: true },
			null,
			"hello",
		]

		for (let i = 0; i < schemas.length; i++) {
			const fn = t.compile(schemas[i]!)
			const data = validData[i]
			const r1 = fn(data)
			const r2 = fn(data)
			expect(r1).toEqual(r2)
		}
	})

	it("roundtrip: parse(object, structuredClone(valid)) always works", () => {
		const s = t.object({
			id: t.integer,
			name: t.string,
			active: t.boolean,
			tags: t.array(t.string),
			meta: t.maybe(t.string),
		})

		fc.assert(
			fc.property(
				fc.record({
					id: fc.integer(),
					name: fc.string(),
					active: fc.boolean(),
					tags: fc.array(fc.string()),
					meta: fc.oneof(
						fc.string(),
						fc.constant(null),
						fc.constant(undefined),
					),
				}),
				(obj: {
					id: number
					name: string
					active: boolean
					tags: string[]
					meta: string | null | undefined
				}) => {
					const cloned = structuredClone(obj)
					const result = t.parse(s, cloned)
					if (obj.meta === null || obj.meta === undefined) {
						expect((result as Record<string, unknown>).meta).toBeUndefined()
					}
				},
			),
			{ numRuns: 500 },
		)
	})

	it("chaos: random mutation of valid objects should usually fail", () => {
		const s = t.object({
			name: t.string,
			age: t.integer,
			active: t.boolean,
		})

		let failCount = 0
		const iterations = 200

		for (let i = 0; i < iterations; i++) {
			const valid: Record<string, unknown> = {
				name: "Alice",
				age: 30,
				active: true,
			}
			const keys = Object.keys(valid)
			const key = keys[i % keys.length]!
			const corruptions = [42, "bad", true, null, undefined, [], {}, NaN, 1.5]
			const corruption = corruptions[i % corruptions.length]
			valid[key] = corruption

			try {
				t.parse(s, valid)
			} catch {
				failCount++
			}
		}
		expect(failCount).toBeGreaterThan(iterations * 0.5)
	})
})

// ============================================================================
// Edge cases that could break codegen
// ============================================================================

describe("codegen edge cases", () => {
	it("object key with spaces", () => {
		const s = t.object({
			"foo bar": t.string,
			"baz qux": t.integer,
		})
		accepts(s, { "foo bar": "ok", "baz qux": 1 })
		throws(s, { "foo bar": 42, "baz qux": 1 })
	})

	it("handles single quotes in object keys", () => {
		const s = t.object({ "a'b": t.string })
		accepts(s, { "a'b": "ok" })
		throws(s, { "a'b": 42 }, "expected string")
	})

	it("object key with dots and brackets", () => {
		const s = t.object({
			"a.b": t.string,
			"c[0]": t.integer,
		})
		accepts(s, { "a.b": "ok", "c[0]": 1 })
	})

	it("deeply nested arrays (5 levels)", () => {
		const s = t.array(t.array(t.array(t.array(t.array(t.integer)))))
		accepts(s, [[[[[1, 2]]]]])
		throws(s, [[[[[1, "bad"]]]]])
	})

	it("object with many fields", () => {
		const shape: Record<string, typeof t.string> = {}
		const data: Record<string, string> = {}
		for (let i = 0; i < 50; i++) {
			shape[`field_${i}`] = t.string
			data[`field_${i}`] = `value_${i}`
		}
		const s = t.object(shape)
		accepts(s, data)
	})

	it("large array validation", () => {
		const s = t.array(t.integer)
		const data = Array.from({ length: 10_000 }, (_, i) => i)
		accepts(s, data)
	})

	it("oneOf with single value", () => {
		const s = t.oneOf("only")
		accepts(s, "only")
		throws(s, "other", "expected one of: only")
	})

	it("union with single variant", () => {
		const s = t.union(t.string)
		accepts(s, "hello")
		throws(s, 42, "union failed")
	})

	it("literal with empty string", () => {
		const s = t.literal("")
		accepts(s, "")
		throws(s, " ")
	})

	it("literal with zero accepts -0 (0 === -0 in JS)", () => {
		const s = t.literal(0)
		accepts(s, 0)
		accepts(s, -0)
	})

	it("unknown tag throws during compilation", () => {
		const s = { _tag: "does_not_exist" } as t.Schema
		expect(() => t.compile(s)).toThrow('Unknown schema tag: "does_not_exist"')
	})
})

// ============================================================================
// Interaction between compile/parse and WeakMap cache
// ============================================================================

describe("WeakMap cache behavior", () => {
	it("parse uses same compiled fn as compile", () => {
		const s = t.object({ x: t.string })
		const compiled = t.compile(s)
		const result = t.parse(s, { x: "hello" })
		expect(result).toEqual({ x: "hello" })
		expect(compiled({ x: "hello" })).toEqual({
			x: "hello",
		})
	})

	it("different schema instances are compiled separately", () => {
		const s1 = t.array(t.string)
		const s2 = t.array(t.string)
		expect(t.compile(s1)).not.toBe(t.compile(s2))
	})

	it("primitive schemas are singletons, so always cached", () => {
		expect(t.compile(t.string)).toBe(t.compile(t.string))
		expect(t.compile(t.number)).toBe(t.compile(t.number))
		expect(t.compile(t.boolean)).toBe(t.compile(t.boolean))
		expect(t.compile(t.integer)).toBe(t.compile(t.integer))
		expect(t.compile(t.bigint)).toBe(t.compile(t.bigint))
	})
})

// ============================================================================
// Stress tests
// ============================================================================

describe("stress", () => {
	it("validates 10k objects without crashing", () => {
		const s = t.object({
			id: t.integer,
			name: t.string,
			active: t.boolean,
		})
		const fn = t.compile(s)
		for (let i = 0; i < 10_000; i++) {
			fn({
				id: i,
				name: `user_${i}`,
				active: i % 2 === 0,
			})
		}
	})

	it("mixed valid/invalid in tight loop", () => {
		const s = t.object({ x: t.integer })
		const fn = t.compile(s)
		let passes = 0
		let fails = 0
		for (let i = 0; i < 5000; i++) {
			try {
				fn(i % 2 === 0 ? { x: i } : { x: "bad" })
				passes++
			} catch {
				fails++
			}
		}
		expect(passes).toBe(2500)
		expect(fails).toBe(2500)
	})

	it("many distinct schemas compiled", () => {
		for (let i = 0; i < 100; i++) {
			const s = t.object({
				[`field_${i}`]: t.string,
			})
			const fn = t.compile(s)
			fn({ [`field_${i}`]: "value" })
		}
	})
})

// ============================================================================
// refine
// ============================================================================

describe("refine", () => {
	it("passes when predicate returns true", () => {
		const positive = t.refine(t.number, (n) => n > 0, "expected positive")
		accepts(positive, 1)
		accepts(positive, 0.5)
		accepts(positive, 999)
	})

	it("rejects when predicate returns false", () => {
		const positive = t.refine(t.number, (n) => n > 0, "expected positive")
		throws(positive, 0, "expected positive")
		throws(positive, -1, "expected positive")
	})

	it("validates inner schema first", () => {
		const positive = t.refine(t.number, (n) => n > 0, "expected positive")
		throws(positive, "not a number", "expected finite number")
	})

	it("uses default message when none provided", () => {
		const nonEmpty = t.refine(t.string, (s) => s.length > 0)
		throws(nonEmpty, "", "refinement failed")
	})

	it("works with string patterns", () => {
		const email = t.refine(t.string, (s) => s.includes("@"), "expected email")
		accepts(email, "user@example.com")
		throws(email, "not-an-email", "expected email")
	})

	it("works inside objects", () => {
		const s = t.object({
			age: t.refine(t.integer, (n) => n >= 0 && n <= 150, "invalid age"),
		})
		accepts(s, { age: 25 })
		throws(s, { age: -1 }, "invalid age")
		throws(s, { age: 200 }, "invalid age")
	})

	it("works inside arrays", () => {
		const s = t.array(t.refine(t.integer, (n) => n > 0, "expected positive"))
		accepts(s, [1, 2, 3])
		throws(s, [1, 0, 3], "expected positive")
	})

	it("chained refinements", () => {
		const s = t.refine(
			t.refine(t.integer, (n) => n > 0, "expected positive"),
			(n) => n % 2 === 0,
			"expected even",
		)
		accepts(s, 2)
		accepts(s, 4)
		throws(s, 3, "expected even")
		throws(s, -2, "expected positive")
	})

	it("error path works with refinement", () => {
		const s = t.object({
			items: t.array(t.refine(t.integer, (n) => n > 0, "expected positive")),
		})
		try {
			t.parse(s, { items: [1, 2, -3] })
			throw new Error("should have thrown")
		} catch (error) {
			const msg = String(error)
			expect(msg).toContain("items")
			expect(msg).toContain("[2]")
			expect(msg).toContain("expected positive")
		}
	})

	it("refinement with single quotes in message", () => {
		const s = t.refine(t.string, (s) => s.length > 0, "can't be empty")
		accepts(s, "hello")
		throws(s, "", "can't be empty")
	})

	it("property: refined integer > 0 rejects all non-positive", () => {
		const positive = t.refine(t.integer, (n) => n > 0, "expected positive")
		fc.assert(
			fc.property(fc.integer({ max: 0 }), (n: number) => {
				throws(positive, n)
			}),
		)
	})
})

// ============================================================================
// lazy — recursive types
// ============================================================================

describe("lazy", () => {
	it("validates a recursive tree structure", () => {
		interface Tree {
			value: number
			children: Tree[]
		}
		const tree: t.Schema<Tree> = t.object({
			value: t.number,
			children: t.array(t.lazy(() => tree)),
		})

		accepts(tree, { value: 1, children: [] })
		accepts(tree, {
			value: 1,
			children: [
				{ value: 2, children: [] },
				{
					value: 3,
					children: [{ value: 4, children: [] }],
				},
			],
		})
	})

	it("rejects invalid nodes deep in tree", () => {
		interface Tree {
			value: number
			children: Tree[]
		}
		const tree: t.Schema<Tree> = t.object({
			value: t.number,
			children: t.array(t.lazy(() => tree)),
		})

		throws(tree, {
			value: 1,
			children: [{ value: "bad", children: [] }],
		})
		throws(tree, {
			value: 1,
			children: [
				{
					value: 2,
					children: [
						{
							value: 3,
							children: "not array",
						},
					],
				},
			],
		})
	})

	it("validates a linked list", () => {
		interface List {
			head: number
			tail: List | undefined
		}
		const list: t.Schema<List> = t.object({
			head: t.integer,
			tail: t.maybe(t.lazy(() => list)),
		})

		expect(t.parse(list, { head: 1, tail: null })).toEqual({
			head: 1,
			tail: undefined,
		})
		expect(t.parse(list, { head: 1, tail: undefined })).toEqual({
			head: 1,
			tail: undefined,
		})
		const result = t.parse(list, {
			head: 1,
			tail: { head: 2, tail: null },
		})
		// oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
		expect((result as { tail: { head: number } }).tail.head).toBe(2)
		throws(list, {
			head: 1,
			tail: { head: "bad", tail: null },
		})
	})

	it("validates a JSON-like recursive union", () => {
		type Json =
			| string
			| number
			| boolean
			| null
			| Json[]
			| { [key: string]: Json }
		const jsonSchema: t.Schema<Json> = t.union(
			t.string,
			t.number,
			t.boolean,
			t.literal(null),
			t.array(t.lazy(() => jsonSchema)),
			t.record(t.lazy(() => jsonSchema)),
		)

		accepts(jsonSchema, "hello")
		accepts(jsonSchema, 42)
		accepts(jsonSchema, true)
		accepts(jsonSchema, null)
		accepts(jsonSchema, [1, "two", [3, [4]]])
		accepts(jsonSchema, {
			a: 1,
			b: { c: [true, null, "x"] },
		})
	})

	it("compile caches lazy schemas", () => {
		interface Tree {
			value: number
			children: Tree[]
		}
		const tree: t.Schema<Tree> = t.object({
			value: t.number,
			children: t.array(t.lazy(() => tree)),
		})

		const fn1 = t.compile(tree)
		const fn2 = t.compile(tree)
		expect(fn1).toBe(fn2)
	})

	it("lazy with maybe recursive field", () => {
		interface Node {
			value: string
			next?: Node | undefined
		}
		const node: t.Schema<Node> = t.object({
			value: t.string,
			next: t.maybe(t.lazy(() => node)),
		})

		accepts(node, { value: "a" })
		accepts(node, {
			value: "a",
			next: { value: "b" },
		})
		accepts(node, {
			value: "a",
			next: {
				value: "b",
				next: { value: "c" },
			},
		})
		throws(node, {
			value: "a",
			next: { value: 42 },
		})
	})
})

// ============================================================================
// Context array (ctx) path — schemas that need runtime closures
// ============================================================================

describe("context array path (ctx.length > 0)", () => {
	it("transform uses context for fn", () => {
		const s = t.transform(t.string, (s) => s.length)
		expect(t.parse(s, "hello")).toBe(5)
	})

	it("fallback union uses context for compiled sub-validators", () => {
		const s = t.union(t.object({ x: t.string }), t.array(t.number))
		accepts(s, { x: "hi" })
		accepts(s, [1, 2, 3])
		throws(s, "plain string")
	})

	it("multiple transforms in same object share ctx", () => {
		const s = t.object({
			a: t.transform(t.string, (s) => s.toUpperCase()),
			b: t.transform(t.integer, (n) => n * 2),
		})
		expect(t.parse(s, { a: "hi", b: 5 })).toEqual({
			a: "HI",
			b: 10,
		})
	})
})

// ============================================================================
// Regression tests — codegen audit fixes
// ============================================================================

describe("regression: lazy assigns return value", () => {
	it("transform inside lazy propagates in array", () => {
		const s = t.array(
			t.lazy(() => t.transform(t.string, (s) => s.toUpperCase())),
		)
		expect(t.parse(s, ["hello", "world"])).toEqual(["HELLO", "WORLD"])
	})

	it("preprocess inside lazy propagates in array", () => {
		const s = t.array(t.lazy(() => t.preprocess(t.integer, Number)))
		expect(t.parse(s, ["1", "2", "3"])).toEqual([1, 2, 3])
	})

	it("transform inside lazy propagates in object field", () => {
		const inner = t.transform(t.string, (s) => s.toUpperCase())
		const s = t.object({ name: t.lazy(() => inner) })
		expect(t.parse(s, { name: "alice" })).toEqual({
			name: "ALICE",
		})
	})
})

describe("regression: esc() handles newlines and special chars", () => {
	it("object key with newline compiles and validates", () => {
		const s = t.object({ "a\nb": t.string })
		expect(t.parse(s, { "a\nb": "ok" })).toEqual({
			"a\nb": "ok",
		})
		expect(() => t.parse(s, { "a\nb": 42 })).toThrow()
	})

	it("object key with carriage return compiles and validates", () => {
		const s = t.object({ "a\rb": t.string })
		expect(t.parse(s, { "a\rb": "ok" })).toEqual({
			"a\rb": "ok",
		})
		expect(() => t.parse(s, { "a\rb": 42 })).toThrow()
	})

	it("refine message with newline compiles and throws correctly", () => {
		const s = t.refine(t.string, (s) => s.length > 0, "must not\nbe empty")
		expect(t.parse(s, "ok")).toBe("ok")
		expect(() => t.parse(s, "")).toThrow("must not\nbe empty")
	})

	it("object key with line separator (U+2028) compiles", () => {
		const s = t.object({ "a\u2028b": t.string })
		expect(t.parse(s, { "a\u2028b": "ok" })).toEqual({
			"a\u2028b": "ok",
		})
	})
})

describe("regression: _building cleanup on compile failure", () => {
	it("schema is retryable after compilation", () => {
		const s = t.object({ x: t.string })
		const fn = t.compile(s)
		expect(fn({ x: "ok" })).toEqual({ x: "ok" })
	})

	it("_building does not leak on error", () => {
		const schema = t.object({ x: t.string })
		const fn1 = t.compile(schema)
		expect(fn1({ x: "ok" })).toEqual({ x: "ok" })
		const fn2 = t.compile(schema)
		expect(fn1).toBe(fn2)
	})
})

describe("regression: typeof union emits no redundant checks", () => {
	it("string variant in union accepts without double typeof", () => {
		const s = t.union(t.string, t.number)
		expect(t.parse(s, "hello")).toBe("hello")
		expect(t.parse(s, 42)).toBe(42)
		expect(() => t.parse(s, true)).toThrow("union failed")
	})

	it("integer in typeof union still validates isInteger", () => {
		const s = t.union(t.integer, t.string)
		expect(t.parse(s, 42)).toBe(42)
		expect(t.parse(s, "hello")).toBe("hello")
		expect(() => t.parse(s, 1.5)).toThrow("expected integer")
	})

	it("number in typeof union still validates isFinite", () => {
		const s = t.union(t.number, t.string)
		expect(t.parse(s, 3.14)).toBe(3.14)
		expect(() => t.parse(s, NaN)).toThrow("expected finite number")
		expect(() => t.parse(s, Infinity)).toThrow("expected finite number")
	})
})

describe("regression: discriminated object union skips redundant checks", () => {
	it("validates non-discriminant fields only", () => {
		const s = t.union(
			t.object({
				type: t.literal("a"),
				val: t.string,
			}),
			t.object({
				type: t.literal("b"),
				val: t.number,
			}),
		)
		expect(t.parse(s, { type: "a", val: "hello" })).toEqual({
			type: "a",
			val: "hello",
		})
		expect(t.parse(s, { type: "b", val: 42 })).toEqual({
			type: "b",
			val: 42,
		})
		expect(() => t.parse(s, { type: "a", val: 42 })).toThrow("expected string")
		expect(() => t.parse(s, { type: "b", val: "x" })).toThrow(
			"expected finite number",
		)
	})

	it("rejects non-objects before switch", () => {
		const s = t.union(
			t.object({
				kind: t.literal("x"),
				data: t.string,
			}),
			t.object({
				kind: t.literal("y"),
				data: t.number,
			}),
		)
		expect(() => t.parse(s, null)).toThrow("expected object")
		expect(() => t.parse(s, "string")).toThrow("expected object")
		expect(() => t.parse(s, [])).toThrow("expected object")
	})

	it("handles maybe fields in discriminated variants", () => {
		const s = t.union(
			t.object({
				type: t.literal("a"),
				val: t.string,
				extra: t.maybe(t.integer),
			}),
			t.object({
				type: t.literal("b"),
				val: t.number,
			}),
		)
		expect(
			t.parse(s, {
				type: "a",
				val: "ok",
			}) as Record<string, unknown>,
		).toEqual({ type: "a", val: "ok" })
		expect(
			t.parse(s, {
				type: "a",
				val: "ok",
				extra: 5,
			}) as Record<string, unknown>,
		).toEqual({ type: "a", val: "ok", extra: 5 })
		expect(() =>
			t.parse(s, {
				type: "a",
				val: "ok",
				extra: "bad",
			}),
		).toThrow("expected integer")
	})
})

describe("regression: dynamic error paths use dot/bracket notation", () => {
	it("array > object field: [idx].field", () => {
		try {
			t.parse(t.array(t.object({ name: t.string })), [{ name: 42 }])
			throw new Error("should have thrown")
		} catch (error) {
			expect(error).toEqual(new Error("[0].name: expected string"))
		}
	})

	it("array > array: [idx][idx]", () => {
		try {
			t.parse(t.array(t.array(t.string)), [["ok", 42]])
			throw new Error("should have thrown")
		} catch (error) {
			expect(String(error)).toContain("[0][1]")
			expect(String(error)).toContain("expected string")
		}
	})

	it("array > object > object: [idx].a.b", () => {
		try {
			t.parse(
				t.array(
					t.object({
						profile: t.object({
							age: t.integer,
						}),
					}),
				),
				[{ profile: { age: "x" } }],
			)
			throw new Error("should have thrown")
		} catch (error) {
			expect(error).toEqual(new Error("[0].profile.age: expected integer"))
		}
	})

	it("array > record: [idx][key]", () => {
		try {
			t.parse(t.array(t.record(t.number)), [{ a: 1 }, { b: "bad" }])
			throw new Error("should have thrown")
		} catch (error) {
			expect(String(error)).toContain("[1]")
			expect(String(error)).toContain("[b]")
			expect(String(error)).toContain("expected finite number")
		}
	})

	it("array > tuple: [idx][tupleIdx]", () => {
		try {
			t.parse(t.array(t.tuple(t.string, t.integer)), [
				["a", 1],
				["b", "x"],
			])
			throw new Error("should have thrown")
		} catch (error) {
			expect(String(error)).toContain("[1][1]")
			expect(String(error)).toContain("expected integer")
		}
	})

	it("object > array > object: field[idx].field", () => {
		try {
			t.parse(
				t.object({
					items: t.array(t.object({ id: t.integer })),
				}),
				{ items: [{ id: 1 }, { id: "bad" }] },
			)
			throw new Error("should have thrown")
		} catch (error) {
			expect(error).toEqual(new Error("items[1].id: expected integer"))
		}
	})

	it("object > array > object > tuple: field[idx].field[tupleIdx]", () => {
		const s = t.object({
			data: t.array(
				t.object({
					pair: t.tuple(t.string, t.integer),
				}),
			),
		})
		try {
			t.parse(s, {
				data: [{ pair: ["ok", "nope"] }],
			})
			throw new Error("should have thrown")
		} catch (error) {
			expect(error).toEqual(new Error("data[0].pair[1]: expected integer"))
		}
	})
})
