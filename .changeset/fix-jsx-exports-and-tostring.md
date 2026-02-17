---
"@suckless/jsx": patch
---

Fix broken module resolution in Bun by removing `bun` export conditions that pointed to unpublished `src/` files. Add `toString()` to `RawHtml` so JSX results coerce to strings in template literals without needing `.value`.
