---
"@suckless/queue": minor
---

Remove PullResult wrapper from queue adapter API. `pull` now returns `Promise<T | undefined>` instead of `Promise<PullResult<T> | undefined>`, matching the same simplification applied to @suckless/cache.
