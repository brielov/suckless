import { describe, expect, test } from "bun:test"
import { createSSEChannel } from "."

function makeRequest(lastEventId?: string): Request {
	const headers = new Headers()
	if (lastEventId !== undefined) {
		headers.set("Last-Event-ID", lastEventId)
	}
	return new Request("http://localhost/events", {
		headers,
	})
}

function readAll(response: Response): Promise<string> {
	return new Response(response.body).text()
}

async function readChunks(
	response: Response,
	count: number,
): Promise<string[]> {
	const reader = response.body!.getReader()
	const decoder = new TextDecoder()
	const chunks: string[] = []
	for (let i = 0; i < count; i++) {
		// oxlint-disable-next-line no-await-in-loop -- sequential reads from a stream are inherently serial
		const { value, done } = await reader.read()
		if (done) {
			break
		}
		chunks.push(decoder.decode(value))
	}
	reader.releaseLock()
	return chunks
}

describe("createSSEChannel", () => {
	test("returns correct SSE response headers", () => {
		using channel = createSSEChannel()
		const res = channel.connect(makeRequest())
		expect(res.status).toBe(200)
		expect(res.headers.get("Content-Type")).toBe(
			"text/event-stream; charset=utf-8",
		)
		expect(res.headers.get("Cache-Control")).toBe("no-cache, no-transform")
		expect(res.headers.get("X-Accel-Buffering")).toBe("no")
		channel.close()
	})

	test("tracks connected clients", () => {
		using channel = createSSEChannel()
		expect(channel.clients).toBe(0)
		channel.connect(makeRequest())
		expect(channel.clients).toBe(1)
		channel.connect(makeRequest())
		expect(channel.clients).toBe(2)
		channel.close()
	})

	test("broadcasts events to all clients", async () => {
		using channel = createSSEChannel()
		const res1 = channel.connect(makeRequest())
		const res2 = channel.connect(makeRequest())

		channel.send("message", "hello")
		channel.close()

		const [text1, text2] = await Promise.all([readAll(res1), readAll(res2)])
		expect(text1).toBe('id: 0\nevent: message\ndata: "hello"\n\n')
		expect(text2).toBe('id: 0\nevent: message\ndata: "hello"\n\n')
	})

	test("sends structured data as JSON", async () => {
		using channel = createSSEChannel()
		const res = channel.connect(makeRequest())
		channel.send("update", { count: 42, active: true })
		channel.close()

		const text = await readAll(res)
		expect(text).toBe(
			'id: 0\nevent: update\ndata: {"count":42,"active":true}\n\n',
		)
	})

	test("increments event IDs", async () => {
		using channel = createSSEChannel()
		const res = channel.connect(makeRequest())
		channel.send("a", 1)
		channel.send("b", 2)
		channel.close()

		const text = await readAll(res)
		expect(text).toBe(
			"id: 0\nevent: a\ndata: 1\n\nid: 1\nevent: b\ndata: 2\n\n",
		)
	})

	test("replays buffered events on reconnect", async () => {
		using channel = createSSEChannel({ replay: 5 })
		const res1 = channel.connect(makeRequest())

		channel.send("msg", "first")
		channel.send("msg", "second")
		channel.send("msg", "third")

		// Close first client by reading its chunks, then reconnect with Last-Event-ID
		const chunks1 = await readChunks(res1, 3)
		expect(chunks1).toHaveLength(3)

		const res2 = channel.connect(makeRequest("0"))
		channel.close()

		const text = await readAll(res2)
		// Should replay events with id > 0 (i.e., events 1 and 2)
		expect(text).toBe(
			'id: 1\nevent: msg\ndata: "second"\n\nid: 2\nevent: msg\ndata: "third"\n\n',
		)
	})

	test("replay buffer respects size limit", async () => {
		using channel = createSSEChannel({ replay: 2 })

		channel.send("msg", "a")
		channel.send("msg", "b")
		channel.send("msg", "c")

		// Connect with Last-Event-ID before the buffer — only last 2 should remain
		const res = channel.connect(makeRequest("0"))
		channel.close()

		const text = await readAll(res)
		// Event 0 ("a") was evicted, events 1 ("b") and 2 ("c") remain, but only id > 0
		expect(text).toBe(
			'id: 1\nevent: msg\ndata: "b"\n\nid: 2\nevent: msg\ndata: "c"\n\n',
		)
	})

	test("ignores non-numeric Last-Event-ID", async () => {
		using channel = createSSEChannel({ replay: 5 })
		channel.send("msg", "data")

		const res = channel.connect(makeRequest("not-a-number"))
		channel.close()

		const text = await readAll(res)
		// No replay — invalid Last-Event-ID is ignored
		expect(text).toBe("")
	})

	test("ignores partially numeric Last-Event-ID", async () => {
		using channel = createSSEChannel({ replay: 5 })
		channel.send("msg", "first")
		channel.send("msg", "second")

		const res = channel.connect(makeRequest("0oops"))
		channel.close()

		expect(await readAll(res)).toBe("")
	})

	test("returns 503 when channel is closed", () => {
		using channel = createSSEChannel()
		channel.close()
		const res = channel.connect(makeRequest())
		expect(res.status).toBe(503)
	})

	test("send throws when channel is closed", () => {
		using channel = createSSEChannel()
		channel.close()
		expect(() => {
			channel.send("msg", "data")
		}).toThrow("Channel is closed")
	})

	test("send rejects event names with line breaks", () => {
		using channel = createSSEChannel()
		expect(() => {
			channel.send("bad\nevent", "data")
		}).toThrow(RangeError)
	})

	test("send rejects non-serializable data", () => {
		using channel = createSSEChannel()
		expect(() => {
			channel.send("msg", { toJSON: () => undefined })
		}).toThrow(TypeError)
	})

	test("close is idempotent", () => {
		using channel = createSSEChannel()
		channel.close()
		channel.close()
	})

	test("dispose closes the channel", () => {
		const channel = createSSEChannel()
		channel[Symbol.dispose]()
		const res = channel.connect(makeRequest())
		expect(res.status).toBe(503)
	})

	test("validates heartbeat option", () => {
		expect(() => createSSEChannel({ heartbeat: -1 })).toThrow(RangeError)
		expect(() => createSSEChannel({ heartbeat: Infinity })).toThrow(RangeError)
		expect(() => createSSEChannel({ heartbeat: NaN })).toThrow(RangeError)
	})

	test("validates replay option", () => {
		expect(() => createSSEChannel({ replay: -1 })).toThrow(RangeError)
		expect(() => createSSEChannel({ replay: 1.5 })).toThrow(RangeError)
	})

	test("disconnects client on abort", async () => {
		using channel = createSSEChannel({ heartbeat: 0 })
		const controller = new AbortController()
		const req = new Request("http://localhost/events", {
			signal: controller.signal,
		})
		channel.connect(req)
		expect(channel.clients).toBe(1)

		controller.abort()
		// Allow microtask to process
		await Promise.resolve()
		expect(channel.clients).toBe(0)
	})

	test("does not keep already aborted requests connected", async () => {
		using channel = createSSEChannel({ heartbeat: 0 })
		const controller = new AbortController()
		controller.abort()
		const req = new Request("http://localhost/events", {
			signal: controller.signal,
		})

		const res = channel.connect(req)

		expect(channel.clients).toBe(0)
		expect(await readAll(res)).toBe("")
	})

	test("disconnects slow clients before the queue grows unbounded", () => {
		using channel = createSSEChannel({ heartbeat: 0 })
		channel.connect(makeRequest())
		expect(channel.clients).toBe(1)

		const largePayload = "x".repeat(40_000)
		channel.send("msg", largePayload)
		channel.send("msg", largePayload)

		expect(channel.clients).toBe(0)
	})
})
