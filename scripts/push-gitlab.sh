#!/usr/bin/env bash
# Push main to GitLab using a personal access token (write_repository scope).
# Token sources (first match wins): GITLAB_TOKEN env, .gitlab-token.local in repo root.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

TOKEN="${GITLAB_TOKEN:-}"
if [ -z "$TOKEN" ] && [ -f "$ROOT/.gitlab-token.local" ]; then
  TOKEN="$(tr -d '[:space:]' < "$ROOT/.gitlab-token.local")"
fi

if [ -z "$TOKEN" ]; then
  echo "Missing GitLab token. Either:" >&2
  echo "  export GITLAB_TOKEN=glpat-..." >&2
  echo "  nano .gitlab-token.local   # paste real token, gitignored" >&2
  exit 1
fi

if [ "$TOKEN" = "glpat-YOUR-TOKEN-HERE" ] || [[ "$TOKEN" == *"YOUR-TOKEN"* ]]; then
  echo "Error: .gitlab-token.local still has the placeholder text." >&2
  echo "Open GitLab → Preferences → Access Tokens, copy the real glpat-... value, then:" >&2
  echo "  nano .gitlab-token.local" >&2
  exit 1
fi

cleanup_remote() {
  git remote set-url gitlab https://gitlab.com/stevenscanlanauthor/Dropline-Method-3.git
}
trap cleanup_remote EXIT

git remote set-url gitlab "https://oauth2:${TOKEN}@gitlab.com/stevenscanlanauthor/Dropline-Method-3.git"
git push -u gitlab main

echo "GitLab push complete."
