# @suckless/jsx

JSX-to-string runtime for server-side HTML rendering. No virtual DOM, no framework, no hydration — JSX expressions evaluate directly to strings with automatic XSS escaping.

## Install

```sh
bun add @suckless/jsx
```

## Setup

Add the JSX pragma to files that use JSX:

```tsx
/** @jsxImportSource @suckless/jsx */
```

Or configure it globally in `tsconfig.json`:

```json
{
	"compilerOptions": {
		"jsx": "react-jsx",
		"jsxImportSource": "@suckless/jsx"
	}
}
```

## Usage

```tsx
/** @jsxImportSource @suckless/jsx */

const page = (
	<html>
		<head>
			<title>Hello</title>
		</head>
		<body>
			<h1>Hello, world!</h1>
		</body>
	</html>
)
// page is a plain string: "<html><head><title>Hello</title></head>..."
```

### Components

Function components receive props and return strings:

```tsx
/** @jsxImportSource @suckless/jsx */
import type { Component } from "@suckless/jsx"

const Card: Component<{ title: string }> = (props) => (
	<div class="card">
		<h2>{props.title}</h2>
		{props.children}
	</div>
)

const html = (
	<Card title="Welcome">
		<p>Content here</p>
	</Card>
)
```

### Escaping

All string children and attribute values are escaped by default:

```tsx
/** @jsxImportSource @suckless/jsx */
import { raw } from "@suckless/jsx"

// Escaped (safe)
const safe = <div>{"<script>alert('xss')</script>"}</div>
// → <div>&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;</div>

// Unescaped (trusted content only)
const trusted = <div>{raw("<b>bold</b>")}</div>
// → <div><b>bold</b></div>
```

### Fragments

```tsx
/** @jsxImportSource @suckless/jsx */

const items = (
	<>
		<li>One</li>
		<li>Two</li>
	</>
)
// → "<li>One</li><li>Two</li>"
```

## API

### `escape(value: string): string`

Escapes `&`, `<`, `>`, `"`, and `'` to their HTML entity equivalents.

### `raw(value: string): RawHtml`

Wraps a string to bypass automatic escaping. Use only with trusted content.

### `Fragment(props: { children?: Children }): string`

Renders children without a wrapper element. Used automatically by `<>...</>` syntax.

## Type Safety

Every HTML and SVG element has strict per-element attribute types:

- Void elements (`<br>`, `<img>`, `<input>`, etc.) reject children at the type level
- Element-specific attributes are enforced (`href` on `<a>`, not on `<div>`)
- Standard HTML attributes (`class`, `for`) — not React conventions
- No event handler types — this is a server-side renderer
- `data-*` and `aria-*` attributes are supported on all elements

## License

MIT
