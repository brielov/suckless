import { describe, expect, it } from "bun:test"
import jsQR from "jsqr"
import QRCodeRef from "qrcode"
import { createQrCode, encodeData, type ErrorCorrectionLevel } from "./index.ts"

// ── Helpers ──────────────────────────────────────────

/** Scale a QR module matrix into RGBA pixel data for jsQR. */
function toImageData(
	modules: Uint8Array,
	size: number,
	scale: number,
): { data: Uint8ClampedArray; width: number; height: number } {
	const margin = 4
	const total = size + margin * 2
	const px = total * scale
	const data = new Uint8ClampedArray(px * px * 4)

	// Fill white background
	for (let i = 0; i < data.length; i += 4) {
		data[i] = 255
		data[i + 1] = 255
		data[i + 2] = 255
		data[i + 3] = 255
	}

	// Draw dark modules
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			if (modules[y * size + x] !== 1) {
				continue
			}
			for (let dy = 0; dy < scale; dy++) {
				for (let dx = 0; dx < scale; dx++) {
					const px_x = (x + margin) * scale + dx
					const px_y = (y + margin) * scale + dy
					const idx = (px_y * px + px_x) * 4
					data[idx] = 0
					data[idx + 1] = 0
					data[idx + 2] = 0
					data[idx + 3] = 255
				}
			}
		}
	}

	return { data, width: px, height: px }
}

/** Create QR and decode it with jsQR. */
function roundTrip(
	text: string,
	ec?: ErrorCorrectionLevel,
): string | undefined {
	const qr = createQrCode(text, {
		errorCorrection: ec ?? "M",
	})
	const { data, width, height } = toImageData(qr.modules, qr.size, 10)
	return jsQR(data, width, height)?.data
}

/**
 * Assert our QR matches the reference library in version/size,
 * and that our output decodes correctly.
 *
 * Mask pattern selection can differ between implementations due
 * to penalty scoring differences — both produce valid QR codes.
 */
function assertMatchesReference(text: string, ec: ErrorCorrectionLevel): void {
	const ours = createQrCode(text, { errorCorrection: ec })
	const ref = QRCodeRef.create(text, {
		errorCorrectionLevel: ec,
	})
	expect(ours.version).toBe(ref.version)
	expect(ours.size).toBe(ref.modules.size)

	const { data, width, height } = toImageData(ours.modules, ours.size, 10)
	const decoded = jsQR(data, width, height)
	expect(decoded?.data).toBe(text)
}

// ── Round-trip decode ────────────────────────────────

describe("round-trip decode", () => {
	it("decodes a simple URL", () => {
		expect(roundTrip("https://example.com")).toBe("https://example.com")
	})

	it("decodes a long URL", () => {
		const input =
			"https://example.com/very/long/path?query=value&foo=bar#section"
		expect(roundTrip(input)).toBe(input)
	})

	it("decodes plain text", () => {
		expect(roundTrip("Hello, World!")).toBe("Hello, World!")
	})

	it("decodes numeric-only data", () => {
		expect(roundTrip("0123456789")).toBe("0123456789")
	})

	it("decodes alphanumeric data", () => {
		expect(roundTrip("HELLO WORLD 123")).toBe("HELLO WORLD 123")
	})

	it("decodes UTF-8 content", () => {
		expect(roundTrip("Hello 世界")).toBe("Hello 世界")
	})

	it("decodes emoji content", () => {
		expect(roundTrip("Hello 🌍🎉")).toBe("Hello 🌍🎉")
	})

	it("decodes single character", () => {
		expect(roundTrip("A")).toBe("A")
	})

	it("decodes data with newlines", () => {
		const input = "Line1\nLine2\nLine3"
		expect(roundTrip(input)).toBe(input)
	})

	it("decodes special characters", () => {
		const input = "!@#$%^&*()_+-=[]{}|;:'\",.<>?/~`"
		expect(roundTrip(input)).toBe(input)
	})

	it("decodes across all error correction levels", () => {
		const input = "Error correction test"
		const levels: ErrorCorrectionLevel[] = ["L", "M", "Q", "H"]
		for (const ec of levels) {
			expect(roundTrip(input, ec)).toBe(input)
		}
	})
})

// ── encodeData round-trip ────────────────────────────

describe("encodeData round-trip", () => {
	it("decodes URL passthrough", () => {
		const input = encodeData({
			type: "url",
			value: "https://github.com/brielov/suckless",
		})
		expect(roundTrip(input)).toBe(input)
	})

	it("decodes WiFi WPA payload", () => {
		const input = encodeData({
			type: "wifi",
			ssid: "TestNetwork",
			password: "password123",
			encryption: "WPA",
		})
		expect(roundTrip(input)).toBe(input)
	})

	it("decodes WiFi with special characters", () => {
		const input = encodeData({
			type: "wifi",
			ssid: "My;Network",
			password: 'pass"word',
			encryption: "WPA",
		})
		expect(roundTrip(input)).toBe(input)
	})

	it("decodes open WiFi", () => {
		const input = encodeData({
			type: "wifi",
			ssid: "OpenNetwork",
			encryption: "nopass",
		})
		expect(roundTrip(input)).toBe(input)
	})

	it("decodes hidden WiFi", () => {
		const input = encodeData({
			type: "wifi",
			ssid: "HiddenNet",
			password: "secret",
			encryption: "WPA",
			hidden: true,
		})
		expect(roundTrip(input)).toBe(input)
	})

	it("decodes vCard with all fields", () => {
		const input = encodeData({
			type: "contact",
			firstName: "John",
			lastName: "Doe",
			organization: "Acme Corp",
			phone: "+1234567890",
			email: "john@example.com",
		})
		expect(roundTrip(input)).toBe(input)
	})

	it("decodes vCard with special characters", () => {
		const input = encodeData({
			type: "contact",
			firstName: "Jane",
			lastName: "O'Brien",
			organization: "Smith, Jones & Co.",
		})
		expect(roundTrip(input)).toBe(input)
	})

	it("decodes minimal vCard", () => {
		const input = encodeData({
			type: "contact",
			firstName: "Alice",
		})
		expect(roundTrip(input)).toBe(input)
	})
})

// ── Cross-reference with qrcode npm package ─────────

describe("cross-reference with qrcode library", () => {
	const cases: [string, ErrorCorrectionLevel][] = [
		["A", "M"],
		["A", "L"],
		["A", "Q"],
		["A", "H"],
		["https://example.com", "M"],
		["Hello, World!", "M"],
		["0123456789", "L"],
		["HELLO WORLD", "M"],
		["Hello 世界", "M"],
	]

	for (const [text, ec] of cases) {
		const label = text.length > 20 ? `${text.slice(0, 20)}...` : text
		it(`matches reference for "${label}" EC=${ec}`, () => {
			assertMatchesReference(text, ec)
		})
	}

	it("matches reference at version 2 boundary", () => {
		// 26 alphanumeric chars at EC M forces version 2
		assertMatchesReference("ABCDEFGHIJKLMNOPQRSTUVWXYZ", "M")
	})

	it("matches reference at version 5", () => {
		assertMatchesReference("A".repeat(100), "M")
	})

	it("matches reference at version 7+ (with version info)", () => {
		assertMatchesReference("B".repeat(200), "M")
	})

	it("matches reference at version 10+", () => {
		assertMatchesReference("C".repeat(400), "L")
	})

	it("matches reference at version 32 (alignment edge case)", () => {
		assertMatchesReference("D".repeat(1952), "L")
	})
})

// ── Version boundary testing ─────────────────────────

describe("version boundaries", () => {
	// Byte-mode capacities per version at EC L (from ISO 18004)
	// prettier-ignore
	const byteCapacityL = [
		17, 32, 53, 78, 106, 134, 154, 192, 230, 271,
		321, 367, 425, 458, 520, 586, 644, 718, 792, 858,
		929, 1003, 1091, 1171, 1273, 1367, 1465, 1528, 1628, 1732,
		1840, 1952, 2068, 2188, 2303, 2431, 2563, 2699, 2809, 2953,
	]

	it("produces correct version for exact byte-capacity fits at EC L", () => {
		for (let v = 1; v <= 10; v++) {
			const cap = byteCapacityL[v - 1]!
			const text = "x".repeat(cap)
			const qr = createQrCode(text, {
				errorCorrection: "L",
			})
			expect(qr.version).toBe(v)
		}
	})

	it("bumps to next version when exceeding capacity by 1", () => {
		for (let v = 1; v <= 9; v++) {
			const cap = byteCapacityL[v - 1]!
			const text = "x".repeat(cap + 1)
			const qr = createQrCode(text, {
				errorCorrection: "L",
			})
			expect(qr.version).toBeGreaterThan(v)
		}
	})

	it("decodes at each version boundary (1-10)", () => {
		for (let v = 1; v <= 10; v++) {
			const cap = byteCapacityL[v - 1]!
			const text = "x".repeat(cap)
			const decoded = roundTrip(text, "L")
			expect(decoded).toBe(text)
		}
	})

	it("decodes at high versions (15, 20, 25, 32, 35)", () => {
		for (const v of [15, 20, 25, 32, 35]) {
			const cap = byteCapacityL[v - 1]!
			const text = "y".repeat(cap)
			const decoded = roundTrip(text, "L")
			expect(decoded).toBe(text)
		}
	})
})

// ── Randomized testing ───────────────────────────────

function randomString(length: number, charset: string): string {
	let result = ""
	for (let i = 0; i < length; i++) {
		result += charset[Math.floor(Math.random() * charset.length)]
	}
	return result
}

const DIGITS = "0123456789"
const ALPHANUM = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:"

const ASCII =
	"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:',.<>?/ "

describe("randomized inputs", () => {
	it("round-trips 20 random numeric strings", () => {
		for (let i = 0; i < 20; i++) {
			const len = 1 + Math.floor(Math.random() * 50)
			const input = randomString(len, DIGITS)
			expect(roundTrip(input, "M")).toBe(input)
		}
	})

	it("round-trips 20 random alphanumeric strings", () => {
		for (let i = 0; i < 20; i++) {
			const len = 1 + Math.floor(Math.random() * 50)
			const input = randomString(len, ALPHANUM)
			expect(roundTrip(input, "M")).toBe(input)
		}
	})

	it("round-trips 20 random ASCII strings", () => {
		for (let i = 0; i < 20; i++) {
			const len = 1 + Math.floor(Math.random() * 100)
			const input = randomString(len, ASCII)
			expect(roundTrip(input, "M")).toBe(input)
		}
	})

	it("round-trips 10 random strings at each EC level", () => {
		const levels: ErrorCorrectionLevel[] = ["L", "M", "Q", "H"]
		for (const ec of levels) {
			for (let i = 0; i < 10; i++) {
				const len = 1 + Math.floor(Math.random() * 80)
				const input = randomString(len, ASCII)
				expect(roundTrip(input, ec)).toBe(input)
			}
		}
	})

	it("round-trips random lengths from 1 to 200", () => {
		for (const len of [1, 2, 5, 10, 25, 50, 100, 150, 200]) {
			const input = randomString(len, ASCII)
			expect(roundTrip(input, "L")).toBe(input)
		}
	})
})
