import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { runDiscovery, verifyGeneration } from './loop.mjs';

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'workflow-discovery-test-'));
  const repo = join(root, 'repo');
  await mkdir(join(repo, 'packages', 'one'), { recursive: true });
  await writeFile(join(repo, 'package.json'), JSON.stringify({ name: 'test-root', scripts: {} }));
  const bytes = JSON.stringify({
    name: '@test/one',
    scripts: {
      build: 'DO_NOT_EXECUTE_PRIVATE',
      check: 'DO_NOT_EXECUTE_PRIVATE',
      test: 'DO_NOT_EXECUTE_PRIVATE'
    }
  });
  await writeFile(join(repo, 'packages/one/package.json'), bytes);
  return { root, repo, out: join(root, 'output'), bytes };
}

test('discovers real package contracts into compiler-qualified approval-required candidates without executing scripts', async () => {
  const f = await fixture();
  try {
    const result = await runDiscovery({ repoRoot: f.repo, outDir: f.out });
    assert.equal(result.status, 'generated');
    assert.equal(result.catalog.candidates.length, 1);
    assert.equal(result.catalog.history.coverage, 'skipped');
    const candidate = result.catalog.candidates[0];
    assert.equal(candidate.validation, 'compiler_validated');
    assert.equal(candidate.execution, 'not_run');
    assert.ok(
      candidate.definition.actions.every((action) => action.autonomy === 'approval_required')
    );
    assert.equal(JSON.stringify(result).includes('DO_NOT_EXECUTE_PRIVATE'), false);
    assert.equal(await readFile(join(f.repo, 'packages/one/package.json'), 'utf8'), f.bytes);
    assert.equal((await verifyGeneration(f.out)).valid, true);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});

test('identical inputs reuse a generation and tampered/missing derived output regenerates once', async () => {
  const f = await fixture();
  try {
    const first = await runDiscovery({ repoRoot: f.repo, outDir: f.out });
    const second = await runDiscovery({ repoRoot: f.repo, outDir: f.out });
    assert.equal(second.status, 'unchanged');
    assert.equal(second.generation, first.generation);
    assert.equal(second.catalog.digest, first.catalog.digest);
    await writeFile(join(f.out, first.generation, 'catalog.json'), 'corrupted');
    assert.equal((await verifyGeneration(f.out)).valid, false);
    const repaired = await runDiscovery({ repoRoot: f.repo, outDir: f.out });
    assert.equal(repaired.status, 'repaired');
    assert.equal(repaired.repairAttempts, 1);
    assert.notEqual(repaired.generation, first.generation);
    assert.equal(repaired.catalog.digest, first.catalog.digest);
    assert.equal(
      await readFile(join(f.out, first.generation, 'catalog.json'), 'utf8'),
      'corrupted',
      'old evidence remains retained'
    );
    await rm(join(f.out, repaired.generation, 'catalog.json'));
    const recovered = await runDiscovery({ repoRoot: f.repo, outDir: f.out });
    assert.equal(recovered.repairAttempts, 1);
    assert.equal((await verifyGeneration(f.out)).valid, true);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});

test('source changes create new candidates, while invalid sources preserve last good state', async () => {
  const f = await fixture();
  try {
    const first = await runDiscovery({ repoRoot: f.repo, outDir: f.out });
    await mkdir(join(f.repo, 'packages', 'two'));
    await writeFile(
      join(f.repo, 'packages/two/package.json'),
      JSON.stringify({ name: 'two', scripts: { check: 'inert', test: 'inert' } })
    );
    const next = await runDiscovery({ repoRoot: f.repo, outDir: f.out });
    assert.equal(next.status, 'regenerated');
    assert.equal(next.catalog.candidates.length, 2);
    assert.notEqual(first.catalog.digest, next.catalog.digest);
    const pointer = await readFile(join(f.out, 'current.json'), 'utf8');
    await writeFile(join(f.repo, 'packages/two/package.json'), 'malformed secret source');
    await assert.rejects(() => runDiscovery({ repoRoot: f.repo, outDir: f.out }));
    assert.equal(await readFile(join(f.out, 'current.json'), 'utf8'), pointer);
    assert.equal((await verifyGeneration(f.out)).valid, true);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});

test('history is sanitized, deduplicated by distinct session, stale-labeled and never treated as permission', async () => {
  const f = await fixture();
  try {
    const file = join(f.root, 'history.private.json');
    const event = {
      pattern: 'package-validation',
      sessionId: '11111111-1111-4111-8111-111111111111',
      eventId: '22222222-2222-4222-8222-222222222222',
      evidenceSha256: `sha256:${'a'.repeat(64)}`
    };
    const history = {
      schema: 'workflow-discovery-history@1',
      coverage: 'bounded_existing_index',
      observedAt: '2026-01-01T00:00:00.000Z',
      events: [event, { ...event, eventId: '33333333-3333-4333-8333-333333333333' }]
    };
    await writeFile(file, JSON.stringify(history));
    const result = await runDiscovery({ repoRoot: f.repo, outDir: f.out, historyFile: file });
    assert.equal(result.catalog.history.coverage, 'stale');
    assert.equal(result.catalog.history.patterns[0].distinctSessions, 1);
    assert.equal(JSON.stringify(result).includes(event.sessionId), false);
    assert.equal(JSON.stringify(result).includes(event.eventId), false);
    assert.equal(result.catalog.candidates[0].authority, 'candidate_only');
    history.events[0].privateTranscript = 'never export this';
    await writeFile(file, JSON.stringify(history));
    const before = await readFile(join(f.out, 'current.json'), 'utf8');
    await assert.rejects(() =>
      runDiscovery({ repoRoot: f.repo, outDir: f.out, historyFile: file })
    );
    assert.equal(await readFile(join(f.out, 'current.json'), 'utf8'), before);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});

test('refuses source overlap, unowned output, symlinks, and concurrent-writer locks', async () => {
  const f = await fixture();
  try {
    await assert.rejects(() =>
      runDiscovery({ repoRoot: f.repo, outDir: join(f.repo, 'generated') })
    );
    await mkdir(f.out);
    await writeFile(join(f.out, 'operator.txt'), 'preserve');
    await assert.rejects(() => runDiscovery({ repoRoot: f.repo, outDir: f.out }));
    assert.equal(await readFile(join(f.out, 'operator.txt'), 'utf8'), 'preserve');
    await rm(f.out, { recursive: true });
    await runDiscovery({ repoRoot: f.repo, outDir: f.out });
    await writeFile(join(f.out, '.discovery-lock'), 'another writer');
    await assert.rejects(() => runDiscovery({ repoRoot: f.repo, outDir: f.out }));
    assert.equal(await readFile(join(f.out, '.discovery-lock'), 'utf8'), 'another writer');
    await rm(join(f.out, '.discovery-lock'));
    const pointer = JSON.parse(await readFile(join(f.out, 'current.json'), 'utf8'));
    await rm(join(f.out, pointer.generation, 'catalog.json'));
    await symlink(join(f.repo, 'package.json'), join(f.out, pointer.generation, 'catalog.json'));
    const before = await readFile(join(f.repo, 'package.json'), 'utf8');
    assert.equal((await runDiscovery({ repoRoot: f.repo, outDir: f.out })).status, 'repaired');
    assert.equal(await readFile(join(f.repo, 'package.json'), 'utf8'), before);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});

test('candidate capacity is explicit and existing invalid workflows are held without source edits', async () => {
  const f = await fixture();
  try {
    await writeFile(
      join(f.repo, 'package.json'),
      JSON.stringify({
        name: 'root',
        scripts: { deploy: 'private', check: 'private', test: 'private' }
      })
    );
    const result = await runDiscovery({ repoRoot: f.repo, outDir: f.out, maximumCandidates: 1 });
    assert.equal(result.catalog.coverage.emitted, 1);
    assert.ok(result.catalog.coverage.deferred > 0);
    assert.equal(result.catalog.deferred.length, result.catalog.coverage.deferred);
    const path = join(f.repo, 'packages/one/workflows/invalid');
    await mkdir(path, { recursive: true });
    await writeFile(join(path, 'workflow.json'), JSON.stringify({ schemaVersion: 'unknown' }));
    const before = await readFile(join(f.out, 'current.json'), 'utf8');
    await assert.rejects(() => runDiscovery({ repoRoot: f.repo, outDir: f.out }));
    assert.equal(await readFile(join(f.out, 'current.json'), 'utf8'), before);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});

test('rewriting candidate and self-hashed manifest cannot bypass current artifact binding', async () => {
  const f = await fixture();
  const canonical = (v) =>
    Array.isArray(v)
      ? v.map(canonical)
      : v && typeof v === 'object'
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .map((k) => [k, canonical(v[k])])
          )
        : v;
  const hash = (v) => `sha256:${createHash('sha256').update(v).digest('hex')}`;
  try {
    const result = await runDiscovery({ repoRoot: f.repo, outDir: f.out });
    const dir = join(f.out, result.generation);
    const manifest = JSON.parse(await readFile(join(dir, 'artifacts.json'), 'utf8'));
    const artifact = manifest.files.find((file) => file.path.endsWith('/compiled-bundle.json'));
    const forged = '{"forged":true}';
    await writeFile(join(dir, artifact.path), forged);
    artifact.sha256 = hash(forged);
    const { digest, ...body } = manifest;
    manifest.digest = hash(JSON.stringify(canonical(body)));
    await writeFile(join(dir, 'artifacts.json'), JSON.stringify(manifest));
    assert.equal((await verifyGeneration(f.out)).valid, false);
    assert.equal((await runDiscovery({ repoRoot: f.repo, outDir: f.out })).status, 'repaired');
    assert.equal((await verifyGeneration(f.out)).valid, true);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});

test('dot-dot-prefixed repository children cannot become output directories', async () => {
  const f = await fixture();
  try {
    for (const child of ['..output', '..', 'nested/..output']) {
      if (child.startsWith('nested/')) await mkdir(join(f.repo, 'nested'));
      await assert.rejects(
        runDiscovery({ repoRoot: f.repo, outDir: join(f.repo, child) }),
        /discovery_output_overlaps_source/
      );
    }
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});

test('capacity selection covers validation and release procedures and indexes every proposal', async () => {
  const f = await fixture();
  try {
    for (let n = 0; n < 8; n++) {
      await mkdir(join(f.repo, 'packages', `release-${n}`));
      await writeFile(
        join(f.repo, 'packages', `release-${n}`, 'package.json'),
        JSON.stringify({
          name: `release-${n}`,
          scripts: { deploy: 'never', build: 'never', test: 'never' }
        })
      );
    }
    const run = await runDiscovery({ repoRoot: f.repo, outDir: f.out, maximumCandidates: 4 });
    assert.equal(
      run.catalog.candidates.filter((x) => x.pattern === 'package-validation').length,
      2
    );
    assert.equal(run.catalog.candidates.filter((x) => x.pattern === 'release-evidence').length, 2);
    assert.equal(run.catalog.candidateIndex.length, run.catalog.coverage.proposed);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});
