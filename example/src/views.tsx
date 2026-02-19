import { raw, type Children, type RawHtml } from "@suckless/jsx"
import type { TranslateFn } from "@suckless/i18n"
import type { AppDict } from "./locales/en.ts"
import type { Locale, Post } from "./data.ts"
import CSS from "./styles.css" with { type: "text" }

// ── Layout ──────────────────────────────────────────────────────────

export function Layout(props: {
	locale: Locale
	t: TranslateFn<AppDict>
	children?: Children
}): RawHtml {
	const { locale, t, children } = props
	const otherLocale: Locale = locale === "en" ? "es" : "en"
	const otherLabel = locale === "en" ? "ES" : "EN"

	return (
		<html lang={locale}>
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>{t("siteTitle")}</title>
				<style>{raw(CSS)}</style>
			</head>
			<body>
				<nav>
					<a href={`/${locale}/`}>{t("home")}</a>
					<a href={`/${locale}/contact`}>{t("contact")}</a>
					<span class="spacer" />
					<a href={`/${otherLocale}/`}>{otherLabel}</a>
				</nav>
				<main>{children}</main>
			</body>
		</html>
	)
}

// ── Home page ───────────────────────────────────────────────────────

export function HomePage(props: {
	locale: Locale
	t: TranslateFn<AppDict>
	posts: readonly Post[]
}): RawHtml {
	const { locale, t } = props

	return (
		<>
			<h1>{t("posts")}</h1>
			<div class="post-list">
				{props.posts.map((post) => {
					const timeAgo = Date.now() - post.date.getTime()
					return (
						<div class="post-card">
							<h2>
								<a href={`/${locale}/posts/${post.slug}`}>
									{post.title[locale]}
								</a>
							</h2>
							<p class="meta">
								{t("postedBy", post.author)} — {t("relativeTime", timeAgo)}
							</p>
							<p>{post.excerpt[locale]}</p>
						</div>
					)
				})}
			</div>
		</>
	)
}

// ── Post page ───────────────────────────────────────────────────────

export function PostPage(props: {
	t: TranslateFn<AppDict>
	title: string
	content: string
	author: string
	date: Date
}): RawHtml {
	const { t, title, content, author, date } = props
	const timeAgo = Date.now() - date.getTime()

	return (
		<>
			<h1>{title}</h1>
			<p class="meta">
				{t("postedBy", author)} — {t("relativeTime", timeAgo)}
			</p>
			<article>{raw(content)}</article>
		</>
	)
}

// ── Contact page ────────────────────────────────────────────────────

export function ContactPage(props: {
	locale: Locale
	t: TranslateFn<AppDict>
	errors?: Record<string, string>
	values?: Record<string, string>
	success?: boolean
}): RawHtml {
	const { locale, t, errors, values, success } = props

	if (success === true) {
		return <div class="success">{t("contactSuccess")}</div>
	}

	const nameError = errors?.["name"]
	const emailError = errors?.["email"]
	const messageError = errors?.["message"]

	return (
		<form method="post" action={`/${locale}/contact`}>
			<h1>{t("contact")}</h1>
			<label>
				{t("name")}
				<input type="text" name="name" value={values?.["name"] ?? ""} />
				{nameError !== undefined ? (
					<span class="field-error">{nameError}</span>
				) : (
					false
				)}
			</label>
			<label>
				{t("email")}
				<input type="email" name="email" value={values?.["email"] ?? ""} />
				{emailError !== undefined ? (
					<span class="field-error">{emailError}</span>
				) : (
					false
				)}
			</label>
			<label>
				{t("message")}
				<textarea name="message">{values?.["message"] ?? ""}</textarea>
				{messageError !== undefined ? (
					<span class="field-error">{messageError}</span>
				) : (
					false
				)}
			</label>
			<button type="submit">{t("send")}</button>
		</form>
	)
}

// ── Error page ──────────────────────────────────────────────────────

export function ErrorPage(props: { message: string }): RawHtml {
	return (
		<div class="error-page">
			<h1>{props.message}</h1>
		</div>
	)
}
