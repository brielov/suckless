# @suckless/sse

Server-Sent Events channel for Web API servers. Zero dependencies, runtime-agnostic.

## Install

```sh
npm install @suckless/sse
```

## Usage

```ts
import { createSSEChannel } from "@suckless/sse"

const channel = createSSEChannel({ heartbeat: 15_000, replay: 50 })

// In your request handler
function handler(req: Request): Response {
	return channel.connect(req)
}

// Broadcast from anywhere
channel.send("message", { text: "hello" })
channel.send("update", { count: 42 })

// Cleanup
channel.close()
```

## How it works

Each call to `connect()` creates a `ReadableStream` wired to the client via the standard `Response` constructor. Events are broadcast to all connected clients as SSE-formatted text chunks. Clients that disconnect (via `AbortSignal` or stream cancellation) are cleaned up automatically.

Optional keepalive comments (`: keepalive`) prevent proxies and load balancers from closing idle connections. An optional replay buffer stores recent events so reconnecting clients can catch up via the `Last-Event-ID` header.

To avoid unbounded memory growth, clients that stop draining their stream are disconnected once their pending buffer exceeds the internal safety limit.

## API

### `createSSEChannel(options?): SSEChannel`

Creates a new SSE channel.

| Option      | Type     | Default | Description                                               |
| ----------- | -------- | ------- | --------------------------------------------------------- |
| `heartbeat` | `number` | `15000` | Keepalive interval in ms. Set to `0` to disable.          |
| `replay`    | `number` | `0`     | Number of recent events to buffer. Set to `0` to disable. |

### `channel.connect(req): Response`

Accepts a `Request` and returns an SSE `Response`. Honors `Last-Event-ID` for replay. Returns a `503` if the channel is closed.

### `channel.send(event, data): void`

Broadcasts an event to all connected clients. `event` must not contain CR/LF characters, and `data` must serialize with `JSON.stringify()`. Throws if validation fails or the channel is closed.

### `channel.close(): void`

Closes the channel, disconnects all clients, and clears the replay buffer. Idempotent.

### `channel.clients: number`

Number of currently connected clients.

### Cleanup

The channel implements the standard disposal protocol:

```ts
using channel = createSSEChannel()
```

`using` requires toolchain support for Explicit Resource Management (TypeScript 5.2+).

You can also call `channel[Symbol.dispose]()` directly.

## License

MIT
