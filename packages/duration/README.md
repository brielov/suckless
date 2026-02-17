# @suckless/duration

Parse and format duration strings. ~60 lines, zero dependencies, runtime-agnostic.

## Install

```sh
npm install @suckless/duration
```

## Usage

```ts
import { parse, format } from "@suckless/duration"

parse("2h30m") // 9000000
parse("500ms") // 500
parse("1.5h") // 5400000

format(90000) // "1m30s"
format(86400000) // "1d"
format(0) // "0ms"
```

## API

### `parse(input: string): number`

Parses a duration string into milliseconds.

- Accepts compound strings: `"2h30m"`, `"1d12h"`, `"500ms"`, `"90s"`
- Accepts single units: `"5m"`, `"100ms"`
- Supports decimals: `"1.5h"` → 5400000
- Whitespace between segments is allowed: `"2h 30m"`
- Throws `SyntaxError` on invalid input (empty string, unknown units, bare numbers, negative values)
- Returns integer milliseconds (rounds result)

### `format(ms: number): string`

Formats milliseconds into a human-readable duration string.

- Returns the most compact representation using largest units first
- `format(90000)` → `"1m30s"`, `format(86400000)` → `"1d"`
- `format(0)` → `"0ms"`
- Sub-millisecond remainders are dropped
- Throws `RangeError` on negative, NaN, or Infinity input

### `Unit`

```ts
type Unit = "ms" | "s" | "m" | "h" | "d"
```

### Unit table

| Unit | Multiplier |
| ---- | ---------- |
| ms   | 1          |
| s    | 1000       |
| m    | 60000      |
| h    | 3600000    |
| d    | 86400000   |

## License

MIT
