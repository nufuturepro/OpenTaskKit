<h1 align="center">OpenTaskKit</h1>

<p align="center"><strong>A self-hosted, local-first task manager.</strong><br>
Plan your day, keep projects in order, set reminders and share lists with your family or your team. Works on your phone and your computer, even offline. No monthly plan per person, and your tasks stay with you.</p>

<p align="center">
  <a href="LICENSE"><img alt="License: AGPL-3.0" src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg"></a>
  <a href="https://github.com/nufuturepro/OpenTaskKit/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/nufuturepro/OpenTaskKit/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://github.com/nufuturepro/OpenTaskKit/releases"><img alt="Latest release" src="https://img.shields.io/github/v/release/nufuturepro/OpenTaskKit?include_prereleases&sort=semver"></a>
  <a href="https://github.com/nufuturepro/OpenTaskKit/pkgs/container/opentaskkit"><img alt="Container image" src="https://img.shields.io/badge/ghcr.io-nufuturepro%2Fopentaskkit-2496ED?logo=docker&logoColor=white"></a>
  <img alt="Docker image size" src="https://img.shields.io/badge/image-%3C%2025%20MB-success">
</p>

---

## What this is

OpenTaskKit is a **distribution of [OpenTodo](https://github.com/pixari/opentodo)**, in the relationship Debian has with Ubuntu:

- **Upstream:** all features and bug fixes come from [pixari/OpenTodo](https://github.com/pixari/opentodo), a great task manager built in the open with specs. Use its [demo](https://demo.open-todo.app), its [documentation](https://open-todo.app/docs/) and its [issue tracker](https://github.com/pixari/opentodo/issues) — that is where the project lives, and general bug fixes belong there.
- **This repository** carries the OpenTaskKit branding and will carry this distribution's own defaults and features. It merges upstream releases regularly (see [FORKING.md](FORKING.md) for the exact workflow, branch scheme and the list of files the brand touches).
- Generic bug fixes found here are sent upstream first, so everyone benefits and the two stay close.

OpenTaskKit is licensed **AGPL-3.0**, exactly like upstream. It is not affiliated with or endorsed by the upstream author; if OpenTaskKit saves you a subscription, consider [supporting upstream](https://buymeacoffee.com/pixari) and starring [pixari/OpenTodo](https://github.com/pixari/opentodo).

## Quick start

On your machine or server (no configuration needed):

```bash
docker run -d -p 8080:8080 -v opentodo-data:/data ghcr.io/nufuturepro/opentaskkit:stable
```

Open <http://localhost:8080>; the first visit creates your account. The data volume keeps the upstream name (`opentodo-data`) and the archive format, so data moves freely between OpenTaskKit and OpenTodo.

Or with Docker Compose:

```bash
git clone https://github.com/nufuturepro/OpenTaskKit.git && cd OpenTaskKit
docker compose up -d
```

Behind a reverse proxy, set `OPENTODO_BASE_URL=https://todo.example.com` (needed for secure cookies, passkeys and web push). All environment variables keep their upstream `OPENTODO_` names.

## Try it in 30 seconds

No install: open the [upstream demo](https://demo.open-todo.app) and press **Try the demo**. You get a private copy with sample data, deleted after a few hours. The demo runs upstream OpenTodo; OpenTaskKit behaves the same apart from the name.

## Why it is good

- **No subscription, no lock-in.** Free software under the AGPL. Nobody can paywall your task list or shut it down with the company.
- **Works offline, on every device.** Each phone and computer keeps a full copy of your data (local-first), so the app works with no connection at all. The server syncs, backs up and shares; it is never in the way of an edit.
- **Your data, one folder.** Everything lives in one `/data` volume around a single SQLite file. Export to JSON at any time, import it (or a CSV, or another app's export) on any instance, and schedule encrypted backups to disk, S3 or WebDAV.
- **Tiny footprint.** One container, one static binary of about 23 MB with the web app inside, around 20 MB of memory when idle. Runs on a Raspberry Pi or the cheapest VPS.
- **Private by design.** No telemetry, no analytics, no phone-home, no third-party scripts or fonts.
- **Keyboard-first, spec-driven, AI-optional.** Vim keybindings, quick add in plain language in six languages, time blocking, shared projects, CalDAV, a REST API and CLI, passkeys, two-factor, single sign-on, optional end-to-end encryption, and bring-your-own-AI that is off by default.

The full feature list, guides and the reference live in the [upstream documentation](https://open-todo.app/docs/) and inside the app under **Help** (`g` then `?`); they describe OpenTaskKit accurately apart from the name on a few pages.

## Configuration

Every setting is an optional environment variable with a safe default; an invalid value stops startup with a message naming the variable. The container image sets `OPENTODO_ADDR=:8080` and `OPENTODO_DATA_DIR=/data`. See [`.env.example`](.env.example) for a commented template.

| Variable | Default | Purpose |
| --- | --- | --- |
| `OPENTODO_ADDR` | `:8080` | Listen address |
| `OPENTODO_DATA_DIR` | `./data` (binary), `/data` (image) | Directory for the SQLite database, secrets, the VAPID key and local backups |
| `OPENTODO_BASE_URL` | — | Public address of this server (sets Secure cookies, the origin check, passkeys and web push) |
| `OPENTODO_TRUSTED_PROXIES` | — | CIDRs whose `X-Forwarded-For` header is trusted (see [SECURITY.md](SECURITY.md)) |

Environment variables keep their upstream `OPENTODO_` names so every guide, template and deployment written for OpenTodo works unchanged. The full list is in the [upstream configuration reference](https://open-todo.app/docs/self-hosting/configuration/) and in [`.env.example`](.env.example).

## Adding people

Closed sign-up by default: the owner invites people with a single-use invitation link, transfers ownership, deactivates accounts and can require two-factor for everyone. Shared projects have viewer, editor and admin roles. The guides are upstream's: [Adding people](https://open-todo.app/docs/self-hosting/adding-people/) and [Sharing](https://open-todo.app/docs/sharing/).

## Development

Requirements: Go (see `go.mod` for the exact toolchain), Node 22+, GNU make.

```bash
make dev    # API on :8080 (go run) + Vite on :5173 with proxy and hot reload
make check  # vet, staticcheck, typecheck, lint, Go and web tests, i18n, docs, OpenSpec
make build  # production binary in bin/opentodo with the web app embedded
```

Contributing to OpenTaskKit: generic bug fixes should go upstream to [pixari/OpenTodo](https://github.com/pixari/opentodo) first (see its [CONTRIBUTING.md](https://github.com/pixari/opentodo/blob/main/CONTRIBUTING.md); bug fixes need no spec); they flow back here with the next sync. Distribution-specific work (branding, defaults, own features) belongs in this repository. The mechanics — remotes, sync script, brand overlay, versioning — are in [FORKING.md](FORKING.md).

## Privacy

The web app makes no network requests except to your own server: no analytics, crash reporters, update pings or third-party fonts. The server makes outbound requests only for features you configure: web push, webhook URLs you add, backup destinations (S3 or WebDAV), the single sign-on issuer, the IMAP mailbox for email to task, the SMTP server for outgoing email, the GitHub or GitLab host for issue import, calendar addresses people subscribe, and the model provider you enable for the in-app assistant (off by default). The CalDAV and MCP endpoints only answer requests; they never call out. The audit log records security events, never task content. See [SECURITY.md](SECURITY.md#what-is-logged) and the [upstream privacy page](https://open-todo.app/docs/privacy/).

## License

[AGPL-3.0](LICENSE). OpenTaskKit is a modified distribution of [OpenTodo](https://github.com/pixari/opentodo) by Raffaele Pizzari, used under the AGPL-3.0. Modifications are published in this repository.
