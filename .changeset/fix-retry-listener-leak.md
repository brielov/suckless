---
"@suckless/retry": patch
---

Fix event listener leak in delay function. The abort listener was never removed on normal timer completion, causing stale listeners to accumulate on long-lived signals.
