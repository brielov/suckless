/** A matched route with its handler and extracted parameters. */
export interface Match<T> {
	value: T
	params: Record<string, string>
}

/** A URL pattern router with type-safe parameter extraction. */
export interface Router<T> {
	add(pattern: string, value: T): Router<T>
	find(path: string): Match<T> | undefined
}

interface Node<T> {
	children: Map<string, Node<T>>
	param: { name: string; child: Node<T> } | undefined
	wildcard: { name: string; value: T } | undefined
	value: [T] | undefined
}

function createNode<T>(): Node<T> {
	return {
		children: new Map(),
		param: undefined,
		wildcard: undefined,
		value: undefined,
	}
}

function resolve<T>(
	node: Node<T>,
	path: string,
	i: number,
	params: Record<string, string>,
): Match<T> | undefined {
	const len = path.length

	if (i >= len) {
		if (node.value !== undefined) {
			return { value: node.value[0], params }
		}
		if (node.wildcard) {
			params[node.wildcard.name] = ""
			return { value: node.wildcard.value, params }
		}
		return undefined
	}

	let end = path.indexOf("/", i)
	if (end === -1) {
		end = len
	}
	const seg = path.slice(i, end)

	const child = node.children.get(seg)
	if (child) {
		const result = resolve(child, path, end + 1, params)
		if (result) {
			return result
		}
	}

	if (node.param) {
		params[node.param.name] = seg
		const result = resolve(node.param.child, path, end + 1, params)
		if (result) {
			return result
		}
		delete params[node.param.name]
	}

	if (node.wildcard) {
		params[node.wildcard.name] = path.slice(i)
		return { value: node.wildcard.value, params }
	}

	return undefined
}

/** Create a new router. */
export function createRouter<T>(): Router<T> {
	const root = createNode<T>()
	const statics = new Map<string, T>()

	const router: Router<T> = {
		add(pattern, value) {
			if (!pattern.startsWith("/")) {
				throw new Error('Pattern must start with "/"')
			}
			if (!pattern.includes(":") && !pattern.includes("*")) {
				statics.set(pattern, value)
			}

			let current = root
			let i = 1
			const len = pattern.length

			while (i < len) {
				let end = pattern.indexOf("/", i)
				if (end === -1) {
					end = len
				}
				const seg = pattern.slice(i, end)

				if (seg.startsWith(":")) {
					const name = seg.slice(1)
					if (name.length === 0) {
						throw new Error("Param name must not be empty")
					}
					if (current.param === undefined) {
						current.param = { name, child: createNode() }
					} else if (current.param.name !== name) {
						throw new Error(
							`Conflicting param name at "${pattern}": ":${name}" vs existing ":${current.param.name}"`,
						)
					}
					current = current.param.child
				} else if (seg.startsWith("*")) {
					if (end !== len) {
						throw new Error("Wildcard must be the last segment")
					}
					if (seg.length === 1) {
						throw new Error("Wildcard param name must not be empty")
					}
					current.wildcard = {
						name: seg.slice(1),
						value,
					}
					return router
				} else {
					let child = current.children.get(seg)
					if (!child) {
						child = createNode()
						current.children.set(seg, child)
					}
					current = child
				}

				i = end + 1
			}

			current.value = [value]
			return router
		},

		find(path) {
			if (!path.startsWith("/")) {
				throw new Error('Path must start with "/"')
			}
			if (statics.has(path)) {
				// oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion -- has() guarantees the key exists
				return { value: statics.get(path) as T, params: {} }
			}
			return resolve(root, path, 1, {})
		},
	}

	return router
}
