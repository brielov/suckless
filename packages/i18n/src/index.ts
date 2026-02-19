/** A translation entry: either a plain string or a function. */
export type Entry = string | ((...args: never[]) => string)

/** A dictionary of translation entries keyed by message name. */
export type Dict = Record<string, Entry>

/**
 * A type-safe translate function. Keys and parameters are inferred
 * from the dictionary type `D`.
 */
export type TranslateFn<D extends Dict> = <K extends keyof D & string>(
	key: K,
	...args: D[K] extends (...args: infer A) => string ? A : []
) => string

/**
 * Wrap a dictionary in a type-safe translate function.
 *
 * String entries are returned as-is. Function entries are called
 * with the provided arguments.
 */
export function translate<D extends Dict>(dict: D): TranslateFn<D> {
	return (key, ...args) => {
		const entry = dict[key]
		if (typeof entry === "string") {
			return entry
		}
		// oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion -- Safe by construction: only typed entries are stored in the dict.
		return (entry as (...a: unknown[]) => string)(...args)
	}
}

/**
 * Resolve a locale string against a set of supported locales using
 * BCP 47 prefix stripping.
 *
 * Tries the exact locale, then progressively strips subtags
 * (e.g. `es-AR` → `es`). Returns the fallback when no match is found.
 *
 * Only the keys of `locales` are used — values are ignored. This
 * lets you pass a loaders record or a dict record directly.
 */
export function resolve<L extends Readonly<Record<string, unknown>>>(
	locales: L,
	fallback: keyof L & string,
	locale: string,
): keyof L & string {
	if (!Object.hasOwn(locales, fallback)) {
		throw new Error(`Fallback locale "${fallback}" not found in locales`)
	}
	let tag = locale
	while (tag) {
		if (Object.hasOwn(locales, tag)) {
			return tag as keyof L & string
		}
		const i = tag.lastIndexOf("-")
		if (i === -1) {
			break
		}
		tag = tag.slice(0, i)
	}
	return fallback
}

/**
 * Merge a base dictionary with partial overrides.
 *
 * `Partial<D>` constrains overrides to only keys that exist in `base`
 * with matching types. The return type preserves `D` so the result
 * is assignable back to the same type.
 */
export function merge<D extends Dict>(base: D, overrides: Partial<D>): D {
	return { ...base, ...overrides }
}
