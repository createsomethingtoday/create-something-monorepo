import { execFileSync, spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
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
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-wiki-check-'));
  const fixturePackage = path.join(fixture, 'packages/database-layer');
  fs.mkdirSync(path.join(fixturePackage, 'scripts'), { recursive: true });
  for (const name of ['generate-agent-wiki.mjs', 'agent-wiki-support.mjs']) {
    fs.copyFileSync(path.join(packageRoot, 'scripts', name), path.join(fixturePackage, 'scripts', name));
  }
  fs.cpSync(wikiDir, path.join(fixturePackage, 'docs/agent-wiki'), { recursive: true });
  fs.symlinkSync(path.join(packageRoot, 'data'), path.join(fixturePackage, 'data'));
  fs.symlinkSync(path.resolve(packageRoot, '../../docs'), path.join(fixture, 'docs'));
  const orphanPath = path.join(fixturePackage, 'docs/agent-wiki/orphaned-page.md');
  fs.writeFileSync(orphanPath, '# Old generated page\n');

  try {
    const result = spawnSync('node', ['scripts/generate-agent-wiki.mjs', '--check'], {
      cwd: fixturePackage,
      encoding: 'utf8'
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /orphaned-page\.md/);
  } finally {
    fs.rmSync(fixture, { force: true, recursive: true });
  }
});


test('wiki prints source age and a caller can enforce an age limit', () => {
  const checked = spawnSync(process.execPath, ['scripts/generate-agent-wiki.mjs', '--check', '--max-age-days', '0'], { cwd: packageRoot, encoding: 'utf8' });
  assert.notEqual(checked.status, 0);
  assert.match(checked.stderr, /source snapshot is .* days old/);
  for (const name of fs.readdirSync(wikiDir).filter((name) => name.endsWith('.md'))) {
    assert.match(fs.readFileSync(path.join(wikiDir, name), 'utf8'), /Source snapshot range \(UTC\): \d{4}-\d{2}-\d{2}T/);
  }
});
