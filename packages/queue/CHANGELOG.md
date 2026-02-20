# @suckless/queue

## 0.4.0

### Minor Changes

- 7503533: Remove PullResult wrapper from queue adapter API. `pull` now returns `Promise<T | undefined>` instead of `Promise<PullResult<T> | undefined>`, matching the same simplification applied to @suckless/cache.
- e840c59: Add `NonUndefined` type constraint to value/item type parameters. `Cache<string, undefined>` and `Queue<undefined>` are now compile-time errors, since `undefined` is used as the miss/end-of-stream sentinel.

## 0.3.0

## 0.2.3

## 0.2.2

## 0.2.1
