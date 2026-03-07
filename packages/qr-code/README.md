# @suckless/qr-code

Minimal, zero-dependency QR code generator with SVG and terminal rendering. Implements QR encoding from scratch (ISO 18004).

## Install

```sh
npm install @suckless/qr-code
```

## Usage

```ts
import { createQrCode, encodeData, renderSvg } from "@suckless/qr-code"

// Encode structured data into a QR-compatible string
const text = encodeData({
	type: "url",
	value: "https://example.com",
})

// Generate the QR code matrix
const qr = createQrCode(text, { errorCorrection: "M" })

// Render as SVG
const svg = renderSvg(qr, {
	size: 400,
	dotStyle: "rounded",
	foreground: "#000000",
	background: "#ffffff",
})
```

Each layer is independent. If you only need the matrix (e.g. for a canvas renderer), skip `renderSvg`:

```ts
const qr = createQrCode("hello")
// qr.version, qr.size, qr.modules (Uint8Array)
```

## Data types

`encodeData` supports structured data:

```ts
// WiFi
encodeData({
	type: "wifi",
	ssid: "MyNetwork",
	password: "secret",
	encryption: "WPA",
})

// Contact (vCard)
encodeData({
	type: "contact",
	firstName: "John",
	lastName: "Doe",
	phone: "+1234567890",
	email: "john@example.com",
})
```

## API

### `encodeData(data: QrData): string`

Converts structured data into a QR-compatible string. Handles WiFi encoding, vCard formatting, and special character escaping.

### `createQrCode(text: string, options?: QrOptions): QrCode`

Generates a QR code from a string. Automatically selects the optimal encoding mode (numeric, alphanumeric, or byte), version (1–40), and mask pattern.

Options:

- `errorCorrection` — `"L"` | `"M"` (default) | `"Q"` | `"H"`

Returns:

- `version` — QR version (1–40)
- `size` — Module count per side (`version * 4 + 17`)
- `modules` — `Uint8Array` of `0` (light) and `1` (dark) values, row-major

Throws `RangeError` if the data exceeds the capacity of version 40.

### `renderSvg(qr: QrCode, options?: SvgOptions): string`

Renders a QR code as an SVG string.

Options:

- `size` — SVG dimensions in pixels (default `400`)
- `foreground` — Module color (default `"#000000"`)
- `background` — Background color or `"transparent"` (default `"#ffffff"`)
- `dotStyle` — `"square"` (default) | `"rounded"` | `"dots"`
- `cornerSquareStyle` — `"square"` (default) | `"rounded"` | `"dot"`
- `cornerDotStyle` — `"square"` (default) | `"dot"`
- `logo` — `{ src: string; sizeRatio?: number }` to embed an image in the center

### `renderText(qr: QrCode, options?: TextOptions): string`

Renders a QR code as a compact Unicode string using half-block characters (`▀ ▄ █`). Each text line encodes two module rows.

```ts
import { createQrCode, renderText } from "@suckless/qr-code"

console.log(renderText(createQrCode("hello"), { invert: true }))
```

Options:

- `margin` — Quiet zone in modules (default `4`)
- `invert` — Swap filled/empty for dark-background terminals (default `false`)

## Input sanitization

`encodeData` escapes characters required by each format spec (WiFi: `\ ; , "`
and vCard: `\ ; ,` plus newlines), but it does **not** strip control
characters (tabs, carriage returns, etc.) from input strings.

For WiFi payloads built from untrusted user input, sanitize control characters
before calling `encodeData`:

```ts
const sanitize = (s: string) => s.replaceAll(/[\x00-\x1f\x7f]/g, "")

encodeData({
	type: "wifi",
	ssid: sanitize(userInput),
	password: sanitize(userPassword),
	encryption: "WPA",
})
```

For vCard payloads, avoid blanket control-character stripping if you need
intentional formatting (for example, user-entered line breaks in addresses).

## License

MIT
