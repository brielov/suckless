import type {
	Children,
	Component,
	IntrinsicElements as IntrinsicElementsMap,
	RawHtml,
} from "./types.ts"

// ── Constants ──────────────────────────────────────────────────────

const VOID_ELEMENTS: ReadonlySet<string> = new Set([
	"area",
	"base",
	"br",
	"col",
	"embed",
	"hr",
	"img",
	"input",
	"link",
	"meta",
	"param",
	"source",
	"track",
	"wbr",
])

// ── Validation ─────────────────────────────────────────────────────

/**
 * Matches valid HTML/SVG attribute names.
 * Rejects names containing characters that could break out of a tag.
 */
const VALID_ATTR_NAME = /^[a-zA-Z_][\w.:-]*$/

// ── Escape & Raw ───────────────────────────────────────────────────

/** Escapes HTML special characters in a string. */
export function escape(value: string): string {
	let result = ""
	let last = 0
	for (let i = 0; i < value.length; i++) {
		const ch = value.codePointAt(i)
		let entity: string | undefined
		if (ch === 38) {
			entity = "&amp;"
		} else if (ch === 60) {
			entity = "&lt;"
		} else if (ch === 62) {
			entity = "&gt;"
		} else if (ch === 34) {
			entity = "&quot;"
		} else if (ch === 39) {
			entity = "&#39;"
		}
		if (entity !== undefined) {
			result += value.slice(last, i) + entity
			last = i + 1
		}
	}
	if (last === 0) {
		return value
	}
	return result + value.slice(last)
}

function isRawHtml(value: unknown): value is RawHtml {
	return (
		value !== null &&
		typeof value === "object" &&
		"__raw" in value &&
		value.__raw === true
	)
}

/**
 * Wraps a string so the renderer skips escaping.
 * Use for pre-escaped or trusted HTML content.
 */
export function raw(value: string): RawHtml {
	return { __raw: true, value }
}

// ── Children rendering ─────────────────────────────────────────────

function renderChildren(children: Children): string {
	if (
		children === null ||
		children === undefined ||
		children === false ||
		children === true
	) {
		return ""
	}
	if (typeof children === "number") {
		return Number.isFinite(children) ? String(children) : ""
	}
	if (typeof children === "string") {
		return escape(children)
	}
	if (isRawHtml(children)) {
		return children.value
	}
	if (Array.isArray(children)) {
		let result = ""
		for (const child of children) {
			result += renderChildren(child)
		}
		return result
	}
	return ""
}

// ── Attribute rendering ────────────────────────────────────────────

function renderAttributes(props: Record<string, unknown>): string {
	let result = ""
	for (const name of Object.keys(props)) {
		if (name === "children" || name === "key") {
			continue
		}
		if (!VALID_ATTR_NAME.test(name)) {
			continue
		}
		const value = props[name]
		if (
			value === null ||
			value === undefined ||
			value === false ||
			typeof value === "function" ||
			typeof value === "object"
		) {
			continue
		}
		if (value === true) {
			result += ` ${name}`
		} else if (typeof value === "string") {
			result += ` ${name}="${escape(value)}"`
		} else if (typeof value === "number" && Number.isFinite(value)) {
			result += ` ${name}="${String(value)}"`
		}
	}
	return result
}

// ── JSX Runtime ────────────────────────────────────────────────────

type Props = { children?: Children } & Record<string, unknown>

/** Renders only children, no wrapper element. */
export function Fragment(props: { children?: Children }): RawHtml {
	return raw(renderChildren(props.children))
}

/** JSX runtime entry point for single-child elements. */
export function jsx(
	tag: string | Component<Record<string, unknown>>,
	props: Props,
	_key?: string,
): RawHtml {
	if (typeof tag === "function") {
		return tag(props)
	}

	const { children, ...rest } = props
	const attrs = renderAttributes(rest)

	if (VOID_ELEMENTS.has(tag)) {
		return raw(`<${tag}${attrs}>`)
	}
	return raw(`<${tag}${attrs}>${renderChildren(children)}</${tag}>`)
}

/** Alias for jsx — multi-child distinction is irrelevant for string rendering. */
export const jsxs: typeof jsx = jsx

/** Dev mode entry point used by Bun/Vite; delegates to jsx. */
export function jsxDEV(
	tag: string | Component<Record<string, unknown>>,
	props: Props,
	_key?: string,
	_isStatic?: boolean,
	_source?: unknown,
	_self?: unknown,
): RawHtml {
	return jsx(tag, props, _key)
}

// ── JSX Namespace ──────────────────────────────────────────────────

export declare namespace JSX {
	type Element = RawHtml

	interface ElementChildrenAttribute {
		children: Children
	}

	type IntrinsicElements = IntrinsicElementsMap
}
