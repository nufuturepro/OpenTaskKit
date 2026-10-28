#!/bin/sh
# Propose commits upstream: branch off upstream/main, cherry-pick, strip the
# distribution brand so the PR needs no reformatting, push to the thin fork and open
# the PR against pixari/OpenTodo (FORKING.md → Sending a bug fix upstream).
# Usage: scripts/upstream-pr.sh <branch-name> <commit>...
#        OTK_STRIP_ONLY=1 scripts/upstream-pr.sh   # the brand pass alone, after a
#                                                   # conflict was resolved by hand
set -eu
if [ -n "$(git status --porcelain)" ]; then
  echo "error: the tree is dirty; commit or stash first (the brand pass rewrites files in place)" >&2
  exit 1
fi

# Present the proposed change in upstream's branding (FORKING.md → the brand overlay).
# - The changelog goes back to upstream's: its entries and release notes are written
#   upstream, and the distribution's marked lines never belong there.
# - Every other changed file gets the capitalised brand swapped OpenTaskKit →
#   OpenTodo (lowercase `opentodo` is an identifier and is left alone).
# - The branch must end with no OpenTaskKit anywhere in its diff, or this fails.
strip_brand() {
  base=$(git merge-base HEAD upstream/main)
  changed=$(git diff --name-only "$base"..HEAD)
  if printf '%s\n' "$changed" | grep -qx 'CHANGELOG.md'; then
    git checkout upstream/main -- CHANGELOG.md
    echo "  brand: CHANGELOG.md reset to upstream's (its release notes are upstream's)"
  fi
  printf '%s\n' "$changed" | while IFS= read -r f; do
    [ -f "$f" ] || continue
    case "$f" in
      *.png|*.jpg|*.jpeg|*.webp|*.gif|*.ico|*.woff|*.woff2|*.ttf) continue ;;
    esac
    if grep -q 'OpenTaskKit' "$f" 2>/dev/null; then
      sed -i 's/OpenTaskKit/OpenTodo/g' "$f"
      echo "  brand: $f rewritten to OpenTodo"
    fi
  done
  leftover=$(printf '%s\n' "$changed" | while IFS= read -r f; do
    [ -f "$f" ] && grep -l 'OpenTaskKit' "$f" 2>/dev/null || true
  done)
  if [ -n "$leftover" ]; then
    echo "error: OpenTaskKit still present in the branch:" >&2
    printf '%s\n' "$leftover" >&2
    exit 1
  fi
  if ! git diff --quiet || ! git diff --cached --quiet; then
    git add -A
    if [ "$(git rev-list --count upstream/main..HEAD)" -eq 1 ]; then
      git commit --amend --no-edit --quiet
    else
      git commit -m "chore: strip the distribution brand for upstream" --quiet
    fi
    echo "  brand: stripped and folded into the branch"
  fi
}

if [ "${OTK_STRIP_ONLY:-}" = "1" ]; then
  strip_brand
  exit 0
fi

name=${1:?usage: upstream-pr.sh <branch-name> <commit>...}
shift
if [ $# -eq 0 ]; then
  echo "error: give the commit(s) to send upstream" >&2
  exit 1
fi

git fetch upstream
here=$(git branch --show-current)
branch="otk-upstream/$name"
git checkout -B "$branch" upstream/main
if ! git cherry-pick "$@"; then
  echo ""
  echo "Cherry-pick conflict. Resolve it, then:"
  echo "  git cherry-pick --continue"
  echo "  OTK_STRIP_ONLY=1 scripts/upstream-pr.sh   # the brand pass"
  echo "  git push fork $branch"
  echo "  gh pr create -R pixari/OpenTodo --base main --head nufuturepro:$branch --title '$name'"
  exit 1
fi
strip_brand

git push -u fork "$branch"

summary=$(git log --format='- %s' "upstream/main..HEAD" | sed 's/^/  /')
gh pr create -R pixari/OpenTodo --base main --head "nufuturepro:$branch" \
  --title "$name" \
  --body "Proposed from the [OpenTaskKit distribution](https://github.com/nufuturepro/OpenTaskKit); it lands there with the next upstream sync.

Commits:

$summary
"
echo ""
echo "PR opened for $branch. Return to $here with: git checkout $here"
