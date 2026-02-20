# @suckless/cache

## 0.4.0

### Minor Changes

- adbb2ed: Remove CacheResult wrapper from cache API. `get` now returns `Promise<V | undefined>` instead of `Promise<CacheResult<V> | undefined>`, matching the canonical cache interface (Redis, Memcached, Map).
- e840c59: Add `NonUndefined` type constraint to value/item type parameters. `Cache<string, undefined>` and `Queue<undefined>` are now compile-time errors, since `undefined` is used as the miss/end-of-stream sentinel.

## 0.3.0

## 0.2.3

## 0.2.2

## 0.2.1
