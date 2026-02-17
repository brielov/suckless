/** A function that handles an input and produces an output. */
export type Handler<In, Out> = (input: In) => Out | Promise<Out>

/** A function that intercepts and transforms a handler's behavior. */
export type Middleware<In, Out> = (
	input: In,
	next: Handler<In, Out>,
) => Out | Promise<Out>

/** Compose middleware into a handler wrapper. */
export function compose<In, Out>(
	...middlewares: Middleware<In, Out>[]
): (handler: Handler<In, Out>) => Handler<In, Out> {
	if (middlewares.length === 0) {
		return (handler) => handler
	}
	const mws = [...middlewares]
	return (handler) => {
		let fn = handler
		for (let i = mws.length - 1; i >= 0; i--) {
			const next = fn
			const mw = mws[i]
			if (mw) {
				fn = (input) => mw(input, next)
			}
		}
		return fn
	}
}
