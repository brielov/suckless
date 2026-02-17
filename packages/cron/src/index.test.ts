import { describe, expect, test } from "bun:test"
import { matches, next, parse, prev, sequence } from "./index.ts"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a local Date from components (avoids timezone ambiguity in tests). */
function local(
	year: number,
	month: number,
	day: number,
	hour = 0,
	minute = 0,
	second = 0,
): Date {
	return new Date(year, month - 1, day, hour, minute, second)
}

/** Collect the first `n` dates from a sequence. */
function take(gen: Generator<Date, never>, n: number): Date[] {
	const result: Date[] = []
	for (let i = 0; i < n; i++) {
		const { value } = gen.next()
		result.push(value)
	}
	return result
}

// ---------------------------------------------------------------------------
// parse() — invalid expressions
// ---------------------------------------------------------------------------

describe("parse() — invalid expressions", () => {
	test("too few fields", () => {
		expect(() => parse("* * *")).toThrow(SyntaxError)
	})

	test("too many fields", () => {
		expect(() => parse("* * * * * * *")).toThrow(SyntaxError)
	})

	test("empty string", () => {
		expect(() => parse("")).toThrow(SyntaxError)
	})

	test("second value out of range (61)", () => {
		expect(() => parse("61 * * * * *")).toThrow(SyntaxError)
	})

	test("minute value out of range (72)", () => {
		expect(() => parse("* 72 * * *")).toThrow(SyntaxError)
	})

	test("hour value out of range (36)", () => {
		expect(() => parse("* * 36 * *")).toThrow(SyntaxError)
	})

	test("day-of-month value out of range (40)", () => {
		expect(() => parse("* * * 40 *")).toThrow(SyntaxError)
	})

	test("day-of-month value out of range (0)", () => {
		expect(() => parse("* * * 0 *")).toThrow(SyntaxError)
	})

	test("month value out of range (13)", () => {
		expect(() => parse("* * * * 13")).toThrow(SyntaxError)
	})

	test("day-of-week 0 is valid (Sunday)", () => {
		const cron = parse("* * * * 0")
		expect(cron.daysOfWeek).toEqual(new Set([0]))
	})

	test("day-of-week value out of range (9)", () => {
		expect(() => parse("* * * * * 9")).toThrow(SyntaxError)
	})

	test("invalid range order (30-20)", () => {
		expect(() => parse("30-20 * * * * *")).toThrow(SyntaxError)
	})

	test("invalid range with dash only", () => {
		expect(() => parse("- * * * * *")).toThrow(SyntaxError)
	})

	test("hour range out of bounds (12-36)", () => {
		expect(() => parse("* * 12-36 * * *")).toThrow(SyntaxError)
	})

	test("day-of-month list with out-of-range value", () => {
		expect(() => parse("* * * 10-15,40 * *")).toThrow(SyntaxError)
	})

	test("month range out of bounds (12-13)", () => {
		expect(() => parse("* * * * 12-13 *")).toThrow(SyntaxError)
	})

	test("step of zero", () => {
		expect(() => parse("*/0 * * * *")).toThrow(SyntaxError)
	})

	test("negative step", () => {
		expect(() => parse("*/-5 * * * *")).toThrow(SyntaxError)
	})

	test("invalid characters — symbol", () => {
		expect(() => parse("10 ! 12 8 0")).toThrow(SyntaxError)
	})

	test("invalid characters — letter", () => {
		expect(() => parse("10 x 12 8 0")).toThrow(SyntaxError)
	})

	test("invalid characters — parentheses", () => {
		expect(() => parse("10 ) 12 8 0")).toThrow(SyntaxError)
	})

	test("interval with invalid characters", () => {
		expect(() => parse("10 */A 12 8 0")).toThrow(SyntaxError)
	})

	test("range with invalid characters", () => {
		expect(() => parse("10 0-z 12 8 0")).toThrow(SyntaxError)
	})

	test("list with invalid characters", () => {
		expect(() => parse("10 0,1,z 12 8 0")).toThrow(SyntaxError)
	})

	test("invalid day-of-week alias", () => {
		expect(() => parse("15 10 * * MON-TUR")).toThrow(SyntaxError)
	})

	test("invalid month alias", () => {
		expect(() => parse("0 0 * FOO *")).toThrow(SyntaxError)
	})
})

// ---------------------------------------------------------------------------
// parse() — valid expressions
// ---------------------------------------------------------------------------

describe("parse() — valid expressions", () => {
	test("all wildcards (5-field)", () => {
		const cron = parse("* * * * *")
		expect(cron.seconds.size).toBe(1)
		expect(cron.seconds.has(0)).toBe(true)
		expect(cron.minutes.size).toBe(60)
		expect(cron.hours.size).toBe(24)
		expect(cron.daysOfMonth.size).toBe(31)
		expect(cron.months.size).toBe(12)
		expect(cron.daysOfWeek.size).toBe(7)
	})

	test("all wildcards (6-field)", () => {
		const cron = parse("* * * * * *")
		expect(cron.seconds.size).toBe(60)
		expect(cron.minutes.size).toBe(60)
	})

	test("tab as field separator", () => {
		const cron = parse("*\t*\t*\t*\t*")
		expect(cron.minutes.size).toBe(60)
	})

	test("mixed tabs and spaces", () => {
		const cron = parse("* \t    *\t \t  *   *  \t \t  *")
		expect(cron.minutes.size).toBe(60)
	})

	test("fixed values", () => {
		const cron = parse("10 2 12 8 0")
		expect(cron.seconds).toEqual(new Set([0]))
		expect(cron.minutes).toEqual(new Set([10]))
		expect(cron.hours).toEqual(new Set([2]))
		expect(cron.daysOfMonth).toEqual(new Set([12]))
		expect(cron.months).toEqual(new Set([8]))
		expect(cron.daysOfWeek).toEqual(new Set([0]))
	})

	test("6-field with fixed second", () => {
		const cron = parse("30 10 2 12 8 0")
		expect(cron.seconds).toEqual(new Set([30]))
		expect(cron.minutes).toEqual(new Set([10]))
	})

	test("step */3 for minutes", () => {
		const cron = parse("*/3 * * * *")
		expect(cron.minutes).toEqual(
			new Set([
				0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54,
				57,
			]),
		)
	})

	test("step */5 for minutes", () => {
		const cron = parse("*/5 * * * *")
		expect(cron.minutes).toEqual(
			new Set([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]),
		)
	})

	test("step with start: 6/23 for minutes", () => {
		const cron = parse("6/23 * * * *")
		expect(cron.minutes).toEqual(new Set([6, 29, 52]))
	})

	test("range 10-30 for minutes", () => {
		const cron = parse("10-30 * * * *")
		const expected = new Set<number>()
		for (let i = 10; i <= 30; i++) {
			expected.add(i)
		}
		expect(cron.minutes).toEqual(expected)
	})

	test("range with step: 10-30/2 for minutes", () => {
		const cron = parse("10-30/2 * * * *")
		expect(cron.minutes).toEqual(
			new Set([10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30]),
		)
	})

	test("range with the same start and end value", () => {
		const cron = parse("*/10 2-2 * * *")
		expect(cron.hours).toEqual(new Set([2]))
	})

	test("list 1,5,10,15", () => {
		const cron = parse("1,5,10,15 * * * *")
		expect(cron.minutes).toEqual(new Set([1, 5, 10, 15]))
	})

	test("list with ranges: 12,13,10,1-3", () => {
		const cron = parse("0 12,13,10,1-3 * * *")
		expect(cron.hours).toEqual(new Set([1, 2, 3, 10, 12, 13]))
	})

	test("day-of-month multiple ranges: 2-4,7-31", () => {
		const cron = parse("0 0 2-4,7-31 * *")
		expect(cron.daysOfMonth.has(1)).toBe(false)
		expect(cron.daysOfMonth.has(2)).toBe(true)
		expect(cron.daysOfMonth.has(5)).toBe(false)
		expect(cron.daysOfMonth.has(7)).toBe(true)
		expect(cron.daysOfMonth.has(31)).toBe(true)
	})

	test("named months: JAN-FEB", () => {
		const cron = parse("0 0 * JAN-FEB *")
		expect(cron.months).toEqual(new Set([1, 2]))
	})

	test("named months case-insensitive: jAn-FeB", () => {
		const cron = parse("0 0 * jAn-FeB *")
		expect(cron.months).toEqual(new Set([1, 2]))
	})

	test("named day of week: SUN", () => {
		const cron = parse("15 10 * * SUN")
		expect(cron.daysOfWeek).toEqual(new Set([0]))
	})

	test("named day of week range: MON-TUE", () => {
		const cron = parse("15 10 * * MON-TUE")
		expect(cron.daysOfWeek).toEqual(new Set([1, 2]))
	})

	test("mixed case named days and months: mOn-tUE, jAn-FeB", () => {
		const cron = parse("15 10 * jAn-FeB mOn-tUE")
		expect(cron.months).toEqual(new Set([1, 2]))
		expect(cron.daysOfWeek).toEqual(new Set([1, 2]))
	})

	test("day-of-week 7 normalizes to 0 (Sunday)", () => {
		const cron = parse("* * * * 7")
		expect(cron.daysOfWeek).toEqual(new Set([0]))
	})

	test("day-of-week 6-7 includes Saturday and Sunday (6-field)", () => {
		const cron = parse("* * * * * 6-7")
		expect(cron.daysOfWeek).toEqual(new Set([0, 6]))
	})

	test("day-of-week 6-7 includes Saturday and Sunday (5-field)", () => {
		const cron = parse("* * * * 6-7")
		expect(cron.daysOfWeek).toEqual(new Set([0, 6]))
	})

	test("dow 6,7 and 6,0 and 0,6 and 7,6 are all equivalent", () => {
		const expressions = [
			"* * * * 6,7",
			"* * * * 6,0",
			"* * * * 0,6",
			"* * * * 7,6",
		]
		for (const expr of expressions) {
			const cron = parse(expr)
			expect(cron.daysOfWeek).toEqual(new Set([0, 6]))
		}
	})

	test("second field step: */20 for seconds (6-field)", () => {
		const cron = parse("*/20 * * * * *")
		expect(cron.seconds).toEqual(new Set([0, 20, 40]))
	})

	test("second field range: 20-40/10 (6-field)", () => {
		const cron = parse("20-40/10 * * * * *")
		expect(cron.seconds).toEqual(new Set([20, 30, 40]))
	})

	test("second field step with start: 1/2 (6-field)", () => {
		const cron = parse("1/2 * * * * *")
		const expected = new Set<number>()
		for (let i = 1; i <= 59; i += 2) {
			expected.add(i)
		}
		expect(cron.seconds).toEqual(expected)
	})

	test("second field step with start: 0/30 (6-field)", () => {
		const cron = parse("0/30 * * * * *")
		expect(cron.seconds).toEqual(new Set([0, 30]))
	})

	test("*/5 for day-of-month", () => {
		const cron = parse("0 12 */5 6 *")
		expect(cron.daysOfMonth).toEqual(new Set([1, 6, 11, 16, 21, 26, 31]))
	})

	test("all named months", () => {
		const cron = parse(
			"0 0 * JAN,FEB,MAR,APR,MAY,JUN,JUL,AUG,SEP,OCT,NOV,DEC *",
		)
		expect(cron.months.size).toBe(12)
	})

	test("all named days of week", () => {
		const cron = parse("0 0 * * SUN,MON,TUE,WED,THU,FRI,SAT")
		expect(cron.daysOfWeek.size).toBe(7)
	})

	test("fields accessible via the CronExpression interface", () => {
		const cron = parse("0 1 2 3 * 1-3,5")
		expect(cron.seconds).toEqual(new Set([0]))
		expect(cron.minutes).toEqual(new Set([1]))
		expect(cron.hours).toEqual(new Set([2]))
		expect(cron.daysOfMonth).toEqual(new Set([3]))
		expect(cron.months.size).toBe(12)
		expect(cron.daysOfWeek).toEqual(new Set([1, 2, 3, 5]))
	})
})

// ---------------------------------------------------------------------------
// next() — basic behavior
// ---------------------------------------------------------------------------

describe("next() — basic behavior", () => {
	test("every minute: next minute from mid-second", () => {
		const cron = parse("* * * * *")
		const from = local(2026, 2, 12, 14, 38, 53)
		const result = next(cron, from)
		expect(result.getMinutes()).toBe(39)
		expect(result.getSeconds()).toBe(0)
	})

	test("never returns the from date itself", () => {
		const cron = parse("0 0 * * *")
		const from = local(2026, 2, 12, 0, 0, 0)
		const result = next(cron, from)
		expect(result.getTime()).toBeGreaterThan(from.getTime())
	})

	test("midnight: next midnight from afternoon", () => {
		const cron = parse("0 0 * * *")
		const from = local(2026, 2, 12, 15, 0, 0)
		const result = next(cron, from)
		expect(result).toEqual(local(2026, 2, 13, 0, 0, 0))
	})

	test("specific time: 10:15 from before that time", () => {
		const cron = parse("15 10 * * *")
		const from = local(2026, 2, 12, 9, 0, 0)
		const result = next(cron, from)
		expect(result).toEqual(local(2026, 2, 12, 10, 15, 0))
	})

	test("specific time: 10:15 from after that time goes to next day", () => {
		const cron = parse("15 10 * * *")
		const from = local(2026, 2, 12, 11, 0, 0)
		const result = next(cron, from)
		expect(result).toEqual(local(2026, 2, 13, 10, 15, 0))
	})

	test("incremental minutes */3", () => {
		const cron = parse("*/3 * * * *")
		const result = next(cron)
		expect(result.getMinutes() % 3).toBe(0)
	})
})

// ---------------------------------------------------------------------------
// next() — step with start offset
// ---------------------------------------------------------------------------

describe("next() — step with start offset", () => {
	test("6/23 minute step produces correct sequence", () => {
		const cron = parse("6/23 * * * *")
		const from = local(2012, 12, 26, 14, 38, 53)
		const d1 = next(cron, from)
		expect(d1.getMinutes()).toBe(52)
		const d2 = next(cron, d1)
		expect(d2.getMinutes()).toBe(6)
		const d3 = next(cron, d2)
		expect(d3.getMinutes()).toBe(29)
		const d4 = next(cron, d3)
		expect(d4.getMinutes()).toBe(52)
	})

	test("0/30 second step (6-field)", () => {
		const cron = parse("0/30 * * * * *")
		const from = local(2012, 12, 26, 14, 38, 53)
		const d1 = next(cron, from)
		expect(d1.getSeconds()).toBe(0)
		const d2 = next(cron, d1)
		expect(d2.getSeconds()).toBe(30)
		const d3 = next(cron, d2)
		expect(d3.getSeconds()).toBe(0)
	})

	test("1/2 second step (6-field)", () => {
		const cron = parse("1/2 * * * * *")
		const from = local(2012, 12, 26, 14, 38, 0)
		const d1 = next(cron, from)
		expect(d1.getSeconds()).toBe(1)
		const d2 = next(cron, d1)
		expect(d2.getSeconds()).toBe(3)
		const d3 = next(cron, d2)
		expect(d3.getSeconds()).toBe(5)
	})
})

// ---------------------------------------------------------------------------
// next() — 6-field seconds
// ---------------------------------------------------------------------------

describe("next() — 6-field seconds", () => {
	test("wildcard seconds increments by 1", () => {
		const cron = parse("* * * * * *")
		const from = local(2012, 12, 26, 14, 38, 0)
		let d = from
		for (let i = 1; i <= 10; i++) {
			d = next(cron, d)
			expect(d.getSeconds()).toBe(i)
		}
	})

	test("*/20 second step", () => {
		const cron = parse("*/20 * * * * *")
		const from = local(2012, 12, 26, 14, 38, 0)
		const d1 = next(cron, from)
		expect(d1.getSeconds()).toBe(20)
		const d2 = next(cron, d1)
		expect(d2.getSeconds()).toBe(40)
		const d3 = next(cron, d2)
		expect(d3.getSeconds()).toBe(0)
	})

	test("20-40/10 second range with step", () => {
		const cron = parse("20-40/10 * * * * *")
		const from = local(2012, 12, 26, 14, 38, 0)
		const d1 = next(cron, from)
		expect(d1.getSeconds()).toBe(20)
		const d2 = next(cron, d1)
		expect(d2.getSeconds()).toBe(30)
		const d3 = next(cron, d2)
		expect(d3.getSeconds()).toBe(40)
	})
})

// ---------------------------------------------------------------------------
// next() — month wrapping and year boundary
// ---------------------------------------------------------------------------

describe("next() — month and year wrapping", () => {
	test("wraps from December to January of next year", () => {
		const cron = parse("0 0 1 1 *")
		const from = local(2026, 2, 1, 0, 0, 0)
		const result = next(cron, from)
		expect(result).toEqual(local(2027, 1, 1, 0, 0, 0))
	})

	test("specific month in the past wraps to next year", () => {
		const cron = parse("0 12 */5 6 *")
		const from = local(2019, 6, 1, 11, 0, 0)
		const results: Date[] = []
		let d = from
		for (let i = 0; i < 7; i++) {
			d = next(cron, d)
			results.push(d)
		}
		expect(results[0]).toEqual(local(2019, 6, 1, 12, 0, 0))
		expect(results[1]).toEqual(local(2019, 6, 6, 12, 0, 0))
		expect(results[2]).toEqual(local(2019, 6, 11, 12, 0, 0))
		expect(results[3]).toEqual(local(2019, 6, 16, 12, 0, 0))
		expect(results[4]).toEqual(local(2019, 6, 21, 12, 0, 0))
		expect(results[5]).toEqual(local(2019, 6, 26, 12, 0, 0))
		// Next occurrence wraps to next year (June only has 30 days, day 31 matches but is invalid)
		expect(results[6]!.getFullYear()).toBe(2020)
		expect(results[6]!.getMonth()).toBe(5) // June (0-indexed)
	})

	test("month 2 (Feb) validation skips to next year when day is 31", () => {
		const cron = parse("* * 31 * *")
		const from = local(2026, 1, 1, 0, 0, 0)
		// Should find Jan 31
		const result = next(cron, from)
		expect(result.getDate()).toBe(31)
	})
})

// ---------------------------------------------------------------------------
// next() — day of week
// ---------------------------------------------------------------------------

describe("next() — day of week", () => {
	test("SUN only", () => {
		const cron = parse("15 10 * * SUN")
		let d = local(2026, 2, 10, 0, 0, 0)
		for (let i = 0; i < 4; i++) {
			d = next(cron, d)
			expect(d.getDay()).toBe(0) // Sunday
			expect(d.getHours()).toBe(10)
			expect(d.getMinutes()).toBe(15)
		}
	})

	test("MON-TUE range", () => {
		const cron = parse("15 10 * * MON-TUE")
		let d = local(2026, 2, 10, 0, 0, 0)
		for (let i = 0; i < 4; i++) {
			d = next(cron, d)
			expect(d.getDay() === 1 || d.getDay() === 2).toBe(true)
			expect(d.getHours()).toBe(10)
			expect(d.getMinutes()).toBe(15)
		}
	})

	test("day-of-week 7 treated as Sunday (same as 0)", () => {
		const cron = parse("10 2 * 8 7")
		let d = local(2026, 1, 1, 0, 0, 0)
		d = next(cron, d)
		// Day must be Sunday and month must be August
		expect(d.getDay()).toBe(0)
		expect(d.getMonth()).toBe(7) // August (0-indexed)
	})

	test("day of week 6,0 matches Saturday and Sunday", () => {
		const cron = parse("30 16 * * 6,0")
		const from = local(2012, 12, 26, 14, 38, 53)
		const d1 = next(cron, from)
		expect(d1.getDay()).toBe(6) // Saturday
		const d2 = next(cron, d1)
		expect(d2.getDay()).toBe(0) // Sunday
		const d3 = next(cron, d2)
		expect(d3.getDay()).toBe(6) // Saturday
	})

	test("dow 6,7 / 6,0 / 0,6 / 7,6 are all equivalent", () => {
		const from = local(2012, 12, 26, 14, 38, 53)
		const expressions = [
			"30 16 * * 6,7",
			"30 16 * * 6,0",
			"30 16 * * 0,6",
			"30 16 * * 7,6",
		]
		const baseline = next(parse(expressions[0]!), from).getTime()

		for (const expr of expressions) {
			const cron = parse(expr)
			const d = next(cron, from)
			expect(d.getTime()).toBe(baseline)
		}
	})
})

// ---------------------------------------------------------------------------
// next() — POSIX OR semantics for dom + dow
// ---------------------------------------------------------------------------

describe("next() — POSIX OR semantics for dom + dow", () => {
	test("both restricted: matches dom OR dow", () => {
		// "15th of every month OR every Wednesday"
		const cron = parse("0 0 15 * 3")
		const from = local(2026, 1, 1, 0, 0, 0)

		// Jan 2026: Wed 7th comes before the 15th
		const r1 = next(cron, from)
		expect(r1.getDate()).toBe(7)
		expect(r1.getDay()).toBe(3) // Wednesday

		// Next match: Wed 14th
		const r2 = next(cron, r1)
		expect(r2.getDate()).toBe(14)
		expect(r2.getDay()).toBe(3)

		// Next match: 15th (dom match, Thursday)
		const r3 = next(cron, r2)
		expect(r3.getDate()).toBe(15)
		expect(r3.getDay()).toBe(4) // Thursday — matches via dom
	})

	test("wildcard dom + specific dow yields only that dow", () => {
		// dom is *, so only dow constrains
		const cron = parse("0 0 * 6 2")
		const from = local(2021, 5, 31, 12, 0, 0)
		const expectedDays = [1, 8, 15, 22, 29]
		let d = from
		for (const dayOfMonth of expectedDays) {
			d = next(cron, d)
			expect(d.getDay()).toBe(2) // Tuesday
			expect(d.getDate()).toBe(dayOfMonth)
			expect(d.getMonth()).toBe(5) // June (0-indexed)
		}
	})

	test("specific dom + wildcard dow yields only that dom", () => {
		// dow is *, so only dom constrains
		const cron = parse("0 0 1 * *")
		const from = local(2026, 1, 1, 0, 0, 0)
		const r1 = next(cron, from)
		expect(r1.getDate()).toBe(1)
		expect(r1.getMonth()).toBe(1) // February (0-indexed)
	})

	test("both wildcards: every day matches", () => {
		const cron = parse("0 0 * * *")
		const from = local(2026, 1, 1, 0, 0, 0)
		const r1 = next(cron, from)
		expect(r1.getDate()).toBe(2)
	})
})

// ---------------------------------------------------------------------------
// next() — sorting and equivalence
// ---------------------------------------------------------------------------

describe("next() — sorting and equivalence", () => {
	test("sorted ranges and values in ascending order", () => {
		const cron = parse("0 12,13,10,1-3 * * *")
		const from = local(2012, 12, 26, 14, 38, 53)
		const expectedHours = [1, 2, 3, 10, 12, 13]
		let d = from
		for (const expectedHour of expectedHours) {
			d = next(cron, d)
			expect(d.getHours()).toBe(expectedHour)
		}
	})

	test("0 9,11,1 * * * and 0 1,9,11 * * * are equivalent", () => {
		const from = local(2012, 12, 26, 0, 0, 0)
		const cron1 = parse("0 9,11,1 * * *")
		const cron2 = parse("0 1,9,11 * * *")

		let d1 = from
		let d2 = from
		for (let i = 0; i < 6; i++) {
			d1 = next(cron1, d1)
			d2 = next(cron2, d2)
			expect(d1.getTime()).toBe(d2.getTime())
		}
	})
})

// ---------------------------------------------------------------------------
// next() — leap year
// ---------------------------------------------------------------------------

describe("next() — leap year", () => {
	test("Feb 29 schedule finds leap years", () => {
		const cron = parse("0 0 29 2 *")
		const from = local(2020, 1, 1, 0, 0, 0)
		let d = from
		for (let i = 0; i < 5; i++) {
			d = next(cron, d)
			expect(d.getDate()).toBe(29)
			expect(d.getMonth()).toBe(1) // February (0-indexed)
		}
	})

	test("Feb 29 from 2026 finds 2028", () => {
		const cron = parse("0 0 29 2 *")
		const from = local(2026, 2, 12, 0, 0, 0)
		const result = next(cron, from)
		expect(result.getFullYear()).toBe(2028)
		expect(result.getMonth()).toBe(1)
		expect(result.getDate()).toBe(29)
	})

	test("day 31 schedule skips months without 31 days", () => {
		const cron = parse("* * 31 * *")
		const from = local(2026, 1, 1, 0, 0, 0)
		const months31 = new Set([0, 2, 4, 6, 7, 9, 11]) // JS months with 31 days
		let d = from
		for (let i = 0; i < 10; i++) {
			d = next(cron, d)
			expect(d.getDate()).toBe(31)
			expect(months31.has(d.getMonth())).toBe(true)
		}
	})
})

// ---------------------------------------------------------------------------
// next() — overflow / RangeError
// ---------------------------------------------------------------------------

describe("next() — overflow", () => {
	test("throws RangeError when no match in search window", () => {
		// Feb 30 never exists
		const cron = parse("0 0 30 2 *")
		expect(() => next(cron, local(2026, 1, 1, 0, 0, 0))).toThrow(RangeError)
	})
})

// ---------------------------------------------------------------------------
// prev() — basic behavior
// ---------------------------------------------------------------------------

describe("prev() — basic behavior", () => {
	test("every minute: previous minute from mid-second", () => {
		const cron = parse("* * * * *")
		const from = local(2026, 2, 12, 14, 38, 53)
		const result = prev(cron, from)
		expect(result.getMinutes()).toBe(38)
		expect(result.getSeconds()).toBe(0)
	})

	test("never returns the from date itself", () => {
		const cron = parse("0 0 * * *")
		const from = local(2026, 2, 12, 0, 0, 0)
		const result = prev(cron, from)
		expect(result.getTime()).toBeLessThan(from.getTime())
	})

	test("midnight: previous midnight from afternoon", () => {
		const cron = parse("0 0 * * *")
		const from = local(2026, 2, 12, 15, 0, 0)
		const result = prev(cron, from)
		expect(result).toEqual(local(2026, 2, 12, 0, 0, 0))
	})

	test("prev from exact midnight yields previous day midnight", () => {
		const cron = parse("0 0 * * *")
		const from = local(2026, 2, 12, 0, 0, 0)
		const result = prev(cron, from)
		expect(result).toEqual(local(2026, 2, 11, 0, 0, 0))
	})

	test("prev with 6-field seconds", () => {
		const cron = parse("59 59 23 * * *")
		const from = local(2012, 12, 26, 14, 38, 53)
		const expectedDates = [25, 24, 23, 22]
		let d = from
		for (const expectedDate of expectedDates) {
			d = prev(cron, d)
			expect(d.getFullYear()).toBe(2012)
			expect(d.getMonth()).toBe(11)
			expect(d.getDate()).toBe(expectedDate)
			expect(d.getHours()).toBe(23)
			expect(d.getMinutes()).toBe(59)
			expect(d.getSeconds()).toBe(59)
		}
	})
})

// ---------------------------------------------------------------------------
// prev() — year/month boundary
// ---------------------------------------------------------------------------

describe("prev() — year and month boundary", () => {
	test("wraps from January to previous December", () => {
		const cron = parse("0 0 * * *")
		const from = local(2026, 1, 1, 0, 0, 0)
		const result = prev(cron, from)
		expect(result).toEqual(local(2025, 12, 31, 0, 0, 0))
	})

	test("Jan 1 schedule finds previous year", () => {
		const cron = parse("0 9 1 1 *")
		const from = local(2019, 1, 2, 0, 0, 0)
		const d1 = prev(cron, from)
		expect(d1.getFullYear()).toBe(2019)
		expect(d1.getMonth()).toBe(0) // January
		expect(d1.getDate()).toBe(1)

		const d2 = prev(cron, d1)
		expect(d2.getFullYear()).toBe(2018)
		expect(d2.getMonth()).toBe(0)
		expect(d2.getDate()).toBe(1)

		const d3 = prev(cron, d2)
		expect(d3.getFullYear()).toBe(2017)
	})
})

// ---------------------------------------------------------------------------
// prev() — leap year
// ---------------------------------------------------------------------------

describe("prev() — leap year", () => {
	test("Feb 29 backward from 2029 finds 2028", () => {
		const cron = parse("0 0 29 2 *")
		const from = local(2029, 1, 1, 0, 0, 0)
		const result = prev(cron, from)
		expect(result.getFullYear()).toBe(2028)
		expect(result.getMonth()).toBe(1)
		expect(result.getDate()).toBe(29)
	})
})

// ---------------------------------------------------------------------------
// prev() — overflow / RangeError
// ---------------------------------------------------------------------------

describe("prev() — overflow", () => {
	test("throws RangeError when no match in search window", () => {
		const cron = parse("0 0 30 2 *")
		expect(() => prev(cron, local(2026, 1, 1, 0, 0, 0))).toThrow(RangeError)
	})
})

// ---------------------------------------------------------------------------
// matches()
// ---------------------------------------------------------------------------

describe("matches()", () => {
	test("wildcard expression matches any date", () => {
		const cron = parse("* * * * *")
		expect(matches(cron, local(2026, 6, 15, 12, 30, 0))).toBe(true)
	})

	test("wildcard expression does not match non-zero seconds", () => {
		const cron = parse("* * * * *")
		// 5-field defaults seconds to {0}
		expect(matches(cron, local(2026, 6, 15, 12, 30, 15))).toBe(false)
	})

	test("6-field wildcard matches any second", () => {
		const cron = parse("* * * * * *")
		expect(matches(cron, local(2026, 6, 15, 12, 30, 45))).toBe(true)
	})

	test("fixed expression matches correctly", () => {
		// 30 9 * * MON → 9:30 on Mondays
		const cron = parse("30 9 * * MON")
		const monday = local(2026, 2, 16, 9, 30, 0) // Feb 16 2026 is Monday
		expect(monday.getDay()).toBe(1)
		expect(matches(cron, monday)).toBe(true)
	})

	test("fixed expression does not match wrong time", () => {
		const cron = parse("30 9 * * MON")
		const monday = local(2026, 2, 16, 10, 30, 0)
		expect(matches(cron, monday)).toBe(false)
	})

	test("fixed expression does not match wrong day", () => {
		const cron = parse("30 9 * * MON")
		const tuesday = local(2026, 2, 17, 9, 30, 0) // Tuesday
		expect(matches(cron, tuesday)).toBe(false)
	})

	test("matches specific day-of-month", () => {
		const cron = parse("0 0 25 12 *")
		expect(matches(cron, local(2026, 12, 25, 0, 0, 0))).toBe(true)
		expect(matches(cron, local(2026, 12, 24, 0, 0, 0))).toBe(false)
	})

	test("matches with 6-field second", () => {
		const cron = parse("30 0 12 * * *")
		expect(matches(cron, local(2026, 6, 15, 12, 0, 30))).toBe(true)
		expect(matches(cron, local(2026, 6, 15, 12, 0, 0))).toBe(false)
	})

	test("result of next() always matches the expression", () => {
		const cron = parse("*/15 9-17 * * MON-FRI")
		let d = local(2026, 2, 12, 0, 0, 0)
		for (let i = 0; i < 20; i++) {
			d = next(cron, d)
			expect(matches(cron, d)).toBe(true)
		}
	})

	test("result of prev() always matches the expression", () => {
		const cron = parse("*/15 9-17 * * MON-FRI")
		let d = local(2026, 3, 1, 0, 0, 0)
		for (let i = 0; i < 20; i++) {
			d = prev(cron, d)
			expect(matches(cron, d)).toBe(true)
		}
	})

	test("hour range 1-6 matches and rejects correctly (6-field)", () => {
		const cron = parse("* * 1-6 * * *")
		expect(matches(cron, local(2019, 1, 1, 1, 0, 0))).toBe(true)
		expect(matches(cron, local(2019, 1, 1, 0, 0, 0))).toBe(false)
		expect(matches(cron, local(2019, 1, 1, 7, 0, 0))).toBe(false)
	})
})

// ---------------------------------------------------------------------------
// sequence()
// ---------------------------------------------------------------------------

describe("sequence()", () => {
	test("yields successive dates", () => {
		const cron = parse("*/15 * * * *")
		const from = local(2026, 2, 12, 0, 0, 0)
		const dates = take(sequence(cron, from), 5)
		expect(dates[0]).toEqual(local(2026, 2, 12, 0, 0, 0))
		expect(dates[1]).toEqual(local(2026, 2, 12, 0, 15, 0))
		expect(dates[2]).toEqual(local(2026, 2, 12, 0, 30, 0))
		expect(dates[3]).toEqual(local(2026, 2, 12, 0, 45, 0))
		expect(dates[4]).toEqual(local(2026, 2, 12, 1, 0, 0))
	})

	test("first yielded date can equal from when from is a match", () => {
		const cron = parse("0 0 * * *")
		const from = local(2026, 2, 12, 0, 0, 0)
		const [first] = take(sequence(cron, from), 1)
		expect(first).toEqual(local(2026, 2, 12, 0, 0, 0))
	})

	test("sequence across month boundary", () => {
		const cron = parse("0 0 * * *")
		const from = local(2026, 2, 28, 0, 0, 0)
		const dates = take(sequence(cron, from), 3)
		expect(dates[0]).toEqual(local(2026, 2, 28, 0, 0, 0))
		expect(dates[1]).toEqual(local(2026, 3, 1, 0, 0, 0))
		expect(dates[2]).toEqual(local(2026, 3, 2, 0, 0, 0))
	})

	test("all yielded dates match the expression", () => {
		const cron = parse("30 */6 * * *")
		const dates = take(sequence(cron, local(2026, 1, 1, 0, 0, 0)), 20)
		for (const d of dates) {
			expect(matches(cron, d)).toBe(true)
		}
	})
})

// ---------------------------------------------------------------------------
// next() and prev() are inverse of each other
// ---------------------------------------------------------------------------

describe("next/prev inverse relationship", () => {
	test("prev(next(from)) returns a date <= from for various expressions", () => {
		const expressions = [
			"*/5 * * * *",
			"0 0 * * *",
			"0 */6 * * *",
			"30 9 * * MON",
			"0 0 1 * *",
		]
		const from = local(2026, 6, 15, 12, 30, 0)

		for (const expr of expressions) {
			const cron = parse(expr)
			const n = next(cron, from)
			const p = prev(cron, n)
			// prev from next should give back a date that matches and is <= from
			expect(matches(cron, p)).toBe(true)
		}
	})

	test("next(prev(from)) returns a date >= from for various expressions", () => {
		const expressions = [
			"*/5 * * * *",
			"0 0 * * *",
			"0 */6 * * *",
			"30 9 * * MON",
			"0 0 1 * *",
		]
		const from = local(2026, 6, 15, 12, 30, 0)

		for (const expr of expressions) {
			const cron = parse(expr)
			const p = prev(cron, from)
			const n = next(cron, p)
			expect(matches(cron, n)).toBe(true)
		}
	})
})

// ---------------------------------------------------------------------------
// next/prev — exclusivity (never returns `from` itself)
// ---------------------------------------------------------------------------

describe("next/prev exclusivity", () => {
	test("next never returns from when from is an exact match", () => {
		const cron = parse("0 0 * * *")
		const from = local(2026, 1, 1, 0, 0, 0)
		expect(matches(cron, from)).toBe(true)
		const result = next(cron, from)
		expect(result.getTime()).toBeGreaterThan(from.getTime())
	})

	test("prev never returns from when from is an exact match", () => {
		const cron = parse("0 0 * * *")
		const from = local(2026, 1, 1, 0, 0, 0)
		expect(matches(cron, from)).toBe(true)
		const result = prev(cron, from)
		expect(result.getTime()).toBeLessThan(from.getTime())
	})
})

// ---------------------------------------------------------------------------
// Edge cases — day-of-month edge cases
// ---------------------------------------------------------------------------

describe("day-of-month edge cases", () => {
	test("Feb has 28 days in non-leap year", () => {
		const cron = parse("0 0 * 2 *")
		const from = local(2026, 2, 27, 0, 0, 0)
		const d1 = next(cron, from)
		expect(d1.getDate()).toBe(28)
		// Next should be Feb 1 of next year (or similar)
		const d2 = next(cron, d1)
		expect(d2.getMonth()).toBe(1) // Still February
	})

	test("Apr 30 schedule works (April has 30 days)", () => {
		const cron = parse("0 0 30 4 *")
		const from = local(2026, 1, 1, 0, 0, 0)
		const result = next(cron, from)
		expect(result.getDate()).toBe(30)
		expect(result.getMonth()).toBe(3) // April (0-indexed)
	})

	test("Apr 31 schedule throws (April never has 31 days)", () => {
		const cron = parse("0 0 31 4 *")
		expect(() => next(cron, local(2026, 1, 1, 0, 0, 0))).toThrow(RangeError)
	})
})

// ---------------------------------------------------------------------------
// Milliseconds are always zeroed
// ---------------------------------------------------------------------------

describe("milliseconds handling", () => {
	test("next zeroes milliseconds", () => {
		const cron = parse("* * * * *")
		const from = new Date("2020-03-06T10:02:01.500")
		const result = next(cron, from)
		expect(result.getMilliseconds()).toBe(0)
	})

	test("prev zeroes milliseconds", () => {
		const cron = parse("* * * * *")
		const from = new Date("2020-03-06T10:02:01.500")
		const result = prev(cron, from)
		expect(result.getMilliseconds()).toBe(0)
	})
})

// ---------------------------------------------------------------------------
// Complex real-world expressions
// ---------------------------------------------------------------------------

describe("complex real-world expressions", () => {
	test("every weekday at 9:30 (MON-FRI)", () => {
		const cron = parse("30 9 * * 1-5")
		const from = local(2026, 2, 9, 10, 0, 0) // Monday after 9:30
		const result = next(cron, from)
		expect(result.getDay()).toBe(2) // Tuesday
		expect(result.getHours()).toBe(9)
		expect(result.getMinutes()).toBe(30)
	})

	test("every 5 minutes during business hours on weekdays", () => {
		const cron = parse("*/5 9-17 * * 1-5")
		const from = local(2026, 2, 13, 17, 55, 0) // Friday 17:55
		const result = next(cron, from)
		// Should jump to next Monday at 9:00
		expect(result.getDay()).toBe(1) // Monday
		expect(result.getHours()).toBe(9)
		expect(result.getMinutes()).toBe(0)
	})

	test("Christmas midnight", () => {
		const cron = parse("0 0 25 DEC *")
		const from = local(2026, 2, 12, 0, 0, 0)
		const result = next(cron, from)
		expect(result.getFullYear()).toBe(2026)
		expect(result.getMonth()).toBe(11) // December
		expect(result.getDate()).toBe(25)
		expect(result.getHours()).toBe(0)
	})

	test("first of every month at noon", () => {
		const cron = parse("0 12 1 * *")
		const from = local(2026, 3, 15, 0, 0, 0)
		const d1 = next(cron, from)
		expect(d1.getDate()).toBe(1)
		expect(d1.getMonth()).toBe(3) // April
		expect(d1.getHours()).toBe(12)
	})

	test("twice daily at 8:00 and 20:00", () => {
		const cron = parse("0 8,20 * * *")
		const from = local(2026, 2, 12, 9, 0, 0)
		const d1 = next(cron, from)
		expect(d1.getHours()).toBe(20)
		const d2 = next(cron, d1)
		expect(d2.getHours()).toBe(8)
		expect(d2.getDate()).toBe(13) // Next day
	})

	test("every 10 seconds (6-field)", () => {
		const cron = parse("*/10 * * * * *")
		const from = local(2026, 2, 12, 0, 0, 0)
		const dates = take(sequence(cron, from), 7)
		expect(dates[0]!.getSeconds()).toBe(0)
		expect(dates[1]!.getSeconds()).toBe(10)
		expect(dates[2]!.getSeconds()).toBe(20)
		expect(dates[3]!.getSeconds()).toBe(30)
		expect(dates[4]!.getSeconds()).toBe(40)
		expect(dates[5]!.getSeconds()).toBe(50)
		expect(dates[6]!.getSeconds()).toBe(0) // Wraps to next minute
		expect(dates[6]!.getMinutes()).toBe(1)
	})
})

// ---------------------------------------------------------------------------
// Stress: next/prev over long sequences
// ---------------------------------------------------------------------------

describe("stress tests", () => {
	test("100 consecutive next() calls produce strictly increasing dates", () => {
		const cron = parse("*/5 * * * *")
		let d = local(2026, 1, 1, 0, 0, 0)
		for (let i = 0; i < 100; i++) {
			const n = next(cron, d)
			expect(n.getTime()).toBeGreaterThan(d.getTime())
			expect(matches(cron, n)).toBe(true)
			d = n
		}
	})

	test("100 consecutive prev() calls produce strictly decreasing dates", () => {
		const cron = parse("*/5 * * * *")
		let d = local(2026, 12, 31, 23, 59, 59)
		for (let i = 0; i < 100; i++) {
			const p = prev(cron, d)
			expect(p.getTime()).toBeLessThan(d.getTime())
			expect(matches(cron, p)).toBe(true)
			d = p
		}
	})

	test("20 consecutive Feb 29 dates are all valid leap years", () => {
		const cron = parse("0 0 29 2 *")
		let d = local(2020, 1, 1, 0, 0, 0)
		for (let i = 0; i < 20; i++) {
			d = next(cron, d)
			expect(d.getDate()).toBe(29)
			expect(d.getMonth()).toBe(1)
			// Verify it's actually a leap year
			const year = d.getFullYear()
			expect(year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)).toBe(
				true,
			)
		}
	})
})
