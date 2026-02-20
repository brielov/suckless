export interface RetryOptions {
	/** Maximum number of attempts (including the first). Defaults to 3. */
	maxAttempts?: number
	/** Base delay in milliseconds. Defaults to 1000. */
	baseDelay?: number
	/** Maximum delay in milliseconds. Defaults to 30000. */
	maxDelay?: number
	/** AbortSignal for external cancellation. */
	signal?: AbortSignal
	/** Return false to stop retrying for a specific error. Defaults to retrying all errors. */
	shouldRetry?: (error: Error) => boolean
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		if (signal.aborted) {
			reject(toError(signal.reason))
			return
		}

		const onAbort = () => {
			clearTimeout(timer)
			reject(toError(signal.reason))
		}

		const timer = setTimeout(() => {
			signal.removeEventListener("abort", onAbort)
			resolve()
		}, ms)

		signal.addEventListener("abort", onAbort, { once: true })
	})
}

function toError(value: unknown): Error {
	return value instanceof Error
		? value
		: new Error(String(value), { cause: value })
}

function computeDelay(
	attempt: number,
	baseDelay: number,
	maxDelay: number,
): number {
	const exponential = Math.min(maxDelay, baseDelay * 2 ** attempt)
	return Math.random() * exponential
}

export async function retry<T>(
	fn: (attempt: number, signal: AbortSignal) => Promise<T>,
	options?: RetryOptions,
): Promise<T> {
	const maxAttempts = options?.maxAttempts ?? 3
	const baseDelay = options?.baseDelay ?? 1000
	const maxDelay = options?.maxDelay ?? 30_000
	const signal = options?.signal ?? new AbortController().signal
	const shouldRetry = options?.shouldRetry

	if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
		throw new RangeError("maxAttempts must be a positive integer")
	}
	if (!Number.isFinite(baseDelay) || baseDelay < 0) {
		throw new RangeError("baseDelay must be a non-negative finite number")
	}
	if (!Number.isFinite(maxDelay) || maxDelay < 0) {
		throw new RangeError("maxDelay must be a non-negative finite number")
	}

	let n = 0
	for (;;) {
		signal.throwIfAborted()

		try {
			return await fn(n, signal) // oxlint-disable-line no-await-in-loop -- retry loop is sequential by design
		} catch (error) {
			const wrapped = toError(error)

			if (shouldRetry !== undefined && !shouldRetry(wrapped)) {
				throw wrapped
			}

			if (n + 1 >= maxAttempts) {
				throw wrapped
			}

			await delay(computeDelay(n, baseDelay, maxDelay), signal) // oxlint-disable-line no-await-in-loop
			n++
		}
	}
}
