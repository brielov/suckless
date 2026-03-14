// ── Types ─────────────────────────────────────────────

export type ErrorCorrectionLevel = "L" | "M" | "Q" | "H"

export interface QrCode {
	readonly version: number
	readonly size: number
	readonly modules: Uint8Array
	readonly errorCorrection: ErrorCorrectionLevel
}

export interface QrOptions {
	errorCorrection?: ErrorCorrectionLevel
}

export interface UrlData {
	type: "url"
	value: string
}

export interface WifiData {
	type: "wifi"
	ssid: string
	password?: string
	encryption: "WPA" | "WEP" | "nopass"
	hidden?: boolean
}

export interface ContactData {
	type: "contact"
	firstName?: string
	lastName?: string
	organization?: string
	phone?: string
	email?: string
	url?: string
	address?: string
}

export type QrData = UrlData | WifiData | ContactData

export type DotStyle = "square" | "rounded" | "dots"
export type CornerSquareStyle = "square" | "rounded" | "dot"
export type CornerDotStyle = "square" | "dot"

export interface LogoOptions {
	src: string
	sizeRatio?: number
	padding?: number
	borderRadius?: number
	backgroundColor?: string
}

export interface SvgOptions {
	size?: number
	margin?: number
	foreground?: string
	background?: string
	dotStyle?: DotStyle
	cornerSquareStyle?: CornerSquareStyle
	cornerDotStyle?: CornerDotStyle
	logo?: LogoOptions
}

export interface TextOptions {
	margin?: number
	invert?: boolean
}

const DEFAULT_LOGO_SIZE_RATIO = 0.12
const DEFAULT_LOGO_PADDING = 6
const DEFAULT_LOGO_BORDER_RADIUS = 4

function isObjectRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null
}

function assertString(name: string, value: unknown): asserts value is string {
	if (typeof value !== "string") {
		throw new TypeError(`${name} must be a string`)
	}
}

function assertNonEmptyString(
	name: string,
	value: unknown,
): asserts value is string {
	assertString(name, value)
	if (value.trim() === "") {
		throw new RangeError(`${name} must be a non-empty string`)
	}
}

function assertOptionalString(
	name: string,
	value: unknown,
): asserts value is string | undefined {
	if (value !== undefined) {
		assertString(name, value)
	}
}

function assertOptionalBoolean(
	name: string,
	value: unknown,
): asserts value is boolean | undefined {
	if (value !== undefined && typeof value !== "boolean") {
		throw new TypeError(`${name} must be a boolean`)
	}
}

function assertInteger(name: string, value: number): void {
	if (!Number.isInteger(value)) {
		throw new RangeError(`${name} must be an integer`)
	}
}

function isErrorCorrectionLevel(value: unknown): value is ErrorCorrectionLevel {
	return value === "L" || value === "M" || value === "Q" || value === "H"
}

function assertErrorCorrectionLevel(
	name: string,
	value: unknown,
): asserts value is ErrorCorrectionLevel {
	if (!isErrorCorrectionLevel(value)) {
		throw new TypeError(`${name} must be one of "L", "M", "Q", or "H"`)
	}
}

function isWifiEncryption(value: unknown): value is WifiData["encryption"] {
	return value === "WPA" || value === "WEP" || value === "nopass"
}

function assertWifiEncryption(
	name: string,
	value: unknown,
): asserts value is WifiData["encryption"] {
	if (!isWifiEncryption(value)) {
		throw new TypeError(`${name} must be one of "WPA", "WEP", or "nopass"`)
	}
}

function isDotStyle(value: unknown): value is DotStyle {
	return value === "square" || value === "rounded" || value === "dots"
}

function assertDotStyle(
	name: string,
	value: unknown,
): asserts value is DotStyle {
	if (!isDotStyle(value)) {
		throw new TypeError(`${name} must be one of "square", "rounded", or "dots"`)
	}
}

function isCornerSquareStyle(value: unknown): value is CornerSquareStyle {
	return value === "square" || value === "rounded" || value === "dot"
}

function assertCornerSquareStyle(
	name: string,
	value: unknown,
): asserts value is CornerSquareStyle {
	if (!isCornerSquareStyle(value)) {
		throw new TypeError(`${name} must be one of "square", "rounded", or "dot"`)
	}
}

function isCornerDotStyle(value: unknown): value is CornerDotStyle {
	return value === "square" || value === "dot"
}

function assertCornerDotStyle(
	name: string,
	value: unknown,
): asserts value is CornerDotStyle {
	if (!isCornerDotStyle(value)) {
		throw new TypeError(`${name} must be one of "square" or "dot"`)
	}
}

function assertQrCode(qr: QrCode): void {
	if (!isObjectRecord(qr)) {
		throw new TypeError("qr must be an object")
	}

	const { version, size, modules, errorCorrection } = qr as {
		version?: unknown
		size?: unknown
		modules?: unknown
		errorCorrection?: unknown
	}

	if (typeof version !== "number" || !Number.isFinite(version)) {
		throw new TypeError("qr.version must be a finite number")
	}
	assertInteger("qr.version", version)
	if (version < 1 || version > 40) {
		throw new RangeError("qr.version must be between 1 and 40")
	}

	if (typeof size !== "number" || !Number.isFinite(size)) {
		throw new TypeError("qr.size must be a finite number")
	}
	assertInteger("qr.size", size)
	const expectedSize = version * 4 + 17
	if (size !== expectedSize) {
		throw new RangeError(
			`qr.size must be ${expectedSize} for version ${version}`,
		)
	}

	if (!(modules instanceof Uint8Array)) {
		throw new TypeError("qr.modules must be a Uint8Array")
	}
	if (modules.length !== size * size) {
		throw new RangeError(`qr.modules length must be ${size * size}`)
	}

	assertErrorCorrectionLevel("qr.errorCorrection", errorCorrection)
}

function normalizeLineBreaks(s: string): string {
	return s.replaceAll(/\r\n?/g, "\n")
}

function normalizeColorForComparison(color: string): string {
	const value = color.trim().toLowerCase()
	if (value === "transparent" || value === "none") {
		return "transparent"
	}
	if (value === "white") {
		return "#ffffff"
	}
	if (value === "black") {
		return "#000000"
	}

	const shortHex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{4})$/)
	if (shortHex) {
		const expandedParts = ["#"]
		for (const ch of shortHex[1]!) {
			expandedParts.push(ch, ch)
		}
		const expanded = expandedParts.join("")
		return expanded.endsWith("ff") && expanded.length === 9
			? expanded.slice(0, 7)
			: expanded
	}

	const opaqueHex = value.match(/^#([0-9a-f]{6})ff$/)
	if (opaqueHex) {
		return `#${opaqueHex[1]!}`
	}

	return value
}

function readModule(
	modules: Uint8Array,
	size: number,
	row: number,
	col: number,
): 0 | 1 {
	const value = modules[row * size + col]
	if (value !== 0 && value !== 1) {
		throw new RangeError("qr.modules must contain only 0 or 1 values")
	}
	return value
}

// ── Internal Constants ────────────────────────────────

const NUMERIC = 1
const ALPHANUMERIC = 2
const BYTE = 4

const EC_IDX: Record<ErrorCorrectionLevel, number> = {
	L: 0,
	M: 1,
	Q: 2,
	H: 3,
}

const EC_FMT: Record<ErrorCorrectionLevel, number> = {
	L: 1,
	M: 0,
	Q: 3,
	H: 2,
}

const ALPHANUM_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:"

// EC table: [ecPerBlock, g1Count, g1Data, g2Count]
// per (version, ecLevel). g2Data = g1Data + 1 when
// g2Count > 0. Indexed by ((v-1)*4 + ecIdx) * 4.
// prettier-ignore
const EC = [
	7,1,19,0, 10,1,16,0, 13,1,13,0, 17,1,9,0,
	10,1,34,0, 16,1,28,0, 22,1,22,0, 28,1,16,0,
	15,1,55,0, 26,1,44,0, 18,2,17,0, 22,2,13,0,
	20,1,80,0, 18,2,32,0, 26,2,24,0, 16,4,9,0,
	26,1,108,0, 24,2,43,0, 18,2,15,2, 22,2,11,2,
	18,2,68,0, 16,4,27,0, 24,4,19,0, 28,4,15,0,
	20,2,78,0, 18,4,31,0, 18,2,14,4, 26,4,13,1,
	24,2,97,0, 22,2,38,2, 22,4,18,2, 26,4,14,2,
	30,2,116,0, 22,3,36,2, 20,4,16,4, 24,4,12,4,
	18,2,68,2, 26,4,43,1, 24,6,19,2, 28,6,15,2,
	20,4,81,0, 30,1,50,4, 28,4,22,4, 24,3,12,8,
	24,2,92,2, 22,6,36,2, 26,4,20,6, 28,7,14,4,
	26,4,107,0, 22,8,37,1, 24,8,20,4, 22,12,11,4,
	30,3,115,1, 24,4,40,5, 20,11,16,5, 24,11,12,5,
	22,5,87,1, 24,5,41,5, 30,5,24,7, 24,11,12,7,
	24,5,98,1, 28,7,45,3, 24,15,19,2, 30,3,15,13,
	28,1,107,5, 28,10,46,1, 28,1,22,15, 28,2,14,17,
	30,5,120,1, 26,9,43,4, 28,17,22,1, 28,2,14,19,
	28,3,113,4, 26,3,44,11, 26,17,21,4, 26,9,13,16,
	28,3,107,5, 26,3,41,13, 30,15,24,5, 28,15,15,10,
	28,4,116,4, 26,17,42,0, 28,17,22,6, 30,19,16,6,
	28,2,111,7, 28,17,46,0, 30,7,24,16, 24,34,13,0,
	30,4,121,5, 28,4,47,14, 30,11,24,14, 30,16,15,14,
	30,6,117,4, 28,6,45,14, 30,11,24,16, 30,30,16,2,
	26,8,106,4, 28,8,47,13, 30,7,24,22, 30,22,15,13,
	28,10,114,2, 28,19,46,4, 28,28,22,6, 30,33,16,4,
	30,8,122,4, 28,22,45,3, 30,8,23,26, 30,12,15,28,
	30,3,117,10, 28,3,45,23, 30,4,24,31, 30,11,15,31,
	30,7,116,7, 28,21,45,7, 30,1,23,37, 30,19,15,26,
	30,5,115,10, 28,19,47,10, 30,15,24,25, 30,23,15,25,
	30,13,115,3, 28,2,46,29, 30,42,24,1, 30,23,15,28,
	30,17,115,0, 28,10,46,23, 30,10,24,35, 30,19,15,35,
	30,17,115,1, 28,14,46,21, 30,29,24,19, 30,11,15,46,
	30,13,115,6, 28,14,46,23, 30,44,24,7, 30,59,16,1,
	30,12,121,7, 28,12,47,26, 30,39,24,14, 30,22,15,41,
	30,6,121,14, 28,6,47,34, 30,46,24,10, 30,2,15,64,
	30,17,122,4, 28,29,46,14, 30,49,24,10, 30,24,15,46,
	30,4,122,18, 28,13,46,32, 30,48,24,14, 30,42,15,32,
	30,20,117,4, 28,40,47,7, 30,43,24,22, 30,10,15,67,
	30,19,118,6, 28,18,47,31, 30,34,24,34, 30,20,15,61,
]

// ── GF(256) Arithmetic ────────────────────────────────
// Primitive polynomial: x^8+x^4+x^3+x^2+1 (0x11D)

function initGf(): [Uint8Array, Uint8Array] {
	const exp = new Uint8Array(512)
	const log = new Uint8Array(256)
	let x = 1
	for (let i = 0; i < 255; i++) {
		exp[i] = x
		log[x] = i
		x <<= 1
		if (x >= 256) {
			x ^= 0x1_1d
		}
	}
	for (let i = 255; i < 512; i++) {
		exp[i] = exp[i - 255]!
	}
	return [exp, log]
}

const [GF_EXP, GF_LOG] = initGf()

function gfMul(a: number, b: number): number {
	if (a === 0 || b === 0) {
		return 0
	}
	return GF_EXP[GF_LOG[a]! + GF_LOG[b]!]!
}

// ── Reed-Solomon ──────────────────────────────────────

function rsGeneratorPoly(n: number): Uint8Array {
	const g = new Uint8Array(n + 1)
	g[0] = 1
	for (let i = 0; i < n; i++) {
		g[i + 1] = g[i]!
		for (let j = i; j >= 1; j--) {
			g[j] = g[j - 1]! ^ gfMul(g[j]!, GF_EXP[i]!)
		}
		g[0] = gfMul(g[0], GF_EXP[i]!)
	}
	g.reverse()
	return g
}

function rsEncode(data: Uint8Array, gen: Uint8Array): Uint8Array {
	const ecCount = gen.length - 1
	const msg = new Uint8Array(data.length + ecCount)
	msg.set(data)
	for (let i = 0; i < data.length; i++) {
		const coeff = msg[i]!
		if (coeff !== 0) {
			for (let j = 1; j <= ecCount; j++) {
				// oxlint-disable-next-line operator-assignment -- noUncheckedIndexedAccess
				msg[i + j] = msg[i + j]! ^ gfMul(coeff, gen[j]!)
			}
		}
	}
	return msg.slice(data.length)
}

// ── Bit Buffer ────────────────────────────────────────

function createBitBuffer() {
	const bits: number[] = []
	return {
		get length() {
			return bits.length
		},
		put(value: number, numBits: number) {
			for (let i = numBits - 1; i >= 0; i--) {
				bits.push((value >> i) & 1)
			}
		},
		toBytes(): Uint8Array {
			const bytes = new Uint8Array(Math.ceil(bits.length / 8))
			for (let i = 0; i < bits.length; i++) {
				if (bits[i] !== 0) {
					// oxlint-disable-next-line operator-assignment -- noUncheckedIndexedAccess
					bytes[i >> 3] = bytes[i >> 3]! | (1 << (7 - (i & 7)))
				}
			}
			return bytes
		},
	}
}

// ── QR Data Encoding ──────────────────────────────────

function selectMode(text: string): number {
	if (text.length > 0 && /^\d+$/.test(text)) {
		return NUMERIC
	}
	if (text.length > 0) {
		let allAlpha = true
		for (const ch of text) {
			if (!ALPHANUM_CHARS.includes(ch)) {
				allAlpha = false
				break
			}
		}
		if (allAlpha) {
			return ALPHANUMERIC
		}
	}
	return BYTE
}

function countBits(mode: number, version: number): number {
	if (version <= 9) {
		if (mode === NUMERIC) {
			return 10
		}
		if (mode === ALPHANUMERIC) {
			return 9
		}
		return 8
	}
	if (version <= 26) {
		if (mode === NUMERIC) {
			return 12
		}
		if (mode === ALPHANUMERIC) {
			return 11
		}
		return 16
	}
	if (mode === NUMERIC) {
		return 14
	}
	if (mode === ALPHANUMERIC) {
		return 13
	}
	return 16
}

function segmentBits(mode: number, count: number): number {
	if (mode === NUMERIC) {
		const full = Math.floor(count / 3) * 10
		const rem = count % 3
		if (rem === 2) {
			return full + 7
		}
		if (rem === 1) {
			return full + 4
		}
		return full
	}
	if (mode === ALPHANUMERIC) {
		return Math.floor(count / 2) * 11 + (count % 2) * 6
	}
	return count * 8
}

function dataCapacity(version: number, ecIdx: number): number {
	const i = ((version - 1) * 4 + ecIdx) * 4
	const g1Count = EC[i + 1]!
	const g1Data = EC[i + 2]!
	const g2Count = EC[i + 3]!
	return g1Count * g1Data + g2Count * (g1Data + 1)
}

function findVersion(mode: number, charCount: number, ecIdx: number): number {
	for (let v = 1; v <= 40; v++) {
		const bits = 4 + countBits(mode, v) + segmentBits(mode, charCount)
		if (bits <= dataCapacity(v, ecIdx) * 8) {
			return v
		}
	}
	throw new RangeError("Data too long for QR code")
}

function encodeSegment(
	buf: { put(value: number, bits: number): void },
	mode: number,
	text: string,
	bytes: Uint8Array,
): void {
	if (mode === NUMERIC) {
		for (let i = 0; i < text.length; i += 3) {
			const group = text.slice(i, i + 3)
			let bits = 4
			if (group.length === 3) {
				bits = 10
			} else if (group.length === 2) {
				bits = 7
			}
			buf.put(parseInt(group, 10), bits)
		}
	} else if (mode === ALPHANUMERIC) {
		for (let i = 0; i < text.length; i += 2) {
			const c1 = ALPHANUM_CHARS.indexOf(text[i]!)
			if (i + 1 < text.length) {
				const c2 = ALPHANUM_CHARS.indexOf(text[i + 1]!)
				buf.put(c1 * 45 + c2, 11)
			} else {
				buf.put(c1, 6)
			}
		}
	} else {
		for (const b of bytes) {
			buf.put(b, 8)
		}
	}
}

function getBlocks(
	version: number,
	ecIdx: number,
): { sizes: number[]; ecPerBlock: number } {
	const i = ((version - 1) * 4 + ecIdx) * 4
	const ecPerBlock = EC[i]!
	const g1Count = EC[i + 1]!
	const g1Data = EC[i + 2]!
	const g2Count = EC[i + 3]!
	const sizes: number[] = []
	for (let j = 0; j < g1Count; j++) {
		sizes.push(g1Data)
	}
	for (let j = 0; j < g2Count; j++) {
		sizes.push(g1Data + 1)
	}
	return { sizes, ecPerBlock }
}

function interleave(
	dataBlocks: Uint8Array[],
	ecBlocks: Uint8Array[],
): Uint8Array {
	let maxData = 0
	let totalLen = 0
	for (const b of dataBlocks) {
		if (b.length > maxData) {
			maxData = b.length
		}
		totalLen += b.length
	}
	const ecLen = ecBlocks[0]!.length
	totalLen += ecLen * ecBlocks.length
	const result = new Uint8Array(totalLen)
	let idx = 0
	for (let i = 0; i < maxData; i++) {
		for (const block of dataBlocks) {
			if (i < block.length) {
				result[idx++] = block[i]!
			}
		}
	}
	for (let i = 0; i < ecLen; i++) {
		for (const block of ecBlocks) {
			result[idx++] = block[i]!
		}
	}
	return result
}

// ── Matrix Construction ───────────────────────────────

function alignmentPositions(version: number): number[] {
	if (version === 1) {
		return []
	}
	const count = Math.floor(version / 7) + 2
	const last = version * 4 + 10
	if (count === 2) {
		return [6, last]
	}
	// ISO 18004 Table E.1: version 32 is a known anomaly where
	// the ceil formula produces the wrong step. All reference
	// implementations (ZXing, qrcode, Nayuki) special-case it.
	const step = version === 32 ? 26 : Math.ceil((last - 6) / (count - 1) / 2) * 2
	const pos = [6]
	for (let i = 1; i < count; i++) {
		pos.push(last - (count - 1 - i) * step)
	}
	return pos
}

function placeFinderPatterns(
	modules: Uint8Array,
	reserved: Uint8Array,
	size: number,
): void {
	// prettier-ignore
	const pattern = [
		1,1,1,1,1,1,1,
		1,0,0,0,0,0,1,
		1,0,1,1,1,0,1,
		1,0,1,1,1,0,1,
		1,0,1,1,1,0,1,
		1,0,0,0,0,0,1,
		1,1,1,1,1,1,1,
	]
	const origins: [number, number][] = [
		[0, 0],
		[0, size - 7],
		[size - 7, 0],
	]
	for (const [or, oc] of origins) {
		for (let r = -1; r <= 7; r++) {
			for (let c = -1; c <= 7; c++) {
				const row = or + r
				const col = oc + c
				if (row < 0 || row >= size || col < 0 || col >= size) {
					continue
				}
				const idx = row * size + col
				reserved[idx] = 1
				if (r >= 0 && r < 7 && c >= 0 && c < 7) {
					modules[idx] = pattern[r * 7 + c]!
				}
			}
		}
	}
}

function placeTimingPatterns(
	modules: Uint8Array,
	reserved: Uint8Array,
	size: number,
): void {
	for (let i = 8; i < size - 8; i++) {
		const val = i % 2 === 0 ? 1 : 0
		const hIdx = 6 * size + i
		if (reserved[hIdx] === 0) {
			modules[hIdx] = val
			reserved[hIdx] = 1
		}
		const vIdx = i * size + 6
		if (reserved[vIdx] === 0) {
			modules[vIdx] = val
			reserved[vIdx] = 1
		}
	}
}

function placeAlignmentPatterns(
	modules: Uint8Array,
	reserved: Uint8Array,
	size: number,
	version: number,
): void {
	const positions = alignmentPositions(version)
	for (const row of positions) {
		for (const col of positions) {
			if (row <= 8 && col <= 8) {
				continue
			}
			if (row <= 8 && col >= size - 8) {
				continue
			}
			if (row >= size - 8 && col <= 8) {
				continue
			}
			for (let dr = -2; dr <= 2; dr++) {
				for (let dc = -2; dc <= 2; dc++) {
					const idx = (row + dr) * size + (col + dc)
					reserved[idx] = 1
					modules[idx] =
						Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0)
							? 1
							: 0
				}
			}
		}
	}
}

function placeDarkModule(
	modules: Uint8Array,
	reserved: Uint8Array,
	size: number,
): void {
	const idx = (size - 8) * size + 8
	modules[idx] = 1
	reserved[idx] = 1
}

function reserveFormatInfo(reserved: Uint8Array, size: number): void {
	// prettier-ignore
	const rows1 = [8,8,8,8,8,8,8,8,7,5,4,3,2,1,0]
	// prettier-ignore
	const cols1 = [0,1,2,3,4,5,7,8,8,8,8,8,8,8,8]
	for (let i = 0; i < 15; i++) {
		reserved[rows1[i]! * size + cols1[i]!] = 1
	}
	for (let i = 0; i < 7; i++) {
		reserved[(size - 1 - i) * size + 8] = 1
	}
	for (let i = 0; i < 8; i++) {
		reserved[8 * size + (size - 8 + i)] = 1
	}
}

function reserveVersionInfo(reserved: Uint8Array, size: number): void {
	for (let i = 0; i < 18; i++) {
		const row = Math.floor(i / 3)
		const col = size - 11 + (i % 3)
		reserved[row * size + col] = 1
		reserved[col * size + row] = 1
	}
}

function placeData(
	modules: Uint8Array,
	reserved: Uint8Array,
	size: number,
	data: Uint8Array,
): void {
	let bitIdx = 0
	const totalBits = data.length * 8
	let upward = true
	for (let right = size - 1; right >= 1; right -= 2) {
		if (right === 6) {
			right = 5
		}
		for (let v = 0; v < size; v++) {
			const row: number = upward ? size - 1 - v : v
			for (let dx = 0; dx <= 1; dx++) {
				const col = right - dx
				const idx = row * size + col
				if (reserved[idx] !== 0) {
					continue
				}
				if (bitIdx < totalBits) {
					modules[idx] = (data[bitIdx >> 3]! >> (7 - (bitIdx & 7))) & 1
					bitIdx++
				}
			}
		}
		upward = !upward
	}
}

// ── Masking ───────────────────────────────────────────

function maskFn(mask: number, row: number, col: number): boolean {
	switch (mask) {
		case 0: {
			return (row + col) % 2 === 0
		}
		case 1: {
			return row % 2 === 0
		}
		case 2: {
			return col % 3 === 0
		}
		case 3: {
			return (row + col) % 3 === 0
		}
		case 4: {
			return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0
		}
		case 5: {
			return ((row * col) % 2) + ((row * col) % 3) === 0
		}
		case 6: {
			return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0
		}
		case 7: {
			return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0
		}
		default: {
			return false
		}
	}
}

// prettier-ignore
const FINDER_LIKE_A = [1,0,1,1,1,0,1,0,0,0,0]
// prettier-ignore
const FINDER_LIKE_B = [0,0,0,0,1,0,1,1,1,0,1]

function computePenalty(modules: Uint8Array, size: number): number {
	let penalty = 0

	// Rule 1: runs of 5+ same-color modules
	for (let row = 0; row < size; row++) {
		let count = 1
		for (let col = 1; col < size; col++) {
			if (modules[row * size + col] === modules[row * size + col - 1]) {
				count++
			} else {
				if (count >= 5) {
					penalty += count - 2
				}
				count = 1
			}
		}
		if (count >= 5) {
			penalty += count - 2
		}
	}
	for (let col = 0; col < size; col++) {
		let count = 1
		for (let row = 1; row < size; row++) {
			if (modules[row * size + col] === modules[(row - 1) * size + col]) {
				count++
			} else {
				if (count >= 5) {
					penalty += count - 2
				}
				count = 1
			}
		}
		if (count >= 5) {
			penalty += count - 2
		}
	}

	// Rule 2: 2x2 blocks of same color
	for (let row = 0; row < size - 1; row++) {
		for (let col = 0; col < size - 1; col++) {
			const v = modules[row * size + col]!
			if (
				v === modules[row * size + col + 1] &&
				v === modules[(row + 1) * size + col] &&
				v === modules[(row + 1) * size + col + 1]
			) {
				penalty += 3
			}
		}
	}

	// Rule 3: finder-like patterns
	for (let row = 0; row < size; row++) {
		for (let col = 0; col <= size - 11; col++) {
			let a = true
			let b = true
			for (let k = 0; k < 11; k++) {
				const v = modules[row * size + col + k]
				if (v !== FINDER_LIKE_A[k]) {
					a = false
				}
				if (v !== FINDER_LIKE_B[k]) {
					b = false
				}
			}
			if (a || b) {
				penalty += 40
			}
		}
	}
	for (let col = 0; col < size; col++) {
		for (let row = 0; row <= size - 11; row++) {
			let a = true
			let b = true
			for (let k = 0; k < 11; k++) {
				const v = modules[(row + k) * size + col]
				if (v !== FINDER_LIKE_A[k]) {
					a = false
				}
				if (v !== FINDER_LIKE_B[k]) {
					b = false
				}
			}
			if (a || b) {
				penalty += 40
			}
		}
	}

	// Rule 4: dark module proportion
	let dark = 0
	for (let i = 0; i < size * size; i++) {
		if (modules[i] !== 0) {
			dark++
		}
	}
	const pct = (dark * 100) / (size * size)
	const prev = Math.floor(pct / 5) * 5
	const next = prev + 5
	penalty += (Math.min(Math.abs(prev - 50), Math.abs(next - 50)) / 5) * 10

	return penalty
}

function selectBestMask(
	modules: Uint8Array,
	reserved: Uint8Array,
	size: number,
	version: number,
	ecLevel: ErrorCorrectionLevel,
): number {
	let bestMask = 0
	let bestPenalty = Infinity
	for (let mask = 0; mask < 8; mask++) {
		const copy = new Uint8Array(modules)
		for (let i = 0; i < size * size; i++) {
			if (reserved[i] === 0) {
				const r = Math.floor(i / size)
				const c = i % size
				if (maskFn(mask, r, c)) {
					// oxlint-disable-next-line operator-assignment -- noUncheckedIndexedAccess
					copy[i] = copy[i]! ^ 1
				}
			}
		}
		writeFormatInfo(copy, size, ecLevel, mask)
		if (version >= 7) {
			writeVersionInfo(copy, size, version)
		}
		const penalty = computePenalty(copy, size)
		if (penalty < bestPenalty) {
			bestPenalty = penalty
			bestMask = mask
		}
	}
	return bestMask
}

function applyMask(
	modules: Uint8Array,
	reserved: Uint8Array,
	size: number,
	mask: number,
): void {
	for (let i = 0; i < size * size; i++) {
		if (reserved[i] === 0) {
			const r = Math.floor(i / size)
			const c = i % size
			if (maskFn(mask, r, c)) {
				// oxlint-disable-next-line operator-assignment -- noUncheckedIndexedAccess
				modules[i] = modules[i]! ^ 1
			}
		}
	}
}

// ── BCH Encoding ──────────────────────────────────────

function formatInfoBits(ecLevel: ErrorCorrectionLevel, mask: number): number {
	const data = (EC_FMT[ecLevel] << 3) | mask
	let rem = data << 10
	for (let i = 4; i >= 0; i--) {
		if (rem & (1 << (i + 10))) {
			rem ^= 0x5_37 << i
		}
	}
	return ((data << 10) | rem) ^ 0x54_12
}

function versionInfoBits(version: number): number {
	let rem = version << 12
	for (let i = 5; i >= 0; i--) {
		if (rem & (1 << (i + 12))) {
			rem ^= 0x1f_25 << i
		}
	}
	return (version << 12) | rem
}

// prettier-ignore
const FMT_POS1_R = [8,8,8,8,8,8,8,8,7,5,4,3,2,1,0]
// prettier-ignore
const FMT_POS1_C = [0,1,2,3,4,5,7,8,8,8,8,8,8,8,8]

function writeFormatInfo(
	modules: Uint8Array,
	size: number,
	ecLevel: ErrorCorrectionLevel,
	mask: number,
): void {
	const bits = formatInfoBits(ecLevel, mask)
	for (let i = 0; i < 15; i++) {
		const bit = (bits >> (14 - i)) & 1
		modules[FMT_POS1_R[i]! * size + FMT_POS1_C[i]!] = bit
	}
	for (let i = 0; i < 7; i++) {
		modules[(size - 1 - i) * size + 8] = (bits >> (14 - i)) & 1
	}
	for (let i = 0; i < 8; i++) {
		modules[8 * size + (size - 8 + i)] = (bits >> (14 - i - 7)) & 1
	}
}

function writeVersionInfo(
	modules: Uint8Array,
	size: number,
	version: number,
): void {
	const bits = versionInfoBits(version)
	for (let i = 0; i < 18; i++) {
		const bit = (bits >> i) & 1
		const row = Math.floor(i / 3)
		const col = size - 11 + (i % 3)
		modules[row * size + col] = bit
		modules[col * size + row] = bit
	}
}

// ── Public API: createQrCode ──────────────────────────

const textEncoder = new TextEncoder()

/** Encode a string into a QR code matrix. */
export function createQrCode(text: string, options?: QrOptions): QrCode {
	assertString("text", text)

	const ecLevel = options?.errorCorrection ?? "M"
	assertErrorCorrectionLevel("errorCorrection", ecLevel)
	const ecIdx = EC_IDX[ecLevel]

	const bytes = textEncoder.encode(text)
	const mode = selectMode(text)
	const charCount = mode === BYTE ? bytes.length : text.length
	const version = findVersion(mode, charCount, ecIdx)
	const size = version * 4 + 17

	const buf = createBitBuffer()
	buf.put(mode, 4)
	buf.put(charCount, countBits(mode, version))
	encodeSegment(buf, mode, text, bytes)

	const cap = dataCapacity(version, ecIdx) * 8
	buf.put(0, Math.min(4, cap - buf.length))
	while (buf.length % 8 !== 0) {
		buf.put(0, 1)
	}
	let pad = 0xec
	while (buf.length < cap) {
		buf.put(pad, 8)
		pad = pad === 0xec ? 0x11 : 0xec
	}

	const dataBytes = buf.toBytes()
	const { sizes, ecPerBlock } = getBlocks(version, ecIdx)
	const gen = rsGeneratorPoly(ecPerBlock)
	const dataBlocks: Uint8Array[] = []
	const ecBlocks: Uint8Array[] = []
	let offset = 0
	for (const blockSize of sizes) {
		const block = dataBytes.slice(offset, offset + blockSize)
		dataBlocks.push(block)
		ecBlocks.push(rsEncode(block, gen))
		offset += blockSize
	}

	const interleaved = interleave(dataBlocks, ecBlocks)

	const modules = new Uint8Array(size * size)
	const reserved = new Uint8Array(size * size)

	placeFinderPatterns(modules, reserved, size)
	placeTimingPatterns(modules, reserved, size)
	placeAlignmentPatterns(modules, reserved, size, version)
	placeDarkModule(modules, reserved, size)
	reserveFormatInfo(reserved, size)
	if (version >= 7) {
		reserveVersionInfo(reserved, size)
	}
	placeData(modules, reserved, size, interleaved)

	const mask = selectBestMask(modules, reserved, size, version, ecLevel)
	applyMask(modules, reserved, size, mask)
	writeFormatInfo(modules, size, ecLevel, mask)
	if (version >= 7) {
		writeVersionInfo(modules, size, version)
	}

	return { version, size, modules, errorCorrection: ecLevel }
}

// ── Public API: encodeData ────────────────────────────

function escapeWifi(s: string): string {
	return s.replaceAll(/[\\;,":]/g, (c) => `\\${c}`)
}

function escapeVcard(s: string): string {
	return normalizeLineBreaks(s)
		.replaceAll("\\", String.raw`\\`)
		.replaceAll(";", String.raw`\;`)
		.replaceAll(",", String.raw`\,`)
		.replaceAll("\n", String.raw`\n`)
}

/** Encode structured data into a QR-compatible string. */
export function encodeData(data: QrData): string {
	if (!isObjectRecord(data)) {
		throw new TypeError("data must be an object")
	}

	switch (data.type) {
		case "url": {
			assertString("data.value", data.value)
			return data.value
		}
		case "wifi": {
			assertString("data.ssid", data.ssid)
			assertWifiEncryption("data.encryption", data.encryption)
			assertOptionalString("data.password", data.password)
			assertOptionalBoolean("data.hidden", data.hidden)

			let s = "WIFI:"
			s += `T:${data.encryption};`
			s += `S:${escapeWifi(data.ssid)};`
			if (data.encryption !== "nopass" && data.password !== undefined) {
				s += `P:${escapeWifi(data.password)};`
			}
			if (data.hidden === true) {
				s += "H:true;"
			}
			return `${s};`
		}
		case "contact": {
			assertOptionalString("data.firstName", data.firstName)
			assertOptionalString("data.lastName", data.lastName)
			assertOptionalString("data.organization", data.organization)
			assertOptionalString("data.phone", data.phone)
			assertOptionalString("data.email", data.email)
			assertOptionalString("data.url", data.url)
			assertOptionalString("data.address", data.address)

			const lines = ["BEGIN:VCARD", "VERSION:3.0"]
			const fn = [data.firstName, data.lastName].filter(Boolean).join(" ")
			if (fn !== "") {
				lines.push(`FN:${escapeVcard(fn)}`)
			}
			const last = escapeVcard(data.lastName ?? "")
			const first = escapeVcard(data.firstName ?? "")
			lines.push(`N:${last};${first};;;`)
			if (data.organization !== undefined) {
				lines.push(`ORG:${escapeVcard(data.organization)}`)
			}
			if (data.phone !== undefined) {
				lines.push(`TEL:${data.phone}`)
			}
			if (data.email !== undefined) {
				lines.push(`EMAIL:${data.email}`)
			}
			if (data.url !== undefined) {
				lines.push(`URL:${data.url}`)
			}
			if (data.address !== undefined) {
				lines.push(`ADR:${escapeVcard(data.address)}`)
			}
			lines.push("END:VCARD")
			return lines.join("\r\n")
		}
		default: {
			throw new TypeError(
				`Unsupported data.type: ${String((data as { type?: unknown }).type)}`,
			)
		}
	}
}

// ── Public API: renderSvg ─────────────────────────────

function fmt(v: number): string {
	return Number(v.toFixed(3)).toString()
}

function escapeAttr(s: string): string {
	return s
		.replaceAll("&", "&amp;")
		.replaceAll('"', "&quot;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
}

function isFinderRegion(x: number, y: number, size: number): boolean {
	if (x < 7 && y < 7) {
		return true
	}
	if (x >= size - 7 && y < 7) {
		return true
	}
	if (x < 7 && y >= size - 7) {
		return true
	}
	return false
}

function renderDot(
	style: DotStyle,
	x: number,
	y: number,
	cs: number,
	fg: string,
): string {
	const eFg = escapeAttr(fg)
	switch (style) {
		case "square": {
			return (
				`<rect x="${fmt(x)}" y="${fmt(y)}"` +
				` width="${fmt(cs)}"` +
				` height="${fmt(cs)}"` +
				` fill="${eFg}"/>`
			)
		}
		case "rounded": {
			const r = fmt(cs * 0.3)
			return (
				`<rect x="${fmt(x)}" y="${fmt(y)}"` +
				` width="${fmt(cs)}"` +
				` height="${fmt(cs)}"` +
				` rx="${r}" ry="${r}"` +
				` fill="${eFg}"/>`
			)
		}
		case "dots": {
			const half = cs / 2
			return (
				`<circle cx="${fmt(x + half)}"` +
				` cy="${fmt(y + half)}"` +
				` r="${fmt(cs * 0.45)}"` +
				` fill="${eFg}"/>`
			)
		}
	}
}

function renderCornerSquare(
	style: CornerSquareStyle,
	x: number,
	y: number,
	cs: number,
	fg: string,
): string {
	const eFg = escapeAttr(fg)
	const half = cs / 2
	switch (style) {
		case "square": {
			return (
				`<rect x="${fmt(x + half)}"` +
				` y="${fmt(y + half)}"` +
				` width="${fmt(6 * cs)}"` +
				` height="${fmt(6 * cs)}"` +
				` fill="none" stroke="${eFg}"` +
				` stroke-width="${fmt(cs)}"/>`
			)
		}
		case "rounded": {
			const r = fmt(cs * 1.5)
			return (
				`<rect x="${fmt(x + half)}"` +
				` y="${fmt(y + half)}"` +
				` width="${fmt(6 * cs)}"` +
				` height="${fmt(6 * cs)}"` +
				` rx="${r}" ry="${r}"` +
				` fill="none" stroke="${eFg}"` +
				` stroke-width="${fmt(cs)}"/>`
			)
		}
		case "dot": {
			const cx = fmt(x + 3.5 * cs)
			const cy = fmt(y + 3.5 * cs)
			return (
				`<circle cx="${cx}" cy="${cy}"` +
				` r="${fmt(3 * cs)}"` +
				` fill="none" stroke="${eFg}"` +
				` stroke-width="${fmt(cs)}"/>`
			)
		}
	}
}

function renderCornerDot(
	style: CornerDotStyle,
	x: number,
	y: number,
	cs: number,
	fg: string,
): string {
	const eFg = escapeAttr(fg)
	switch (style) {
		case "square": {
			return (
				`<rect x="${fmt(x + 2 * cs)}"` +
				` y="${fmt(y + 2 * cs)}"` +
				` width="${fmt(3 * cs)}"` +
				` height="${fmt(3 * cs)}"` +
				` fill="${eFg}"/>`
			)
		}
		case "dot": {
			const cx = fmt(x + 3.5 * cs)
			const cy = fmt(y + 3.5 * cs)
			return (
				`<circle cx="${cx}" cy="${cy}"` +
				` r="${fmt(1.5 * cs)}"` +
				` fill="${eFg}"/>`
			)
		}
	}
}

/**
 * Conservative limit on how many corrupted modules the QR code can
 * tolerate before becoming unscannable.
 *
 * Each corrupted module affects at most one RS codeword. Standard
 * RS error correction needs 2 EC codewords per error, giving a
 * capacity of ecPerBlock/2 errors per block. Some scanners can
 * detect logo regions as erasures (1 EC codeword each), raising
 * capacity to ecPerBlock per block. We use 75% of the total EC
 * codewords as a practical threshold: more conservative than
 * assuming full erasure decoding, but not so strict that typical
 * logos are rejected.
 */
function ecModuleLimit(version: number, ecLevel: ErrorCorrectionLevel): number {
	const ecIdx = EC_IDX[ecLevel]
	const i = ((version - 1) * 4 + ecIdx) * 4
	const ecPerBlock = EC[i]!
	const g1Count = EC[i + 1]!
	const g2Count = EC[i + 3]!
	return Math.floor((g1Count + g2Count) * ecPerBlock * 0.75)
}

function renderLogo(opts: LogoOptions, qrSize: number): string {
	const ratio = opts.sizeRatio ?? DEFAULT_LOGO_SIZE_RATIO
	const padding = opts.padding ?? DEFAULT_LOGO_PADDING
	const borderRadius = opts.borderRadius ?? DEFAULT_LOGO_BORDER_RADIUS
	const bgColor = opts.backgroundColor ?? "#ffffff"
	const logoSize = qrSize * ratio
	const totalSize = logoSize + padding * 2
	const x = (qrSize - totalSize) / 2
	const y = (qrSize - totalSize) / 2
	return (
		`<rect x="${fmt(x)}" y="${fmt(y)}"` +
		` width="${fmt(totalSize)}"` +
		` height="${fmt(totalSize)}"` +
		` rx="${fmt(borderRadius)}"` +
		` ry="${fmt(borderRadius)}"` +
		` fill="${escapeAttr(bgColor)}"/>` +
		`<image x="${fmt(x + padding)}"` +
		` y="${fmt(y + padding)}"` +
		` width="${fmt(logoSize)}"` +
		` height="${fmt(logoSize)}"` +
		` href="${escapeAttr(opts.src)}"` +
		` preserveAspectRatio="xMidYMid meet"/>`
	)
}

function assertPositive(name: string, value: number): void {
	if (!Number.isFinite(value) || value <= 0) {
		throw new RangeError(`${name} must be a positive finite number`)
	}
}

function assertNonNegative(name: string, value: number): void {
	if (!Number.isFinite(value) || value < 0) {
		throw new RangeError(`${name} must be a non-negative finite number`)
	}
}

/** Render a QR code matrix as an SVG string. */
export function renderSvg(qr: QrCode, options?: SvgOptions): string {
	assertQrCode(qr)

	const size = options?.size ?? 400
	const margin = options?.margin ?? 4
	assertPositive("size", size)
	assertNonNegative("margin", margin)
	const fg = options?.foreground ?? "#000000"
	const bg = options?.background ?? "#ffffff"
	const ds = options?.dotStyle ?? "square"
	const css = options?.cornerSquareStyle ?? "square"
	const cds = options?.cornerDotStyle ?? "square"
	assertString("foreground", fg)
	assertString("background", bg)
	assertDotStyle("dotStyle", ds)
	assertCornerSquareStyle("cornerSquareStyle", css)
	assertCornerDotStyle("cornerDotStyle", cds)

	const total = qr.size + margin * 2
	const cell = size / total
	const off = margin * cell

	// Compute logo exclusion zone in module coordinates
	const logo = options?.logo
	let exclX1 = 0
	let exclY1 = 0
	let exclX2 = -1
	let exclY2 = -1
	if (logo) {
		assertNonEmptyString("logo.src", logo.src)
		assertOptionalString("logo.backgroundColor", logo.backgroundColor)

		const ratio = logo.sizeRatio ?? DEFAULT_LOGO_SIZE_RATIO
		const logoPadding = logo.padding ?? DEFAULT_LOGO_PADDING
		const borderRadius = logo.borderRadius ?? DEFAULT_LOGO_BORDER_RADIUS
		assertPositive("logo.sizeRatio", ratio)
		assertNonNegative("logo.padding", logoPadding)
		assertNonNegative("logo.borderRadius", borderRadius)

		const logoSize = size * ratio
		const totalLogoSize = logoSize + logoPadding * 2
		const logoPixelX1 = (size - totalLogoSize) / 2
		const logoPixelY1 = (size - totalLogoSize) / 2
		const logoPixelX2 = logoPixelX1 + totalLogoSize
		const logoPixelY2 = logoPixelY1 + totalLogoSize

		// Module is excluded when its center falls inside the logo rect.
		// Center of module (x, y) = off + (x + 0.5) * cell.
		// Solving for x: x >= ceil((px1 - off) / cell - 0.5)
		exclX1 = Math.max(0, Math.ceil((logoPixelX1 - off) / cell - 0.5))
		exclY1 = Math.max(0, Math.ceil((logoPixelY1 - off) / cell - 0.5))
		exclX2 = Math.min(qr.size - 1, Math.floor((logoPixelX2 - off) / cell - 0.5))
		exclY2 = Math.min(qr.size - 1, Math.floor((logoPixelY2 - off) / cell - 0.5))

		// Count modules that will be corrupted by the logo.
		// When the logo background matches the QR background, only
		// dark modules are corrupted (light modules remain correct).
		// When they differ, ALL modules in the zone are corrupted.
		const logoBg = normalizeColorForComparison(
			logo.backgroundColor ?? "#ffffff",
		)
		const qrBg = normalizeColorForComparison(bg)
		const bgMatch = logoBg === qrBg
		let corrupted = 0
		for (let y = exclY1; y <= exclY2; y++) {
			for (let x = exclX1; x <= exclX2; x++) {
				if (bgMatch) {
					if (readModule(qr.modules, qr.size, y, x) !== 0) {
						corrupted++
					}
				} else {
					corrupted++
				}
			}
		}

		const capacity = ecModuleLimit(qr.version, qr.errorCorrection)
		if (corrupted > capacity) {
			throw new RangeError(
				`Logo obscures ${corrupted} modules but error correction ` +
					`level ${qr.errorCorrection} can recover at most ` +
					`${capacity}. Use a higher error correction level ` +
					`or reduce the logo size.`,
			)
		}
	}

	let svg =
		`<svg xmlns="http://www.w3.org/2000/svg"` +
		` viewBox="0 0 ${size} ${size}"` +
		` width="${size}" height="${size}"` +
		` role="img">`

	if (bg !== "transparent") {
		svg += `<rect width="${size}" height="${size}" fill="${escapeAttr(bg)}"/>`
	}

	const styledCorners = css !== "square" || cds !== "square"

	for (let y = 0; y < qr.size; y++) {
		for (let x = 0; x < qr.size; x++) {
			if (readModule(qr.modules, qr.size, y, x) === 0) {
				continue
			}
			if (styledCorners && isFinderRegion(x, y, qr.size)) {
				continue
			}
			if (logo && x >= exclX1 && x <= exclX2 && y >= exclY1 && y <= exclY2) {
				continue
			}
			svg += renderDot(ds, off + x * cell, off + y * cell, cell, fg)
		}
	}

	if (styledCorners) {
		const origins: [number, number][] = [
			[0, 0],
			[qr.size - 7, 0],
			[0, qr.size - 7],
		]
		const eBg = escapeAttr(bg === "transparent" ? "#ffffff" : bg)
		for (const [fx, fy] of origins) {
			const cx = off + fx * cell
			const cy = off + fy * cell
			if (bg !== "transparent") {
				svg +=
					`<rect x="${fmt(cx)}" y="${fmt(cy)}"` +
					` width="${fmt(7 * cell)}"` +
					` height="${fmt(7 * cell)}"` +
					` fill="${eBg}"/>`
			}
			svg += renderCornerSquare(css, cx, cy, cell, fg)
			svg += renderCornerDot(cds, cx, cy, cell, fg)
		}
	}

	if (logo) {
		svg += renderLogo(logo, size)
	}

	svg += "</svg>"
	return svg
}

// ── Public API: renderText ────────────────────────────

/**
 * Render a QR code as a compact Unicode string using half-block
 * characters (▀ ▄ █). Each text line encodes two module rows.
 *
 * Set `invert: true` for dark-background terminals so that
 * light modules render as filled blocks (foreground color) and
 * dark modules render as spaces (background color).
 */
export function renderText(qr: QrCode, options?: TextOptions): string {
	assertQrCode(qr)

	const margin = options?.margin ?? 4
	const invert = options?.invert ?? false
	assertNonNegative("margin", margin)
	assertInteger("margin", margin)
	if (typeof invert !== "boolean") {
		throw new TypeError("invert must be a boolean")
	}

	const total = qr.size + margin * 2
	const lines: string[] = []

	for (let row = 0; row < total; row += 2) {
		let line = ""
		for (let col = 0; col < total; col++) {
			const mr = row - margin
			const mc = col - margin
			const top =
				mr >= 0 &&
				mr < qr.size &&
				mc >= 0 &&
				mc < qr.size &&
				readModule(qr.modules, qr.size, mr, mc) === 1
			const br = mr + 1
			const bottom =
				row + 1 < total &&
				br >= 0 &&
				br < qr.size &&
				mc >= 0 &&
				mc < qr.size &&
				readModule(qr.modules, qr.size, br, mc) === 1
			const t = invert ? !top : top
			const b = invert ? !bottom : bottom
			if (t && b) {
				line += "█"
			} else if (t) {
				line += "▀"
			} else if (b) {
				line += "▄"
			} else {
				line += " "
			}
		}
		lines.push(line)
	}

	return lines.join("\n")
}
