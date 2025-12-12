#!/usr/bin/env bash
set -euo pipefail

SRC="images"
BRANCH="gh-pages"
WT=".gh-pages"

git fetch origin

# Prepare worktree
if git ls-remote --exit-code origin "$BRANCH" >/dev/null 2>&1; then
  git worktree add -B "$BRANCH" "$WT" "origin/$BRANCH"
else
  git worktree add -B "$BRANCH" "$WT"
fi

# Preserve optional files
saved="$(mktemp -d)"
[ -f "$WT/CNAME" ] && cp "$WT/CNAME" "$saved/CNAME"

# Sync contents
rm -rf "$WT"/*
# Recreate deploy .gitignore so unwanted files aren't committed
cat >"$WT/.gitignore" <<'EOF'
node_modules/
.images/
logs/
*.map
.DS_Store
Thumbs.db
EOF

cp -R "$SRC"/. "$WT"/
[ -f "$saved/CNAME" ] && cp "$saved/CNAME" "$WT/CNAME"
rm -rf "$saved"

pushd "$WT" >/dev/null
git add -A
git -c user.name="CI Bot" -c user.email="ci@example.com" \
  commit -m "Deploy $(date -u +'%Y-%m-%dT%H:%M:%SZ')" || echo "Nothing to commit"

git push origin "$BRANCH"
popd >/dev/null

git worktree remove "$WT"
