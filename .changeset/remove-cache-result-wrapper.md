---
"@suckless/cache": minor
---

Remove CacheResult wrapper from cache API. `get` now returns `Promise<V | undefined>` instead of `Promise<CacheResult<V> | undefined>`, matching the canonical cache interface (Redis, Memcached, Map).
