import { describe, expect, test } from "bun:test"
import { format, parse } from "."

describe("parse", () => {
	test("single units", () => {
		expect(parse("500ms")).toBe(500)
		expect(parse("1s")).toBe(1000)
		expect(parse("5m")).toBe(300_000)
		expect(parse("2h")).toBe(7_200_000)
		expect(parse("1d")).toBe(86_400_000)
	})

	test("compound durations", () => {
		expect(parse("2h30m")).toBe(9_000_000)
		expect(parse("1d12h")).toBe(129_600_000)
		expect(parse("1m30s")).toBe(90_000)
		expect(parse("1h30m45s")).toBe(5_445_000)
	})

	test("whitespace between segments", () => {
		expect(parse("2h 30m")).toBe(9_000_000)
		expect(parse("1d 12h")).toBe(129_600_000)
		expect(parse("  5m  ")).toBe(300_000)
	})

	test("decimals", () => {
		expect(parse("1.5h")).toBe(5_400_000)
		expect(parse("0.5s")).toBe(500)
		expect(parse("2.5m")).toBe(150_000)
	})

	test("throws on empty string", () => {
		expect(() => parse("")).toThrow(SyntaxError)
		expect(() => parse("  ")).toThrow(SyntaxError)
	})

	test("throws on unknown units", () => {
		expect(() => parse("5x")).toThrow(SyntaxError)
		expect(() => parse("10w")).toThrow(SyntaxError)
	})

	test("throws on bare numbers", () => {
		expect(() => parse("100")).toThrow(SyntaxError)
	})

	test("throws on negative values", () => {
		expect(() => parse("-5m")).toThrow(SyntaxError)
	})

	test("throws on invalid input", () => {
		expect(() => parse("abc")).toThrow(SyntaxError)
		expect(() => parse("5m abc")).toThrow(SyntaxError)
	})

	test("throws on whitespace between digit and unit", () => {
		expect(() => parse("1 m")).toThrow(SyntaxError)
		expect(() => parse("1 s")).toThrow(SyntaxError)
		expect(() => parse("1 m s")).toThrow(SyntaxError)
		expect(() => parse("1 s m")).toThrow(SyntaxError)
	})
})

describe("format", () => {
	test("zero", () => {
		expect(format(0)).toBe("0ms")
	})

	test("single units", () => {
		expect(format(500)).toBe("500ms")
		expect(format(1000)).toBe("1s")
		expect(format(60_000)).toBe("1m")
		expect(format(3_600_000)).toBe("1h")
		expect(format(86_400_000)).toBe("1d")
	})

	test("compound durations", () => {
		expect(format(90_000)).toBe("1m30s")
		expect(format(9_000_000)).toBe("2h30m")
		expect(format(129_600_000)).toBe("1d12h")
		expect(format(5_445_000)).toBe("1h30m45s")
	})

	test("drops sub-millisecond remainders", () => {
		expect(format(1000.7)).toBe("1s")
		expect(format(0.5)).toBe("0ms")
	})

	test("throws on negative", () => {
		expect(() => format(-1)).toThrow(RangeError)
	})

	test("throws on NaN", () => {
		expect(() => format(NaN)).toThrow(RangeError)
	})

	test("throws on Infinity", () => {
		expect(() => format(Infinity)).toThrow(RangeError)
		expect(() => format(-Infinity)).toThrow(RangeError)
	})
})

describe("roundtrip", () => {
	test("parse(format(ms)) preserves value", () => {
		const values = [0, 500, 1000, 90_000, 9_000_000, 86_400_000]
		for (const ms of values) {
			expect(parse(format(ms))).toBe(ms)
		}
	})
})
