# @suckless/jsx

## 0.2.2

### Patch Changes

- 08eebef: Export all HTML and SVG element attribute types from the package entry point

## 0.2.1

### Patch Changes

- 9db1e07: Fix broken module resolution in Bun by removing `bun` export conditions that pointed to unpublished `src/` files. Add `toString()` to `RawHtml` so JSX results coerce to strings in template literals without needing `.value`.
