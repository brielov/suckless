---
"@suckless/schema": minor
"@suckless/jsx": minor
"@suckless/router": minor
"@suckless/limiter": minor
"@suckless/queue": minor
"@suckless/key": minor
"@suckless/i18n": minor
---

Security hardening and bug fixes across packages

- **schema**: Use `Object.hasOwn` instead of `in` to prevent prototype pollution in object/union validation; use `Object.keys` instead of `for..in` for record iteration; wrap `structuredClone` to handle non-cloneable union inputs
- **jsx**: Validate tag names, reject event handler (`on*`) attributes, and harden `isRawHtml` against accessor-based spoofing
- **router**: Validate that patterns and paths start with `/`, reject empty param names and non-terminal wildcards
- **limiter**: Serialize concurrent `check()` calls per key to fix race condition
- **queue**: Retry transient adapter pull failures instead of exiting the worker; resolve `drain()` on dispose
- **key**: Detect and reject accessor properties during serialization
- **i18n**: Match locale tags case-insensitively per BCP 47
