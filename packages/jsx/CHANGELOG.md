# @suckless/jsx

## 0.6.0

## 0.5.1

## 0.5.0

### Minor Changes

- d9eee5c: Security hardening and bug fixes across packages
  - **schema**: Use `Object.hasOwn` instead of `in` to prevent prototype pollution in object/union validation; use `Object.keys` instead of `for..in` for record iteration; wrap `structuredClone` to handle non-cloneable union inputs
  - **jsx**: Validate tag names, reject event handler (`on*`) attributes, and harden `isRawHtml` against accessor-based spoofing
  - **router**: Validate that patterns and paths start with `/`, reject empty param names and non-terminal wildcards
  - **limiter**: Serialize concurrent `check()` calls per key to fix race condition
  - **queue**: Retry transient adapter pull failures instead of exiting the worker; resolve `drain()` on dispose
  - **key**: Detect and reject accessor properties during serialization
  - **i18n**: Match locale tags case-insensitively per BCP 47

## 0.4.0

## 0.3.0

## 0.2.3

### Patch Changes

- Add `property` attribute to `MetaAttributes` for Open Graph meta tags

## 0.2.2

### Patch Changes

- 08eebef: Export all HTML and SVG element attribute types from the package entry point

## 0.2.1

### Patch Changes

- 9db1e07: Fix broken module resolution in Bun by removing `bun` export conditions that pointed to unpublished `src/` files. Add `toString()` to `RawHtml` so JSX results coerce to strings in template literals without needing `.value`.
