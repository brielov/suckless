/** @jsxImportSource @suckless/jsx */
/* oxlint-disable unicorn/no-null -- The runtime intentionally accepts React-style null children and props. */
import { describe, expect, mock, test } from "bun:test"
import * as SucklessJsx from "@suckless/jsx"
import {
	Children,
	cloneElement,
	createContext,
	createElement,
	escape,
	forwardRef,
	isValidElement,
	memo,
	raw,
	useContext,
	type Component,
	type ElementType,
} from "@suckless/jsx"
import {
	Fragment as devFragment,
	jsx as devJsx,
	jsxDEV as devJsxDEV,
	jsxs as devJsxs,
} from "@suckless/jsx/jsx-dev-runtime"

describe("runtime entrypoints", () => {
	test("jsx-dev-runtime exports callable functions", () => {
		expect(typeof devJsx).toBe("function")
		expect(typeof devJsxs).toBe("function")
		expect(typeof devJsxDEV).toBe("function")
		expect(typeof devFragment).toBe("function")

		expect(devJsx("div", { children: "x" }).value).toBe("<div>x</div>")
		expect(devJsxs("div", { children: ["x", "y"] }).value).toBe("<div>xy</div>")
		expect(devJsxDEV("div", { children: "x" }).value).toBe("<div>x</div>")
		expect(devFragment({ children: "x" }).value).toBe("x")
	})
})

// ── escape() ───────────────────────────────────────────────────────

describe("escape", () => {
	test("escapes all five HTML entities", () => {
		expect(escape(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;")
	})

	test("returns empty string unchanged", () => {
		expect(escape("")).toBe("")
	})

	test("returns string with no special chars unchanged", () => {
		const input = "hello world 123"
		expect(escape(input)).toBe(input)
	})

	test("handles mixed content", () => {
		expect(escape('a & b < c > d " e')).toBe("a &amp; b &lt; c &gt; d &quot; e")
	})
})

// ── raw() ──────────────────────────────────────────────────────────

describe("raw", () => {
	test("raw content is not escaped in JSX", () => {
		const html = <div>{raw("<b>bold</b>")}</div>
		expect(html.value).toBe("<div><b>bold</b></div>")
	})

	test("plain string content is escaped in JSX", () => {
		const html = <div>{"<b>bold</b>"}</div>
		expect(html.value).toBe("<div>&lt;b&gt;bold&lt;/b&gt;</div>")
	})
})

// ── Void elements ──────────────────────────────────────────────────

describe("void elements", () => {
	test("br renders without closing tag", () => {
		expect((<br />).value).toBe("<br>")
	})

	test("img renders with attributes", () => {
		const html = <img src="/a.png" alt="test" />
		expect(html.value).toBe('<img src="/a.png" alt="test">')
	})

	test("input renders with boolean attribute", () => {
		const html = <input type="text" disabled />
		expect(html.value).toBe('<input type="text" disabled>')
	})

	test("hr renders without closing tag", () => {
		expect((<hr />).value).toBe("<hr>")
	})

	test("meta renders with attributes", () => {
		const html = <meta charset="utf-8" />
		expect(html.value).toBe('<meta charset="utf-8">')
	})

	test("link renders with attributes", () => {
		const html = <link rel="stylesheet" href="/style.css" />
		expect(html.value).toBe('<link rel="stylesheet" href="/style.css">')
	})
})

// ── Boolean attributes ─────────────────────────────────────────────

describe("boolean attributes", () => {
	test("true renders as bare attribute", () => {
		const html = <button disabled={true}>ok</button>
		expect(html.value).toBe("<button disabled>ok</button>")
	})

	test("false omits the attribute", () => {
		const html = <button disabled={false}>ok</button>
		expect(html.value).toBe("<button>ok</button>")
	})

	test("hidden true renders as bare attribute", () => {
		const html = <div hidden={true}>secret</div>
		expect(html.value).toBe("<div hidden>secret</div>")
	})
})

// ── Null/undefined attributes ──────────────────────────────────────

describe("null/undefined attributes", () => {
	test("undefined attribute is omitted", () => {
		const html = <div id={undefined}>text</div>
		expect(html.value).toBe("<div>text</div>")
	})

	test("null attribute is omitted via spread", () => {
		const props: Record<string, unknown> = { class: undefined }
		const html = <div {...props}>text</div>
		expect(html.value).toBe("<div>text</div>")
	})
})

// ── Attribute escaping ─────────────────────────────────────────────

describe("attribute escaping", () => {
	test("attribute values are escaped", () => {
		const html = <div title={'<script>alert("xss")</script>'}>ok</div>
		expect(html.value).toBe(
			'<div title="&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;">ok</div>',
		)
	})

	test("single quotes in attributes are escaped", () => {
		const html = <div title="it's">ok</div>
		expect(html.value).toBe('<div title="it&#39;s">ok</div>')
	})
})

// ── Children ───────────────────────────────────────────────────────

describe("children", () => {
	test("string children are escaped", () => {
		const html = <p>{"<em>hi</em>"}</p>
		expect(html.value).toBe("<p>&lt;em&gt;hi&lt;/em&gt;</p>")
	})

	test("number children are rendered", () => {
		const html = <span>{42}</span>
		expect(html.value).toBe("<span>42</span>")
	})

	test("false is filtered out", () => {
		const html = <div>{false}</div>
		expect(html.value).toBe("<div></div>")
	})

	test("null is filtered out", () => {
		// eslint-disable-next-line unicorn/no-null
		const value = null
		const html = <div>{value}</div>
		expect(html.value).toBe("<div></div>")
	})

	test("undefined is filtered out", () => {
		const html = <div>{undefined}</div>
		expect(html.value).toBe("<div></div>")
	})

	test("true is filtered out", () => {
		const html = <div>{true}</div>
		expect(html.value).toBe("<div></div>")
	})

	test("array children are flattened", () => {
		const items = ["one", "two", "three"]
		const html = (
			<ul>
				{items.map((x) => (
					<li>{x}</li>
				))}
			</ul>
		)
		expect(html.value).toBe("<ul><li>one</li><li>two</li><li>three</li></ul>")
	})

	test("mixed children types", () => {
		const html = (
			<div>
				text {42} {true} {false} {undefined}
			</div>
		)
		expect(html.value).toBe("<div>text 42   </div>")
	})

	test("multiple static children", () => {
		const html = (
			<div>
				<span>a</span>
				<span>b</span>
			</div>
		)
		expect(html.value).toBe("<div><span>a</span><span>b</span></div>")
	})
})

// ── Fragment ───────────────────────────────────────────────────────

describe("Fragment", () => {
	test("renders children without wrapper", () => {
		const html = (
			<>
				<p>a</p>
				<p>b</p>
			</>
		)
		expect(html.value).toBe("<p>a</p><p>b</p>")
	})

	test("empty fragment returns empty string", () => {
		const html = <></>
		expect(html.value).toBe("")
	})

	test("fragment with single child", () => {
		const html = (
			<>
				<span>only</span>
			</>
		)
		expect(html.value).toBe("<span>only</span>")
	})
})

// ── Function components ────────────────────────────────────────────

const Greeting: Component<{ name: string }> = (props) => (
	<h1>Hello, {props.name}!</h1>
)

const Card: Component<{ title: string }> = (props) => (
	<div class="card">
		<h2>{props.title}</h2>
		{props.children}
	</div>
)

const Inner: Component = (props) => <em>{props.children}</em>

const Outer: Component = (props) => (
	<div>
		<Inner>{props.children}</Inner>
	</div>
)

describe("function components", () => {
	test("component receives props", () => {
		const html = <Greeting name="world" />
		expect(html.value).toBe("<h1>Hello, world!</h1>")
	})

	test("component receives children", () => {
		const html = (
			<Card title="Test">
				<p>Content</p>
			</Card>
		)
		expect(html.value).toBe(
			'<div class="card"><h2>Test</h2><p>Content</p></div>',
		)
	})

	test("nested components", () => {
		const html = <Outer>text</Outer>
		expect(html.value).toBe("<div><em>text</em></div>")
	})
})

// ── Lazy render handles ────────────────────────────────────────────

describe("lazy render handles", () => {
	test("toString and value render the same HTML", () => {
		const html = <div title="x">ok</div>
		expect(String(html)).toBe('<div title="x">ok</div>')
		expect(html.value).toBe('<div title="x">ok</div>')
	})

	test("component execution is deferred until serialization", () => {
		let calls = 0
		const Deferred: Component = () => {
			calls += 1
			return <span>ok</span>
		}
		const html = <Deferred />
		expect(calls).toBe(0)
		expect(html.value).toBe("<span>ok</span>")
		expect(calls).toBe(1)
		expect(html.value).toBe("<span>ok</span>")
		expect(calls).toBe(1)
	})
})

// ── React-shaped helpers ───────────────────────────────────────────

describe("React-shaped helpers", () => {
	test("createElement renders intrinsic elements", () => {
		const html = createElement("div", { className: "box" }, "ok")
		expect(html.value).toBe('<div class="box">ok</div>')
	})

	test("normalizes React-style HTML, SVG, and style props", () => {
		const html = (
			<label htmlFor="email" style={{ backgroundColor: "red", zIndex: 1 }}>
				<svg viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" />
			</label>
		)
		expect(html.value).toBe(
			'<label for="email" style="background-color:red;z-index:1;"><svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round"></svg></label>',
		)
	})

	test("cloneElement merges props and children", () => {
		const html = cloneElement(
			<button class="a">old</button>,
			{ className: "b" },
			"new",
		)
		expect(html.value).toBe('<button class="b">new</button>')
	})

	test("isValidElement detects render handles", () => {
		expect(isValidElement(<div />)).toBe(true)
		expect(isValidElement("x")).toBe(false)
	})

	test("Children.toArray flattens renderable children", () => {
		expect(
			Children.toArray(["a", [false, <span>b</span>], undefined]).length,
		).toBe(2)
	})

	test("forwardRef renders and ignores ref attributes", () => {
		const Icon = forwardRef<SVGSVGElement, { label: string }>((props) => (
			<svg aria-label={props.label} />
		))
		const html = <Icon label="Search" ref={{ current: null }} />
		expect(html.value).toBe('<svg aria-label="Search"></svg>')
	})

	test("memo renders wrapped components", () => {
		const Badge = memo<{ label: string }>((props) => <span>{props.label}</span>)
		expect((<Badge label="New" />).value).toBe("<span>New</span>")
	})

	test("context provider and useContext render synchronously", () => {
		const Theme = createContext("light")
		const Label: Component = () => <span>{useContext(Theme)}</span>
		const html = (
			<Theme.Provider value="dark">
				<Label />
			</Theme.Provider>
		)
		expect(html.value).toBe("<span>dark</span>")
	})

	test("promise-like renderables fail clearly", () => {
		const props: Record<string, unknown> = {
			children: Promise.resolve(<span />),
		}
		const html = createElement("div", props)
		expect(() => html.value).toThrow("Async components are not supported")
	})

	test("renders Lucide-style icon components", () => {
		const Camera = forwardRef<
			SVGSVGElement,
			{
				className?: string
				color?: string
				size?: number
				strokeWidth?: number
			}
		>((props) =>
			createElement(
				"svg",
				{
					className: props.className,
					fill: "none",
					height: props.size ?? 24,
					stroke: props.color ?? "currentColor",
					strokeLinecap: "round",
					strokeLinejoin: "round",
					strokeWidth: props.strokeWidth ?? 2,
					viewBox: "0 0 24 24",
					width: props.size ?? 24,
				},
				createElement("path", { d: "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9" }),
				createElement("circle", { cx: 12, cy: 13, r: 3 }),
			),
		)
		const html = <Camera className="size-4" />
		expect(html.value).toBe(
			'<svg class="size-4" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9"></path><circle cx="12" cy="13" r="3"></circle></svg>',
		)
	})

	test("renders lucide-react through the React-shaped runtime", async () => {
		void mock.module("react", () => SucklessJsx)
		/* oxlint-disable typescript-eslint/no-unsafe-type-assertion -- The runtime alias is the behavior under test. */
		const { Camera, LucideProvider } =
			(await import("lucide-react")) as unknown as {
				Camera: ElementType
				LucideProvider: ElementType
			}
		/* oxlint-enable typescript-eslint/no-unsafe-type-assertion */

		const icon = createElement(Camera, { className: "size-4" })
		expect(icon.value).toContain("<svg")
		expect(icon.value).toContain('stroke="currentColor"')
		expect(icon.value).toContain('stroke-width="2"')
		expect(icon.value).toContain('class="lucide lucide-camera size-4"')
		expect(icon.value).toContain("<circle")

		const themed = createElement(
			LucideProvider,
			{ color: "red", size: 16 },
			createElement(Camera, undefined),
		)
		expect(themed.value).toContain('width="16"')
		expect(themed.value).toContain('height="16"')
		expect(themed.value).toContain('stroke="red"')
	})
})

// ── SVG ────────────────────────────────────────────────────────────

describe("SVG", () => {
	test("renders svg with children", () => {
		const html = (
			<svg viewBox="0 0 100 100">
				<circle cx="50" cy="50" r="40" fill="red" />
			</svg>
		)
		expect(html.value).toBe(
			'<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red"></circle></svg>',
		)
	})

	test("renders path element", () => {
		const html = (
			<svg viewBox="0 0 24 24">
				<path d="M0 0h24v24H0z" fill="none" />
			</svg>
		)
		expect(html.value).toBe(
			'<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none"></path></svg>',
		)
	})

	test("renders nested SVG groups", () => {
		const html = (
			<svg viewBox="0 0 100 100">
				<g transform="translate(10, 10)">
					<rect x="0" y="0" width="50" height="50" />
				</g>
			</svg>
		)
		expect(html.value).toBe(
			'<svg viewBox="0 0 100 100"><g transform="translate(10, 10)"><rect x="0" y="0" width="50" height="50"></rect></g></svg>',
		)
	})
})

// ── data-* and aria-* attributes ───────────────────────────────────

describe("data and aria attributes", () => {
	test("data-* attributes render correctly", () => {
		const html = <div data-testid="foo">bar</div>
		expect(html.value).toBe('<div data-testid="foo">bar</div>')
	})

	test("aria-* attributes render correctly", () => {
		const html = <button aria-label="Close">X</button>
		expect(html.value).toBe('<button aria-label="Close">X</button>')
	})
})

// ── Edge cases ─────────────────────────────────────────────────────

describe("edge cases", () => {
	test("function attribute values are skipped", () => {
		const props: Record<string, unknown> = {
			onclick: () => {},
		}
		const html = (
			<div data-ok="yes" {...props}>
				text
			</div>
		)
		expect(html.value).toBe('<div data-ok="yes">text</div>')
	})

	test("event-handler attribute names are rejected", () => {
		const props: Record<string, unknown> = {
			onclick: "alert(1)",
		}
		const html = <div {...props}>text</div>
		expect(html.value).toBe("<div>text</div>")
	})

	test("invalid tag names are rejected", () => {
		expect(() => devJsx("img src=x onerror=alert(1)", {})).toThrow(
			"Invalid tag name",
		)
	})

	test("numeric attribute values", () => {
		const html = <div tabindex={0}>text</div>
		expect(html.value).toBe('<div tabindex="0">text</div>')
	})

	test("empty element", () => {
		const html = <div></div>
		expect(html.value).toBe("<div></div>")
	})

	test("deeply nested elements", () => {
		const html = (
			<div>
				<ul>
					<li>
						<a href="/home">Home</a>
					</li>
				</ul>
			</div>
		)
		expect(html.value).toBe(
			'<div><ul><li><a href="/home">Home</a></li></ul></div>',
		)
	})

	test("zero renders as child", () => {
		const html = <span>{0}</span>
		expect(html.value).toBe("<span>0</span>")
	})

	test("negative number renders as child", () => {
		const html = <span>{-1}</span>
		expect(html.value).toBe("<span>-1</span>")
	})

	test("NaN is filtered out as child", () => {
		const html = <span>{NaN}</span>
		expect(html.value).toBe("<span></span>")
	})

	test("Infinity is filtered out as child", () => {
		const html = <span>{Infinity}</span>
		expect(html.value).toBe("<span></span>")
	})

	test("NaN attribute value is omitted", () => {
		const props: Record<string, unknown> = { tabindex: NaN }
		const html = <div {...props}>text</div>
		expect(html.value).toBe("<div>text</div>")
	})

	test("invalid attribute names are rejected", () => {
		const props: Record<string, unknown> = {
			'"><script>alert(1)</script>': "xss",
		}
		const html = <div {...props}>text</div>
		expect(html.value).toBe("<div>text</div>")
	})

	test("attribute names with spaces are rejected", () => {
		const props: Record<string, unknown> = {
			"x onclick=alert(1)": "true",
		}
		const html = <div {...props}>text</div>
		expect(html.value).toBe("<div>text</div>")
	})
})
