# suckless

Small, focused libraries that do one thing well.

Inspired by the [suckless philosophy](https://suckless.org/philosophy/): software should be simple, minimal, and correct. No bloat, no unnecessary abstractions, no kitchen sinks.

Each package in this repository is:

- **Tiny** — hundreds of lines, not thousands
- **Zero dependencies** — nothing to audit, nothing to break
- **Type-safe** — correct types are the contract, not an afterthought
- **Runtime-agnostic** — works in Bun, Node, Deno, and browsers unless stated otherwise
- **Single-purpose** — solves one problem completely, then stops

## Packages

| Package                                     | Description                                                      |
| ------------------------------------------- | ---------------------------------------------------------------- |
| [@suckless/cache](packages/cache)           | Minimal cache with pluggable adapters and request deduplication  |
| [@suckless/cron](packages/cron)             | Cron expression parser with next/prev schedule computation       |
| [@suckless/duration](packages/duration)     | Parse and format duration strings                                |
| [@suckless/emitter](packages/emitter)       | Type-safe event emitter                                          |
| [@suckless/jsx](packages/jsx)               | JSX-to-string runtime with XSS escaping and strict element types |
| [@suckless/key](packages/key)               | Deterministic value serialization                                |
| [@suckless/limiter](packages/limiter)       | Token bucket rate limiter with pluggable storage                 |
| [@suckless/memo](packages/memo)             | Memoization with LRU eviction                                    |
| [@suckless/middleware](packages/middleware) | Generic composable middleware                                    |
| [@suckless/queue](packages/queue)           | Producer/consumer queue with pluggable storage                   |
| [@suckless/retry](packages/retry)           | Retry with exponential backoff and jitter                        |
| [@suckless/router](packages/router)         | Fast URL pattern router                                          |
| [@suckless/schema](packages/schema)         | Runtime validation with compiled validators                      |

## License

MIT
