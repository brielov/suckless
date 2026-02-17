/* oxlint-disable typescript-eslint/no-unsafe-type-assertion -- Schema uses an
   index signature ([key: string]: unknown), so every descriptor property access
   returns unknown and requires a type assertion. These assertions are correct
   by construction: descriptor() creates objects with the expected properties,
   and emit() only accesses them after matching _tag. */

// ============================================================================
// Core Types
// ============================================================================

/**
 * A schema descriptor. Built with combinators like `string`, `object()`,
 * `array()`. Pass to `compile()` to produce a validator function.
 */
export interface Schema<out T = unknown> {
	readonly _tag: string
	readonly _phantom?: T
	readonly [key: string]: unknown
}

/**
 * Extract the TypeScript type from a schema descriptor.
 */
export type Infer<T> = T extends Schema<infer U> ? U : never

/**
 * Map an object of schemas to their inferred types.
 */
type InferObject<T> = { [K in keyof T]: Infer<T[K]> }

// ============================================================================
// Internal — Codegen
// ============================================================================

const TYPEOF_TAGS: Record<string, string> = {
	string: "string",
	boolean: "boolean",
	number: "number",
	integer: "number",
	bigint: "bigint",
}

function esc(s: string): string {
	return s
		.replaceAll("\\", String.raw`\\`)
		.replaceAll("'", String.raw`\'`)
		.replaceAll("\n", String.raw`\n`)
		.replaceAll("\r", String.raw`\r`)
		.replaceAll("\u2028", String.raw`\u2028`)
		.replaceAll("\u2029", String.raw`\u2029`)
}

type PathVal = { s: string } | { d: string }

function throwCode(p: PathVal, msg: string): string {
	const m = esc(msg)
	if ("s" in p) {
		const prefix = p.s ? `${p.s}: ` : ""
		return `throw new Error('${prefix}${m}')`
	}
	return `throw new Error(${p.d}+': ${m}')`
}

function appendKey(p: PathVal, key: string): PathVal {
	const k = esc(key)
	if ("s" in p) {
		return { s: p.s ? `${p.s}.${k}` : k }
	}
	return { d: `${p.d}+'.${k}'` }
}

function appendIndex(p: PathVal, indexVar: string): PathVal {
	if ("s" in p) {
		const prefix = p.s
			? `'${esc(p.s)}['+${indexVar}+']'`
			: `'['+${indexVar}+']'`
		return { d: prefix }
	}
	return { d: `${p.d}+'['+${indexVar}+']'` }
}

function appendTupleIndex(p: PathVal, idx: number): PathVal {
	if ("s" in p) {
		return { s: `${p.s}[${idx}]` }
	}
	return { d: `${p.d}+'[${idx}]'` }
}

function emit(
	d: Schema,
	e: string,
	ctx: unknown[],
	c: { n: number },
	p: PathVal,
): string {
	switch (d._tag) {
		case "string": {
			return `if(typeof ${e}!=='string')${throwCode(p, "expected string")}`
		}
		case "boolean": {
			return `if(typeof ${e}!=='boolean')${throwCode(p, "expected boolean")}`
		}
		case "number": {
			return `if(typeof ${e}!=='number'||!Number.isFinite(${e}))${throwCode(p, "expected finite number")}`
		}
		case "integer": {
			return `if(typeof ${e}!=='number'||!Number.isInteger(${e}))${throwCode(p, "expected integer")}`
		}
		case "bigint": {
			return `if(typeof ${e}!=='bigint')${throwCode(p, "expected bigint")}`
		}
		case "literal": {
			const enc = JSON.stringify(d.value)
			const msg =
				d.value === null ? "null" : `${d.value as string | number | boolean}`
			return `if(${e}!==${enc})${throwCode(p, `expected ${msg}`)}`
		}
		case "oneOf": {
			const values = d.values as (string | number)[]
			const cases = values.map((v) => `case ${JSON.stringify(v)}:`).join("")
			const msg = values.join(", ")
			return `switch(${e}){${cases}break;default:${throwCode(p, `expected one of: ${msg}`)}}`
		}
		case "maybe": {
			const inner = emit(d.inner as Schema, e, ctx, c, p)
			return inner
				? `if(${e}!=null){${inner}}else{${e}=undefined}`
				: `if(${e}===null){${e}=undefined}`
		}
		case "array": {
			const v = `i${c.n++}`
			const inner = emit(
				d.item as Schema,
				`${e}[${v}]`,
				ctx,
				c,
				appendIndex(p, v),
			)
			return `if(!Array.isArray(${e}))${throwCode(p, "expected array")};for(let ${v}=0;${v}<${e}.length;${v}++){${inner}}`
		}
		case "object": {
			const shape = d.shape as Record<string, Schema>
			const parts: string[] = [
				`if(typeof ${e}!=='object'||${e}===null||Array.isArray(${e}))${throwCode(p, "expected object")}`,
			]
			for (const key of Object.keys(shape)) {
				const fd = shape[key]!
				const acc = `${e}[${JSON.stringify(key)}]`
				const kp = appendKey(p, key)
				if (fd._tag === "maybe") {
					parts.push(
						`if(${JSON.stringify(key)} in ${e}){${emit(fd, acc, ctx, c, kp)}}`,
					)
				} else {
					parts.push(emit(fd, acc, ctx, c, kp))
				}
			}
			return parts.join(";")
		}
		case "tuple": {
			const items = d.items as Schema[]
			const len = items.length
			const parts: string[] = [
				`if(!Array.isArray(${e})||${e}.length!==${len})${throwCode(p, `expected tuple of length ${len}`)}`,
			]
			for (let i = 0; i < len; i++) {
				parts.push(
					emit(items[i]!, `${e}[${i}]`, ctx, c, appendTupleIndex(p, i)),
				)
			}
			return parts.join(";")
		}
		case "record": {
			const v = `k${c.n++}`
			const inner = emit(
				d.value as Schema,
				`${e}[${v}]`,
				ctx,
				c,
				appendIndex(p, v),
			)
			return `if(typeof ${e}!=='object'||${e}===null||Array.isArray(${e}))${throwCode(p, "expected object")};for(const ${v} in ${e}){${inner}}`
		}
		case "union": {
			const variants = d.variants as Schema[]
			const typeofMap = new Map<string, Schema>()
			let canDiscriminate = true
			for (const variant of variants) {
				const tag = TYPEOF_TAGS[variant._tag]
				if (tag === undefined || typeofMap.has(tag)) {
					canDiscriminate = false
					break
				}
				typeofMap.set(tag, variant)
			}
			if (canDiscriminate) {
				const cases: string[] = []
				for (const [tag, variant] of typeofMap) {
					let body = ""
					if (variant._tag === "number") {
						body = `if(!Number.isFinite(${e}))${throwCode(p, "expected finite number")}`
					} else if (variant._tag === "integer") {
						body = `if(!Number.isInteger(${e}))${throwCode(p, "expected integer")}`
					}
					cases.push(`case '${tag}':${body};break`)
				}
				return `switch(typeof ${e}){${cases.join(";")};default:${throwCode(p, "union failed")}}`
			}
			if (variants.every((v) => v._tag === "object")) {
				const firstShape = (variants[0] as Schema).shape as Record<
					string,
					Schema
				>
				for (const key of Object.keys(firstShape)) {
					const discMap = new Map<string | number | boolean | null, Schema>()
					let valid = true
					for (const variant of variants) {
						const field = (variant.shape as Record<string, Schema>)[key]
						if (!field || field._tag !== "literal") {
							valid = false
							break
						}
						const val = field.value as string | number | boolean | null
						if (discMap.has(val)) {
							valid = false
							break
						}
						discMap.set(val, variant)
					}
					if (valid && discMap.size === variants.length) {
						const cases: string[] = []
						for (const [val, variant] of discMap) {
							const shape = variant.shape as Record<string, Schema>
							const parts: string[] = []
							for (const fk of Object.keys(shape)) {
								if (fk === key) {
									continue
								}
								const fd = shape[fk]!
								const acc = `${e}[${JSON.stringify(fk)}]`
								const kp = appendKey(p, fk)
								if (fd._tag === "maybe") {
									parts.push(
										`if(${JSON.stringify(fk)} in ${e}){${emit(fd, acc, ctx, c, kp)}}`,
									)
								} else {
									parts.push(emit(fd, acc, ctx, c, kp))
								}
							}
							cases.push(`case ${JSON.stringify(val)}:${parts.join(";")};break`)
						}
						const keyAcc = `${e}[${JSON.stringify(key)}]`
						return `if(typeof ${e}!=='object'||${e}===null||Array.isArray(${e}))${throwCode(p, "expected object")};switch(${keyAcc}){${cases.join(";")};default:${throwCode(p, "union failed")}}`
					}
				}
			}
			const fns: number[] = []
			for (const variant of variants) {
				const idx = ctx.length
				ctx.push(build(variant))
				fns.push(idx)
			}
			const label = `_u${c.n++}`
			const snap = `_s${c.n++}`
			const cloneIdx = ctx.length
			ctx.push(structuredClone)
			// Clone before each try so no variant can mutate state
			// visible to subsequent variants or the caller.
			const tries = fns
				.map(
					(i) =>
						`${e}=v[${cloneIdx}](${snap});try{${e}=v[${i}](${e});break ${label}}catch(_e){err=_e}`,
				)
				.join(";")
			return `var err,${snap}=v[${cloneIdx}](${e});${label}:do{${tries};throw err??new Error('union failed')}while(0)`
		}
		case "transform": {
			const inner = emit(d.inner as Schema, e, ctx, c, p)
			const idx = ctx.length
			ctx.push(d.fn)
			return `${inner};${e}=v[${idx}](${e})`
		}
		case "lazy": {
			const resolved = (d.thunk as () => Schema)()
			const idx = ctx.length
			ctx.push(build(resolved))
			return `${e}=v[${idx}](${e})`
		}
		case "refine": {
			const inner = emit(d.inner as Schema, e, ctx, c, p)
			const idx = ctx.length
			ctx.push(d.fn)
			const msg = (d.message as string | undefined) ?? "refinement failed"
			return `${inner};if(!v[${idx}](${e}))${throwCode(p, msg)}`
		}
		case "preprocess": {
			const idx = ctx.length
			ctx.push(d.fn)
			const inner = emit(d.inner as Schema, e, ctx, c, p)
			return `${e}=v[${idx}](${e});${inner}`
		}
	}
	throw new Error(`Unknown schema tag: "${d._tag}"`)
}

const _building = new WeakSet<Schema>()

function build(d: Schema): (input: unknown) => unknown {
	if (_building.has(d)) {
		let compiled: ((input: unknown) => unknown) | undefined
		const trampoline = (input: unknown): unknown => {
			compiled ??= _cache.get(d)
			if (compiled === undefined) {
				throw new Error("recursive schema not yet compiled")
			}
			return compiled(input)
		}
		return trampoline
	}
	_building.add(d)
	try {
		const ctx: unknown[] = []
		const body = emit(d, "input", ctx, { n: 0 }, { s: "" })
		let fn: (input: unknown) => unknown
		/* oxlint-disable no-new-func, typescript-eslint/no-implied-eval --
		   JIT compilation via new Function is the whole point of this library */
		if (ctx.length === 0) {
			fn = (
				new Function(`return function(input){${body};return input}`) as () => (
					input: unknown,
				) => unknown
			)()
		} else {
			fn = (
				new Function("v", `return function(input){${body};return input}`) as (
					v: unknown[],
				) => (input: unknown) => unknown
			)(ctx)
		}
		/* oxlint-enable no-new-func, typescript-eslint/no-implied-eval */
		return fn
	} finally {
		_building.delete(d)
	}
}

function descriptor<T>(
	tag: string,
	extra?: Record<string, unknown>,
): Schema<T> {
	return { _tag: tag, ...extra } as Schema<T>
}

// ============================================================================
// Primitive Types
// ============================================================================

/**
 * Validates that input is a string.
 */
export const string: Schema<string> = descriptor("string")

/**
 * Validates that input is a boolean.
 */
export const boolean: Schema<boolean> = descriptor("boolean")

/**
 * Validates that input is a finite number.
 */
export const number: Schema<number> = descriptor("number")

/**
 * Validates that input is an integer.
 */
export const integer: Schema<number> = descriptor("integer")

/**
 * Validates that input is a bigint.
 */
export const bigint: Schema<bigint> = descriptor("bigint")

// ============================================================================
// Literal Types
// ============================================================================

/**
 * Validates that input equals a specific literal value.
 */
export function literal<T extends string | number | boolean | null>(
	value: T,
): Schema<T> {
	return descriptor("literal", { value })
}

/**
 * Validates that input is one of the specified values.
 */
export function oneOf<T extends string | number>(...values: T[]): Schema<T> {
	return descriptor("oneOf", { values })
}

// ============================================================================
// Wrappers
// ============================================================================

/**
 * Makes a schema accept null or undefined values.
 * Normalizes both to `undefined` at runtime. In object context, the
 * key may be absent.
 */
export function maybe<T>(inner: Schema<T>): Schema<T | undefined> {
	return descriptor("maybe", { inner })
}

// ============================================================================
// Container Types
// ============================================================================

/**
 * Validates an array where all elements match the schema.
 */
export function array<T>(item: Schema<T>): Schema<T[]> {
	return descriptor("array", { item })
}

/**
 * Validates an object with a specific shape.
 */
export function object<T extends Record<string, Schema>>(
	shape: T,
): Schema<InferObject<T>> {
	return descriptor("object", { shape })
}

/**
 * Validates a tuple with specific schemas at each position.
 */
export function tuple<T extends Schema[]>(
	...items: T
): Schema<{ [K in keyof T]: Infer<T[K]> }> {
	return descriptor("tuple", { items })
}

/**
 * Validates a record with string keys and uniform value type.
 */
export function record<T>(value: Schema<T>): Schema<Record<string, T>> {
	return descriptor("record", { value })
}

// ============================================================================
// Combinators
// ============================================================================

/**
 * Tries schemas in order, returns first successful result. Optimizes to
 * a compiled typeof switch when all variants have distinct typeof tags.
 */
export function union<T extends Schema[]>(
	...variants: T
): Schema<Infer<T[number]>> {
	return descriptor("union", { variants })
}

/**
 * Defers schema resolution to support recursive types.
 *
 * @example
 * ```ts
 * type Tree = { value: number; children: Tree[] }
 * const tree: Schema<Tree> = object({
 *   value: number,
 *   children: array(lazy(() => tree)),
 * })
 * ```
 */
export function lazy<T>(thunk: () => Schema<T>): Schema<T> {
	return descriptor("lazy", { thunk })
}

/**
 * Validates the inner schema, then checks a predicate. Throws with the
 * provided message (or "refinement failed") if the predicate returns
 * false.
 */
export function refine<T>(
	inner: Schema<T>,
	fn: (value: T) => boolean,
	message?: string,
): Schema<T> {
	return descriptor("refine", { inner, fn, message })
}

// ============================================================================
// Transforms
// ============================================================================

/**
 * Transforms the input before validating with the inner schema. The
 * function receives `unknown` since it runs before any validation.
 */
export function preprocess<T>(
	inner: Schema<T>,
	fn: (value: unknown) => unknown,
): Schema<T> {
	return descriptor("preprocess", { inner, fn })
}

/**
 * Validates then transforms the value.
 */
export function transform<T, U>(
	inner: Schema<T>,
	fn: (value: T) => U,
): Schema<U> {
	return descriptor("transform", { inner, fn })
}

// ============================================================================
// Compiler
// ============================================================================

const _cache = new WeakMap<Schema, (input: unknown) => unknown>()

/**
 * Compiles a schema descriptor into a validator function. The resulting
 * function throws on invalid input and returns the input on success.
 */
export function compile<T>(desc: Schema<T>): (input: unknown) => T {
	let fn = _cache.get(desc)
	if (!fn) {
		fn = build(desc)
		_cache.set(desc, fn)
	}
	return fn as (input: unknown) => T
}

/**
 * Validates input against a schema. Lazily compiles and caches the
 * validator. Throws on invalid input, returns the validated value on
 * success.
 */
export function parse<T>(desc: Schema<T>, input: unknown): T {
	return compile(desc)(input)
}
