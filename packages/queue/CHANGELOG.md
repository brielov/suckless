# @suckless/queue

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

### Minor Changes

- 7503533: Remove PullResult wrapper from queue adapter API. `pull` now returns `Promise<T | undefined>` instead of `Promise<PullResult<T> | undefined>`, matching the same simplification applied to @suckless/cache.
- e840c59: Add `NonUndefined` type constraint to value/item type parameters. `Cache<string, undefined>` and `Queue<undefined>` are now compile-time errors, since `undefined` is used as the miss/end-of-stream sentinel.

## 0.3.0

## 0.2.3

## 0.2.2

## 0.2.1
