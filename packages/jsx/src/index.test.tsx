/** @jsxImportSource @suckless/jsx */
import { describe, expect, test } from "bun:test"
import { escape, raw, type Component } from "@suckless/jsx"

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
