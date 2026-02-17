// ── Foundation ──────────────────────────────────────────────────────

/** Content that can appear as children of an HTML/SVG element. */
export type Children =
	| string
	| number
	| boolean
	| null
	| undefined
	| RawHtml
	| Children[]

/** A pre-escaped HTML string that bypasses automatic escaping. */
export interface RawHtml {
	readonly __raw: true
	readonly value: string
}

/** A function component that receives typed props and returns HTML. */
export type Component<P = Record<never, never>> = (
	props: P & { children?: Children },
) => RawHtml

// ── Shared type aliases ────────────────────────────────────────────

type CrossOrigin = "anonymous" | "use-credentials" | ""
type ReferrerPolicy =
	| "no-referrer"
	| "no-referrer-when-downgrade"
	| "origin"
	| "origin-when-cross-origin"
	| "same-origin"
	| "strict-origin"
	| "strict-origin-when-cross-origin"
	| "unsafe-url"
	| ""
type FormEnctype =
	| "application/x-www-form-urlencoded"
	| "multipart/form-data"
	| "text/plain"
type FormMethod = "get" | "post" | "dialog"
type Target =
	| "_self"
	| "_blank"
	| "_parent"
	| "_top"
	| (string & Record<string, never>)
type Loading = "eager" | "lazy"
type FetchPriority = "high" | "low" | "auto"
type InputType =
	| "button"
	| "checkbox"
	| "color"
	| "date"
	| "datetime-local"
	| "email"
	| "file"
	| "hidden"
	| "image"
	| "month"
	| "number"
	| "password"
	| "radio"
	| "range"
	| "reset"
	| "search"
	| "submit"
	| "tel"
	| "text"
	| "time"
	| "url"
	| "week"
	| (string & Record<string, never>)
type ButtonType = "submit" | "reset" | "button"
type Autocomplete =
	| "on"
	| "off"
	| "name"
	| "email"
	| "username"
	| "new-password"
	| "current-password"
	| "one-time-code"
	| "street-address"
	| "country"
	| "postal-code"
	| "tel"
	| "url"
	| (string & Record<string, never>)

// ── HTML Global Attributes ─────────────────────────────────────────

export interface GlobalAttributes {
	accesskey?: string
	autocapitalize?: "off" | "none" | "on" | "sentences" | "words" | "characters"
	autofocus?: boolean
	class?: string
	contenteditable?: boolean | "plaintext-only" | ""
	dir?: "ltr" | "rtl" | "auto"
	draggable?: boolean
	enterkeyhint?:
		| "enter"
		| "done"
		| "go"
		| "next"
		| "previous"
		| "search"
		| "send"
	hidden?: boolean | "until-found"
	id?: string
	inert?: boolean
	inputmode?:
		| "none"
		| "text"
		| "tel"
		| "url"
		| "email"
		| "numeric"
		| "decimal"
		| "search"
	is?: string
	itemid?: string
	itemprop?: string
	itemref?: string
	itemscope?: boolean
	itemtype?: string
	lang?: string
	nonce?: string
	part?: string
	popover?: "auto" | "manual" | ""
	role?: string
	slot?: string
	spellcheck?: boolean | ""
	style?: string
	tabindex?: number | string
	title?: string
	translate?: "yes" | "no" | ""
	[key: `data-${string}`]: string | number | boolean | undefined
	[key: `aria-${string}`]: string | number | boolean | undefined
}

// ── HTML Base Attributes ───────────────────────────────────────────

/** Attributes for non-void HTML elements. */
export interface HtmlAttributes extends GlobalAttributes {
	children?: Children
}

/** Attributes for void HTML elements (no closing tag). */
export interface VoidHtmlAttributes extends GlobalAttributes {
	children?: never
}

// ── HTML Element-Specific Attributes ───────────────────────────────

export interface AnchorAttributes extends HtmlAttributes {
	download?: string | boolean
	href?: string
	hreflang?: string
	ping?: string
	referrerpolicy?: ReferrerPolicy
	rel?: string
	target?: Target
	type?: string
}

export interface AreaAttributes extends VoidHtmlAttributes {
	alt?: string
	coords?: string
	download?: string | boolean
	href?: string
	ping?: string
	referrerpolicy?: ReferrerPolicy
	rel?: string
	shape?: "rect" | "circle" | "poly" | "default"
	target?: Target
}

export interface AudioAttributes extends HtmlAttributes {
	autoplay?: boolean
	controls?: boolean
	crossorigin?: CrossOrigin
	loop?: boolean
	muted?: boolean
	preload?: "none" | "metadata" | "auto" | ""
	src?: string
}

export interface BaseAttributes extends VoidHtmlAttributes {
	href?: string
	target?: Target
}

export interface BlockquoteAttributes extends HtmlAttributes {
	cite?: string
}

export interface ButtonAttributes extends HtmlAttributes {
	disabled?: boolean
	form?: string
	formaction?: string
	formenctype?: FormEnctype
	formmethod?: FormMethod
	formnovalidate?: boolean
	formtarget?: Target
	name?: string
	popovertarget?: string
	popovertargetaction?: "hide" | "show" | "toggle"
	type?: ButtonType
	value?: string | number
}

export interface CanvasAttributes extends HtmlAttributes {
	height?: number | string
	width?: number | string
}

export interface ColAttributes extends VoidHtmlAttributes {
	span?: number
}

export interface ColgroupAttributes extends HtmlAttributes {
	span?: number
}

export interface DataElementAttributes extends HtmlAttributes {
	value?: string | number
}

export interface DelAttributes extends HtmlAttributes {
	cite?: string
	datetime?: string
}

export interface DetailsAttributes extends HtmlAttributes {
	name?: string
	open?: boolean
}

export interface DialogAttributes extends HtmlAttributes {
	open?: boolean
}

export interface EmbedAttributes extends VoidHtmlAttributes {
	height?: number | string
	src?: string
	type?: string
	width?: number | string
}

export interface FieldsetAttributes extends HtmlAttributes {
	disabled?: boolean
	form?: string
	name?: string
}

export interface FormAttributes extends HtmlAttributes {
	"accept-charset"?: string
	action?: string
	autocomplete?: Autocomplete
	enctype?: FormEnctype
	method?: FormMethod
	name?: string
	novalidate?: boolean
	rel?: string
	target?: Target
}

export interface IframeAttributes extends HtmlAttributes {
	allow?: string
	allowfullscreen?: boolean
	height?: number | string
	loading?: Loading
	name?: string
	referrerpolicy?: ReferrerPolicy
	sandbox?: string
	src?: string
	srcdoc?: string
	width?: number | string
}

export interface ImgAttributes extends VoidHtmlAttributes {
	alt?: string
	crossorigin?: CrossOrigin
	decoding?: "sync" | "async" | "auto"
	fetchpriority?: FetchPriority
	height?: number | string
	ismap?: boolean
	loading?: Loading
	referrerpolicy?: ReferrerPolicy
	sizes?: string
	src?: string
	srcset?: string
	width?: number | string
}

export interface InputAttributes extends VoidHtmlAttributes {
	accept?: string
	alt?: string
	autocomplete?: Autocomplete
	capture?: "user" | "environment" | boolean
	checked?: boolean
	dirname?: string
	disabled?: boolean
	form?: string
	formaction?: string
	formenctype?: FormEnctype
	formmethod?: FormMethod
	formnovalidate?: boolean
	formtarget?: Target
	height?: number | string
	list?: string
	max?: number | string
	maxlength?: number
	min?: number | string
	minlength?: number
	multiple?: boolean
	name?: string
	pattern?: string
	placeholder?: string
	popovertarget?: string
	popovertargetaction?: "hide" | "show" | "toggle"
	readonly?: boolean
	required?: boolean
	size?: number
	src?: string
	step?: number | string
	type?: InputType
	value?: string | number
	width?: number | string
}

export interface InsAttributes extends HtmlAttributes {
	cite?: string
	datetime?: string
}

export interface LabelAttributes extends HtmlAttributes {
	for?: string
}

export interface LiAttributes extends HtmlAttributes {
	value?: number
}

export interface LinkAttributes extends VoidHtmlAttributes {
	as?: string
	blocking?: "render"
	crossorigin?: CrossOrigin
	disabled?: boolean
	fetchpriority?: FetchPriority
	href?: string
	hreflang?: string
	imagesizes?: string
	imagesrcset?: string
	integrity?: string
	media?: string
	referrerpolicy?: ReferrerPolicy
	rel?: string
	sizes?: string
	type?: string
}

export interface MapAttributes extends HtmlAttributes {
	name?: string
}

export interface MetaAttributes extends VoidHtmlAttributes {
	charset?: string
	content?: string
	"http-equiv"?:
		| "content-security-policy"
		| "content-type"
		| "default-style"
		| "refresh"
		| "x-ua-compatible"
		| (string & Record<string, never>)
	media?: string
	name?: string
}

export interface MeterAttributes extends HtmlAttributes {
	form?: string
	high?: number
	low?: number
	max?: number | string
	min?: number | string
	optimum?: number
	value?: number | string
}

export interface ObjectAttributes extends HtmlAttributes {
	data?: string
	form?: string
	height?: number | string
	name?: string
	type?: string
	width?: number | string
}

export interface OlAttributes extends HtmlAttributes {
	reversed?: boolean
	start?: number
	type?: "1" | "a" | "A" | "i" | "I"
}

export interface OptgroupAttributes extends HtmlAttributes {
	disabled?: boolean
	label?: string
}

export interface OptionAttributes extends HtmlAttributes {
	disabled?: boolean
	label?: string
	selected?: boolean
	value?: string | number
}

export interface OutputAttributes extends HtmlAttributes {
	for?: string
	form?: string
	name?: string
}

export interface ParamAttributes extends VoidHtmlAttributes {
	name?: string
	value?: string
}

export interface ProgressAttributes extends HtmlAttributes {
	max?: number | string
	value?: number | string
}

export interface QAttributes extends HtmlAttributes {
	cite?: string
}

export interface ScriptAttributes extends HtmlAttributes {
	async?: boolean
	blocking?: "render"
	crossorigin?: CrossOrigin
	defer?: boolean
	fetchpriority?: FetchPriority
	integrity?: string
	nomodule?: boolean
	nonce?: string
	referrerpolicy?: ReferrerPolicy
	src?: string
	type?: string
}

export interface SelectAttributes extends HtmlAttributes {
	autocomplete?: Autocomplete
	disabled?: boolean
	form?: string
	multiple?: boolean
	name?: string
	required?: boolean
	size?: number
}

export interface SlotAttributes extends HtmlAttributes {
	name?: string
}

export interface SourceAttributes extends VoidHtmlAttributes {
	height?: number | string
	media?: string
	sizes?: string
	src?: string
	srcset?: string
	type?: string
	width?: number | string
}

export interface StyleAttributes extends HtmlAttributes {
	blocking?: "render"
	media?: string
	nonce?: string
}

export interface TableAttributes extends HtmlAttributes {
	align?: "left" | "center" | "right"
}

export interface TdAttributes extends HtmlAttributes {
	colspan?: number
	headers?: string
	rowspan?: number
}

export interface TemplateAttributes extends HtmlAttributes {
	shadowrootclonable?: boolean
	shadowrootdelegatesfocus?: boolean
	shadowrootmode?: "open" | "closed"
	shadowrootserializable?: boolean
}

export interface TextareaAttributes extends HtmlAttributes {
	autocomplete?: Autocomplete
	cols?: number
	dirname?: string
	disabled?: boolean
	form?: string
	maxlength?: number
	minlength?: number
	name?: string
	placeholder?: string
	readonly?: boolean
	required?: boolean
	rows?: number
	wrap?: "hard" | "soft"
}

export interface ThAttributes extends HtmlAttributes {
	abbr?: string
	colspan?: number
	headers?: string
	rowspan?: number
	scope?: "row" | "col" | "rowgroup" | "colgroup"
}

export interface TimeAttributes extends HtmlAttributes {
	datetime?: string
}

export interface TrackAttributes extends VoidHtmlAttributes {
	default?: boolean
	kind?: "subtitles" | "captions" | "descriptions" | "chapters" | "metadata"
	label?: string
	src?: string
	srclang?: string
}

export interface VideoAttributes extends HtmlAttributes {
	autoplay?: boolean
	controls?: boolean
	crossorigin?: CrossOrigin
	height?: number | string
	loop?: boolean
	muted?: boolean
	playsinline?: boolean
	poster?: string
	preload?: "none" | "metadata" | "auto" | ""
	src?: string
	width?: number | string
}

// ── SVG Global Attributes ──────────────────────────────────────────

export interface SVGGlobalAttributes {
	class?: string
	"clip-path"?: string
	"clip-rule"?: "nonzero" | "evenodd" | "inherit"
	color?: string
	cursor?: string
	direction?: "ltr" | "rtl" | "inherit"
	display?: string
	fill?: string
	"fill-opacity"?: number | string
	"fill-rule"?: "nonzero" | "evenodd" | "inherit"
	filter?: string
	"flood-color"?: string
	"flood-opacity"?: number | string
	"font-family"?: string
	"font-size"?: number | string
	"font-style"?: string
	"font-weight"?: number | string
	id?: string
	"letter-spacing"?: number | string
	"lighting-color"?: string
	marker?: string
	"marker-end"?: string
	"marker-mid"?: string
	"marker-start"?: string
	mask?: string
	opacity?: number | string
	overflow?: "visible" | "hidden" | "scroll" | "auto" | "inherit"
	"paint-order"?: string
	"pointer-events"?:
		| "auto"
		| "none"
		| "visiblePainted"
		| "visibleFill"
		| "visibleStroke"
		| "visible"
		| "painted"
		| "fill"
		| "stroke"
		| "all"
		| "inherit"
	"shape-rendering"?:
		| "auto"
		| "optimizeSpeed"
		| "crispEdges"
		| "geometricPrecision"
		| "inherit"
	"stop-color"?: string
	"stop-opacity"?: number | string
	stroke?: string
	"stroke-dasharray"?: string
	"stroke-dashoffset"?: number | string
	"stroke-linecap"?: "butt" | "round" | "square" | "inherit"
	"stroke-linejoin"?: "miter" | "round" | "bevel" | "inherit"
	"stroke-miterlimit"?: number | string
	"stroke-opacity"?: number | string
	"stroke-width"?: number | string
	style?: string
	"text-anchor"?: "start" | "middle" | "end" | "inherit"
	"text-decoration"?: string
	"text-rendering"?:
		| "auto"
		| "optimizeSpeed"
		| "optimizeLegibility"
		| "geometricPrecision"
		| "inherit"
	transform?: string
	"transform-origin"?: string
	"unicode-bidi"?:
		| "normal"
		| "embed"
		| "bidi-override"
		| "isolate"
		| "isolate-override"
		| "plaintext"
		| "inherit"
	visibility?: "visible" | "hidden" | "collapse" | "inherit"
	"word-spacing"?: number | string
	"writing-mode"?: "lr-tb" | "rl-tb" | "tb-rl" | "lr" | "rl" | "tb"
}

// ── SVG Base Attributes ────────────────────────────────────────────

/** Attributes for non-void SVG elements. */
export interface SVGAttributes extends SVGGlobalAttributes {
	children?: Children
}

/** Attributes for void SVG elements (no children). */
export interface SVGVoidAttributes extends SVGGlobalAttributes {
	children?: never
}

// ── SVG Element-Specific Attributes ────────────────────────────────

export interface SVGSVGAttributes extends SVGAttributes {
	height?: number | string
	preserveAspectRatio?: string
	viewBox?: string
	width?: number | string
	xmlns?: string
	"xmlns:xlink"?: string
	x?: number | string
	y?: number | string
}

export interface SVGCircleAttributes extends SVGAttributes {
	cx?: number | string
	cy?: number | string
	r?: number | string
	pathLength?: number | string
}

export interface SVGEllipseAttributes extends SVGAttributes {
	cx?: number | string
	cy?: number | string
	rx?: number | string
	ry?: number | string
	pathLength?: number | string
}

export interface SVGLineAttributes extends SVGAttributes {
	pathLength?: number | string
	x1?: number | string
	x2?: number | string
	y1?: number | string
	y2?: number | string
}

export interface SVGPathAttributes extends SVGAttributes {
	d?: string
	pathLength?: number | string
}

export interface SVGPolygonAttributes extends SVGAttributes {
	pathLength?: number | string
	points?: string
}

export interface SVGPolylineAttributes extends SVGAttributes {
	pathLength?: number | string
	points?: string
}

export interface SVGRectAttributes extends SVGAttributes {
	height?: number | string
	pathLength?: number | string
	rx?: number | string
	ry?: number | string
	width?: number | string
	x?: number | string
	y?: number | string
}

export interface SVGTextAttributes extends SVGAttributes {
	dx?: number | string
	dy?: number | string
	lengthAdjust?: "spacing" | "spacingAndGlyphs"
	"text-anchor"?: "start" | "middle" | "end" | "inherit"
	textLength?: number | string
	x?: number | string
	y?: number | string
}

export interface SVGTSpanAttributes extends SVGAttributes {
	dx?: number | string
	dy?: number | string
	lengthAdjust?: "spacing" | "spacingAndGlyphs"
	textLength?: number | string
	x?: number | string
	y?: number | string
}

export interface SVGTextPathAttributes extends SVGAttributes {
	href?: string
	lengthAdjust?: "spacing" | "spacingAndGlyphs"
	method?: "align" | "stretch"
	spacing?: "auto" | "exact"
	startOffset?: number | string
	textLength?: number | string
}

export interface SVGImageAttributes extends SVGAttributes {
	crossorigin?: CrossOrigin
	decoding?: "sync" | "async" | "auto"
	height?: number | string
	href?: string
	preserveAspectRatio?: string
	width?: number | string
	x?: number | string
	y?: number | string
}

export interface SVGUseAttributes extends SVGAttributes {
	height?: number | string
	href?: string
	width?: number | string
	x?: number | string
	y?: number | string
}

export interface SVGForeignObjectAttributes extends SVGAttributes {
	height?: number | string
	width?: number | string
	x?: number | string
	y?: number | string
}

export interface SVGLinearGradientAttributes extends SVGAttributes {
	gradientTransform?: string
	gradientUnits?: "userSpaceOnUse" | "objectBoundingBox"
	href?: string
	spreadMethod?: "pad" | "reflect" | "repeat"
	x1?: number | string
	x2?: number | string
	y1?: number | string
	y2?: number | string
}

export interface SVGRadialGradientAttributes extends SVGAttributes {
	cx?: number | string
	cy?: number | string
	fr?: number | string
	fx?: number | string
	fy?: number | string
	gradientTransform?: string
	gradientUnits?: "userSpaceOnUse" | "objectBoundingBox"
	href?: string
	r?: number | string
	spreadMethod?: "pad" | "reflect" | "repeat"
}

export interface SVGStopAttributes extends SVGVoidAttributes {
	offset?: number | string
	"stop-color"?: string
	"stop-opacity"?: number | string
}

export interface SVGPatternAttributes extends SVGAttributes {
	height?: number | string
	href?: string
	patternContentUnits?: "userSpaceOnUse" | "objectBoundingBox"
	patternTransform?: string
	patternUnits?: "userSpaceOnUse" | "objectBoundingBox"
	preserveAspectRatio?: string
	viewBox?: string
	width?: number | string
	x?: number | string
	y?: number | string
}

export interface SVGClipPathAttributes extends SVGAttributes {
	clipPathUnits?: "userSpaceOnUse" | "objectBoundingBox"
}

export interface SVGMaskAttributes extends SVGAttributes {
	height?: number | string
	maskContentUnits?: "userSpaceOnUse" | "objectBoundingBox"
	maskUnits?: "userSpaceOnUse" | "objectBoundingBox"
	width?: number | string
	x?: number | string
	y?: number | string
}

export interface SVGMarkerAttributes extends SVGAttributes {
	markerHeight?: number | string
	markerUnits?: "strokeWidth" | "userSpaceOnUse"
	markerWidth?: number | string
	orient?: string
	preserveAspectRatio?: string
	refX?: number | string
	refY?: number | string
	viewBox?: string
}

export interface SVGFilterAttributes extends SVGAttributes {
	filterUnits?: "userSpaceOnUse" | "objectBoundingBox"
	height?: number | string
	primitiveUnits?: "userSpaceOnUse" | "objectBoundingBox"
	width?: number | string
	x?: number | string
	y?: number | string
}

export interface SVGSymbolAttributes extends SVGAttributes {
	height?: number | string
	preserveAspectRatio?: string
	refX?: number | string
	refY?: number | string
	viewBox?: string
	width?: number | string
	x?: number | string
	y?: number | string
}

export interface SVGViewAttributes extends SVGAttributes {
	preserveAspectRatio?: string
	viewBox?: string
}

// ── SVG Filter Primitive Attributes ────────────────────────────────

interface SVGFilterPrimitiveBase extends SVGVoidAttributes {
	height?: number | string
	result?: string
	width?: number | string
	x?: number | string
	y?: number | string
}

export interface SVGFeBlendAttributes extends SVGFilterPrimitiveBase {
	in?: string
	in2?: string
	mode?: "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten"
}

export interface SVGFeColorMatrixAttributes extends SVGFilterPrimitiveBase {
	in?: string
	type?: "matrix" | "saturate" | "hueRotate" | "luminanceToAlpha"
	values?: string
}

export interface SVGFeComponentTransferAttributes extends SVGAttributes {
	height?: number | string
	in?: string
	result?: string
	width?: number | string
	x?: number | string
	y?: number | string
}

export interface SVGFeCompositeAttributes extends SVGFilterPrimitiveBase {
	in?: string
	in2?: string
	k1?: number | string
	k2?: number | string
	k3?: number | string
	k4?: number | string
	operator?: "over" | "in" | "out" | "atop" | "xor" | "arithmetic"
}

export interface SVGFeConvolveMatrixAttributes extends SVGFilterPrimitiveBase {
	bias?: number | string
	divisor?: number | string
	edgeMode?: "duplicate" | "wrap" | "none"
	in?: string
	kernelMatrix?: string
	kernelUnitLength?: string
	order?: string
	preserveAlpha?: boolean
	targetX?: number | string
	targetY?: number | string
}

export interface SVGFeDisplacementMapAttributes extends SVGFilterPrimitiveBase {
	in?: string
	in2?: string
	scale?: number | string
	xChannelSelector?: "R" | "G" | "B" | "A"
	yChannelSelector?: "R" | "G" | "B" | "A"
}

export interface SVGFeFloodAttributes extends SVGFilterPrimitiveBase {
	"flood-color"?: string
	"flood-opacity"?: number | string
}

export interface SVGFeDropShadowAttributes extends SVGFilterPrimitiveBase {
	dx?: number | string
	dy?: number | string
	"flood-color"?: string
	"flood-opacity"?: number | string
	stdDeviation?: number | string
}

export interface SVGFeFuncAttributes extends SVGVoidAttributes {
	amplitude?: number | string
	exponent?: number | string
	intercept?: number | string
	offset?: number | string
	slope?: number | string
	tableValues?: string
	type?: "identity" | "table" | "discrete" | "linear" | "gamma"
}

export interface SVGFeGaussianBlurAttributes extends SVGFilterPrimitiveBase {
	edgeMode?: "duplicate" | "wrap" | "none"
	in?: string
	stdDeviation?: number | string
}

export interface SVGFeImageAttributes extends SVGFilterPrimitiveBase {
	crossorigin?: CrossOrigin
	href?: string
	preserveAspectRatio?: string
}

export interface SVGFeMergeAttributes extends SVGAttributes {
	height?: number | string
	result?: string
	width?: number | string
	x?: number | string
	y?: number | string
}

export interface SVGFeMergeNodeAttributes extends SVGVoidAttributes {
	in?: string
}

export interface SVGFeMorphologyAttributes extends SVGFilterPrimitiveBase {
	in?: string
	operator?: "erode" | "dilate"
	radius?: number | string
}

export interface SVGFeOffsetAttributes extends SVGFilterPrimitiveBase {
	dx?: number | string
	dy?: number | string
	in?: string
}

export interface SVGFeSpecularLightingAttributes extends SVGAttributes {
	height?: number | string
	in?: string
	"lighting-color"?: string
	result?: string
	specularConstant?: number | string
	specularExponent?: number | string
	surfaceScale?: number | string
	width?: number | string
	x?: number | string
	y?: number | string
}

export interface SVGFeDiffuseLightingAttributes extends SVGAttributes {
	diffuseConstant?: number | string
	height?: number | string
	in?: string
	"lighting-color"?: string
	result?: string
	surfaceScale?: number | string
	width?: number | string
	x?: number | string
	y?: number | string
}

export interface SVGFePointLightAttributes extends SVGVoidAttributes {
	x?: number | string
	y?: number | string
	z?: number | string
}

export interface SVGFeSpotLightAttributes extends SVGVoidAttributes {
	limitingConeAngle?: number | string
	pointsAtX?: number | string
	pointsAtY?: number | string
	pointsAtZ?: number | string
	specularExponent?: number | string
	x?: number | string
	y?: number | string
	z?: number | string
}

export interface SVGFeDistantLightAttributes extends SVGVoidAttributes {
	azimuth?: number | string
	elevation?: number | string
}

export interface SVGFeTileAttributes extends SVGFilterPrimitiveBase {
	in?: string
}

export interface SVGFeTurbulenceAttributes extends SVGFilterPrimitiveBase {
	baseFrequency?: string
	numOctaves?: number | string
	seed?: number | string
	stitchTiles?: "stitch" | "noStitch"
	type?: "fractalNoise" | "turbulence"
}

export interface SVGAnimateAttributes extends SVGAttributes {
	attributeName?: string
	begin?: string
	dur?: string
	end?: string
	fill?: string
	from?: string
	keySplines?: string
	keyTimes?: string
	max?: string
	min?: string
	repeatCount?: number | string
	repeatDur?: string
	restart?: "always" | "whenNotActive" | "never"
	to?: string
	values?: string
}

export interface SVGAnimateTransformAttributes extends SVGAttributes {
	attributeName?: string
	begin?: string
	dur?: string
	end?: string
	fill?: string
	from?: string
	repeatCount?: number | string
	repeatDur?: string
	restart?: "always" | "whenNotActive" | "never"
	to?: string
	type?: "translate" | "scale" | "rotate" | "skewX" | "skewY"
	values?: string
}

export interface SVGSetAttributes extends SVGVoidAttributes {
	attributeName?: string
	begin?: string
	dur?: string
	end?: string
	fill?: string
	to?: string
}

// ── IntrinsicElements ──────────────────────────────────────────────

export interface IntrinsicElements {
	// HTML non-void elements
	a: AnchorAttributes
	abbr: HtmlAttributes
	address: HtmlAttributes
	article: HtmlAttributes
	aside: HtmlAttributes
	audio: AudioAttributes
	b: HtmlAttributes
	bdi: HtmlAttributes
	bdo: HtmlAttributes
	blockquote: BlockquoteAttributes
	body: HtmlAttributes
	button: ButtonAttributes
	canvas: CanvasAttributes
	caption: HtmlAttributes
	cite: HtmlAttributes
	code: HtmlAttributes
	colgroup: ColgroupAttributes
	data: DataElementAttributes
	datalist: HtmlAttributes
	dd: HtmlAttributes
	del: DelAttributes
	details: DetailsAttributes
	dfn: HtmlAttributes
	dialog: DialogAttributes
	div: HtmlAttributes
	dl: HtmlAttributes
	dt: HtmlAttributes
	em: HtmlAttributes
	fieldset: FieldsetAttributes
	figcaption: HtmlAttributes
	figure: HtmlAttributes
	footer: HtmlAttributes
	form: FormAttributes
	h1: HtmlAttributes
	h2: HtmlAttributes
	h3: HtmlAttributes
	h4: HtmlAttributes
	h5: HtmlAttributes
	h6: HtmlAttributes
	head: HtmlAttributes
	header: HtmlAttributes
	hgroup: HtmlAttributes
	html: HtmlAttributes
	i: HtmlAttributes
	iframe: IframeAttributes
	ins: InsAttributes
	kbd: HtmlAttributes
	label: LabelAttributes
	legend: HtmlAttributes
	li: LiAttributes
	main: HtmlAttributes
	map: MapAttributes
	mark: HtmlAttributes
	math: HtmlAttributes
	menu: HtmlAttributes
	meter: MeterAttributes
	nav: HtmlAttributes
	noscript: HtmlAttributes
	object: ObjectAttributes
	ol: OlAttributes
	optgroup: OptgroupAttributes
	option: OptionAttributes
	output: OutputAttributes
	p: HtmlAttributes
	picture: HtmlAttributes
	pre: HtmlAttributes
	progress: ProgressAttributes
	q: QAttributes
	rp: HtmlAttributes
	rt: HtmlAttributes
	ruby: HtmlAttributes
	s: HtmlAttributes
	samp: HtmlAttributes
	script: ScriptAttributes
	search: HtmlAttributes
	section: HtmlAttributes
	select: SelectAttributes
	slot: SlotAttributes
	small: HtmlAttributes
	span: HtmlAttributes
	strong: HtmlAttributes
	style: StyleAttributes
	sub: HtmlAttributes
	summary: HtmlAttributes
	sup: HtmlAttributes
	table: TableAttributes
	tbody: HtmlAttributes
	td: TdAttributes
	template: TemplateAttributes
	textarea: TextareaAttributes
	tfoot: HtmlAttributes
	th: ThAttributes
	thead: HtmlAttributes
	time: TimeAttributes
	tr: HtmlAttributes
	u: HtmlAttributes
	ul: HtmlAttributes
	var: HtmlAttributes
	video: VideoAttributes

	// HTML void elements
	area: AreaAttributes
	base: BaseAttributes
	br: VoidHtmlAttributes
	col: ColAttributes
	embed: EmbedAttributes
	hr: VoidHtmlAttributes
	img: ImgAttributes
	input: InputAttributes
	link: LinkAttributes
	meta: MetaAttributes
	param: ParamAttributes
	source: SourceAttributes
	track: TrackAttributes
	wbr: VoidHtmlAttributes

	// SVG non-void elements
	svg: SVGSVGAttributes
	circle: SVGCircleAttributes
	clipPath: SVGClipPathAttributes
	defs: SVGAttributes
	desc: SVGAttributes
	ellipse: SVGEllipseAttributes
	feComponentTransfer: SVGFeComponentTransferAttributes
	feDiffuseLighting: SVGFeDiffuseLightingAttributes
	feMerge: SVGFeMergeAttributes
	feSpecularLighting: SVGFeSpecularLightingAttributes
	filter: SVGFilterAttributes
	foreignObject: SVGForeignObjectAttributes
	g: SVGAttributes
	image: SVGImageAttributes
	line: SVGLineAttributes
	linearGradient: SVGLinearGradientAttributes
	marker: SVGMarkerAttributes
	mask: SVGMaskAttributes
	path: SVGPathAttributes
	pattern: SVGPatternAttributes
	polygon: SVGPolygonAttributes
	polyline: SVGPolylineAttributes
	radialGradient: SVGRadialGradientAttributes
	rect: SVGRectAttributes
	symbol: SVGSymbolAttributes
	text: SVGTextAttributes
	textPath: SVGTextPathAttributes
	title: SVGAttributes
	tspan: SVGTSpanAttributes
	use: SVGUseAttributes
	view: SVGViewAttributes

	// SVG animation elements
	animate: SVGAnimateAttributes
	animateTransform: SVGAnimateTransformAttributes
	set: SVGSetAttributes

	// SVG void elements (filter primitives)
	feBlend: SVGFeBlendAttributes
	feColorMatrix: SVGFeColorMatrixAttributes
	feComposite: SVGFeCompositeAttributes
	feConvolveMatrix: SVGFeConvolveMatrixAttributes
	feDisplacementMap: SVGFeDisplacementMapAttributes
	feDistantLight: SVGFeDistantLightAttributes
	feDropShadow: SVGFeDropShadowAttributes
	feFlood: SVGFeFloodAttributes
	feFuncA: SVGFeFuncAttributes
	feFuncB: SVGFeFuncAttributes
	feFuncG: SVGFeFuncAttributes
	feFuncR: SVGFeFuncAttributes
	feGaussianBlur: SVGFeGaussianBlurAttributes
	feImage: SVGFeImageAttributes
	feMergeNode: SVGFeMergeNodeAttributes
	feMorphology: SVGFeMorphologyAttributes
	feOffset: SVGFeOffsetAttributes
	fePointLight: SVGFePointLightAttributes
	feSpotLight: SVGFeSpotLightAttributes
	feTile: SVGFeTileAttributes
	feTurbulence: SVGFeTurbulenceAttributes
}
