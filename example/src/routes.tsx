import { resolve, translate } from "@suckless/i18n"
import type { RawHtml } from "@suckless/jsx"
import { stableKey } from "@suckless/key"
import { createRouter } from "@suckless/router"
import { compile, object, refine, string } from "@suckless/schema"
import { type Locale, findPost, posts } from "./data.ts"
import { en, type AppDict } from "./locales/en.ts"
import { es } from "./locales/es.ts"
import {
	contactLimiter,
	emailQueue,
	emitter,
	pageCache,
	requestIPs,
} from "./services.ts"
import { ContactPage, ErrorPage, HomePage, Layout, PostPage } from "./views.tsx"

// ── Locale resolution ───────────────────────────────────────────────

const DICTS: Record<Locale, AppDict> = { en, es }

function resolveLocale(raw: string): Locale {
	return resolve(DICTS, "en", raw)
}

// ── Rendering helpers ───────────────────────────────────────────────

function renderPage(element: RawHtml): string {
	return `<!doctype html>${String(element)}`
}

function htmlResponse(element: RawHtml, status = 200): Response {
	return new Response(renderPage(element), {
		status,
		headers: {
			"content-type": "text/html; charset=utf-8",
		},
	})
}

// ── Schema validation ───────────────────────────────────────────────

const contactSchema = compile(
	object({
		name: refine(string, (v) => v.trim().length > 0, "name is required"),
		email: refine(string, (v) => v.includes("@"), "invalid email address"),
		message: refine(string, (v) => v.trim().length > 0, "message is required"),
	}),
)

function parseSchemaError(error: Error): Record<string, string> {
	const idx = error.message.indexOf(": ")
	if (idx === -1) {
		return { _form: error.message }
	}
	return {
		[error.message.slice(0, idx)]: error.message.slice(idx + 2),
	}
}

// ── Route handler type ──────────────────────────────────────────────

type RouteHandler = (
	req: Request,
	params: Record<string, string>,
) => Response | Promise<Response>

// ── Route handlers ──────────────────────────────────────────────────

function handleRoot(req: Request): Response {
	const accept = req.headers.get("accept-language") ?? "en"
	const primary = (accept.split(",")[0] ?? "").split(";")[0] ?? ""
	const locale = resolveLocale(primary.trim())
	return new Response(undefined, {
		status: 302,
		headers: { location: `/${locale}/` },
	})
}

async function handleHome(
	_req: Request,
	params: Record<string, string>,
): Promise<Response> {
	const { locale: localeParam } = params
	if (localeParam === undefined) {
		return new Response("Bad Request", { status: 400 })
	}
	const locale = resolveLocale(localeParam)
	const t = translate(DICTS[locale])
	const key = stableKey({ locale, page: "home" })

	const html = await pageCache.fetch(key, () =>
		Promise.resolve(
			renderPage(
				<Layout locale={locale} t={t}>
					<HomePage locale={locale} t={t} posts={posts} />
				</Layout>,
			),
		),
	)
	return new Response(html, {
		headers: {
			"content-type": "text/html; charset=utf-8",
		},
	})
}

async function handlePost(
	_req: Request,
	params: Record<string, string>,
): Promise<Response> {
	const { locale: localeParam, slug } = params
	if (localeParam === undefined || slug === undefined) {
		return new Response("Bad Request", { status: 400 })
	}

	const locale = resolveLocale(localeParam)
	const t = translate(DICTS[locale])
	const post = findPost(slug)

	if (!post) {
		return htmlResponse(
			<Layout locale={locale} t={t}>
				<ErrorPage message={t("notFound")} />
			</Layout>,
			404,
		)
	}

	const key = stableKey({ locale, slug })

	const html = await pageCache.fetch(key, () =>
		Promise.resolve(
			renderPage(
				<Layout locale={locale} t={t}>
					<PostPage
						t={t}
						title={post.title[locale]}
						content={post.content[locale]}
						author={post.author}
						date={post.date}
					/>
				</Layout>,
			),
		),
	)
	return new Response(html, {
		headers: {
			"content-type": "text/html; charset=utf-8",
		},
	})
}

function handleContactGet(
	_req: Request,
	params: Record<string, string>,
): Response {
	const { locale: localeParam } = params
	if (localeParam === undefined) {
		return new Response("Bad Request", { status: 400 })
	}
	const locale = resolveLocale(localeParam)
	const t = translate(DICTS[locale])

	return htmlResponse(
		<Layout locale={locale} t={t}>
			<ContactPage locale={locale} t={t} />
		</Layout>,
	)
}

// ── Router ──────────────────────────────────────────────────────────

export const router = createRouter<RouteHandler>()
	.add("/", handleRoot)
	.add("/:locale", handleHome)
	.add("/:locale/posts/:slug", handlePost)
	.add("/:locale/contact", handleContactGet)

// ── Contact POST handler ────────────────────────────────────────────

export async function handleContactPost(
	req: Request,
	rawLocale: string,
): Promise<Response> {
	const locale = resolveLocale(rawLocale)
	const t = translate(DICTS[locale])

	const ip = requestIPs.get(req) ?? "unknown"
	const limit = await contactLimiter.check(ip)
	if (!limit.ok) {
		return htmlResponse(
			<Layout locale={locale} t={t}>
				<ErrorPage message={t("tooManyRequests")} />
			</Layout>,
			429,
		)
	}

	const formData = await req.formData()
	const values: Record<string, string> = {}
	for (const [key, val] of formData.entries()) {
		if (typeof val === "string") {
			values[key] = val
		}
	}

	try {
		const validated = contactSchema(values)
		emitter.emit("form:submit", validated.name, validated.email)
		await emailQueue.push({
			to: validated.email,
			name: validated.name,
			message: validated.message,
		})
		return htmlResponse(
			<Layout locale={locale} t={t}>
				<ContactPage locale={locale} t={t} success={true} />
			</Layout>,
		)
	} catch (error) {
		if (error instanceof Error) {
			const errors = parseSchemaError(error)
			return htmlResponse(
				<Layout locale={locale} t={t}>
					<ContactPage locale={locale} t={t} errors={errors} values={values} />
				</Layout>,
				422,
			)
		}
		throw error
	}
}

// ── Not found handler ───────────────────────────────────────────────

export function handleNotFound(req: Request): Response {
	const url = new URL(req.url)
	const [, pathSegment] = url.pathname.split("/")
	const locale = resolveLocale(pathSegment ?? "en")
	const t = translate(DICTS[locale])

	return htmlResponse(
		<Layout locale={locale} t={t}>
			<ErrorPage message={t("notFound")} />
		</Layout>,
		404,
	)
}
