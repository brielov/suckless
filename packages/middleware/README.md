# @suckless/middleware

Generic composable middleware. ~20 lines, zero dependencies, runtime-agnostic.

## Install

```sh
npm install @suckless/middleware
```

## Usage

```ts
import { compose } from "@suckless/middleware"

const enhance = compose<Request, Response>(cors(), logger())

Bun.serve({ fetch: enhance(app) })
```

## Writing middleware

A middleware receives the input and a `next` function. Call `next` to continue the chain, or return early to short-circuit:

```ts
import type { Middleware } from "@suckless/middleware"

const logger: Middleware<Request, Response> = async (req, next) => {
	const start = performance.now()
	const res = await next(req)
	console.log(`${req.method} ${req.url} ${performance.now() - start}ms`)
	return res
}

const cors: Middleware<Request, Response> = async (req, next) => {
	if (req.method === "OPTIONS") {
		return new Response(null, {
			headers: { "Access-Control-Allow-Origin": "*" },
		})
	}
	const res = await next(req)
	res.headers.set("Access-Control-Allow-Origin", "*")
	return res
}
```

## API

### `compose<In, Out>(...middlewares): (handler) => handler`

Composes middleware into a handler wrapper. Middleware executes left to right — the first middleware in the list runs first.

```ts
const enhance = compose(a, b, c)
// Execution order: a → b → c → handler
```

### `Handler<In, Out>`

```ts
type Handler<In, Out> = (input: In) => Out | Promise<Out>
```

### `Middleware<In, Out>`

```ts
type Middleware<In, Out> = (
	input: In,
	next: Handler<In, Out>,
) => Out | Promise<Out>
```

## License

MIT
