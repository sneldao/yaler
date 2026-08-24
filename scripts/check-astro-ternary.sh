#!/usr/bin/env bash
# check-astro-ternary.sh — block {cond ? (...JSX...) : (...JSX...)} in .astro
#
# Astro 4.x's compiler chokes on ternaries where both branches contain JSX,
# producing "Expected } but found $$render" at build time. The fix is to use
# {cond && (...)} / {!cond && (...)} instead. This script catches the pattern
# before it reaches the build.
#
# Exit 1 if any staged .astro file contains the pattern, 0 otherwise.
set -euo pipefail

# Gather staged .astro files (or all .astro files if not in a git repo).
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  files=$(git diff --cached --name-only --diff-filter=ACM -- '*.astro' 2>/dev/null || true)
else
  files=""
fi

# If no staged .astro files, check all of them (for --all-files / manual runs).
if [ -z "$files" ]; then
  files=$(find . -path ./node_modules -prune -o -name '*.astro' -print 2>/dev/null || true)
fi

if [ -z "$files" ]; then
  exit 0
fi

found=0

for file in $files; do
  [ -f "$file" ] || continue

  # Match lines like:  {something ? (
  # This is the ternary-true-branch-with-JSX pattern that breaks Astro.
  # We look for a template expression opening with { that contains ? (
  # on the same line, which is the signature of the broken pattern.
  matches=$(grep -nE '\{[^}]*\?\s*\(' "$file" 2>/dev/null || true)

  if [ -n "$matches" ]; then
    echo "ERROR: $file contains ternary-with-JSX in a template expression."
    echo "  Astro 4.x's compiler breaks on {cond ? (...JSX...) : (...JSX...)} with"
    echo "  'Expected } but found \$\$render'. Use {cond && (...)} / {!cond && (...)} instead."
    echo ""
    echo "$matches"
    echo ""
    found=1
  fi
done

if [ "$found" -eq 1 ]; then
  echo "See commit a7bacd2 / 4a67459 for the pattern that was fixed."
  exit 1
fi

exit 0
