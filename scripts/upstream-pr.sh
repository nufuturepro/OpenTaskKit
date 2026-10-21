#!/bin/sh
# Propose commits upstream: branch off upstream/main, cherry-pick, push to the thin
# fork, open the PR against pixari/OpenTodo (FORKING.md → Sending a bug fix upstream).
# Usage: scripts/upstream-pr.sh <branch-name> <commit>...
set -eu
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
  echo "  git push fork $branch"
  echo "  gh pr create -R pixari/OpenTodo --base main --head nufuturepro:$branch --title '$name'"
  exit 1
fi
git push -u fork "$branch"

summary=$(git log --format='- %s' "upstream/main..HEAD" | sed 's/^/  /')
gh pr create -R pixari/OpenTodo --base main --head "nufuturepro:$branch" \
  --title "$name" \
  --body "Bug fix proposed from the [OpenTaskKit distribution](https://github.com/nufuturepro/OpenTaskKit); it lands there with the next upstream sync.

Commits:

$summary
"
echo ""
echo "PR opened for $branch. Return to $here with: git checkout $here"
