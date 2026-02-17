# @suckless/schema

Runtime validation with compiled validators. ~300 lines, zero dependencies, runtime-agnostic.

Schemas are declarative descriptors. Calling `compile()` generates a straight-line JavaScript validator via `new Function()`, yielding 10–700x speedup over interpretation-based libraries. Compiled functions are cached per schema identity.

## Install

```sh
npm install @suckless/schema
```

## Usage

```ts
import { object, string, integer, parse } from "@suckless/schema"

const User = object({
	name: string,
	age: integer,
})

const user = parse(User, input) // throws on invalid input
```

## Primitives

```ts
import { string, number, integer, boolean, bigint } from "@suckless/schema"

parse(string, "hello") // ok
parse(number, 3.14) // ok (must be finite)
parse(integer, 42) // ok (must be integer)
parse(boolean, true) // ok
parse(bigint, 0n) // ok
```

## Literals and enums

```ts
import { literal, oneOf } from "@suckless/schema"

const admin = literal("admin")
parse(admin, "admin") // ok
parse(admin, "user") // throws

const status = oneOf("active", "inactive", "pending")
parse(status, "active") // ok
```

`literal(null)` validates null values.

## Optional values

```ts
import { maybe, object, string } from "@suckless/schema"

const Profile = object({
	name: string,
	bio: maybe(string), // accepts string, null, or undefined
})

parse(Profile, { name: "Alice" }) // ok, bio absent
parse(Profile, { name: "Alice", bio: null }) // ok, bio normalized to undefined
```

`maybe` normalizes both `null` and `undefined` to `undefined`. In object context, the key may be absent entirely.

## Containers

```ts
import { array, object, tuple, record } from "@suckless/schema"

const Tags = array(string)
const Point = tuple(number, number)
const Scores = record(integer)

parse(Tags, ["a", "b"]) // ok
parse(Point, [1.5, 2.0]) // ok
parse(Scores, { math: 95 }) // ok
```

## Unions

```ts
import { union, string, number, object, literal } from "@suckless/schema"

// typeof-discriminated: compiles to a switch on typeof
const StringOrNum = union(string, number)

// Object-discriminated: compiles to a switch on the literal key
const Shape = union(
	object({ type: literal("circle"), radius: number }),
	object({ type: literal("rect"), width: number, height: number }),
)

// Fallback: try/catch when discrimination is not possible
const Mixed = union(array(string), object({ x: number }))
```

## Transforms

```ts
import { transform, preprocess, string, integer } from "@suckless/schema"

// Validate then transform
const Upper = transform(string, (s) => s.toUpperCase())
parse(Upper, "hello") // "HELLO"

// Transform before validation (receives unknown)
const CoercedInt = preprocess(integer, (v) => Number(v))
parse(CoercedInt, "42") // 42
```

## Refinements

```ts
import { refine, integer } from "@suckless/schema"

const positive = refine(integer, (n) => n > 0, "expected positive")
parse(positive, 5) // ok
parse(positive, -1) // throws "expected positive"
```

## Recursive types

```ts
import { object, array, number, lazy, type Schema } from "@suckless/schema"

type Tree = { value: number; children: Tree[] }

const tree: Schema<Tree> = object({
	value: number,
	children: array(lazy(() => tree)),
})
```

## Compilation

```ts
import { compile, object, string, integer } from "@suckless/schema"

const validate = compile(object({ name: string, age: integer }))

// validate is a generated function — no interpretation overhead
validate({ name: "Alice", age: 30 }) // returns input
validate({ name: "Alice", age: "old" }) // throws "age: expected integer"
```

`compile()` caches by schema identity (WeakMap). `parse()` calls `compile()` internally and benefits from the same cache.

## Error messages

Validation errors are thrown as `Error` instances with dot/bracket path notation in the message:

```
name: expected string
items[2].id: expected integer
data[0].pair[1]: expected integer
```

## Limitations

Validators are compiled via `new Function()`. This will not work in environments with Content Security Policy (CSP) restrictions that disallow `unsafe-eval` (e.g., browser extensions, some web apps with strict CSP headers).

## Type inference

```ts
import { type Infer, object, string, integer } from "@suckless/schema"

const User = object({ name: string, age: integer })
type User = Infer<typeof User> // { name: string; age: number }
```

## License

MIT
