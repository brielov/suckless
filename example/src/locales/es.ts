import type { AppDict } from "./en.ts"

function tiempoAtras(ms: number): string {
	const seconds = Math.floor(ms / 1000)
	const minutes = Math.floor(seconds / 60)
	const hours = Math.floor(minutes / 60)
	const days = Math.floor(hours / 24)
	const months = Math.floor(days / 30)
	const years = Math.floor(days / 365)

	if (years > 0) {return `hace ${years} año${years > 1 ? "s" : ""}`}
	if (months > 0)
		{return `hace ${months} mes${months > 1 ? "es" : ""}`}
	if (days > 0) {return `hace ${days} día${days > 1 ? "s" : ""}`}
	if (hours > 0) {return `hace ${hours} hora${hours > 1 ? "s" : ""}`}
	if (minutes > 0)
		{return `hace ${minutes} minuto${minutes > 1 ? "s" : ""}`}
	return "justo ahora"
}

export const es: AppDict = {
	siteTitle: "Blog Suckless",
	home: "Inicio",
	posts: "Publicaciones",
	contact: "Contacto",
	readMore: "Leer más",
	name: "Nombre",
	email: "Correo electrónico",
	message: "Mensaje",
	send: "Enviar",
	contactSuccess: "¡Tu mensaje ha sido enviado con éxito!",
	notFound: "Página no encontrada",
	tooManyRequests:
		"Demasiadas solicitudes. Inténtalo de nuevo más tarde.",
	relativeTime: (ms: number): string => tiempoAtras(ms),
	postedBy: (author: string): string => `Por ${author}`,
}
