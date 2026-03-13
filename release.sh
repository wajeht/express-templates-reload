#!/usr/bin/env bash
set -euo pipefail

if [ -n "$(git status --porcelain)" ]; then
  echo "Error: working tree is dirty. Commit or stash changes first."
  exit 1
fi

current=$(node -p "require('./package.json').version")
echo "Current version: $current"

read -rp "New version: " version

if [ -z "$version" ]; then
  echo "Error: version cannot be empty."
  exit 1
fi

npm version "$version" --no-git-tag-version
npm run ci

git add package.json package-lock.json
git commit -m "release: v$version"
git tag "v$version"

read -rp "Push and publish? (y/n) " confirm
if [ "$confirm" = "y" ]; then
  git push && git push --tags
  npm publish --access public
  echo "Published v$version"
else
  echo "Skipped push/publish. Run manually:"
  echo "  git push && git push --tags && npm publish --access public"
fi
