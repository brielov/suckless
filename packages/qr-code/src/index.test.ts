import { describe, expect, it } from "bun:test"
import {
	createQrCode,
	encodeData,
	renderSvg,
	renderText,
	type QrCode,
	type QrData,
} from "./index.ts"

// ── encodeData ────────────────────────────────────────

describe("encodeData", () => {
	it("passes URL value through as-is", () => {
		const result = encodeData({
			type: "url",
			value: "https://example.com",
		})
		expect(result).toBe("https://example.com")
	})

	it("encodes WiFi with WPA", () => {
		const result = encodeData({
			type: "wifi",
			ssid: "MyNetwork",
			password: "secret123",
			encryption: "WPA",
		})
		expect(result).toBe("WIFI:T:WPA;S:MyNetwork;P:secret123;;")
	})

	it("escapes special chars in WiFi SSID and password", () => {
		const result = encodeData({
			type: "wifi",
			ssid: "Net;work",
			password: 'pass"word',
			encryption: "WPA",
		})
		expect(result).toContain(String.raw`S:Net\;work;`)
		expect(result).toContain(String.raw`P:pass\"word;`)
	})

	it("escapes colons in WiFi SSID and password", () => {
		const result = encodeData({
			type: "wifi",
			ssid: "net:work",
			password: "pass:word",
			encryption: "WPA",
		})
		expect(result).toContain(String.raw`S:net\:work;`)
		expect(result).toContain(String.raw`P:pass\:word;`)
	})

	it("omits password field when undefined", () => {
		const result = encodeData({
			type: "wifi",
			ssid: "Open",
			encryption: "nopass",
		})
		expect(result).toBe("WIFI:T:nopass;S:Open;;")
		expect(result).not.toContain("P:")
	})

	it("includes hidden flag when true", () => {
		const result = encodeData({
			type: "wifi",
			ssid: "Hidden",
			encryption: "WPA",
			password: "pass",
			hidden: true,
		})
		expect(result).toContain("H:true;")
	})

	it("encodes vCard with all fields", () => {
		const result = encodeData({
			type: "contact",
			firstName: "John",
			lastName: "Doe",
			organization: "Acme",
			phone: "+1234567890",
			email: "john@example.com",
			url: "https://example.com",
			address: "123 Main St",
		})
		expect(result).toContain("BEGIN:VCARD")
		expect(result).toContain("VERSION:3.0")
		expect(result).toContain("FN:John Doe")
		expect(result).toContain("N:Doe;John;;;")
		expect(result).toContain("ORG:Acme")
		expect(result).toContain("TEL:+1234567890")
		expect(result).toContain("EMAIL:john@example.com")
		expect(result).toContain("END:VCARD")
	})

	it("uses CRLF line endings in vCard", () => {
		const result = encodeData({
			type: "contact",
			firstName: "Jane",
		})
		expect(result).toContain("\r\n")
		expect(result.startsWith("BEGIN:VCARD\r\n")).toBe(true)
		expect(result.endsWith("\r\nEND:VCARD")).toBe(true)
	})

	it("escapes special characters in vCard fields", () => {
		const result = encodeData({
			type: "contact",
			firstName: "John",
			lastName: "O'Brien;Jr",
			organization: "Acme, Inc.",
			address: "Line1\nLine2",
		})
		expect(result).toContain(String.raw`N:O'Brien\;Jr;John;;;`)
		expect(result).toContain(String.raw`ORG:Acme\, Inc.`)
		expect(result).toContain(String.raw`ADR:Line1\nLine2`)
	})

	it("includes only populated vCard fields", () => {
		const result = encodeData({
			type: "contact",
			firstName: "Jane",
		})
		expect(result).toContain("FN:Jane")
		expect(result).not.toContain("ORG:")
		expect(result).not.toContain("TEL:")
		expect(result).not.toContain("EMAIL:")
	})
})

// ── createQrCode ──────────────────────────────────────

describe("createQrCode", () => {
	it("produces correct version and size for short URL", () => {
		const qr = createQrCode("https://example.com")
		expect(qr.version).toBeGreaterThanOrEqual(1)
		expect(qr.version).toBeLessThanOrEqual(40)
		expect(qr.size).toBe(qr.version * 4 + 17)
		expect(qr.modules.length).toBe(qr.size * qr.size)
	})

	it("uses version 1 for very short numeric data at ECL L", () => {
		const qr = createQrCode("12345", {
			errorCorrection: "L",
		})
		expect(qr.version).toBe(1)
		expect(qr.size).toBe(21)
	})

	it("increases version for longer data", () => {
		const short = createQrCode("A")
		const long = createQrCode("A".repeat(100))
		expect(long.version).toBeGreaterThan(short.version)
	})

	it("higher EC levels require more space", () => {
		const text = "Hello, World! This is a test string."
		const qrL = createQrCode(text, {
			errorCorrection: "L",
		})
		const qrH = createQrCode(text, {
			errorCorrection: "H",
		})
		expect(qrH.version).toBeGreaterThanOrEqual(qrL.version)
	})

	it("throws RangeError for data that is too long", () => {
		expect(() => {
			createQrCode("A".repeat(10_000))
		}).toThrow(RangeError)
	})

	it("has dark module at position (size-8, 8)", () => {
		const qr = createQrCode("test")
		const idx = (qr.size - 8) * qr.size + 8
		expect(qr.modules[idx]).toBe(1)
	})

	it("has finder patterns in three corners", () => {
		const qr = createQrCode("test")
		// Top-left corner (0,0) should be dark
		expect(qr.modules[0]).toBe(1)
		// Top-right corner (0, size-1) should be dark
		expect(qr.modules[qr.size - 1]).toBe(1)
		// Bottom-left corner (size-1, 0) should be dark
		expect(qr.modules[(qr.size - 1) * qr.size]).toBe(1)
	})

	it("produces valid QR for UTF-8 content", () => {
		const qr = createQrCode("Hello 世界! 🌍")
		expect(qr.version).toBeGreaterThanOrEqual(1)
		expect(qr.modules.length).toBe(qr.size * qr.size)
	})

	it("selects numeric mode for digit-only input", () => {
		const qrNum = createQrCode("0123456789012345678901234", {
			errorCorrection: "L",
		})
		const qrByte = createQrCode("abcdefghijklmnopqrstuvwxy", {
			errorCorrection: "L",
		})
		// Pure digits use numeric mode (more efficient encoding),
		// so they fit in a smaller or equal version than byte mode
		expect(qrNum.version).toBeLessThanOrEqual(qrByte.version)
	})
})

// ── renderSvg ─────────────────────────────────────────

describe("renderSvg", () => {
	function makeQr(): QrCode {
		return createQrCode("https://example.com")
	}

	it("starts with <svg and ends with </svg>", () => {
		const svg = renderSvg(makeQr())
		expect(svg.startsWith("<svg")).toBe(true)
		expect(svg.endsWith("</svg>")).toBe(true)
	})

	it("includes correct viewBox at default size", () => {
		const svg = renderSvg(makeQr())
		expect(svg).toContain('viewBox="0 0 400 400"')
	})

	it("uses custom size in viewBox", () => {
		const svg = renderSvg(makeQr(), { size: 200 })
		expect(svg).toContain('viewBox="0 0 200 200"')
	})

	it("omits background rect when transparent", () => {
		const svg = renderSvg(makeQr(), {
			background: "transparent",
		})
		expect(svg).not.toContain('fill="#ffffff"')
		// Should not have a background rect at all
		const bgRectCount = (svg.match(/<rect[^>]*width="400"/g) ?? []).length
		expect(bgRectCount).toBe(0)
	})

	it("includes background rect by default", () => {
		const svg = renderSvg(makeQr())
		expect(svg).toContain('fill="#000000"')
	})

	it("applies foreground color", () => {
		const svg = renderSvg(makeQr(), {
			foreground: "#ff0000",
		})
		expect(svg).toContain("#ff0000")
	})

	it("renders data dots as rects for square style", () => {
		const svg = renderSvg(makeQr(), {
			dotStyle: "square",
		})
		expect(svg).toContain("<rect")
	})

	it("renders data dots as circles for dots style", () => {
		const svg = renderSvg(makeQr(), {
			dotStyle: "dots",
		})
		expect(svg).toContain("<circle")
	})

	it("renders rounded dots with rx/ry", () => {
		const svg = renderSvg(makeQr(), {
			dotStyle: "rounded",
		})
		expect(svg).toContain("rx=")
		expect(svg).toContain("ry=")
	})

	it("renders square corners as plain modules", () => {
		const svg = renderSvg(makeQr(), {
			cornerSquareStyle: "square",
		})
		expect(svg).not.toContain("stroke=")
	})

	it("renders styled corners with stroke", () => {
		const svg = renderSvg(makeQr(), {
			cornerSquareStyle: "rounded",
		})
		expect(svg).toContain("stroke=")
	})

	it("renders dot-style corners as circles", () => {
		const svg = renderSvg(makeQr(), {
			cornerSquareStyle: "dot",
			cornerDotStyle: "dot",
		})
		expect(svg).toContain("<circle")
	})

	it("includes image element when logo is provided", () => {
		const svg = renderSvg(makeQr(), {
			logo: { src: "data:image/png;base64,abc" },
		})
		expect(svg).toContain("<image")
		expect(svg).toContain("data:image/png;base64,abc")
		expect(svg).toContain("preserveAspectRatio")
	})

	it("uses conservative default logo size", () => {
		const svg = renderSvg(makeQr(), {
			logo: { src: "data:image/png;base64,abc" },
		})
		const image = svg.match(/<image[^>]*width="([^"]+)"[^>]*height="([^"]+)"/)
		expect(image?.[1]).toBe("48")
		expect(image?.[2]).toBe("48")
	})

	it("escapes special characters in attributes", () => {
		const svg = renderSvg(makeQr(), {
			foreground: 'color"<>&test',
		})
		expect(svg).toContain("&amp;")
		expect(svg).toContain("&quot;")
		expect(svg).toContain("&lt;")
		expect(svg).toContain("&gt;")
	})

	it("has role=img on the svg element", () => {
		const svg = renderSvg(makeQr())
		expect(svg).toContain('role="img"')
	})

	it("throws on invalid size", () => {
		const qr = makeQr()
		expect(() => renderSvg(qr, { size: NaN })).toThrow(RangeError)
		expect(() => renderSvg(qr, { size: Infinity })).toThrow(RangeError)
		expect(() => renderSvg(qr, { size: -1 })).toThrow(RangeError)
		expect(() => renderSvg(qr, { size: 0 })).toThrow(RangeError)
	})

	it("throws on invalid margin", () => {
		const qr = makeQr()
		expect(() => renderSvg(qr, { margin: NaN })).toThrow(RangeError)
		expect(() => renderSvg(qr, { margin: -1 })).toThrow(RangeError)
	})

	it("throws on invalid logo options", () => {
		const qr = makeQr()
		expect(() =>
			renderSvg(qr, {
				logo: { src: "data:image/png;base64,abc", sizeRatio: NaN },
			}),
		).toThrow(RangeError)
		expect(() =>
			renderSvg(qr, {
				logo: { src: "data:image/png;base64,abc", padding: -1 },
			}),
		).toThrow(RangeError)
		expect(() =>
			renderSvg(qr, {
				logo: {
					src: "data:image/png;base64,abc",
					borderRadius: Infinity,
				},
			}),
		).toThrow(RangeError)
	})

	it("throws when logo is too large for EC capacity", () => {
		const qr = createQrCode("test", { errorCorrection: "L" })
		expect(() =>
			renderSvg(qr, {
				logo: { src: "data:image/png;base64,abc", sizeRatio: 0.5 },
			}),
		).toThrow(RangeError)
	})

	it("accepts logo at high EC level that would fail at low EC", () => {
		const qrH = createQrCode("https://example.com", {
			errorCorrection: "H",
		})
		const svg = renderSvg(qrH, {
			logo: {
				src: "data:image/png;base64,abc",
				sizeRatio: 0.15,
			},
		})
		expect(svg).toContain("<image")
	})

	it("counts all modules when logo bg differs from QR bg", () => {
		const qr = createQrCode("test", { errorCorrection: "L" })
		// With matching backgrounds, a small logo might pass.
		// With mismatched backgrounds, it counts all modules
		// (both dark and light), which is more restrictive.
		expect(() =>
			renderSvg(qr, {
				background: "#ffffff",
				logo: {
					src: "data:image/png;base64,abc",
					backgroundColor: "#ff0000",
					sizeRatio: 0.3,
				},
			}),
		).toThrow(RangeError)
	})

	it("renders logo with styled corners without visual conflict", () => {
		const qr = createQrCode("https://example.com", {
			errorCorrection: "H",
		})
		const svg = renderSvg(qr, {
			cornerSquareStyle: "rounded",
			cornerDotStyle: "dot",
			logo: { src: "data:image/png;base64,abc" },
		})
		expect(svg).toContain("<image")
		expect(svg).toContain("stroke=")
		expect(svg).toContain("<circle")
	})

	it("skips modules under logo exclusion zone", () => {
		const qr = createQrCode("https://example.com", {
			errorCorrection: "H",
		})
		const withLogo = renderSvg(qr, {
			logo: { src: "data:image/png;base64,abc" },
		})
		const without = renderSvg(qr)
		// The logo version should have fewer rects (modules skipped)
		// and contain the image element
		const withCount = (withLogo.match(/<rect/g) ?? []).length
		const withoutCount = (without.match(/<rect/g) ?? []).length
		expect(withCount).toBeLessThan(withoutCount)
		expect(withLogo).toContain("<image")
	})

	it("uses fmt() for logo borderRadius", () => {
		const qr = createQrCode("https://example.com", {
			errorCorrection: "H",
		})
		const svg = renderSvg(qr, {
			logo: {
				src: "data:image/png;base64,abc",
				borderRadius: 8.1234,
			},
		})
		expect(svg).toContain('rx="8.123"')
		expect(svg).toContain('ry="8.123"')
	})
})

// ── renderText ────────────────────────────────────────

describe("renderText", () => {
	function makeQr(): QrCode {
		return createQrCode("https://example.com")
	}

	it("produces one line per two module rows", () => {
		const qr = makeQr()
		const margin = 4
		const total = qr.size + margin * 2
		const text = renderText(qr)
		const lines = text.split("\n")
		expect(lines.length).toBe(Math.ceil(total / 2))
	})

	it("all lines have equal width", () => {
		const qr = makeQr()
		const margin = 4
		const total = qr.size + margin * 2
		const lines = renderText(qr).split("\n")
		for (const line of lines) {
			expect(line.length).toBe(total)
		}
	})

	it("only contains half-block characters and spaces", () => {
		const text = renderText(makeQr())
		for (const ch of text) {
			if (ch !== "\n") {
				expect(" ▀▄█".includes(ch)).toBe(true)
			}
		}
	})

	it("contains dark modules as filled characters", () => {
		const text = renderText(makeQr())
		expect(text).toContain("█")
	})

	it("inverted output swaps filled and empty", () => {
		const qr = makeQr()
		const normal = renderText(qr, { invert: false })
		const inverted = renderText(qr, { invert: true })
		expect(normal).not.toBe(inverted)

		const normalLines = normal.split("\n")
		const invertedLines = inverted.split("\n")
		expect(normalLines.length).toBe(invertedLines.length)

		// Each character should map to its complement
		const complement: Record<string, string> = {
			" ": "█",
			"█": " ",
			"▀": "▄",
			"▄": "▀",
		}
		for (let i = 0; i < normalLines.length; i++) {
			const nLine = normalLines[i]!
			const iLine = invertedLines[i]!
			expect(nLine.length).toBe(iLine.length)
			for (let j = 0; j < nLine.length; j++) {
				expect(iLine[j]).toBe(complement[nLine[j]!])
			}
		}
	})

	it("respects custom margin", () => {
		const qr = makeQr()
		const text0 = renderText(qr, { margin: 0 })
		const text8 = renderText(qr, { margin: 8 })
		const lines0 = text0.split("\n")
		const lines8 = text8.split("\n")
		expect(lines8[0]!.length).toBe(lines0[0]!.length + 16)
	})

	it("works with margin 0", () => {
		const qr = makeQr()
		const text = renderText(qr, { margin: 0 })
		const lines = text.split("\n")
		expect(lines.length).toBe(Math.ceil(qr.size / 2))
		for (const line of lines) {
			expect(line.length).toBe(qr.size)
		}
	})

	it("throws on invalid margin", () => {
		const qr = makeQr()
		expect(() => renderText(qr, { margin: NaN })).toThrow(RangeError)
		expect(() => renderText(qr, { margin: -1 })).toThrow(RangeError)
	})
})

// ── Integration ───────────────────────────────────────

describe("integration", () => {
	it("full pipeline: encodeData → createQrCode → renderSvg", () => {
		const text = encodeData({
			type: "url",
			value: "https://example.com",
		})
		const qr = createQrCode(text)
		const svg = renderSvg(qr)
		expect(svg.startsWith("<svg")).toBe(true)
		expect(svg.endsWith("</svg>")).toBe(true)
		expect(svg.length).toBeGreaterThan(100)
	})

	it("WiFi QR code produces valid SVG", () => {
		const text = encodeData({
			type: "wifi",
			ssid: "TestNetwork",
			password: "password123",
			encryption: "WPA",
		})
		const qr = createQrCode(text, {
			errorCorrection: "H",
		})
		const svg = renderSvg(qr, {
			size: 300,
			dotStyle: "rounded",
			cornerSquareStyle: "rounded",
			cornerDotStyle: "dot",
		})
		expect(svg).toContain("<svg")
		expect(svg).toContain('viewBox="0 0 300 300"')
	})

	it("all data types produce valid QR codes", () => {
		const cases: QrData[] = [
			{ type: "url", value: "https://example.com" },
			{
				type: "wifi",
				ssid: "Net",
				encryption: "WPA",
				password: "pass",
			},
			{
				type: "contact",
				firstName: "A",
				lastName: "B",
			},
		]
		for (const data of cases) {
			const text = encodeData(data)
			const qr = createQrCode(text)
			const svg = renderSvg(qr)
			expect(svg.startsWith("<svg")).toBe(true)
			expect(svg.endsWith("</svg>")).toBe(true)
		}
	})
})
