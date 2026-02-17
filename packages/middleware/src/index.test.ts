import { describe, expect, test } from "bun:test"
import { type Handler, type Middleware, compose } from "."

const identity: Handler<string, string> = (input) => input

const bracket: Middleware<string, string> = (input, next) => next(`[${input}]`)

const block: Middleware<string, string> = () => "blocked"

const upper: Middleware<string, string> = (input, next) =>
	next(input.toUpperCase())

const wrapAngle: Middleware<string, string> = async (input, next) => {
	const result = await next(input)
	return `<${result}>`
}

const catcher: Middleware<string, string> = async (input, next) => {
	try {
		return await next(input)
	} catch {
		return "recovered"
	}
}

const throws: Handler<string, string> = () => {
	throw new Error("boom")
}

const delay: Middleware<string, string> = async (input, next) => {
	await Promise.resolve()
	return next(input)
}

const toUpper: Handler<string, string> = (input) => input.toUpperCase()

const add: Middleware<number, number> = (input, next) => next(input + 1)

const double: Middleware<number, number> = (input, next) => next(input * 2)

const numId: Handler<number, number> = (n) => n

describe("compose", () => {
	test("no middleware returns handler as-is", async () => {
		const result = await compose<string, string>()(identity)("hello")
		expect(result).toBe("hello")
	})

	test("single middleware wraps handler", async () => {
		const result = await compose(bracket)(identity)("hello")
		expect(result).toBe("[hello]")
	})

	test("executes middleware left to right", async () => {
		const order: number[] = []
		const a: Middleware<string, string> = (input, next) => {
			order.push(1)
			return next(input)
		}
		const b: Middleware<string, string> = (input, next) => {
			order.push(2)
			return next(input)
		}
		const handler: Handler<string, string> = (input) => {
			order.push(3)
			return input
		}
		const result = await compose(a, b)(handler)("hello")
		expect(order).toEqual([1, 2, 3])
		expect(result).toBe("hello")
	})

	test("middleware can short-circuit", async () => {
		const result = await compose(block)(identity)("hello")
		expect(result).toBe("blocked")
	})

	test("middleware can transform input", async () => {
		const result = await compose(upper)(identity)("hello")
		expect(result).toBe("HELLO")
	})

	test("middleware can transform output", async () => {
		const result = await compose(wrapAngle)(identity)("hello")
		expect(result).toBe("<hello>")
	})

	test("middleware can catch errors", async () => {
		const result = await compose(catcher)(throws)("hello")
		expect(result).toBe("recovered")
	})

	test("async middleware", async () => {
		const result = await compose(delay)(toUpper)("hello")
		expect(result).toBe("HELLO")
	})

	test("compose is reusable", async () => {
		const enhance = compose(add, double)
		expect(await enhance(numId)(5)).toBe(12)
		expect(await enhance(numId)(0)).toBe(2)
	})
})
