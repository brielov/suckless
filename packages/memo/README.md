# @suckless/memo

Memoization with explicit key functions and optional LRU eviction.

## Install

```sh
npm install @suckless/memo
```

## Usage

```typescript
import { memo } from "@suckless/memo"

const expensive = memo(
	(a: number, b: number) => a + b,
	(a, b) => `${a},${b}`,
)

expensive(1, 2) // computes
expensive(1, 2) // cached
```

### With LRU eviction

```typescript
const memoized = memo(fn, key, { max: 100 })
```

When the cache reaches `max` entries, the least recently used entry is evicted. Cache hits update recency.

### With @suckless/key

```typescript
import { memo } from "@suckless/memo"
import { stableKey } from "@suckless/key"

const memoized = memo(fn, (...args) => stableKey(args))
```

## API

### `memo(fn, key, options?)`

- **fn** — the function to memoize
- **key** — maps arguments to a cache key string
- **options.max** — optional; caps cache size with LRU eviction (must be a positive integer)

Returns a function with the same signature as `fn`.

## License

MIT
