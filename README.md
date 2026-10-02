# Markdown Sync Hub V7

V7 adds mandatory web username/password plus RFC 6238 TOTP, recovery codes, HttpOnly sessions, protected vault web APIs, `/health`, and an Activity/Devices view. Obsidian synchronization remains on the independent Bearer-token API and retains V6 baseline reconciliation, client deletion detection, server trash/tombstones, and conflict-copy behavior. HTTPS is intentionally omitted because nginx is expected to terminate TLS.

## Server
```bash
go mod tidy
go run .
```
The first run prints both a sync token and a one-time web setup code. Open the web UI, enter the setup code and a password of at least 10 characters, add the supplied `otpauth://` URI to Google Authenticator/Microsoft Authenticator/Bitwarden, and confirm the 6-digit code. Save the recovery codes offline.

Sessions are 12 hours. The session cookie becomes Secure when nginx sends `X-Forwarded-Proto: https`. Configure nginx to pass that header.

## Plugin
```bash
cd obsidian-plugin
npm install
npm run build
```
Copy main.js, manifest.json, styles.css to `.obsidian/plugins/markdown-sync-hub/`. Web TOTP does not affect Obsidian automatic sync.

## Migration
Back up your existing vault and `sync-data` first. For the cleanest V7 authentication test, use a new V7 sync-data directory initially.
