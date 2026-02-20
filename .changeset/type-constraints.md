---
"@suckless/cache": minor
"@suckless/queue": minor
---

Add `NonUndefined` type constraint to value/item type parameters. `Cache<string, undefined>` and `Queue<undefined>` are now compile-time errors, since `undefined` is used as the miss/end-of-stream sentinel.
