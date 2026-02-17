# @suckless/retry

Retry with exponential backoff and jitter. ~80 lines, zero dependencies, runtime-agnostic.

## Install

```sh
npm install @suckless/retry
```

## Usage

```ts
import { retry } from "@suckless/retry"

const data = await retry(async (attempt, signal) => {
	const res = await fetch("https://api.example.com/data", { signal })
	if (!res.ok) throw new Error(`HTTP ${res.status}`)
	return res.json()
})
```

By default, `retry` makes up to 3 attempts with exponential backoff and full jitter.

## Options

```ts
await retry(fn, {
	maxAttempts: 5, // default: 3
	baseDelay: 500, // default: 1000 (ms)
	maxDelay: 10_000, // default: 30000 (ms)
	signal: controller.signal,
	shouldRetry: (error) => error instanceof TransientError,
})
```

### `maxAttempts`

Total number of attempts including the first. Setting this to `1` disables retrying.

### `baseDelay` / `maxDelay`

Controls the backoff timing. The delay before attempt `n` is:

```
random() * min(maxDelay, baseDelay * 2^n)
```

This is full jitter over exponential backoff — the canonical strategy for preventing thundering herd. For a constant delay, set `baseDelay` and `maxDelay` to the same value.

### `signal`

Standard `AbortSignal` for cancellation. Works with `AbortController` and `AbortSignal.timeout()`:

```ts
// Cancel after 10 seconds total
await retry(fn, { signal: AbortSignal.timeout(10_000) })

// Manual cancellation
const controller = new AbortController()
retry(fn, { signal: controller.signal })
controller.abort()
```

The signal is forwarded to `fn` so you can pass it to `fetch` or any other API that accepts it.

### `shouldRetry`

A predicate that receives the thrown error. Return `false` to stop retrying immediately. Useful for non-retryable errors like 4xx HTTP responses or validation failures:

```ts
await retry(
	async () => {
		const res = await fetch("https://api.example.com/data")
		if (!res.ok) throw new HttpError(res.status)
		return res.json()
	},
	{
		shouldRetry: (error) => error instanceof HttpError && error.status >= 500,
	},
)
```

## Error handling

On exhaustion, `retry` throws the error from the last failed attempt. If the original throw value is not an `Error`, it is wrapped via `new Error(String(value), { cause: value })`, preserving the original value as `cause`.

## API

### `retry<T>(fn, options?): Promise<T>`

- `fn(attempt, signal)` — the async function to retry. `attempt` is zero-indexed.
- Returns the result of the first successful call to `fn`.
- Throws the last error if all attempts fail, `shouldRetry` returns false, or the signal is aborted.

## License

MIT
