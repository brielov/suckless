import { describe, expect, test } from "bun:test"
import { type Dict, merge, resolve, translate } from "."

const en = {
	greeting: (p: { name: string }) => `Hello, ${p.name}!`,
	items: (p: { count: number }) =>
		p.count === 1 ? `${p.count} item` : `${p.count} items`,
	home: "Home",
} satisfies Dict

// satisfies typeof en enforces the contract: if en gains a key,
// es must add it too or TypeScript reports an error.
const es = {
	greeting: (p: { name: string }) => `Hola, ${p.name}!`,
	items: (p: { count: number }) =>
		p.count === 1 ? `${p.count} elemento` : `${p.count} elementos`,
	home: "Inicio",
} satisfies typeof en

// merge enforces the contract by construction: overrides must be
// Partial<typeof es>, and the return type is typeof es.
const esAR = merge(es, {
	greeting: (p: { name: string }) => `Ché, ${p.name}!`,
})

describe("translate", () => {
	test("returns string entries as-is", () => {
		const t = translate(en)
		expect(t("home")).toBe("Home")
	})

	test("calls function entries with arguments", () => {
		const t = translate(en)
		expect(t("greeting", { name: "World" })).toBe("Hello, World!")
		expect(t("items", { count: 1 })).toBe("1 item")
		expect(t("items", { count: 3 })).toBe("3 items")
	})
})

describe("resolve", () => {
	const locales = { en: 0, es: 0, "es-AR": 0 }

	test("returns exact match", () => {
		expect(resolve(locales, "en", "es")).toBe("es")
	})

	test("strips subtags: es-VE → es", () => {
		expect(resolve(locales, "en", "es-VE")).toBe("es")
	})

	test("prefers exact match over stripped: es-AR → es-AR", () => {
		expect(resolve(locales, "en", "es-AR")).toBe("es-AR")
	})

	test("falls back to default for unknown locale", () => {
		expect(resolve(locales, "en", "ja")).toBe("en")
	})

	test("strips multiple subtags: pt-BR → pt → fallback", () => {
		expect(resolve(locales, "en", "pt-BR")).toBe("en")
	})

	test("throws if fallback is not in locales", () => {
		// @ts-expect-error — "fr" is not a key in locales.
		// The type system catches this at compile time; this test
		// verifies the runtime guard for untyped callers.
		expect(() => resolve(locales, "fr", "en")).toThrow(
			'Fallback locale "fr" not found in locales',
		)
	})
})

describe("merge", () => {
	test("overrides replace base entries", () => {
		const result = merge(en, { home: "Homepage" })
		expect(result.home).toBe("Homepage")
	})

	test("non-overridden entries are preserved", () => {
		const result = merge(en, { home: "Homepage" })
		expect(result.greeting({ name: "World" })).toBe("Hello, World!")
		expect(result.items({ count: 2 })).toBe("2 items")
	})
})

describe("composition", () => {
	const loaders = {
		en: () => Promise.resolve(en),
		es: () => Promise.resolve(es),
		"es-AR": () => Promise.resolve(esAR),
	}

	test("resolve → load → translate", async () => {
		const tag = resolve(loaders, "en", "es-AR")
		const dict = await loaders[tag]()
		const t = translate(dict)
		expect(t("greeting", { name: "Mundo" })).toBe("Ché, Mundo!")
		expect(t("home")).toBe("Inicio")
	})

	test("fallback through composition", async () => {
		const tag = resolve(loaders, "en", "pt-BR")
		const dict = await loaders[tag]()
		const t = translate(dict)
		expect(t("greeting", { name: "World" })).toBe("Hello, World!")
	})

	test("works with sync dicts directly", () => {
		const dicts = { en, es }
		const tag = resolve(dicts, "en", "es")
		const t = translate(dicts[tag])
		expect(t("home")).toBe("Inicio")
	})
})
