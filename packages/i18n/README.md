# @suckless/i18n

Minimal, type-safe internationalization with BCP 47 locale resolution.

## Install

```sh
npm install @suckless/i18n
```

## Usage

Define translations as plain strings or functions:

```typescript
// locales/en.ts
import type { Dict } from "@suckless/i18n"

export default {
	home: "Home",
	greeting: (p: { name: string }) => `Hello, ${p.name}!`,
	items: (p: { count: number }) =>
		p.count === 1 ? `${p.count} item` : `${p.count} items`,
} satisfies Dict
```

Use strings for static text, functions when you need interpolation or logic.

### Type contract

The base locale defines the shape. Enforce it on other locales with `satisfies`:

```typescript
// locales/es.ts
import type en from "./en"

export default {
	home: "Inicio",
	greeting: (p: { name: string }) => `Hola, ${p.name}!`,
	items: (p: { count: number }) =>
		p.count === 1 ? `${p.count} elemento` : `${p.count} elementos`,
} satisfies typeof en
// ^ Adding a key to en without adding it here is a compile error.
```

### Partial overrides with merge

Use `merge` for regional variants without duplicating the full dictionary:

```typescript
// locales/es-ar.ts
import es from "./es"
import { merge } from "@suckless/i18n"

export default merge(es, {
	greeting: (p: { name: string }) => `Ché, ${p.name}!`,
	// everything else inherited from es
})
```

### Resolve and translate

```typescript
import { resolve, translate } from "@suckless/i18n"

const loaders = {
	en: () => import("./locales/en").then((m) => m.default),
	es: () => import("./locales/es").then((m) => m.default),
	"es-AR": () => import("./locales/es-ar").then((m) => m.default),
}

const tag = resolve(loaders, "en", navigator.language)
const dict = await loaders[tag]()
const t = translate(dict)

t("greeting", { name: "World" }) // type-safe key + params
t("home") // no params needed for string entries
```

`resolve` only reads the keys of the object you pass — values are ignored. This lets you pass a loaders record, a dict record, or any object whose keys are locale tags.

## Fallback chain

Locale resolution follows BCP 47 prefix stripping:

- `es-AR` → exact match if registered
- `es-VE` → no `es-VE` → tries `es` → match
- `pt-BR` → no `pt-BR` → tries `pt` → no `pt` → fallback locale

## API

### `translate(dict)`

Wraps a dictionary in a type-safe translate function.

- **`dict`** — A `Dict` object (string or function entries).
- **Returns** — `TranslateFn<D>` with autocomplete on keys and type-checked parameters.

### `resolve(locales, fallback, locale)`

Resolves a locale string via BCP 47 prefix stripping.

- **`locales`** — Object whose keys are supported locale tags. Values are ignored.
- **`fallback`** — Key in `locales` used when no match is found (compile-time and runtime checked).
- **`locale`** — The locale string to resolve.
- **Returns** — The matched key from `locales`.

### `merge(base, overrides)`

Merges a base dictionary with partial overrides.

- **`base`** — The full dictionary to extend.
- **`overrides`** — A partial dictionary. Only keys from `base` are allowed, with matching types.
- **Returns** — A new dictionary with the same type as `base`.

### Types

```typescript
type Entry = string | ((...args: never[]) => string)
type Dict = Record<string, Entry>
type TranslateFn<D extends Dict> = <K extends keyof D & string>(
	key: K,
	...args: D[K] extends (...args: infer A) => string ? A : []
) => string
```

## License

MIT
