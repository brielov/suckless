/** Storage backend for queue items. */
export interface QueueAdapter<T> extends AsyncDisposable {
	push(item: T): Promise<void>
	pull(signal: AbortSignal): Promise<T | undefined>
}

/** Producer/consumer queue with pluggable storage. */
export interface Queue<T> extends AsyncDisposable {
	push(item: T): Promise<void>
	drain(): Promise<void>
	readonly running: number
}

/** In-memory FIFO queue adapter with blocking pull. */
export function memoryAdapter<T>(): QueueAdapter<T> {
	const buffer: T[] = []
	const waiters: ((item: T | undefined) => void)[] = []

	return {
		push(item) {
			const waiter = waiters.shift()
			if (waiter) {
				waiter(item)
			} else {
				buffer.push(item)
			}
			return Promise.resolve()
		},

		pull(signal) {
			if (buffer.length > 0) {
				// oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion -- length check guarantees shift returns T
				return Promise.resolve(buffer.shift() as T)
			}
			if (signal.aborted) {
				return Promise.resolve(undefined)
			}
			return new Promise<T | undefined>((resolve) => {
				const waiter = (item: T | undefined) => {
					signal.removeEventListener("abort", onAbort)
					resolve(item)
				}
				const onAbort = () => {
					const idx = waiters.indexOf(waiter)
					if (idx !== -1) {
						waiters.splice(idx, 1)
					}
					resolve(undefined)
				}
				waiters.push(waiter)
				signal.addEventListener("abort", onAbort, { once: true })
			})
		},

		[Symbol.asyncDispose]() {
			buffer.length = 0
			for (const waiter of waiters.splice(0)) {
				waiter(undefined)
			}
			return Promise.resolve()
		},
	}
}

/** Create a producer/consumer queue with pluggable storage. */
export function createQueue<T>(
	handler: (item: T) => void | Promise<void>,
	adapter: QueueAdapter<T>,
	options?: {
		concurrency?: number
		onError?: (error: Error, item: T) => void
	},
): Queue<T> {
	const concurrency = options?.concurrency ?? 1
	const onError = options?.onError
	if (
		!Number.isInteger(concurrency) ||
		concurrency < 1 ||
		!Number.isFinite(concurrency)
	) {
		throw new RangeError("concurrency must be a positive finite integer")
	}
	const controller = new AbortController()
	const drainWaiters: (() => void)[] = []

	let pending = 0
	let running = 0
	let closed = false

	function notifyDrain(): void {
		if (pending === 0) {
			for (const waiter of drainWaiters.splice(0)) {
				waiter()
			}
		}
	}

	async function worker(): Promise<void> {
		while (!controller.signal.aborted) {
			let item: T | undefined
			try {
				// oxlint-disable-next-line no-await-in-loop -- worker loop is sequential by design
				item = await adapter.pull(controller.signal)
			} catch {
				// Adapter error — exit gracefully to avoid unhandled rejections.
				break
			}
			if (item === undefined) {
				break
			}
			running++
			try {
				await handler(item) // oxlint-disable-line no-await-in-loop
			} catch (error) {
				try {
					onError?.(
						error instanceof Error
							? error
							: new Error(String(error), { cause: error }),
						item,
					)
				} catch {
					// Prevent onError failures from killing the worker.
				}
			} finally {
				running--
				pending--
				notifyDrain()
			}
		}
	}

	const workers = Array.from({ length: concurrency }, () => worker())

	return {
		push(item) {
			if (closed) {
				return Promise.reject(new Error("Queue is closed"))
			}
			pending++
			return adapter.push(item).catch((error: unknown) => {
				pending--
				notifyDrain()
				throw error
			})
		},

		drain() {
			if (pending === 0) {
				return Promise.resolve()
			}
			return new Promise<void>((resolve) => {
				drainWaiters.push(resolve)
			})
		},

		get running() {
			return running
		},

		async [Symbol.asyncDispose]() {
			closed = true
			controller.abort()
			await Promise.all(workers)
			await adapter[Symbol.asyncDispose]()
		},
	}
}
