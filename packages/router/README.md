# @suckless/router

Fast URL pattern router. ~100 lines, zero dependencies, runtime-agnostic.

## Install

```sh
npm install @suckless/router
```

## Usage

```ts
import { createRouter } from "@suckless/router"

const router = createRouter<string>()
	.add("/health", "health")
	.add("/users/:id", "getUser")
	.add("/users/:id/posts/:postId", "getPost")
	.add("/files/*path", "getFile")

router.find("/users/42")
// { value: "getUser", params: { id: "42" } }

router.find("/users/42/posts/7")
// { value: "getPost", params: { id: "42", postId: "7" } }

router.find("/files/a/b/c")
// { value: "getFile", params: { path: "a/b/c" } }

router.find("/missing")
// undefined
```

## With Bun

```ts
import { createRouter } from "@suckless/router"

type Handler = (req: Request, params: Record<string, string>) => Response

const router = createRouter<Handler>()
	.add("/users/:id", (req, params) => {
		return new Response(`User ${params.id}`)
	})
	.add("/health", () => new Response("ok"))

Bun.serve({
	fetch(req) {
		const url = new URL(req.url)
		const match = router.find(url.pathname)
		if (match) return match.value(req, match.params)
		return new Response("Not Found", { status: 404 })
	},
})
```

## Patterns

- **Static**: `/health`, `/api/users` — exact match
- **Params**: `/users/:id` — captures a single path segment
- **Wildcard**: `/files/*path` — captures the rest of the path

Priority: static > param > wildcard. If a param branch fails to match deeper segments, the router backtracks to try wildcard.

## Performance

- **Static routes** are stored in a flat `Map` — O(1) lookup
- **Dynamic routes** use a segment trie with `Map` children — O(depth) with O(1) per level
- Path scanning uses `indexOf` instead of `split` — zero array allocation on the hot path
- Backtracking only occurs when param and wildcard compete at the same level

## API

### `createRouter<T>(): Router<T>`

Creates a new router that maps patterns to values of type `T`.

### `router.add(pattern, value): Router<T>`

Registers a route. Returns the router for chaining.

### `router.find(path): Match<T> | undefined`

Matches a path against registered routes. Returns `{ value, params }` or `undefined`.

## License

MIT
