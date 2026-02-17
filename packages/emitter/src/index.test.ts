import { describe, expect, test } from "bun:test"
import { createEmitter } from "."

interface Events {
	message: [string]
	error: [Error]
	connect: []
	data: [number, string]
}

describe("createEmitter", () => {
	test("emits events to listeners", () => {
		const emitter = createEmitter<Events>()
		const calls: string[] = []
		emitter.on("message", (msg) => calls.push(msg))
		emitter.emit("message", "hello")
		emitter.emit("message", "world")
		expect(calls).toEqual(["hello", "world"])
	})

	test("supports multiple listeners", () => {
		const emitter = createEmitter<Events>()
		const a: string[] = []
		const b: string[] = []
		emitter.on("message", (msg) => a.push(msg))
		emitter.on("message", (msg) => b.push(msg))
		emitter.emit("message", "hi")
		expect(a).toEqual(["hi"])
		expect(b).toEqual(["hi"])
	})

	test("unsubscribes with returned function", () => {
		const emitter = createEmitter<Events>()
		const calls: string[] = []
		const off = emitter.on("message", (msg) => calls.push(msg))
		emitter.emit("message", "before")
		off()
		emitter.emit("message", "after")
		expect(calls).toEqual(["before"])
	})

	test("once fires only once", () => {
		const emitter = createEmitter<Events>()
		const calls: string[] = []
		emitter.once("message", (msg) => calls.push(msg))
		emitter.emit("message", "first")
		emitter.emit("message", "second")
		expect(calls).toEqual(["first"])
	})

	test("once can be unsubscribed before firing", () => {
		const emitter = createEmitter<Events>()
		const calls: string[] = []
		const off = emitter.once("message", (msg) => calls.push(msg))
		off()
		emitter.emit("message", "nope")
		expect(calls).toEqual([])
	})

	test("events are independent", () => {
		const emitter = createEmitter<Events>()
		const messages: string[] = []
		const connects: number[] = []
		emitter.on("message", (msg) => messages.push(msg))
		emitter.on("connect", () => connects.push(1))
		emitter.emit("message", "hi")
		emitter.emit("connect")
		expect(messages).toEqual(["hi"])
		expect(connects).toEqual([1])
	})

	test("emitting without listeners is a no-op", () => {
		const emitter = createEmitter<Events>()
		emitter.emit("message", "nobody listening")
	})

	test("supports multiple arguments", () => {
		const emitter = createEmitter<Events>()
		const calls: [number, string][] = []
		emitter.on("data", (n, s) => calls.push([n, s]))
		emitter.emit("data", 42, "hello")
		expect(calls).toEqual([[42, "hello"]])
	})

	test("supports zero-argument events", () => {
		const emitter = createEmitter<Events>()
		let count = 0
		emitter.on("connect", () => count++)
		emitter.emit("connect")
		emitter.emit("connect")
		expect(count).toBe(2)
	})

	test("dispose removes all listeners", () => {
		const emitter = createEmitter<Events>()
		const calls: string[] = []
		emitter.on("message", (msg) => calls.push(msg))
		emitter[Symbol.dispose]()
		emitter.emit("message", "after dispose")
		expect(calls).toEqual([])
	})

	test("listener removal during emit is safe", () => {
		const emitter = createEmitter<Events>()
		const calls: string[] = []
		const off = emitter.on("message", () => {
			calls.push("first")
			off()
		})
		emitter.on("message", () => calls.push("second"))
		emitter.emit("message", "test")
		expect(calls).toEqual(["first", "second"])
	})

	test("duplicate off calls are safe", () => {
		const emitter = createEmitter<Events>()
		const off = emitter.on("message", () => {})
		off()
		off()
	})
})
