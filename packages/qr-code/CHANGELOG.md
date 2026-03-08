# @suckless/qr-code

## 0.5.1

### Patch Changes

- 192f976: Fix WiFi escaping, harden logo safety checks, and add tests

  - Escape `:` in WiFi SSID/password fields to prevent ambiguous QR payloads
  - Apply 0.75 safety factor to logo EC capacity check (was using optimistic erasure assumption)
  - Count all modules when logo background differs from QR background
  - Use `fmt()` for logo borderRadius SVG attribute
