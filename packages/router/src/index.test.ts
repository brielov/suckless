import { describe, expect, test } from "bun:test"
import { createRouter } from "."

describe("createRouter", () => {
	describe("static routes", () => {
		test("exact match", () => {
			const r = createRouter<string>()
			r.add("/", "root")
			r.add("/health", "health")
			r.add("/api/users", "users")

			expect(r.find("/")).toEqual({ value: "root", params: {} })
			expect(r.find("/health")).toEqual({
				value: "health",
				params: {},
			})
			expect(r.find("/api/users")).toEqual({
				value: "users",
				params: {},
			})
		})

		test("no match returns undefined", () => {
			const r = createRouter<string>()
			r.add("/health", "health")

			expect(r.find("/missing")).toBeUndefined()
			expect(r.find("/health/extra")).toBeUndefined()
		})

		test("trailing slash matches same route", () => {
			const r = createRouter<string>()
			r.add("/users", "users")

			expect(r.find("/users")).toEqual({
				value: "users",
				params: {},
			})
			expect(r.find("/users/")).toEqual({
				value: "users",
				params: {},
			})
		})
	})

	describe("param routes", () => {
		test("single param", () => {
			const r = createRouter<string>()
			r.add("/users/:id", "user")

			expect(r.find("/users/123")).toEqual({
				value: "user",
				params: { id: "123" },
			})
		})

		test("multiple params", () => {
			const r = createRouter<string>()
			r.add("/users/:userId/posts/:postId", "post")

			expect(r.find("/users/42/posts/99")).toEqual({
				value: "post",
				params: { userId: "42", postId: "99" },
			})
		})

		test("param does not match empty segment", () => {
			const r = createRouter<string>()
			r.add("/:id", "match")

			expect(r.find("/")).toBeUndefined()
		})
	})

	describe("wildcard routes", () => {
		test("captures rest of path", () => {
			const r = createRouter<string>()
			r.add("/files/*path", "file")

			expect(r.find("/files/a/b/c")).toEqual({
				value: "file",
				params: { path: "a/b/c" },
			})
		})

		test("captures single segment", () => {
			const r = createRouter<string>()
			r.add("/files/*path", "file")

			expect(r.find("/files/readme.txt")).toEqual({
				value: "file",
				params: { path: "readme.txt" },
			})
		})

		test("empty wildcard match", () => {
			const r = createRouter<string>()
			r.add("/files/*path", "file")

			expect(r.find("/files")).toEqual({
				value: "file",
				params: { path: "" },
			})
		})
	})

	describe("priority", () => {
		test("static over param", () => {
			const r = createRouter<string>()
			r.add("/users/me", "static")
			r.add("/users/:id", "param")

			expect(r.find("/users/me")).toEqual({
				value: "static",
				params: {},
			})
			expect(r.find("/users/123")).toEqual({
				value: "param",
				params: { id: "123" },
			})
		})

		test("param over wildcard", () => {
			const r = createRouter<string>()
			r.add("/files/:name", "param")
			r.add("/files/*path", "wild")

			expect(r.find("/files/readme")).toEqual({
				value: "param",
				params: { name: "readme" },
			})
			expect(r.find("/files/a/b")).toEqual({
				value: "wild",
				params: { path: "a/b" },
			})
		})
	})

	describe("chaining", () => {
		test("add returns router for chaining", () => {
			const r = createRouter<string>().add("/a", "a").add("/b", "b")

			expect(r.find("/a")).toEqual({ value: "a", params: {} })
			expect(r.find("/b")).toEqual({ value: "b", params: {} })
		})
	})

	describe("stores any value", () => {
		test("functions as values", () => {
			const r = createRouter<() => string>()
			r.add("/greet", () => "hello")

			const match = r.find("/greet")
			expect(match?.value()).toBe("hello")
		})

		test("objects as values", () => {
			const r = createRouter<{ name: string }>()
			r.add("/item", { name: "test" })

			expect(r.find("/item")?.value.name).toBe("test")
		})

		test("undefined as a value", () => {
			const r = createRouter<undefined>()
			r.add("/void", undefined)

			const match = r.find("/void")
			expect(match).not.toBeUndefined()
			expect(match).toEqual({ value: undefined, params: {} })
		})

		test("undefined as a value in param route", () => {
			const r = createRouter<undefined>()
			r.add("/items/:id", undefined)

			const match = r.find("/items/123")
			expect(match).not.toBeUndefined()
			expect(match).toEqual({
				value: undefined,
				params: { id: "123" },
			})
		})
	})
})
