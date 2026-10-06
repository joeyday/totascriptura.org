#!/usr/bin/env bash
# Point the site at a new tsgen release: bump the tag in package.json, re-resolve
# the git dependency in the lockfile (plain `npm install` would not), pull in
# patched nested dependencies, and check the lockfile really got the tag.
# Usage: npm run update-tsgen -- 0.5.2
# It only edits package.json and package-lock.json. Commit and push (which
# deploys the live site) yourself, together with any content changes.
set -euo pipefail

REPO=joeyday/tota-scriptura-static-site-generator

version="${1:-}"
version="${version#v}"
if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Usage: npm run update-tsgen -- X.Y.Z" >&2
  exit 1
fi

# The commit the tag points at (an annotated tag lists the commit as ^{}).
refs=$(git ls-remote "https://github.com/$REPO.git" "refs/tags/v$version" "refs/tags/v$version^{}")
commit=$(echo "$refs" | awk 'END { print $1 }')
if [[ -z "$commit" ]]; then
  echo "Tag v$version doesn't exist on GitHub yet. Push it first." >&2
  exit 1
fi

npm pkg set "devDependencies.tsgen=github:$REPO#v$version"
npm update tsgen --package-lock-only
# Exits non-zero while unfixable advisories remain (gray-matter's js-yaml); that's no reason to stop.
npm audit fix --package-lock-only || echo "(npm audit still reports issues it can't fix; see above.)"

# node_modules/tsgen must show the new version and the tag's commit.
read -r locked_version locked_commit < <(node -e '
  const e = require("./package-lock.json").packages["node_modules/tsgen"];
  console.log(e.version, e.resolved.split("#").pop());
')
if [[ "$locked_version" != "$version" || "$locked_commit" != "$commit" ]]; then
  echo "Lockfile mismatch: wanted $version @ ${commit:0:7}, got $locked_version @ ${locked_commit:0:7}." >&2
  exit 1
fi

echo "tsgen is now $locked_version @ ${locked_commit:0:7} in package.json and package-lock.json."
echo "Review with: git diff package.json package-lock.json"
