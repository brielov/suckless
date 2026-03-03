import {
	Fragment as runtimeFragment,
	jsx as runtimeJsx,
	jsxDEV as runtimeJsxDEV,
	jsxs as runtimeJsxs,
} from "./jsx-runtime.ts"

export const Fragment: typeof runtimeFragment = runtimeFragment
export const jsx: typeof runtimeJsx = runtimeJsx
export const jsxDEV: typeof runtimeJsxDEV = runtimeJsxDEV
export const jsxs: typeof runtimeJsxs = runtimeJsxs
export type { JSX } from "./jsx-runtime.ts"
