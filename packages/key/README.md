# @suckless/key

Deterministic serialization of complex values into stable string keys. Produces compact, unambiguous strings suitable for cache keys, deduplication, and memoization.

## Install

```sh
npm install @suckless/key
```

## Usage

```typescript
import { stableKey } from "@suckless/key"

stableKey("hello") // 's"hello"'
stableKey(42) // "n42"
stableKey(true) // "T"
stableKey(null) // "N"
stableKey(undefined) // "U"
stableKey(42n) // "b42"
stableKey([1, "a"]) // '[n1,s"a"]'
stableKey({ b: 2, a: 1 }) // "{a:n1,b:n2}" (sorted keys)
```

## Determinism

Object keys are sorted, so property insertion order does not affect output:

```typescript
stableKey({ a: 1, b: 2 }) === stableKey({ b: 2, a: 1 }) // true
```

## Edge cases

Special numeric values each produce a distinct key:

```typescript
stableKey(NaN) // "Z"
stableKey(Infinity) // "I"
stableKey(-Infinity) // "J"
stableKey(-0) // "K"
```

## Error handling

Circular references and non-serializable types throw `TypeError`:

```typescript
const obj = {}
obj.self = obj
stableKey(obj) // TypeError: Circular reference detected

stableKey(new Date()) // TypeError: Non-serializable type: Date
stableKey(() => {}) // TypeError: Non-serializable type: function
stableKey(Symbol("x")) // TypeError: Non-serializable type: symbol
```

## License

MIT
