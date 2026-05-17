# @suckless/jsx

JSX-to-HTML runtime for server-side rendering. No client runtime, no hydration, no effects — JSX expressions produce render handles that stringify to escaped HTML.

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
// String(page): "<html><head><title>Hello</title></head>..."
```

### Components

Function components receive props and return renderable HTML:

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

Components are synchronous. Promise-returning components are rejected during rendering.

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

### React-shaped render libraries

The root export includes a small server-only React-shaped surface for pure render libraries:

- `createElement`
- `forwardRef`
- `memo`
- `createContext` / `useContext`
- `cloneElement`
- `isValidElement`
- `Children.toArray`

Alias React imports to this package when a dependency imports `react`:

```json
{
	"alias": {
		"react": "@suckless/jsx",
		"react/jsx-runtime": "@suckless/jsx/jsx-runtime",
		"react/jsx-dev-runtime": "@suckless/jsx/jsx-dev-runtime"
	}
}
```

This supports pure server-rendered components such as icon libraries. It does not implement client state, effects, hydration, Suspense, or portals.

## API

### `escape(value: string): string`

Escapes `&`, `<`, `>`, `"`, and `'` to their HTML entity equivalents.

### `raw(value: string): RawHtml`

Wraps a string to bypass automatic escaping. Use only with trusted content.

### `Fragment(props: { children?: Renderable }): RawHtml`

Renders children without a wrapper element. Used automatically by `<>...</>` syntax.

### `createElement(tag, props, ...children): RawHtml`

Creates a render handle using the classic React-style call shape.

## Type Safety

Every HTML and SVG element has strict per-element attribute types:

- Void elements (`<br>`, `<img>`, `<input>`, etc.) reject children at the type level
- Element-specific attributes are enforced (`href` on `<a>`, not on `<div>`)
- Standard HTML attributes (`class`, `for`) — not React conventions
- Common React DOM/SVG aliases (`className`, `htmlFor`, `strokeWidth`, etc.) are normalized during rendering
- No event handler types — this is a server-side renderer
- `data-*` and `aria-*` attributes are supported on all elements

## License

MIT
