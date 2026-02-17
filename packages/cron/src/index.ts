/**
 * Cron expression parser with next/prev schedule computation.
 *
 * Supports 5-field (minute hour dom month dow) and 6-field
 * (second minute hour dom month dow) expressions.
 *
 * Uses POSIX OR semantics for day matching: when both day-of-month
 * and day-of-week are restricted (not `*`), a date matches if it
 * satisfies either condition.
 */

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

export interface CronExpression {
	readonly seconds: ReadonlySet<number>
	readonly minutes: ReadonlySet<number>
	readonly hours: ReadonlySet<number>
	readonly daysOfMonth: ReadonlySet<number>
	readonly months: ReadonlySet<number>
	readonly daysOfWeek: ReadonlySet<number>
	/** True when the day-of-month field was restricted (not `*`). */
	readonly domRestricted: boolean
	/** True when the day-of-week field was restricted (not `*`). */
	readonly dowRestricted: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONTH_NAMES: Record<string, number> = {
	JAN: 1,
	FEB: 2,
	MAR: 3,
	APR: 4,
	MAY: 5,
	JUN: 6,
	JUL: 7,
	AUG: 8,
	SEP: 9,
	OCT: 10,
	NOV: 11,
	DEC: 12,
}

const DOW_NAMES: Record<string, number> = {
	SUN: 0,
	MON: 1,
	TUE: 2,
	WED: 3,
	THU: 4,
	FRI: 5,
	SAT: 6,
}

// ---------------------------------------------------------------------------
// Field parsing
// ---------------------------------------------------------------------------

function resolveNamedValue(
	token: string,
	names: Record<string, number> | undefined,
): number {
	if (token === "") {
		throw new SyntaxError("Empty value in expression")
	}
	if (names !== undefined) {
		const mapped = names[token.toUpperCase()]
		if (mapped !== undefined) {
			return mapped
		}
	}
	const n = Number(token)
	if (!Number.isInteger(n)) {
		throw new SyntaxError(`Invalid value: "${token}"`)
	}
	return n
}

function expandField(
	field: string,
	min: number,
	max: number,
	names?: Record<string, number>,
	normalizeFn?: (v: number) => number,
): Set<number> {
	// When a normalizeFn exists (e.g. DOW 7→0), raw input values may exceed
	// `max` before normalization. Allow the raw upper bound to be max+1 so
	// that ranges like 6-7 parse correctly, then normalize each value.
	const rawMax = normalizeFn !== undefined ? max + 1 : max
	const result = new Set<number>()

	for (const part of field.split(",")) {
		let base: string
		let step: number | undefined

		const slashIndex = part.indexOf("/")
		if (slashIndex !== -1) {
			base = part.slice(0, slashIndex)
			step = Number(part.slice(slashIndex + 1))
			if (!Number.isInteger(step) || step <= 0) {
				throw new SyntaxError(`Invalid step value in "${part}"`)
			}
		} else {
			base = part
		}

		let rangeMin: number
		let rangeMax: number

		if (base === "*") {
			rangeMin = min
			rangeMax = max
		} else {
			const dashIndex = base.indexOf("-")
			if (dashIndex !== -1) {
				rangeMin = resolveNamedValue(base.slice(0, dashIndex), names)
				rangeMax = resolveNamedValue(base.slice(dashIndex + 1), names)
				if (rangeMin < min || rangeMax > rawMax || rangeMin > rangeMax) {
					throw new SyntaxError(
						`Range out of bounds: "${base}" (valid: ${String(min)}-${String(rawMax)})`,
					)
				}
			} else {
				let value = resolveNamedValue(base, names)
				if (normalizeFn !== undefined) {
					value = normalizeFn(value)
				}
				if (value < min || value > max) {
					throw new SyntaxError(
						`Value out of bounds: ${String(value)} (valid: ${String(min)}-${String(max)})`,
					)
				}
				if (step !== undefined) {
					rangeMin = value
					rangeMax = max
				} else {
					result.add(value)
					continue
				}
			}
		}

		const s = step ?? 1
		for (let i = rangeMin; i <= rangeMax; i += s) {
			result.add(normalizeFn !== undefined ? normalizeFn(i) : i)
		}
	}

	if (result.size === 0) {
		throw new SyntaxError(`Field "${field}" produced no values`)
	}

	return result
}

/** Normalize day-of-week 7 → 0 (both mean Sunday). */
function normalizeDow(v: number): number {
	return v === 7 ? 0 : v
}

// ---------------------------------------------------------------------------
// parse()
// ---------------------------------------------------------------------------

export function parse(expression: string): CronExpression {
	const tokens = expression.trim().split(/\s+/)

	if (tokens.length !== 5 && tokens.length !== 6) {
		throw new SyntaxError(
			`Expected 5 or 6 fields, got ${String(tokens.length)}: "${expression}"`,
		)
	}

	const isSixField = tokens.length === 6
	let i = 0

	const seconds = isSixField ? expandField(tokens[i++]!, 0, 59) : new Set([0])
	const minutes = expandField(tokens[i++]!, 0, 59)
	const hours = expandField(tokens[i++]!, 0, 23)
	const domToken = tokens[i++]!
	const daysOfMonth = expandField(domToken, 1, 31)
	const months = expandField(tokens[i++]!, 1, 12, MONTH_NAMES)
	const dowToken = tokens[i++]!
	const daysOfWeek = expandField(dowToken, 0, 6, DOW_NAMES, normalizeDow)

	const domRestricted = domToken !== "*"
	const dowRestricted = dowToken !== "*"

	return {
		seconds,
		minutes,
		hours,
		daysOfMonth,
		months,
		daysOfWeek,
		domRestricted,
		dowRestricted,
	}
}

// ---------------------------------------------------------------------------
// matches()
// ---------------------------------------------------------------------------

export function matches(cron: CronExpression, date: Date): boolean {
	if (
		!cron.seconds.has(date.getSeconds()) ||
		!cron.minutes.has(date.getMinutes()) ||
		!cron.hours.has(date.getHours()) ||
		!cron.months.has(date.getMonth() + 1)
	) {
		return false
	}
	return matchesDay(cron, date.getDate(), date.getDay())
}

// ---------------------------------------------------------------------------
// Sorted set helpers
// ---------------------------------------------------------------------------

interface SortedFields {
	months: number[]
	hours: number[]
	minutes: number[]
	seconds: number[]
}

const sortedCache = new WeakMap<CronExpression, SortedFields>()

function sortSet(s: ReadonlySet<number>): number[] {
	return [...s].toSorted((a, b) => a - b)
}

function getSorted(cron: CronExpression): SortedFields {
	let cached = sortedCache.get(cron)
	if (cached === undefined) {
		cached = {
			months: sortSet(cron.months),
			hours: sortSet(cron.hours),
			minutes: sortSet(cron.minutes),
			seconds: sortSet(cron.seconds),
		}
		sortedCache.set(cron, cached)
	}
	return cached
}

/** Return the smallest value in `sorted` that is >= `target`, or undefined. */
function findForward(sorted: number[], target: number): number | undefined {
	for (const v of sorted) {
		if (v >= target) {
			return v
		}
	}
	return undefined
}

/** Return the largest value in `sorted` that is <= `target`, or undefined. */
function findBackward(sorted: number[], target: number): number | undefined {
	for (let i = sorted.length - 1; i >= 0; i--) {
		if (sorted[i]! <= target) {
			return sorted[i]
		}
	}
	return undefined
}

// ---------------------------------------------------------------------------
// Date component helpers
// ---------------------------------------------------------------------------

function daysInMonth(year: number, month: number): number {
	return new Date(year, month, 0).getDate()
}

/**
 * POSIX OR semantics: when both dom and dow are restricted, a day
 * matches if it satisfies either condition. When only one is
 * restricted, only that constraint applies.
 */
function matchesDay(
	cron: CronExpression,
	dayOfMonth: number,
	dayOfWeek: number,
): boolean {
	const domOk = cron.daysOfMonth.has(dayOfMonth)
	const dowOk = cron.daysOfWeek.has(dayOfWeek)
	if (cron.domRestricted && cron.dowRestricted) {
		return domOk || dowOk
	}
	return domOk && dowOk
}

function isValidDay(
	cron: CronExpression,
	year: number,
	month: number,
	day: number,
): boolean {
	if (day > daysInMonth(year, month)) {
		return false
	}
	const dow = new Date(year, month - 1, day).getDay()
	return matchesDay(cron, day, dow)
}

// ---------------------------------------------------------------------------
// next()
// ---------------------------------------------------------------------------

export function next(cron: CronExpression, from?: Date): Date {
	const start = from !== undefined ? new Date(from) : new Date()

	// Advance by 1 second so we never return `from` itself.
	start.setSeconds(start.getSeconds() + 1, 0)

	let year = start.getFullYear()
	let month = start.getMonth() + 1
	let day = start.getDate()
	let hour = start.getHours()
	let minute = start.getMinutes()
	let second = start.getSeconds()

	const {
		months: sortedMonths,
		hours: sortedHours,
		minutes: sortedMinutes,
		seconds: sortedSeconds,
	} = getSorted(cron)

	const maxYear = year + 5

	while (year < maxYear) {
		// --- Month ---
		const foundMonth = findForward(sortedMonths, month)
		if (foundMonth === undefined) {
			year++
			month = sortedMonths[0]!
			day = 1
			hour = sortedHours[0]!
			minute = sortedMinutes[0]!
			second = sortedSeconds[0]!
			continue
		}
		if (foundMonth !== month) {
			month = foundMonth
			day = 1
			hour = sortedHours[0]!
			minute = sortedMinutes[0]!
			second = sortedSeconds[0]!
		}

		// --- Day ---
		let dayFound = false
		for (let d = day; d <= 31; d++) {
			if (d > daysInMonth(year, month)) {
				break
			}
			if (isValidDay(cron, year, month, d)) {
				if (d !== day) {
					hour = sortedHours[0]!
					minute = sortedMinutes[0]!
					second = sortedSeconds[0]!
				}
				day = d
				dayFound = true
				break
			}
		}
		if (!dayFound) {
			month++
			if (month > 12) {
				month = 1
				year++
			}
			day = 1
			hour = 0
			minute = 0
			second = 0
			continue
		}

		// --- Hour ---
		const foundHour = findForward(sortedHours, hour)
		if (foundHour === undefined) {
			day++
			hour = 0
			minute = 0
			second = 0
			continue
		}
		if (foundHour !== hour) {
			hour = foundHour
			minute = sortedMinutes[0]!
			second = sortedSeconds[0]!
		}

		// --- Minute ---
		const foundMinute = findForward(sortedMinutes, minute)
		if (foundMinute === undefined) {
			hour++
			minute = 0
			second = 0
			continue
		}
		if (foundMinute !== minute) {
			minute = foundMinute
			second = sortedSeconds[0]!
		}

		// --- Second ---
		const foundSecond = findForward(sortedSeconds, second)
		if (foundSecond === undefined) {
			minute++
			second = 0
			continue
		}
		second = foundSecond

		return new Date(year, month - 1, day, hour, minute, second)
	}

	throw new RangeError("No matching date found within 5-year search window")
}

// ---------------------------------------------------------------------------
// prev()
// ---------------------------------------------------------------------------

export function prev(cron: CronExpression, from?: Date): Date {
	const start = from !== undefined ? new Date(from) : new Date()

	// Go back 1 second so we never return `from` itself.
	start.setSeconds(start.getSeconds() - 1, 0)

	let year = start.getFullYear()
	let month = start.getMonth() + 1
	let day = start.getDate()
	let hour = start.getHours()
	let minute = start.getMinutes()
	let second = start.getSeconds()

	const {
		months: sortedMonths,
		hours: sortedHours,
		minutes: sortedMinutes,
		seconds: sortedSeconds,
	} = getSorted(cron)

	const lastMonth = sortedMonths.at(-1)!
	const lastHour = sortedHours.at(-1)!
	const lastMinute = sortedMinutes.at(-1)!
	const lastSecond = sortedSeconds.at(-1)!

	const minYear = year - 5

	while (year > minYear) {
		// --- Month ---
		const foundMonth = findBackward(sortedMonths, month)
		if (foundMonth === undefined) {
			year--
			month = lastMonth
			day = 31
			hour = lastHour
			minute = lastMinute
			second = lastSecond
			continue
		}
		if (foundMonth !== month) {
			month = foundMonth
			day = daysInMonth(year, month)
			hour = lastHour
			minute = lastMinute
			second = lastSecond
		}

		// --- Day ---
		let dayFound = false
		for (let d = day; d >= 1; d--) {
			if (isValidDay(cron, year, month, d)) {
				if (d !== day) {
					hour = lastHour
					minute = lastMinute
					second = lastSecond
				}
				day = d
				dayFound = true
				break
			}
		}
		if (!dayFound) {
			month--
			if (month < 1) {
				month = 12
				year--
			}
			day = daysInMonth(year, month)
			hour = 23
			minute = 59
			second = 59
			continue
		}

		// --- Hour ---
		const foundHour = findBackward(sortedHours, hour)
		if (foundHour === undefined) {
			day--
			if (day < 1) {
				month--
				if (month < 1) {
					month = 12
					year--
				}
				day = daysInMonth(year, month)
			}
			hour = 23
			minute = 59
			second = 59
			continue
		}
		if (foundHour !== hour) {
			hour = foundHour
			minute = lastMinute
			second = lastSecond
		}

		// --- Minute ---
		const foundMinute = findBackward(sortedMinutes, minute)
		if (foundMinute === undefined) {
			hour--
			if (hour < 0) {
				day--
				if (day < 1) {
					month--
					if (month < 1) {
						month = 12
						year--
					}
					day = daysInMonth(year, month)
				}
				hour = 23
			}
			minute = 59
			second = 59
			continue
		}
		if (foundMinute !== minute) {
			minute = foundMinute
			second = lastSecond
		}

		// --- Second ---
		const foundSecond = findBackward(sortedSeconds, second)
		if (foundSecond === undefined) {
			minute--
			if (minute < 0) {
				hour--
				if (hour < 0) {
					day--
					if (day < 1) {
						month--
						if (month < 1) {
							month = 12
							year--
						}
						day = daysInMonth(year, month)
					}
					hour = 23
				}
				minute = 59
			}
			second = 59
			continue
		}
		second = foundSecond

		return new Date(year, month - 1, day, hour, minute, second)
	}

	throw new RangeError("No matching date found within 5-year search window")
}

// ---------------------------------------------------------------------------
// sequence()
// ---------------------------------------------------------------------------

export function* sequence(
	cron: CronExpression,
	from?: Date,
): Generator<Date, never> {
	let current = from !== undefined ? new Date(from) : new Date()
	// Step back 1 second so the first next() call considers `from` itself.
	current.setSeconds(current.getSeconds() - 1, 0)

	for (;;) {
		current = next(cron, current)
		yield current
	}
}
