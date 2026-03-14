const encoder = new TextEncoder()
const KEEPALIVE_CHUNK = encoder.encode(": keepalive\n\n")
const STREAM_HIGH_WATER_MARK = 64 * 1024

/** JSON-serializable value. Includes objects with a `toJSON()` method (e.g. `Date`). */
export type JsonValue =
	| string
	| number
	| boolean
	| null
	| { toJSON(): unknown }
	| JsonValue[]
	| { [key: string]: JsonValue }

export interface SSEChannelOptions {
	/** Keepalive interval in milliseconds. Set to 0 to disable. Default: 15000. */
	heartbeat?: number
	/** Number of recent events to buffer for Last-Event-ID reconnection. Set to 0 to disable. Default: 0. */
	replay?: number
}

interface Client {
	controller: ReadableStreamDefaultController<Uint8Array>
	heartbeat: ReturnType<typeof setInterval> | undefined
	signal: AbortSignal
	onAbort: () => void
}

interface BufferedEvent {
	id: number
	chunk: Uint8Array
}

/** Server-Sent Events channel. */
export interface SSEChannel {
	/** Number of currently connected clients. */
	readonly clients: number
	/** Connect a request and return an SSE response stream. */
	connect(req: Request): Response
	/** Broadcast an event to all connected clients. */
	send(event: string, data: JsonValue): void
	/** Close the channel and disconnect all clients. */
	close(): void
	/** Dispose the channel. Equivalent to calling `close()`. */
	[Symbol.dispose](): void
}

/** Create a Server-Sent Events channel. */
export function createSSEChannel(options?: SSEChannelOptions): SSEChannel {
	const heartbeatMs = options?.heartbeat ?? 15_000
	const replaySize = options?.replay ?? 0

	if (heartbeatMs < 0 || !Number.isFinite(heartbeatMs)) {
		throw new RangeError("heartbeat must be a non-negative finite number")
	}
	if (!Number.isInteger(replaySize) || replaySize < 0) {
		throw new RangeError("replay must be a non-negative integer")
	}

	const replayBuffer: BufferedEvent[] = []
	const connections = new Map<number, Client>()

	let nextClientId = 0
	let nextEventId = 0
	let closed = false

	function disconnect(clientId: number): void {
		const client = connections.get(clientId)
		if (!client) {
			return
		}
		connections.delete(clientId)
		if (client.heartbeat !== undefined) {
			clearInterval(client.heartbeat)
		}
		client.signal.removeEventListener("abort", client.onAbort)
		try {
			client.controller.close()
		} catch {
			// Controller already closed.
		}
	}

	function enqueue(clientId: number, chunk: Uint8Array): void {
		const client = connections.get(clientId)
		if (!client) {
			return
		}

		const { desiredSize } = client.controller
		if (desiredSize !== null && desiredSize < chunk.byteLength) {
			disconnect(clientId)
			return
		}

		try {
			client.controller.enqueue(chunk)
		} catch {
			disconnect(clientId)
		}
	}

	function replay(clientId: number, lastEventId: string): void {
		if (!/^\d+$/.test(lastEventId)) {
			return
		}

		const id = Number(lastEventId)
		if (!Number.isSafeInteger(id)) {
			return
		}

		for (const entry of replayBuffer) {
			if (entry.id > id) {
				enqueue(clientId, entry.chunk)
			}
		}
	}

	function serializeEvent(
		id: number,
		event: string,
		data: JsonValue,
	): Uint8Array {
		if (event.includes("\n") || event.includes("\r")) {
			throw new RangeError("event must not contain CR or LF")
		}

		const payload = JSON.stringify(data)
		if (payload === undefined) {
			throw new TypeError("data must be JSON-serializable")
		}

		return encoder.encode(`id: ${id}\nevent: ${event}\ndata: ${payload}\n\n`)
	}

	return {
		get clients() {
			return connections.size
		},

		connect(req) {
			if (closed) {
				return new Response("channel closed", { status: 503 })
			}

			const clientId = nextClientId++
			const lastEventId = req.headers.get("Last-Event-ID")

			const stream = new ReadableStream<Uint8Array>(
				{
					start: (controller) => {
						let heartbeat: ReturnType<typeof setInterval> | undefined
						const onAbort = () => {
							disconnect(clientId)
						}

						if (heartbeatMs > 0) {
							heartbeat = setInterval(() => {
								enqueue(clientId, KEEPALIVE_CHUNK)
							}, heartbeatMs)

							if (typeof heartbeat === "object" && "unref" in heartbeat) {
								heartbeat.unref()
							}
						}

						connections.set(clientId, {
							controller,
							heartbeat,
							signal: req.signal,
							onAbort,
						})

						if (req.signal.aborted) {
							disconnect(clientId)
							return
						}

						req.signal.addEventListener("abort", onAbort, {
							once: true,
						})

						if (lastEventId !== null) {
							replay(clientId, lastEventId)
						}
					},
					cancel: () => {
						disconnect(clientId)
					},
				},
				{
					highWaterMark: STREAM_HIGH_WATER_MARK,
					size: (chunk) => chunk?.byteLength ?? 0,
				},
			)

			return new Response(stream, {
				headers: {
					"Content-Type": "text/event-stream; charset=utf-8",
					"Cache-Control": "no-cache, no-transform",
					"X-Accel-Buffering": "no",
				},
			})
		},

		send(event, data) {
			if (closed) {
				throw new Error("Channel is closed")
			}

			const id = nextEventId++
			const chunk = serializeEvent(id, event, data)

			if (replaySize > 0) {
				replayBuffer.push({ id, chunk })
				if (replayBuffer.length > replaySize) {
					replayBuffer.shift()
				}
			}

			for (const clientId of connections.keys()) {
				enqueue(clientId, chunk)
			}
		},

		close() {
			closed = true
			for (const clientId of connections.keys()) {
				disconnect(clientId)
			}
			replayBuffer.length = 0
		},

		[Symbol.dispose]() {
			if (!closed) {
				this.close()
			}
		},
	}
}
