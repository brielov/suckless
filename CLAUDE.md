# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A monorepo of minimal, zero-dependency TypeScript libraries under the `@suckless` npm organization. Each package is tiny (80–540 lines), single-purpose, type-safe, and runtime-agnostic. Inspired by the suckless philosophy.

## Commands

```sh
bun run build          # Build all packages (bunup)
bun run dev            # Build in watch mode
bun run check          # oxlint --type-check --type-aware
bun run check:fix      # oxlint --type-check --type-aware --fix
bun run fmt            # oxfmt --write .
bun run fmt:check      # oxfmt --check .
bun test               # Run all tests
bun test packages/X    # Run tests for a single package
```

Tests use Bun's built-in test runner (`bun:test`). There is no separate test script — just `bun test`.

## Code Style

Enforced by oxfmt: **tabs, no semicolons, double quotes, trailing commas, 80-char width**.

Linting and type checking use oxlint with `--type-check --type-aware`. The `--type-check` flag enables TypeScript compiler diagnostics (replacing `tsc --noEmit`), and `--type-aware` enables type-informed lint rules. Only `correctness` category is error-level; `suspicious`, `pedantic`, `perf`, and `style` are warnings.

## Architecture

Bun workspaces monorepo. All packages live under `packages/`. Each package has one source file (`src/index.ts`), one test file (`src/index.test.ts`), a `README.md`, and a `package.json`. There are no per-package tsconfig files — a single root `tsconfig.json` covers everything.

Build config is in `bunup.config.ts` at the root. When adding a new package, register it there.

## Adding a New Package

1. Create `packages/<name>/src/index.ts` and `packages/<name>/src/index.test.ts`
2. Create `packages/<name>/package.json` (copy structure from an existing package, update name/description/homepage)
3. Create `packages/<name>/README.md`
4. Add an entry to `bunup.config.ts`
5. Run `bun install` to link the workspace

## Package Conventions

- Single entry point: `src/index.ts`
- All exports from that file
- No external runtime dependencies
- Interfaces and types are exported for adapter/extension patterns
- `AsyncDisposable` for resource cleanup (see `@suckless/cache`)
- Errors use standard classes: `SyntaxError`, `RangeError`, `Error`
- Avoid `async` on functions that don't `await` — return `Promise.resolve()` instead
- Avoid `any`, unsafe casts, and type assertions
