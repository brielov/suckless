/** Supported unit suffixes. */
export type Unit = "ms" | "s" | "m" | "h" | "d"

const UNIT_MS: [Unit, number][] = [
	["d", 86_400_000],
	["h", 3_600_000],
	["m", 60_000],
	["s", 1000],
	["ms", 1],
]

const UNIT_MAP = new Map<string, number>(UNIT_MS)

const TOKEN = /(\d+(?:\.\d+)?)(ms|s|m|h|d)/g

/** Parse a duration string into milliseconds. */
export function parse(input: string): number {
	const trimmed = input.trim()
	if (trimmed === "") {
		throw new SyntaxError("Duration string must not be empty")
	}

	let total = 0
	let matched = 0

	for (const [segment, digits, unit] of trimmed.matchAll(TOKEN)) {
		const value = Number(digits)
		const multiplier = UNIT_MAP.get(unit!)
		if (multiplier !== undefined) {
			total += value * multiplier
		}
		matched += segment.length
	}

	const stripped = trimmed.replaceAll(/\s/g, "")
	if (matched === 0 || matched !== stripped.length) {
		throw new SyntaxError(`Invalid duration: "${input}"`)
	}

	return Math.round(total)
}

/** Format milliseconds into a human-readable duration string. */
export function format(ms: number): string {
	if (!Number.isFinite(ms) || ms < 0) {
		throw new RangeError("Duration must be a non-negative finite number")
	}

	if (ms === 0) {
		return "0ms"
	}

	let remaining = Math.trunc(ms)
	let result = ""

	for (const [unit, multiplier] of UNIT_MS) {
		if (remaining >= multiplier) {
			const count = Math.trunc(remaining / multiplier)
			remaining -= count * multiplier
			result += `${count}${unit}`
		}
	}

	return result || "0ms"
}
