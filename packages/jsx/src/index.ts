import {
	Children as runtimeChildren,
	Fragment as runtimeFragment,
	cloneElement as runtimeCloneElement,
	createContext as runtimeCreateContext,
	createElement as runtimeCreateElement,
	escape as runtimeEscape,
	forwardRef as runtimeForwardRef,
	isValidElement as runtimeIsValidElement,
	memo as runtimeMemo,
	raw as runtimeRaw,
	useCallback as runtimeUseCallback,
	useContext as runtimeUseContext,
	useEffect as runtimeUseEffect,
	useId as runtimeUseId,
	useInsertionEffect as runtimeUseInsertionEffect,
	useLayoutEffect as runtimeUseLayoutEffect,
	useMemo as runtimeUseMemo,
	useReducer as runtimeUseReducer,
	useRef as runtimeUseRef,
	useState as runtimeUseState,
} from "./jsx-runtime.ts"

export const Children: typeof runtimeChildren = runtimeChildren
export const escape: typeof runtimeEscape = runtimeEscape
export const Fragment: typeof runtimeFragment = runtimeFragment
export const raw: typeof runtimeRaw = runtimeRaw
export const cloneElement: typeof runtimeCloneElement = runtimeCloneElement
export const createContext: typeof runtimeCreateContext = runtimeCreateContext
export const createElement: typeof runtimeCreateElement = runtimeCreateElement
export const forwardRef: typeof runtimeForwardRef = runtimeForwardRef
export const isValidElement: typeof runtimeIsValidElement =
	runtimeIsValidElement
export const memo: typeof runtimeMemo = runtimeMemo
export const useCallback: typeof runtimeUseCallback = runtimeUseCallback
export const useContext: typeof runtimeUseContext = runtimeUseContext
export const useEffect: typeof runtimeUseEffect = runtimeUseEffect
export const useId: typeof runtimeUseId = runtimeUseId
export const useInsertionEffect: typeof runtimeUseInsertionEffect =
	runtimeUseInsertionEffect
export const useLayoutEffect: typeof runtimeUseLayoutEffect =
	runtimeUseLayoutEffect
export const useMemo: typeof runtimeUseMemo = runtimeUseMemo
export const useReducer: typeof runtimeUseReducer = runtimeUseReducer
export const useRef: typeof runtimeUseRef = runtimeUseRef
export const useState: typeof runtimeUseState = runtimeUseState
export type * from "./types.ts"

const React: {
	readonly Children: typeof Children
	readonly Fragment: typeof Fragment
	readonly cloneElement: typeof cloneElement
	readonly createContext: typeof createContext
	readonly createElement: typeof createElement
	readonly forwardRef: typeof forwardRef
	readonly isValidElement: typeof isValidElement
	readonly memo: typeof memo
	readonly useCallback: typeof useCallback
	readonly useContext: typeof useContext
	readonly useEffect: typeof useEffect
	readonly useId: typeof useId
	readonly useInsertionEffect: typeof useInsertionEffect
	readonly useLayoutEffect: typeof useLayoutEffect
	readonly useMemo: typeof useMemo
	readonly useReducer: typeof useReducer
	readonly useRef: typeof useRef
	readonly useState: typeof useState
} = {
	Children: Children,
	Fragment: Fragment,
	cloneElement: cloneElement,
	createContext: createContext,
	createElement: createElement,
	forwardRef: forwardRef,
	isValidElement: isValidElement,
	memo: memo,
	useCallback: useCallback,
	useContext: useContext,
	useEffect: useEffect,
	useId: useId,
	useInsertionEffect: useInsertionEffect,
	useLayoutEffect: useLayoutEffect,
	useMemo: useMemo,
	useReducer: useReducer,
	useRef: useRef,
	useState: useState,
} as const

export default React
