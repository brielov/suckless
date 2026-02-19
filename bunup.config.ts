import { defineWorkspace } from "bunup"

// https://bunup.dev/docs/guide/workspaces

export default defineWorkspace([
	{
		name: "cron",
		root: "packages/cron",
	},
	{
		name: "cache",
		root: "packages/cache",
	},
	{
		name: "retry",
		root: "packages/retry",
	},
	{
		name: "schema",
		root: "packages/schema",
	},
	{
		name: "duration",
		root: "packages/duration",
	},
	{
		name: "middleware",
		root: "packages/middleware",
	},
	{
		name: "router",
		root: "packages/router",
	},
	{
		name: "limiter",
		root: "packages/limiter",
	},
	{
		name: "emitter",
		root: "packages/emitter",
	},
	{
		name: "queue",
		root: "packages/queue",
	},
	{
		name: "key",
		root: "packages/key",
	},
	{
		name: "memo",
		root: "packages/memo",
	},
	{
		name: "i18n",
		root: "packages/i18n",
	},
	{
		name: "jsx",
		root: "packages/jsx",
		config: {
			entry: ["src/index.ts", "src/jsx-runtime.ts", "src/jsx-dev-runtime.ts"],
		},
	},
])
