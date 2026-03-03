import {
	Fragment as runtimeFragment,
	escape as runtimeEscape,
	raw as runtimeRaw,
} from "./jsx-runtime.ts"

export const escape: typeof runtimeEscape = runtimeEscape
export const Fragment: typeof runtimeFragment = runtimeFragment
export const raw: typeof runtimeRaw = runtimeRaw
export type * from "./types.ts"
