#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
demo_dir=$(mktemp -d)
trap 'rm -rf "$demo_dir"' EXIT
run_ground() {
  npx --yes --package @createsomething/ground-mcp@0.4.3 ground --db "$demo_dir/registry.db" "$@"
}
printf '%s\n' '1. Attempt a claim before comparison (expected: blocked)'
set +e
run_ground claim duplicate draft.ts published.ts 'These rules look alike' > "$demo_dir/blocked.txt" 2>&1
claim_exit=$?
set -e
cat "$demo_dir/blocked.txt"
if [ "$claim_exit" -eq 0 ]; then
  printf '%s\n' 'ERROR: the unchecked claim unexpectedly succeeded' >&2
  exit 1
fi
if ! grep -q 'No evidence found' "$demo_dir/blocked.txt"; then
  printf '%s\n' 'ERROR: command failed for a reason other than missing evidence' >&2
  exit 1
fi
printf '\n%s\n' '2. Compare the two files'
run_ground compare draft.ts published.ts
printf '\n%s\n' '3. Check the actual behavior'
node --input-type=module <<'JS'
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const compile = (path) => new Function(readFileSync(path, 'utf8').replace('export ', '').replace(': string', '').replace(': boolean', '') + '; return canEdit;')();
const draft = compile('draft.ts');
const published = compile('published.ts');
assert.equal(draft('draft'), true);
assert.equal(published('draft'), false);
assert.equal(draft('published'), false);
assert.equal(published('published'), true);
console.log('draft.ts: draft=true, published=false');
console.log('published.ts: draft=false, published=true');
console.log('Same structure does not establish equivalent behavior.');
JS
