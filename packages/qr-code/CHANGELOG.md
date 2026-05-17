# @suckless/qr-code

## 0.7.0

## 0.6.0

### Minor Changes

- 958f87c: Add @suckless/sse package and harden @suckless/qr-code runtime validation
  - New package: `@suckless/sse` — Server-Sent Events channel with keepalive heartbeats, replay buffer, and backpressure handling
  - `@suckless/qr-code`: add runtime validation for JS consumers, fix WiFi nopass encoding, normalize vCard line endings, fix transparent corner styling, reject blank logo src and fractional text margins

## 0.5.1

### Patch Changes

- 192f976: Fix WiFi escaping, harden logo safety checks, and add tests
  - Escape `:` in WiFi SSID/password fields to prevent ambiguous QR payloads
  - Apply 0.75 safety factor to logo EC capacity check (was using optimistic erasure assumption)
  - Count all modules when logo background differs from QR background
  - Use `fmt()` for logo borderRadius SVG attribute
