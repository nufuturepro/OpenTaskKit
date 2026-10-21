#!/bin/sh
# Merge an upstream OpenTodo release into main (FORKING.md → Syncing an upstream release).
# Usage: scripts/sync-upstream.sh v0.8.1
set -eu
tag=${1:?usage: sync-upstream.sh <upstream-tag, e.g. v0.8.1>}

if [ -n "$(git status --porcelain)" ]; then
  echo "error: working tree is dirty; commit or stash first" >&2
  exit 1
fi

git fetch upstream --tags
if ! git rev-parse --verify --quiet "refs/tags/$tag" >/dev/null; then
  echo "error: no such upstream tag: $tag (fetch brought: $(git tag -l 'v*' | tail -3 | tr '\n' ' '))" >&2
  exit 1
fi

version=${tag#v}
if git rev-parse --verify --quiet "refs/tags/upstream-$tag" >/dev/null; then
  echo "note: upstream-$tag already exists; skipping the tag step"
else
  git tag "upstream-$tag" "$tag"
  echo "tagged upstream-$tag at $tag"
fi

git checkout main
git merge --no-ff "$tag" -m "Merge upstream $tag" || {
  echo ""
  echo "Merge conflicts. For the brand overlay files (FORKING.md → brand overlay)"
  echo "keep OUR side; everything else is a genuine merge: take upstream's, then"
  echo "re-apply our change on top if it still matters. Afterwards:"
  echo "  1. Re-apply the brand sweep (sed line in FORKING.md)."
  echo "  2. make check   (CI on ubuntu is authoritative on Windows)"
  echo "  3. git push origin main"
  exit 1
}

cat <<EOF

Merged $tag into main.

Next:
  1. Re-apply the brand sweep (FORKING.md → brand overlay).
  2. Note the sync in CHANGELOG.md and run: make check
  3. Tag a distribution release:
       git tag opentaskkit-$version-otk.1 && git push origin main --tags
EOF
