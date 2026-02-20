import { describe, expect, mock, test } from "bun:test"
import { createQueue, type QueueAdapter, memoryAdapter } from "."

function delay(ms: number): Promise<void> {
	return new Promise<void>((resolve) => {
		setTimeout(resolve, ms)
	})
}

describe("memoryAdapter", () => {
	test("FIFO ordering", async () => {
		const adapter = memoryAdapter<string>()
		await adapter.push("a")
		await adapter.push("b")
		await adapter.push("c")

		const signal = AbortSignal.abort()
		expect(await adapter.pull(signal)).toBe("a")
		expect(await adapter.pull(signal)).toBe("b")
		expect(await adapter.pull(signal)).toBe("c")
	})

	test("blocking pull resolves when item pushed", async () => {
		const adapter = memoryAdapter<number>()
		const controller = new AbortController()

		const pulling = adapter.pull(controller.signal)
		await adapter.push(42)

		expect(await pulling).toBe(42)
		controller.abort()
	})

	test("direct handoff when consumer is waiting", async () => {
		const adapter = memoryAdapter<string>()
		const controller = new AbortController()

		const pulling = adapter.pull(controller.signal)
		await adapter.push("direct")

		expect(await pulling).toBe("direct")
		controller.abort()
	})

	test("pre-aborted signal returns undefined", async () => {
		const adapter = memoryAdapter<number>()
		const signal = AbortSignal.abort()

		expect(await adapter.pull(signal)).toBeUndefined()
	})

	test("abort during blocking pull returns undefined", async () => {
		const adapter = memoryAdapter<number>()
		const controller = new AbortController()

		const pulling = adapter.pull(controller.signal)
		controller.abort()

		expect(await pulling).toBeUndefined()
	})

	test("disposal resolves blocked pullers and clears buffer", async () => {
		const adapter = memoryAdapter<number>()
		const controller = new AbortController()

		// Buffer some items
		await adapter.push(1)
		await adapter.push(2)

		// Drain the buffer
		expect(await adapter.pull(controller.signal)).toBe(1)
		expect(await adapter.pull(controller.signal)).toBe(2)

		// Now buffer is empty — this pull will block
		const pulling = adapter.pull(controller.signal)
		await adapter[Symbol.asyncDispose]()

		expect(await pulling).toBeUndefined()
		controller.abort()
	})

	test("disposal clears buffered items", async () => {
		const adapter = memoryAdapter<number>()

		await adapter.push(1)
		await adapter.push(2)
		await adapter[Symbol.asyncDispose]()

		// Buffer was cleared — pull on aborted signal returns undefined
		expect(await adapter.pull(AbortSignal.abort())).toBeUndefined()
	})

	test("multiple blocked pullers receive items in order", async () => {
		const adapter = memoryAdapter<string>()
		const controller = new AbortController()

		const pull1 = adapter.pull(controller.signal)
		const pull2 = adapter.pull(controller.signal)
		const pull3 = adapter.pull(controller.signal)

		await adapter.push("a")
		await adapter.push("b")
		await adapter.push("c")

		expect(await pull1).toBe("a")
		expect(await pull2).toBe("b")
		expect(await pull3).toBe("c")
		controller.abort()
	})

	test("falsy values pass through correctly", async () => {
		const adapter = memoryAdapter<number | boolean | string>()

		await adapter.push(0)
		await adapter.push(false)
		await adapter.push("")

		const signal = AbortSignal.abort()
		expect(await adapter.pull(signal)).toBe(0)
		expect(await adapter.pull(signal)).toBe(false)
		expect(await adapter.pull(signal)).toBe("")
	})
})

describe("createQueue", () => {
	test("processes items through handler", async () => {
		const results: number[] = []
		const queue = createQueue<number>((item) => {
			results.push(item * 2)
		}, memoryAdapter())

		await queue.push(1)
		await queue.push(2)
		await queue.push(3)
		await queue.drain()

		expect(results).toEqual([2, 4, 6])
		await queue[Symbol.asyncDispose]()
	})

	test("respects concurrency limit", async () => {
		let current = 0
		let maxConcurrent = 0

		const queue = createQueue<number>(
			async () => {
				current++
				maxConcurrent = Math.max(maxConcurrent, current)
				await delay(10)
				current--
			},
			memoryAdapter(),
			{ concurrency: 2 },
		)

		for (let i = 0; i < 6; i++) {
			await queue.push(i) // oxlint-disable-line no-await-in-loop
		}
		await queue.drain()

		expect(maxConcurrent).toBe(2)
		await queue[Symbol.asyncDispose]()
	})

	test("FIFO processing order", async () => {
		const order: number[] = []
		const queue = createQueue<number>((item) => {
			order.push(item)
		}, memoryAdapter())

		for (let i = 0; i < 5; i++) {
			await queue.push(i) // oxlint-disable-line no-await-in-loop
		}
		await queue.drain()

		expect(order).toEqual([0, 1, 2, 3, 4])
		await queue[Symbol.asyncDispose]()
	})

	test("drain resolves when all handlers complete", async () => {
		const results: number[] = []
		const queue = createQueue<number>(
			async (item) => {
				await delay(10)
				results.push(item)
			},
			memoryAdapter(),
			{ concurrency: 2 },
		)

		await queue.push(1)
		await queue.push(2)
		await queue.push(3)
		await queue.drain()

		expect(results).toEqual([1, 2, 3])
		await queue[Symbol.asyncDispose]()
	})

	test("drain resolves immediately when nothing is running", async () => {
		const queue = createQueue<number>(() => {}, memoryAdapter())
		await queue.drain()
		await queue[Symbol.asyncDispose]()
	})

	test("rejects push after disposal", async () => {
		const queue = createQueue<number>(() => {}, memoryAdapter())
		await queue[Symbol.asyncDispose]()

		expect(queue.push(1)).rejects.toThrow("Queue is closed")
	})

	test("disposal waits for in-flight handlers", async () => {
		const results: number[] = []
		const queue = createQueue<number>(async (item) => {
			await delay(10)
			results.push(item)
		}, memoryAdapter())

		await queue.push(1)
		// Give the worker time to pick up the item
		await delay(1)
		await queue[Symbol.asyncDispose]()

		expect(results).toEqual([1])
	})

	test("handler errors do not crash worker loops", async () => {
		const results: number[] = []
		const queue = createQueue<number>((item) => {
			if (item === 2) {
				throw new Error("boom")
			}
			results.push(item)
		}, memoryAdapter())

		await queue.push(1)
		await queue.push(2)
		await queue.push(3)
		await queue.drain()

		expect(results).toEqual([1, 3])
		await queue[Symbol.asyncDispose]()
	})

	test("async handler rejection does not crash worker loops", async () => {
		const results: number[] = []
		const queue = createQueue<number>((item) => {
			if (item === 2) {
				return Promise.reject(new Error("async boom"))
			}
			results.push(item)
		}, memoryAdapter())

		await queue.push(1)
		await queue.push(2)
		await queue.push(3)
		await queue.drain()

		expect(results).toEqual([1, 3])
		await queue[Symbol.asyncDispose]()
	})

	test("onError receives error and item on handler failure", async () => {
		const errors: { error: Error; item: number }[] = []
		const results: number[] = []
		const queue = createQueue<number>(
			(item) => {
				if (item === 2) {
					throw new Error("boom")
				}
				results.push(item)
			},
			memoryAdapter(),
			{
				onError(error, item) {
					errors.push({ error, item })
				},
			},
		)

		await queue.push(1)
		await queue.push(2)
		await queue.push(3)
		await queue.drain()

		expect(results).toEqual([1, 3])
		expect(errors).toHaveLength(1)
		expect(errors[0]?.error.message).toBe("boom")
		expect(errors[0]?.item).toBe(2)
		await queue[Symbol.asyncDispose]()
	})

	test("onError receives error on async rejection", async () => {
		const errors: { error: Error; item: number }[] = []
		const queue = createQueue<number>(
			(item) => {
				if (item === 1) {
					return Promise.reject(new Error("async boom"))
				}
			},
			memoryAdapter(),
			{
				onError(error, item) {
					errors.push({ error, item })
				},
			},
		)

		await queue.push(1)
		await queue.drain()

		expect(errors).toHaveLength(1)
		expect(errors[0]?.error.message).toBe("async boom")
		expect(errors[0]?.item).toBe(1)
		await queue[Symbol.asyncDispose]()
	})

	test("onError throw does not kill worker", async () => {
		const results: number[] = []
		const queue = createQueue<number>(
			(item) => {
				if (item === 2) {
					throw new Error("boom")
				}
				results.push(item)
			},
			memoryAdapter(),
			{
				onError() {
					throw new Error("onError kaboom")
				},
			},
		)

		await queue.push(1)
		await queue.push(2)
		await queue.push(3)
		await queue.drain()

		expect(results).toEqual([1, 3])
		await queue[Symbol.asyncDispose]()
	})

	test("onError wraps non-Error throws", async () => {
		const errors: Error[] = []
		const queue = createQueue<number>(
			() => {
				throw "string error" // oxlint-disable-line only-throw-error, no-throw-literal
			},
			memoryAdapter(),
			{
				onError(error) {
					errors.push(error)
				},
			},
		)

		await queue.push(1)
		await queue.drain()

		expect(errors).toHaveLength(1)
		expect(errors[0]).toBeInstanceOf(Error)
		expect(errors[0]?.message).toBe("string error")
		expect(errors[0]?.cause).toBe("string error")
		await queue[Symbol.asyncDispose]()
	})

	test("falsy item values pass through handler", async () => {
		const results: (number | boolean | string)[] = []
		const queue = createQueue<number | boolean | string>((item) => {
			results.push(item)
		}, memoryAdapter())

		await queue.push(0)
		await queue.push(false)
		await queue.push("")
		await queue.drain()

		expect(results).toEqual([0, false, ""])
		await queue[Symbol.asyncDispose]()
	})

	test("multiple concurrent drain waiters all resolve", async () => {
		const queue = createQueue<number>(async () => {
			await delay(10)
		}, memoryAdapter())

		await queue.push(1)

		const [r1, r2, r3] = await Promise.all([
			queue.drain(),
			queue.drain(),
			queue.drain(),
		])

		expect(r1).toBeUndefined()
		expect(r2).toBeUndefined()
		expect(r3).toBeUndefined()
		await queue[Symbol.asyncDispose]()
	})

	test("running counter is accurate during processing", async () => {
		const gate = Promise.withResolvers<void>()
		const queue = createQueue<number>(
			async () => {
				await gate.promise
			},
			memoryAdapter(),
			{ concurrency: 2 },
		)

		expect(queue.running).toBe(0)

		await queue.push(1)
		await queue.push(2)
		await delay(1)

		expect(queue.running).toBe(2)

		gate.resolve()
		await queue.drain()

		expect(queue.running).toBe(0)
		await queue[Symbol.asyncDispose]()
	})

	test("double disposal does not throw", async () => {
		const queue = createQueue<number>(() => {}, memoryAdapter())
		await queue[Symbol.asyncDispose]()
		await queue[Symbol.asyncDispose]()
	})
})

describe("createQueue with spy adapter", () => {
	test("push delegates to adapter", async () => {
		const pushFn = mock(() => Promise.resolve())
		const adapter: QueueAdapter<number> = {
			push: pushFn,
			pull: () =>
				new Promise<number | undefined>((resolve) => {
					setTimeout(() => {
						resolve(undefined)
					}, 100)
				}),
			[Symbol.asyncDispose]: () => Promise.resolve(),
		}

		const queue = createQueue<number>(() => {}, adapter)
		await queue.push(42)

		expect(pushFn).toHaveBeenCalledWith(42)
		await queue[Symbol.asyncDispose]()
	})

	test("workers call adapter pull", async () => {
		const pullFn = mock((_signal: AbortSignal) =>
			Promise.resolve<number | undefined>(undefined),
		)
		const adapter: QueueAdapter<number> = {
			push: () => Promise.resolve(),
			pull: pullFn,
			[Symbol.asyncDispose]: () => Promise.resolve(),
		}

		const queue = createQueue<number>(() => {}, adapter)
		// Workers start immediately and call pull
		await delay(1)
		await queue[Symbol.asyncDispose]()

		expect(pullFn).toHaveBeenCalled()
	})

	test("adapter push failure rolls back pending counter", async () => {
		const adapter: QueueAdapter<number> = {
			push: () => Promise.reject(new Error("push failed")),
			pull: () =>
				new Promise<number | undefined>((resolve) => {
					setTimeout(() => {
						resolve(undefined)
					}, 100)
				}),
			[Symbol.asyncDispose]: () => Promise.resolve(),
		}

		const queue = createQueue<number>(() => {}, adapter)

		expect(queue.push(1)).rejects.toThrow("push failed")
		await delay(1)
		// drain should resolve immediately — pending was rolled back
		await queue.drain()
		await queue[Symbol.asyncDispose]()
	})

	test("adapter pull failure exits worker gracefully", async () => {
		let pullCount = 0
		const adapter: QueueAdapter<number> = {
			push: () => Promise.resolve(),
			pull: () => {
				pullCount++
				return Promise.reject(new Error("pull failed"))
			},
			[Symbol.asyncDispose]: () => Promise.resolve(),
		}

		const queue = createQueue<number>(() => {}, adapter)
		await delay(1)
		await queue[Symbol.asyncDispose]()

		// Worker called pull once, got an error, and exited
		expect(pullCount).toBe(1)
	})

	test("disposal calls adapter dispose", async () => {
		const disposeFn = mock(() => Promise.resolve())
		const adapter: QueueAdapter<number> = {
			push: () => Promise.resolve(),
			pull: () =>
				new Promise<number | undefined>((resolve) => {
					setTimeout(() => {
						resolve(undefined)
					}, 100)
				}),
			[Symbol.asyncDispose]: disposeFn,
		}

		const queue = createQueue<number>(() => {}, adapter)
		await queue[Symbol.asyncDispose]()

		expect(disposeFn).toHaveBeenCalled()
	})
})

describe("validation", () => {
	test("concurrency < 1 throws RangeError", () => {
		const a = memoryAdapter()
		expect(() => createQueue(() => {}, a, { concurrency: 0 })).toThrow(
			RangeError,
		)
		expect(() => createQueue(() => {}, a, { concurrency: -1 })).toThrow(
			RangeError,
		)
	})

	test("non-integer concurrency throws RangeError", () => {
		const a = memoryAdapter()
		expect(() => createQueue(() => {}, a, { concurrency: 1.5 })).toThrow(
			RangeError,
		)
	})

	test("non-finite concurrency throws RangeError", () => {
		const a = memoryAdapter()
		expect(() => createQueue(() => {}, a, { concurrency: Infinity })).toThrow(
			RangeError,
		)
		expect(() => createQueue(() => {}, a, { concurrency: NaN })).toThrow(
			RangeError,
		)
	})
})
