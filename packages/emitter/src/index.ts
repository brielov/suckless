/**
 * Type-safe event emitter.
 *
 * The self-referential `{ [K in keyof E]: unknown[] }` constraint
 * allows both `interface` and `type` declarations as event maps
 * (interfaces lack the implicit index signature that
 * `Record<string, …>` requires).
 */
export interface Emitter<
	E extends { [K in keyof E]: unknown[] },
> extends Disposable {
	on<K extends keyof E & string>(
		event: K,
		listener: (...args: E[K]) => void,
	): () => void
	once<K extends keyof E & string>(
		event: K,
		listener: (...args: E[K]) => void,
	): () => void
	emit<K extends keyof E & string>(event: K, ...args: E[K]): void
}

/** Create a type-safe event emitter. */
export function createEmitter<
	E extends { [K in keyof E]: unknown[] },
>(): Emitter<E> {
	const map = new Map<string, Set<unknown>>()

	function getSet(event: string): Set<unknown> {
		let set = map.get(event)
		if (!set) {
			set = new Set()
			map.set(event, set)
		}
		return set
	}

	function subscribe<K extends keyof E & string>(
		event: K,
		listener: (...args: E[K]) => void,
	): () => void {
		const set = getSet(event)
		set.add(listener)
		return () => {
			set.delete(listener)
			if (set.size === 0) {
				map.delete(event)
			}
		}
	}

	return {
		on: subscribe,

		once(event, listener) {
			const off = subscribe(event, (...args) => {
				off()
				listener(...args)
			})
			return off
		},

		emit(event, ...args) {
			const set = map.get(event)
			if (!set) {
				return
			}
			// Snapshot before iterating so listeners can safely
			// remove themselves during emit.
			// oxlint-disable-next-line unicorn/prefer-spread -- Array.from is clearer for snapshotting
			for (const fn of Array.from(set)) {
				// The set stores listeners as `unknown` because each
				// event key has a different signature. The cast is
				// correct by construction: only typed listeners are
				// added via subscribe().
				// oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
				;(fn as (...a: unknown[]) => void)(...args)
			}
		},

		[Symbol.dispose]() {
			map.clear()
		},
	}
}
