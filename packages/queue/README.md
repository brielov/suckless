# @suckless/queue

Producer/consumer queue with pluggable storage. Zero dependencies, runtime-agnostic.

## Install

```sh
npm install @suckless/queue
```

## Usage

```ts
import { createQueue } from "@suckless/queue"

const queue = createQueue<string>(
	async (url) => {
		const res = await fetch(url)
		await saveToDb(res)
	},
	{ concurrency: 4 },
)

// Push items — fire-and-forget
await queue.push("https://example.com/1")
await queue.push("https://example.com/2")

// Wait for all in-flight work to finish
await queue.drain()
```

## How it works

The queue separates producers (who push items) from consumers (worker loops that process them). On creation, `concurrency` worker loops start pulling items from the adapter and passing them to the handler. This design enables pluggable backends — swap the in-memory adapter for Redis, PostgreSQL, or any message broker.

Handler errors are caught to prevent worker death. The handler is responsible for its own error handling (retry, dead-letter, logging).

## API

### `createQueue<T>(handler, options?): Queue<T>`

Creates a new queue. Workers start pulling immediately.

- `handler` — called for each item. May be sync or async.
- `options.adapter` — storage backend. Defaults to `memoryAdapter()`.
- `options.concurrency` — max concurrent handlers. Must be a positive finite integer. Defaults to `1`.

### `queue.push(item): Promise<void>`

Enqueues an item. Rejects with `Error` if the queue is closed.

### `queue.drain(): Promise<void>`

Resolves when all pushed items have been processed. Resolves immediately if nothing is pending.

### `queue.running`

Number of handlers currently executing.

### Cleanup

The queue implements `AsyncDisposable`. Disposing marks the queue as closed, stops workers from pulling new items, waits for in-flight handlers, then disposes the adapter:

```ts
await using queue = createQueue<Job>(processJob, { concurrency: 4 })
```

## Adapters

### `memoryAdapter<T>(): QueueAdapter<T>`

In-memory FIFO adapter. Array-backed with a waiter queue for efficient blocking pull. Items are handed directly to waiting consumers when possible (zero-copy).

### Custom adapters

Implement `QueueAdapter<T>` to plug in any backend:

```ts
import { RedisClient } from "bun"
import type { PullResult, QueueAdapter } from "@suckless/queue"

function redisAdapter<T>(key: string, url?: string): QueueAdapter<T> {
	const redis = new RedisClient(url)
	return {
		async push(item) {
			await redis.send("LPUSH", [key, JSON.stringify(item)])
		},
		async pull(signal) {
			// Poll with a short timeout so the signal can be checked
			while (!signal.aborted) {
				const result = await redis.send("BRPOP", [key, "1"])
				if (result) {
					return { value: JSON.parse(result[1]) } as PullResult<T>
				}
			}
			return undefined
		},
		[Symbol.asyncDispose]() {
			redis.close()
			return Promise.resolve()
		},
	}
}
```

## License

MIT
