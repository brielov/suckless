---
"@suckless/router": minor
---

Throw an error when registering routes with conflicting param names at the same trie position (e.g. `/users/:id` then `/users/:name`). Previously the second name was silently ignored.
