import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../..');
const cliPath = path.join(repoRoot, 'scripts/prose-quality/index.mjs');
const fixturesDir = path.join(testDir, 'fixtures/prose-quality');

function runCli(mode, fixture, options = {}) {
  const args = [cliPath, mode];
  if (fixture) args.push(path.join(fixturesDir, fixture));
  if (options.changedFrom) args.push('--changed-from', options.changedFrom);
  args.push('--format', 'json');

  return spawnSync(process.execPath, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: 'utf8'
  });
}

function runGit(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

test('prose check passes clear prose through the public CLI', () => {
  const result = runCli('check', 'clear.md');

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const report = JSON.parse(result.stdout);
  assert.equal(report.version, 1);
  assert.deepEqual(report.policy, {
    id: 'policy.prose-quality.v1',
    version: 1
  });
  assert.equal(report.mode, 'check');
  assert.equal(report.status, 'pass');
  assert.deepEqual(report.summary, {
    files: 1,
    findings: 0,
    blocking: 0,
    review: 0
  });
  assert.deepEqual(report.findings, []);
});

test('prose check blocks deterministic policy violations with actionable JSON', () => {
  const result = runCli('check', 'blocking.md');

  assert.equal(result.status, 1, result.stderr || result.stdout);

  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'block');
  assert.equal(report.summary.files, 1);
  assert.equal(report.summary.blocking, 3);
  assert.equal(report.summary.review, 2);
  assert.deepEqual(
    report.findings.map(({ rule, severity, line, column, suggestion }) => ({
      rule,
      severity,
      line,
      column,
      suggestion
    })),
    [
      {
        rule: 'marketing-jargon/cutting-edge',
        severity: 'error',
        line: 3,
        column: 5,
        suggestion: 'Name the specific capability or evidence.'
      },
      {
        rule: 'marketing-jargon/ai-powered',
        severity: 'error',
        line: 3,
        column: 18,
        suggestion: 'Name the model, agent, or workflow and what it does.'
      },
      {
        rule: 'marketing-jargon/solutions',
        severity: 'warning',
        line: 3,
        column: 29,
        suggestion:
          'Name the product, service, or workflow when solutions is vague. Keep the term when it names the subject precisely.'
      },
      {
        rule: 'marketing-jargon/leverage',
        severity: 'warning',
        line: 3,
        column: 39,
        suggestion:
          'Use the exact action when leverage is only a vague substitute. Keep the term when it has precise field meaning.'
      },
      {
        rule: 'marketing-jargon/seamless',
        severity: 'error',
        line: 3,
        column: 50,
        suggestion: 'Describe the observed behavior or measured result.'
      }
    ]
  );
  assert.match(report.findings[0].message, /cutting-edge/);
  assert.match(report.findings[0].file, /blocking\.md$/);
  assert.equal(report.findings[0].excerpt, 'cutting-edge');
});

test('prose audit reports deterministic backlog without failing the command', () => {
  const result = runCli('audit', 'blocking.md');

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const report = JSON.parse(result.stdout);
  assert.equal(report.mode, 'audit');
  assert.equal(report.status, 'block');
  assert.equal(report.summary.blocking, 3);
  assert.equal(report.summary.review, 2);
});

test('prose check reports reader-review signals without failing CI', () => {
  const result = runCli('check', 'review.md');

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'review');
  assert.equal(report.summary.blocking, 0);
  assert.equal(report.summary.review, 1);
  assert.deepEqual(
    report.findings.map(({ rule, severity, line, suggestion }) => ({
      rule,
      severity,
      line,
      suggestion
    })),
    [
      {
        rule: 'readability/long-sentence',
        severity: 'warning',
        line: 3,
        suggestion:
          'Split the sentence or introduce the concrete task before the supporting detail.'
      }
    ]
  );
});

test('prose check selects changed prose from the requested git baseline', (t) => {
  const tempRepo = mkdtempSync(path.join(tmpdir(), 'prose-quality-git-'));
  t.after(() => rmSync(tempRepo, { recursive: true, force: true }));

  runGit(tempRepo, ['init', '-q']);
  runGit(tempRepo, ['config', 'user.email', 'prose-test@example.com']);
  runGit(tempRepo, ['config', 'user.name', 'Prose Test']);
  writeFileSync(path.join(tempRepo, 'README.md'), 'A clear starting sentence.\n');
  runGit(tempRepo, ['add', 'README.md']);
  runGit(tempRepo, ['commit', '-qm', 'baseline']);

  writeFileSync(path.join(tempRepo, 'README.md'), 'A seamless platform.\n');

  const result = runCli('check', null, { cwd: tempRepo, changedFrom: 'HEAD' });

  assert.equal(result.status, 1, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.summary.files, 1);
  assert.equal(report.summary.blocking, 1);
  assert.equal(report.findings[0].file, 'README.md');
  assert.equal(report.findings[0].rule, 'marketing-jargon/seamless');
});

test('changed-file check reports only findings introduced after the baseline', (t) => {
  const tempRepo = mkdtempSync(path.join(tmpdir(), 'prose-quality-existing-debt-'));
  t.after(() => rmSync(tempRepo, { recursive: true, force: true }));

  runGit(tempRepo, ['init', '-q']);
  runGit(tempRepo, ['config', 'user.email', 'prose-test@example.com']);
  runGit(tempRepo, ['config', 'user.name', 'Prose Test']);
  writeFileSync(path.join(tempRepo, 'README.md'), 'A seamless platform.\n');
  runGit(tempRepo, ['add', 'README.md']);
  runGit(tempRepo, ['commit', '-qm', 'baseline with existing prose debt']);

  writeFileSync(
    path.join(tempRepo, 'README.md'),
    'A seamless platform.\nThe operator reviews the receipt.\n'
  );

  const result = runCli('check', null, { cwd: tempRepo, changedFrom: 'HEAD' });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'pass');
  assert.deepEqual(report.summary, {
    files: 1,
    findings: 0,
    blocking: 0,
    review: 0
  });
});

test('prose check reuses the agency overlay through the root CLI', () => {
  const fixture = path.join(
    repoRoot,
    'packages/agency/test/fixtures/prose-quality/agency-blocking.svelte'
  );
  const result = spawnSync(process.execPath, [cliPath, 'check', fixture, '--format', 'json'], {
    cwd: repoRoot,
    encoding: 'utf8'
  });

  assert.equal(result.status, 1, result.stderr || result.stdout);

  const report = JSON.parse(result.stdout);
  assert.equal(report.summary.files, 1);
  assert.equal(report.summary.blocking, 1);
  assert.deepEqual(
    report.findings.map(({ rule, severity, suggestion, excerpt }) => ({
      rule,
      severity,
      suggestion,
      excerpt
    })),
    [
      {
        rule: 'agency/approval-owner',
        severity: 'error',
        suggestion: 'Replace with "approval authority".',
        excerpt: 'approval owner'
      }
    ]
  );
});

test('agency overlay follows public-copy discovery instead of the whole package', () => {
  const readme = path.join(repoRoot, 'packages/agency/README.md');
  const result = spawnSync(process.execPath, [cliPath, 'check', readme, '--format', 'json'], {
    cwd: repoRoot,
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert(
    report.findings.every((finding) => !finding.rule.startsWith('agency/')),
    'internal agency README unexpectedly received the public-copy overlay'
  );
});

test('target-reader corpus keeps pass and revise coverage anchored to current source', () => {
  const corpusPath = path.join(repoRoot, 'scripts/prose-quality/evals/target-reader.v1.json');
  assert(existsSync(corpusPath), 'target-reader corpus is missing');

  const corpus = JSON.parse(readFileSync(corpusPath, 'utf8'));
  assert.equal(corpus.version, 1);
  assert.equal(corpus.reader, 'junior-practitioner');
  assert.equal(corpus.cases.length, 12);
  assert.deepEqual(
    Object.fromEntries(
      ['pass', 'revise'].map((verdict) => [
        verdict,
        corpus.cases.filter((entry) => entry.expected === verdict).length
      ])
    ),
    { pass: 10, revise: 2 }
  );
  assert.deepEqual([...new Set(corpus.cases.map((entry) => entry.property))].sort(), [
    'agency',
    'io',
    'ltd',
    'space'
  ]);

  for (const entry of corpus.cases) {
    const sourcePath = path.join(repoRoot, entry.source.file);
    assert(existsSync(sourcePath), `${entry.id} source file is missing`);
    const sourceLines = readFileSync(sourcePath, 'utf8').split(/\r?\n/);
    const nearbySource = sourceLines
      .slice(Math.max(0, entry.source.line - 3), entry.source.line + 3)
      .join(' ')
      .replace(/\s+/g, ' ');
    assert(
      nearbySource.includes(entry.source.anchor),
      `${entry.id} anchor drifted near ${entry.source.file}:${entry.source.line}`
    );
    assert.match(entry.reason, /\S/);
    assert.equal(entry.reviewScope, 'rendered-component');
    assert.match(entry.context, /\S/);
  }
});

test('prose check keeps abstraction and unexplained owned-term clusters review-only', () => {
  const result = runCli('check', 'review-signals.md');

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'review');
  assert.equal(report.summary.blocking, 0);
  assert.deepEqual(
    report.findings.map(({ rule, severity, line }) => ({ rule, severity, line })),
    [
      { rule: 'readability/abstraction-density', severity: 'warning', line: 3 },
      { rule: 'readability/owned-term-cluster', severity: 'warning', line: 5 }
    ]
  );
});

test('prose check respects code-label and agency controlled-vocabulary exceptions', () => {
  const fixture = path.join(
    repoRoot,
    'packages/agency/test/fixtures/prose-quality/agency-controlled-vocabulary.svelte'
  );
  const result = spawnSync(process.execPath, [cliPath, 'check', fixture, '--format', 'json'], {
    cwd: repoRoot,
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'pass');
  assert.deepEqual(report.findings, []);
});

test('runtime rule identifiers are declared by the versioned policy artifact', () => {
  const policyPath = path.join(repoRoot, 'docs/policies/v1/policy.prose-quality.v1.json');
  assert(existsSync(policyPath), 'machine-readable prose policy is missing');
  const policy = JSON.parse(readFileSync(policyPath, 'utf8'));

  assert.equal(policy.policy_id, 'policy.prose-quality.v1');
  assert.equal(policy.version, 1);
  assert.equal(policy.enforcement.changed_files.blocking, true);
  assert.equal(policy.enforcement.full_audit.blocking, false);
  assert.equal(policy.judgment_signals.blocking, false);

  const declaredRuleIds = new Set([
    ...policy.deterministic_rules.map((rule) => rule.id),
    ...policy.contextual_rules.map((rule) => rule.id),
    ...policy.configuration_rules.map((rule) => rule.id),
    ...policy.judgment_signals.rules.map((rule) => rule.id)
  ]);
  for (const ruleId of [
    'marketing-jargon/cutting-edge',
    'marketing-jargon/ai-powered',
    'marketing-jargon/solutions',
    'marketing-jargon/leverage',
    'marketing-jargon/seamless',
    'configuration/invalid-ignore-marker',
    'readability/long-sentence',
    'readability/abstraction-density',
    'readability/owned-term-cluster'
  ]) {
    assert(declaredRuleIds.has(ruleId), `${ruleId} is missing from the prose policy`);
  }
  assert.equal(
    policy.overlays.agency.source,
    'packages/agency/scripts/check-public-copy.mjs#PUBLIC_COPY_RULES'
  );
});

test('invalid prose-ignore markers fail as deterministic configuration findings', () => {
  const result = runCli('check', 'invalid-ignore.md');

  assert.equal(result.status, 1, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'block');
  assert.equal(report.summary.blocking, 2);
  assert.deepEqual(
    report.findings.map(({ rule, severity, message }) => ({ rule, severity, message })),
    [
      {
        rule: 'configuration/invalid-ignore-marker',
        severity: 'error',
        message: 'A prose-ignore-start marker requires a teaching-example reason.'
      },
      {
        rule: 'configuration/invalid-ignore-marker',
        severity: 'error',
        message: 'A prose-ignore-start marker has no matching prose-ignore-end marker.'
      }
    ]
  );
});

test('explicit teaching examples are ignored and ambiguous terms stay review-only', () => {
  const result = runCli('check', 'contextual-and-ignored.md');

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'review');
  assert.equal(report.summary.blocking, 0);
  assert.equal(report.summary.review, 2);
  assert.deepEqual(
    report.findings.map(({ rule, severity, excerpt }) => ({ rule, severity, excerpt })),
    [
      { rule: 'marketing-jargon/leverage', severity: 'warning', excerpt: 'leverage' },
      { rule: 'marketing-jargon/solutions', severity: 'warning', excerpt: 'solutions' }
    ]
  );
});
