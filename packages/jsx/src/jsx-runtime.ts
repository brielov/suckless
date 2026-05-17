import type {
	Component,
	Context,
	CSSProperties,
	ElementType,
	ForwardRefExoticComponent,
	ForwardRefRenderFunction,
	IntrinsicElements as IntrinsicElementsMap,
	NamedExoticComponent,
	RawHtml,
	Ref,
	Renderable,
	RenderFunction,
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

const VALID_ATTR_NAME = /^[a-zA-Z_][\w.:-]*$/
const VALID_TAG_NAME = /^[a-zA-Z][\w:-]*$/

// ── Internal render model ──────────────────────────────────────────

type Props = { children?: Renderable } & Record<string, unknown>

type RenderNode =
	| { kind: "raw"; value: string }
	| { kind: "element"; tag: ElementType; props: Props }
	| { kind: "fragment"; children?: Renderable }
	| { kind: "provider"; context: object; props: Props }

interface RenderState {
	readonly contexts: Map<object, unknown[]>
	id: number
}

interface InternalContext<T> extends Context<T> {
	readonly _defaultValue: T
}

class Html implements RawHtml {
	readonly node: RenderNode
	#cached: string | undefined

	constructor(node: RenderNode) {
		this.node = node
	}

	get value(): string {
		if (this.#cached === undefined) {
			const state = createRenderState()
			this.#cached = withRenderState(state, () => renderNode(this.node, state))
		}
		return this.#cached
	}

	toString(): string {
		return this.value
	}
}

function createRenderState(): RenderState {
	return { contexts: new Map(), id: 0 }
}

function createHandle(node: RenderNode): RawHtml {
	return new Html(node)
}

function isRawHtml(value: unknown): value is Html {
	return value instanceof Html
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
	if (value === null) {
		return false
	}
	if (typeof value !== "object" && typeof value !== "function") {
		return false
	}
	return "then" in value && typeof value.then === "function"
}

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

/**
 * Wraps a string so the renderer skips escaping.
 * Use for pre-escaped or trusted HTML content.
 */
export function raw(value: string): RawHtml {
	return createHandle({ kind: "raw", value })
}

// ── Rendering ──────────────────────────────────────────────────────

function renderRenderable(value: Renderable, state: RenderState): string {
	if (
		value === null ||
		value === undefined ||
		value === false ||
		value === true
	) {
		return ""
	}
	if (typeof value === "number") {
		return Number.isFinite(value) ? String(value) : ""
	}
	if (typeof value === "string") {
		return escape(value)
	}
	if (isRawHtml(value)) {
		return renderNode(value.node, state)
	}
	if (Array.isArray(value)) {
		let result = ""
		for (const child of value) {
			result += renderRenderable(child, state)
		}
		return result
	}
	if (isPromiseLike(value)) {
		throw new Error("Async components are not supported by @suckless/jsx")
	}
	return ""
}

function renderNode(node: RenderNode, state: RenderState): string {
	if (node.kind === "raw") {
		return node.value
	}
	if (node.kind === "fragment") {
		return renderRenderable(node.children, state)
	}
	if (node.kind === "provider") {
		return renderProvider(node.context, node.props, state)
	}
	return renderElement(node.tag, node.props, state)
}

function renderElement(
	tag: ElementType,
	props: Props,
	state: RenderState,
): string {
	if (tag === Fragment) {
		return renderRenderable(props.children, state)
	}
	if (typeof tag === "string") {
		return renderIntrinsic(tag, props, state)
	}
	if (typeof tag === "function") {
		return renderRenderable(tag(props), state)
	}
	return ""
}

function renderProvider(
	context: object,
	props: Props,
	state: RenderState,
): string {
	const stack = state.contexts.get(context) ?? []
	state.contexts.set(context, stack)
	stack.push(props["value"])
	try {
		return renderRenderable(props.children, state)
	} finally {
		stack.pop()
		if (stack.length === 0) {
			state.contexts.delete(context)
		}
	}
}

function renderIntrinsic(
	tag: string,
	props: Props,
	state: RenderState,
): string {
	if (!VALID_TAG_NAME.test(tag)) {
		throw new Error(`Invalid tag name: "${tag}"`)
	}

	const attrs = renderAttributes(props)
	if (VOID_ELEMENTS.has(tag)) {
		return `<${tag}${attrs}>`
	}

	const dangerousHtml = getDangerousHtml(props["dangerouslySetInnerHTML"])
	const children = dangerousHtml ?? renderRenderable(props.children, state)
	return `<${tag}${attrs}>${children}</${tag}>`
}

// ── Attribute rendering ────────────────────────────────────────────

const ATTRIBUTE_ALIASES: Readonly<Record<string, string>> = {
	acceptCharset: "accept-charset",
	accessKey: "accesskey",
	autoCapitalize: "autocapitalize",
	autoComplete: "autocomplete",
	autoFocus: "autofocus",
	autoPlay: "autoplay",
	className: "class",
	clipPath: "clip-path",
	clipRule: "clip-rule",
	colSpan: "colspan",
	contentEditable: "contenteditable",
	crossOrigin: "crossorigin",
	dateTime: "datetime",
	domStorage: "dom-storage",
	encType: "enctype",
	fetchPriority: "fetchpriority",
	fillOpacity: "fill-opacity",
	fillRule: "fill-rule",
	floodColor: "flood-color",
	floodOpacity: "flood-opacity",
	fontFamily: "font-family",
	fontSize: "font-size",
	fontStyle: "font-style",
	fontWeight: "font-weight",
	formAction: "formaction",
	formEncType: "formenctype",
	formMethod: "formmethod",
	formNoValidate: "formnovalidate",
	formTarget: "formtarget",
	htmlFor: "for",
	httpEquiv: "http-equiv",
	imageSizes: "imagesizes",
	imageSrcSet: "imagesrcset",
	inputMode: "inputmode",
	itemID: "itemid",
	itemProp: "itemprop",
	itemRef: "itemref",
	itemScope: "itemscope",
	itemType: "itemtype",
	lengthAdjust: "lengthAdjust",
	lightingColor: "lighting-color",
	markerEnd: "marker-end",
	markerMid: "marker-mid",
	markerStart: "marker-start",
	noModule: "nomodule",
	noValidate: "novalidate",
	pathLength: "pathLength",
	playsInline: "playsinline",
	popoverTarget: "popovertarget",
	popoverTargetAction: "popovertargetaction",
	preserveAspectRatio: "preserveAspectRatio",
	readOnly: "readonly",
	referrerPolicy: "referrerpolicy",
	rowSpan: "rowspan",
	shapeRendering: "shape-rendering",
	spellCheck: "spellcheck",
	srcDoc: "srcdoc",
	srcLang: "srclang",
	srcSet: "srcset",
	stopColor: "stop-color",
	stopOpacity: "stop-opacity",
	strokeDasharray: "stroke-dasharray",
	strokeDashoffset: "stroke-dashoffset",
	strokeLinecap: "stroke-linecap",
	strokeLinejoin: "stroke-linejoin",
	strokeMiterlimit: "stroke-miterlimit",
	strokeMiterLimit: "stroke-miterlimit",
	strokeOpacity: "stroke-opacity",
	strokeWidth: "stroke-width",
	tabIndex: "tabindex",
	textAnchor: "text-anchor",
	textDecoration: "text-decoration",
	textRendering: "text-rendering",
	transformOrigin: "transform-origin",
	unicodeBidi: "unicode-bidi",
	viewBox: "viewBox",
	xlinkHref: "xlink:href",
	xmlnsXlink: "xmlns:xlink",
}

const SKIPPED_PROPS: ReadonlySet<string> = new Set([
	"children",
	"dangerouslySetInnerHTML",
	"key",
	"ref",
	"suppressContentEditableWarning",
	"suppressHydrationWarning",
])

function renderAttributes(props: Record<string, unknown>): string {
	let result = ""
	const values = new Map<string, unknown>()
	for (const rawName of Object.keys(props)) {
		if (SKIPPED_PROPS.has(rawName)) {
			continue
		}
		const name = normalizeAttributeName(rawName)
		if (name === undefined) {
			continue
		}
		values.set(name, props[rawName])
	}
	for (const [name, value] of values) {
		const rendered = renderAttributeValue(name, value)
		if (rendered === undefined) {
			continue
		}
		result += rendered
	}
	return result
}

function normalizeAttributeName(name: string): string | undefined {
	if (
		name.length > 1 &&
		(name[0] === "o" || name[0] === "O") &&
		(name[1] === "n" || name[1] === "N")
	) {
		return undefined
	}
	const normalized = ATTRIBUTE_ALIASES[name] ?? name
	if (!VALID_ATTR_NAME.test(normalized)) {
		return undefined
	}
	return normalized
}

function renderAttributeValue(
	name: string,
	value: unknown,
): string | undefined {
	if (
		value === null ||
		value === undefined ||
		value === false ||
		typeof value === "function"
	) {
		return undefined
	}
	if (name === "style") {
		const style = serializeStyle(value)
		return style === undefined ? undefined : ` style="${escape(style)}"`
	}
	if (value === true) {
		return ` ${name}`
	}
	if (typeof value === "string") {
		return ` ${name}="${escape(value)}"`
	}
	if (typeof value === "number" && Number.isFinite(value)) {
		return ` ${name}="${String(value)}"`
	}
	return undefined
}

function serializeStyle(value: unknown): string | undefined {
	if (typeof value === "string") {
		return value
	}
	if (!isStyleObject(value)) {
		return undefined
	}

	let result = ""
	for (const key of Object.keys(value)) {
		const item = value[key]
		if (item === null || item === undefined) {
			continue
		}
		if (typeof item === "number" && !Number.isFinite(item)) {
			continue
		}
		const name = key.startsWith("--") ? key : kebabCase(key)
		result += `${name}:${String(item)};`
	}
	return result === "" ? undefined : result
}

function isStyleObject(value: unknown): value is CSSProperties {
	return value !== null && typeof value === "object" && !Array.isArray(value)
}

function kebabCase(value: string): string {
	return value.replaceAll(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`)
}

function getDangerousHtml(value: unknown): string | undefined {
	if (value === null || typeof value !== "object") {
		return undefined
	}
	const descriptor = Object.getOwnPropertyDescriptor(value, "__html")
	if (descriptor === undefined || "get" in descriptor || "set" in descriptor) {
		return undefined
	}
	return typeof descriptor.value === "string" ? descriptor.value : undefined
}

// ── JSX Runtime ────────────────────────────────────────────────────

function assignChildren(
	props: Props | null | undefined,
	children: Renderable[],
): Props {
	const next: Props = props === null || props === undefined ? {} : { ...props }
	if (children.length === 1) {
		const [child] = children
		next.children = child
	} else if (children.length > 1) {
		next.children = children
	}
	return next
}

/** Renders only children, no wrapper element. */
export function Fragment(props: { children?: Renderable }): RawHtml {
	return createHandle({ kind: "fragment", children: props.children })
}

/** Creates an element for classic JSX runtimes and React-shaped libraries. */
export function createElement(
	tag: ElementType,
	props?: Props | null,
	...children: Renderable[]
): RawHtml {
	if (typeof tag === "string" && !VALID_TAG_NAME.test(tag)) {
		throw new Error(`Invalid tag name: "${tag}"`)
	}
	return createHandle({
		kind: "element",
		tag,
		props: assignChildren(props, children),
	})
}

/** JSX runtime entry point for single-child elements. */
export function jsx(tag: ElementType, props: Props, _key?: string): RawHtml {
	return createElement(tag, props)
}

/** Alias for jsx — multi-child distinction is irrelevant for string rendering. */
export const jsxs: typeof jsx = jsx

/** Dev mode entry point used by Bun/Vite; delegates to jsx. */
export function jsxDEV(
	tag: ElementType,
	props: Props,
	_key?: string,
	_isStatic?: boolean,
	_source?: unknown,
	_self?: unknown,
): RawHtml {
	return jsx(tag, props, _key)
}

// ── React-shaped helpers ───────────────────────────────────────────

export function isValidElement(value: unknown): value is RawHtml {
	return isRawHtml(value)
}

export function cloneElement(
	element: RawHtml,
	props?: Props | null,
	...children: Renderable[]
): RawHtml {
	if (!isRawHtml(element) || element.node.kind !== "element") {
		throw new Error("cloneElement expected a JSX element")
	}
	const nextProps = assignChildren(
		{ ...element.node.props, ...props },
		children,
	)
	return createHandle({
		kind: "element",
		tag: element.node.tag,
		props: nextProps,
	})
}

function toArray(children: Renderable): Renderable[] {
	const result: Renderable[] = []
	appendChildren(result, children)
	return result
}

function appendChildren(result: Renderable[], value: Renderable): void {
	if (
		value === null ||
		value === undefined ||
		value === false ||
		value === true
	) {
		return
	}
	if (Array.isArray(value)) {
		for (const child of value) {
			appendChildren(result, child)
		}
		return
	}
	result.push(value)
}

export const Children: { readonly toArray: typeof toArray } = {
	toArray: toArray,
}

export function forwardRef<T, P = Record<never, never>>(
	render: ForwardRefRenderFunction<T, P>,
): ForwardRefExoticComponent<P & { ref?: Ref<T> }> {
	const component: ForwardRefExoticComponent<P & { ref?: Ref<T> }> = (props) =>
		createHandle({
			kind: "fragment",
			children: render(props, props.ref),
		})
	return component
}

export function memo<P>(
	component: RenderFunction<P>,
): NamedExoticComponent<P & { children?: Renderable }> {
	const wrapped: NamedExoticComponent<P & { children?: Renderable }> = (
		props,
	) => createHandle({ kind: "fragment", children: component(props) })
	return wrapped
}

export function createContext<T>(defaultValue: T): Context<T> {
	const Provider: Component<{ value: T }> = (props) =>
		createHandle({
			kind: "provider",
			context: context,
			props: { children: props.children, value: props.value },
		})

	const Consumer: Component<{
		children?: ((value: T) => Renderable) | Renderable
	}> = (props) => {
		const value = useContext(context)
		return createHandle({
			kind: "fragment",
			children:
				typeof props.children === "function"
					? props.children(value)
					: props.children,
		})
	}

	const context: InternalContext<T> = {
		_defaultValue: defaultValue,
		Provider: Provider,
		Consumer: Consumer,
	}
	return context
}

export function useContext<T>(context: Context<T>): T {
	if (!isInternalContext(context)) {
		throw new Error("useContext expected a context created by @suckless/jsx")
	}
	const stack = currentState?.contexts.get(context)
	if (stack !== undefined && stack.length > 0) {
		const value = stack.at(-1)
		if (value !== undefined) {
			return readContextValue<T>(value)
		}
	}
	return context._defaultValue
}

function isInternalContext<T>(
	context: Context<T>,
): context is InternalContext<T> {
	return "_defaultValue" in context
}

function readContextValue<T>(value: unknown): T {
	// oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion -- Provider writes T values for this context key.
	return value as T
}

let currentState: RenderState | undefined

function withRenderState<T>(state: RenderState, callback: () => T): T {
	const previous = currentState
	currentState = state
	try {
		return callback()
	} finally {
		currentState = previous
	}
}

export function useMemo<T>(factory: () => T, _deps?: readonly unknown[]): T {
	return factory()
}

export function useCallback<T extends (...args: never[]) => unknown>(
	callback: T,
	_deps?: readonly unknown[],
): T {
	return callback
}

export function useRef<T>(initialValue: T): { current: T } {
	return { current: initialValue }
}

export function useId(): string {
	const state = currentState
	if (state === undefined) {
		return ":s0:"
	}
	const { id } = state
	state.id = id + 1
	return `:s${id}:`
}

export function useEffect(): void {}

export function useLayoutEffect(): void {}

export function useInsertionEffect(): void {}

export function useState(): never {
	throw new Error("useState is not supported by @suckless/jsx")
}

export function useReducer(): never {
	throw new Error("useReducer is not supported by @suckless/jsx")
}

const React: {
	readonly Children: typeof Children
	readonly Fragment: typeof Fragment
	readonly cloneElement: typeof cloneElement
	readonly createContext: typeof createContext
	readonly createElement: typeof createElement
	readonly forwardRef: typeof forwardRef
	readonly isValidElement: typeof isValidElement
	readonly memo: typeof memo
	readonly useCallback: typeof useCallback
	readonly useContext: typeof useContext
	readonly useEffect: typeof useEffect
	readonly useId: typeof useId
	readonly useInsertionEffect: typeof useInsertionEffect
	readonly useLayoutEffect: typeof useLayoutEffect
	readonly useMemo: typeof useMemo
	readonly useReducer: typeof useReducer
	readonly useRef: typeof useRef
	readonly useState: typeof useState
} = {
	Children: Children,
	Fragment: Fragment,
	cloneElement: cloneElement,
	createContext: createContext,
	createElement: createElement,
	forwardRef: forwardRef,
	isValidElement: isValidElement,
	memo: memo,
	useCallback: useCallback,
	useContext: useContext,
	useEffect: useEffect,
	useId: useId,
	useInsertionEffect: useInsertionEffect,
	useLayoutEffect: useLayoutEffect,
	useMemo: useMemo,
	useReducer: useReducer,
	useRef: useRef,
	useState: useState,
} as const

export default React

// ── JSX Namespace ──────────────────────────────────────────────────

export declare namespace JSX {
	type Element = RawHtml

	interface ElementChildrenAttribute {
		children: Renderable
	}

	type IntrinsicElements = IntrinsicElementsMap
}
