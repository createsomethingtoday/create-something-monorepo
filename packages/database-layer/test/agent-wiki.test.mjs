import { execFileSync, spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const wikiDir = path.join(packageRoot, 'docs', 'agent-wiki');

test('agent wiki is generated from current Atlas/Substrate artifacts', () => {
  execFileSync('node', ['scripts/generate-agent-wiki.mjs', '--check'], {
    cwd: packageRoot,
    stdio: 'pipe'
  });

  const index = fs.readFileSync(path.join(wikiDir, 'README.md'), 'utf8');
  assert.match(index, /Atlas\/Substrate Agent Wiki/);
  assert.match(index, /Agent-Run Receipt Charter/);
  assert.match(index, /agent-run with receipts/);
  assert.match(index, /\[data\/create-something-internal-topology\.json\]\(\.\.\/\.\.\/data\/create-something-internal-topology\.json\)/);
  assert.match(index, /Management resources/);
  assert.match(index, /Business recommendation lanes/);
  assert.match(index, /Historical Context/);
  assert.match(index, /private local history/);
  assert.match(index, /not a source of truth or a\s+receipt/);

  const business = fs.readFileSync(path.join(wikiDir, 'business-recommendations.md'), 'utf8');
  assert.match(business, /Business Recommendations/);
  assert.match(business, /Operationalized lanes/);
  assert.match(business, /Client delivery packets/);

  const routes = fs.readFileSync(path.join(wikiDir, 'agent-routes.md'), 'utf8');
  assert.doesNotMatch(routes, /CRE-1068/);
  assert.match(routes, /active Linear issue/);
  assert.match(routes, /ctx search "<question>" --refresh off --verbose/);
  assert.match(routes, /ctx show event <ctx-event-id> --window 5/);
  assert.match(routes, /ctx_session_id/);
  assert.match(routes, /ctx_event_id/);
  assert.match(routes, /Stop before mutating Cloudflare/);
});

test('agent wiki freshness check fails on orphaned generated markdown', () => {
  const orphanPath = path.join(wikiDir, 'orphaned-page.md');
  fs.writeFileSync(orphanPath, '# Old generated page\n');

  try {
    const result = spawnSync('node', ['scripts/generate-agent-wiki.mjs', '--check'], {
      cwd: packageRoot,
      encoding: 'utf8'
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /orphaned-page\.md/);
  } finally {
    fs.rmSync(orphanPath, { force: true });
  }
});
