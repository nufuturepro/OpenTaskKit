# Forking playbook — OpenTaskKit

OpenTaskKit is a **distribution of [OpenTodo](https://github.com/pixari/opentodo)**, in the
relationship Debian has with Ubuntu: upstream is where features and general bug fixes are built;
this repository is its own product, carrying the OpenTaskKit identity and (eventually) its own
defaults and features, while staying close enough to merge upstream releases routinely.

## The three repositories

| Repository | Role |
| --- | --- |
| [pixari/OpenTodo](https://github.com/pixari/OpenTodo) | **Upstream.** The product this distribution is built from. |
| [nufuturepro/OpenTodo](https://github.com/nufuturepro/OpenTodo) | **Thin fork.** Kept identical to upstream; exists only so bugfix branches can be proposed as PRs to upstream. Never add distribution work here. |
| [nufuturepro/OpenTaskKit](https://github.com/nufuturepro/OpenTaskKit) | **This repository.** The product. Carries the brand, merges upstream releases, publishes `ghcr.io/nufuturepro/opentaskkit`. |

Local remotes in a clone of this repository:

```
origin   → nufuturepro/OpenTaskKit   (the product)
upstream → pixari/OpenTodo           (the source of releases)
fork     → nufuturepro/OpenTodo      (the staging area for upstream PRs)
```

## Branches, tags and versions

- `main` is the product. Upstream releases are merged into it with a
  `Merge upstream vX.Y.Z` commit; distribution changes land on top.
- Every synced upstream release is marked with a local tag **`upstream-vX.Y.Z`**
  (same commit as upstream's `vX.Y.Z`). `git log upstream-vX.Y.Z..HEAD --oneline`
  is this distribution's exact delta on top of that release.
- Distribution releases are tagged **`opentaskkit-X.Y.Z-otk.N`** and published by CI
  (container image, binaries, GitHub release). The in-app version string comes from
  `git describe`, so a build from `main` reads like the nearest tag plus commits.
- Feature work happens on branches off `main`; merge back with a PR.

## The brand overlay (what a sync usually conflicts on)

The brand is the **capitalised word**: `OpenTodo` → `OpenTaskKit`. Lowercase
`opentodo` is an identifier — the Go module path, binaries, `OPENTODO_*` variables,
the `opentodo-*.tar.gz` archive format, `urn:opentodo:*` tokens — and **stays
upstream everywhere**, so data, archives and deployments remain compatible.

Files that carry the brand (the conflict hotspots; resolve by keeping our side):

| Area | Files |
| --- | --- |
| App strings | `web/src/**` — every `t('…OpenTaskKit…')` key, all six `web/src/locales/*.json` catalogs, `web/src/index.css` (font name), `web/index.html` |
| Server strings | `internal/**`, `cmd/**` — passkey RP name, TOTP issuer, calendar feed name, push VAPID subject, assistant prompt, backup error messages |
| Docs build | `web/scripts/docs/site.mjs`, `web/scripts/docs/lib.mjs` (`REPO_URL`) |
| Identity | `README.md`, `CHANGELOG.md` (OpenTaskKit note), `docker-compose.yml` (image), `.github/workflows/helm.yml` (chart namespace) |
| Distribution tooling | `FORKING.md`, `scripts/sync-upstream.sh`, `scripts/upstream-pr.sh`, `.github/workflows/sync-upstream.yml` |

Deliberately **not** rebranded (upstream-owned or guarded by upstream's checks):
`docs/**` guide text, `skills/**`, `openspec/**`, `SECURITY.md`, `CODEOWNERS`,
`.github/FUNDING.yml`, the logo artwork, and the Go module path.

After a sync merge, re-apply the brand to anything upstream added:

```sh
git diff upstream-vX.Y.Z upstream/vX.Y.Z --name-only | grep -vE '^(docs/|skills/|openspec/|web/src/generated/)' \
  | xargs grep -rlI 'OpenTodo' 2>/dev/null \
  | xargs sed -i 's/OpenTodo/OpenTaskKit/g'
```

Then run `make i18n-check docs-check` (both validate branded output) and check the
diff for lowercase identifiers the sweep should not have touched.

## Syncing an upstream release

Either run the weekly workflow (opens a "Sync upstream vX.Y.Z" PR automatically), or
by hand:

```sh
git fetch upstream --tags
scripts/sync-upstream.sh vX.Y.Z     # tags, merges into main, reminds about the brand sweep
```

The script refuses to run with a dirty tree, tags `upstream-vX.Y.Z`, merges with
`--no-ff`, and prints the follow-up steps (brand sweep, `make check`, changelog).
Resolve conflicts in the brand overlay by keeping our side; everything else is a
genuine merge — take upstream's and re-apply our change on top if it still matters.

## Sending a bug fix upstream

Generic fixes (a bug anyone can hit, no distribution-specific behaviour) go upstream
first; they return with the next sync, conflict-free, because the same change flows
both ways:

```sh
scripts/upstream-pr.sh fix-short-description <commit>...
```

The script branches off `upstream/main`, cherry-picks the commits, pushes to the
`fork` remote and opens the PR against `pixari/OpenTodo`. Follow upstream's
CONTRIBUTING: bug fixes need no OpenSpec change; `make check` must be green there;
UI changes need before/after screenshots from `make screens`.

Distribution-specific work (branding, own defaults, own features) stays here.

## Windows development notes

- Set `git config core.autocrlf false` in your clone (this checkout ships LF; several
  golden and docs-parsing tests fail on CRLF).
- Upstream's tests assume POSIX: `os.Rename` over open files, `0600` file modes and
  `flock` semantics. On Windows, `go test ./...` fails in the backup/host/tenant/push/
  settings/store/blobs families and a few web tests (ESLint config resolution, Dexie
  teardown) regardless of any local change — verified on pristine upstream code.
  **GitHub Actions (ubuntu) is the authoritative gate**; always check CI before
  blaming a change.

## Licence and credit

AGPL-3.0, like upstream. Modified distributions must publish their source (this
repository does). Keep the attribution in the README, do not imply upstream
endorsement, and support upstream — it is where the product is made.
