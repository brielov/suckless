import { memo } from "@suckless/memo"
import { stableKey } from "@suckless/key"

export type Locale = "en" | "es"

type Localized = Record<Locale, string>

export interface Post {
	slug: string
	title: Localized
	excerpt: Localized
	content: Localized
	author: string
	date: Date
}

export const posts: readonly Post[] = [
	{
		slug: "hello-world",
		title: {
			en: "Hello World",
			es: "Hola Mundo",
		},
		excerpt: {
			en: "Welcome to the Suckless Blog, where simplicity meets power.",
			es: "Bienvenido al Blog Suckless, donde la simplicidad se encuentra con el poder.",
		},
		content: {
			en: "<p>Welcome to the <strong>Suckless Blog</strong>. We believe in building software that is minimal, correct, and transparent.</p><p>Every package in the <code>@suckless</code> ecosystem has zero runtime dependencies, full type safety, and a single-purpose design.</p>",
			es: "<p>Bienvenido al <strong>Blog Suckless</strong>. Creemos en construir software que sea mínimo, correcto y transparente.</p><p>Cada paquete en el ecosistema <code>@suckless</code> tiene cero dependencias de ejecución, seguridad de tipos completa y un diseño de propósito único.</p>",
		},
		author: "Admin",
		date: new Date("2025-01-15"),
	},
	{
		slug: "zero-dependencies",
		title: {
			en: "Zero Dependencies",
			es: "Cero Dependencias",
		},
		excerpt: {
			en: "Why we build everything from scratch with zero external dependencies.",
			es: "Por qué construimos todo desde cero sin dependencias externas.",
		},
		content: {
			en: "<p>Every <code>@suckless</code> package has <strong>zero runtime dependencies</strong>. This isn't a constraint — it's a feature.</p><p>Fewer dependencies mean fewer supply chain risks, smaller bundles, and complete control over behavior.</p>",
			es: "<p>Cada paquete <code>@suckless</code> tiene <strong>cero dependencias de ejecución</strong>. Esto no es una restricción — es una característica.</p><p>Menos dependencias significan menos riesgos en la cadena de suministro, paquetes más pequeños y control completo sobre el comportamiento.</p>",
		},
		author: "Admin",
		date: new Date("2025-02-20"),
	},
	{
		slug: "type-safety",
		title: {
			en: "Type Safety First",
			es: "Seguridad de Tipos Primero",
		},
		excerpt: {
			en: "How TypeScript's type system drives the design of every package.",
			es: "Cómo el sistema de tipos de TypeScript guía el diseño de cada paquete.",
		},
		content: {
			en: "<p>Type safety isn't just a feature — it's a <strong>design principle</strong>. Every API is shaped so that incorrect usage is a compile error, not a runtime surprise.</p><p>From the schema validator's <code>Infer&lt;T&gt;</code> to the emitter's typed event maps, types are the contract.</p>",
			es: "<p>La seguridad de tipos no es solo una característica — es un <strong>principio de diseño</strong>. Cada API está diseñada para que el uso incorrecto sea un error de compilación, no una sorpresa en tiempo de ejecución.</p><p>Desde el <code>Infer&lt;T&gt;</code> del validador de esquemas hasta los mapas de eventos tipados del emisor, los tipos son el contrato.</p>",
		},
		author: "Admin",
		date: new Date("2025-03-10"),
	},
]

export const findPost: (slug: string) => Post | undefined = memo(
	(slug: string) => posts.find((p) => p.slug === slug),
	(slug) => stableKey({ slug }),
	{ max: 50 },
)
