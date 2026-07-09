import { describe, expect, it } from 'vitest';

import { runScan } from './scan';
import { defaultConfig } from '../policy/default-config';
import type { FileEntry, Ruleset, ScanConfig, ScanRule } from '../types';

const noop = () => {};

function file(overrides: Partial<FileEntry> & { path: string; content: string }): FileEntry {
  return {
    sizeBytes: overrides.content.length,
    ext: overrides.path.slice(overrides.path.lastIndexOf('.')).toLowerCase(),
    isTextCandidate: true,
    tags: [],
    isIgnored: false,
    ...overrides
  };
}

function ruleset(rules: ScanRule[]): Ruleset {
  return {
    schemaVersion: 'test@1.0.0',
    rulesetVersion: '1.0.0-test',
    rules
  };
}

function rule(overrides: Partial<ScanRule> & { ruleId: string; matchers: ScanRule['matchers'] }): ScanRule {
  return {
    name: overrides.ruleId,
    category: 'SECURITY',
    reviewBucket: 'ACTION_REQUIRED',
    severity: 'HIGH',
    disposition: 'ACTION_REQUIRED',
    description: 'test rule',
    ...overrides
  };
}

describe('runScan', () => {
  it('produces a finding with correct location and trigger token', () => {
    const inventory = [file({ path: 'src/app.js', content: 'const x = 1;\neval(userInput);' })];
    const rs = ruleset([
      rule({
        ruleId: 'SEC-DCE',
        category: 'NETWORK', // avoid redaction masking so we can assert the raw token
        matchers: [{ id: 'm1', type: 'regex', pattern: 'eval\\([^)]*\\)', fileGlobs: ['**/*.js'] }]
      })
    ]);

    const findings = runScan(inventory, rs, defaultConfig, noop);

    expect(findings).toHaveLength(1);
    const [f] = findings;
    expect(f?.ruleId).toBe('SEC-DCE');
    expect(f?.filePath).toBe('src/app.js');
    expect(f?.line).toBe(2);
    expect(f?.col).toBe(1);
    expect(f?.triggerToken).toBe('eval(userInput)');
    expect(f?.locationType).toBe('CODE');
  });

  it('skips ignored, non-text, and content-less files', () => {
    const inventory = [
      file({ path: 'a.js', content: 'eval(x)', isIgnored: true }),
      file({ path: 'b.js', content: 'eval(x)', isTextCandidate: false }),
      { path: 'c.js', sizeBytes: 0, ext: '.js', isTextCandidate: true, tags: [], isIgnored: false } as FileEntry
    ];
    const rs = ruleset([
      rule({ ruleId: 'R', matchers: [{ id: 'm', type: 'regex', pattern: 'eval', fileGlobs: [] }] })
    ]);

    expect(runScan(inventory, rs, defaultConfig, noop)).toHaveLength(0);
  });

  it('respects matcher fileGlobs', () => {
    const inventory = [
      file({ path: 'src/app.js', content: 'eval(x)' }),
      file({ path: 'src/styles.css', content: 'eval(x)' })
    ];
    const rs = ruleset([
      rule({ ruleId: 'R', matchers: [{ id: 'm', type: 'regex', pattern: 'eval', fileGlobs: ['**/*.js'] }] })
    ]);

    const findings = runScan(inventory, rs, defaultConfig, noop);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.filePath).toBe('src/app.js');
  });

  it('honors allowlistPatterns to suppress a match', () => {
    const inventory = [file({ path: 'app.js', content: 'eval(safeThing)' })];
    const rs = ruleset([
      rule({
        ruleId: 'R',
        matchers: [{ id: 'm', type: 'regex', pattern: 'eval\\([^)]*\\)', fileGlobs: [], allowlistPatterns: ['safeThing'] }]
      })
    ]);

    expect(runScan(inventory, rs, defaultConfig, noop)).toHaveLength(0);
  });

  it('enforces maxMatchesPerFile', () => {
    const inventory = [file({ path: 'app.js', content: 'x x x x x' })];
    const rs = ruleset([rule({ ruleId: 'R', matchers: [{ id: 'm', type: 'regex', pattern: 'x', fileGlobs: [] }] })]);
    const config: ScanConfig = { ...defaultConfig, limits: { maxMatchesPerFile: 2, maxMatchesPerRule: 500 } };

    expect(runScan(inventory, rs, config, noop)).toHaveLength(2);
  });

  it('enforces maxMatchesPerRule across files', () => {
    const inventory = [
      file({ path: 'a.js', content: 'x x' }),
      file({ path: 'b.js', content: 'x x' })
    ];
    const rs = ruleset([rule({ ruleId: 'R', matchers: [{ id: 'm', type: 'regex', pattern: 'x', fileGlobs: [] }] })]);
    const config: ScanConfig = { ...defaultConfig, limits: { maxMatchesPerFile: 100, maxMatchesPerRule: 3 } };

    expect(runScan(inventory, rs, config, noop)).toHaveLength(3);
  });

  it('downgrades confidence to LOW for minified/generated files', () => {
    const inventory = [file({ path: 'bundle.js', content: 'eval(x)', tags: ['MINIFIED_FILE'] })];
    const rs = ruleset([
      rule({
        ruleId: 'R',
        matchers: [{ id: 'm', type: 'regex', pattern: 'eval', fileGlobs: [], confidence: 'HIGH' }]
      })
    ]);

    const [f] = runScan(inventory, rs, defaultConfig, noop);
    expect(f?.confidence).toBe('LOW');
    expect(f?.confidenceReason).toBe('Generated/Minified Code');
  });

  it('marks matches inside comments as COMMENT with LOW confidence', () => {
    const inventory = [file({ path: 'app.js', content: '// eval(x) is dangerous' })];
    const rs = ruleset([
      rule({ ruleId: 'R', matchers: [{ id: 'm', type: 'regex', pattern: 'eval', fileGlobs: [], confidence: 'HIGH' }] })
    ]);

    const [f] = runScan(inventory, rs, defaultConfig, noop);
    expect(f?.locationType).toBe('COMMENT');
    expect(f?.confidence).toBe('LOW');
  });

  it('applies conditional overrides based on snippet context', () => {
    const inventory = [file({ path: 'app.js', content: 'eval(dangerousPayload)' })];
    const rs = ruleset([
      rule({
        ruleId: 'R',
        category: 'NETWORK',
        severity: 'MEDIUM',
        matchers: [
          {
            id: 'm',
            type: 'regex',
            pattern: 'eval\\([^)]*\\)',
            fileGlobs: [],
            conditionalOverrides: [
              { pattern: 'dangerous', newSeverity: 'BLOCKER', newReviewBucket: 'AUTO_REJECT', note: 'escalated' }
            ]
          }
        ]
      })
    ]);

    const [f] = runScan(inventory, rs, defaultConfig, noop);
    expect(f?.severity).toBe('BLOCKER');
    expect(f?.reviewBucket).toBe('AUTO_REJECT');
    expect(f?.confidenceReason).toBe('escalated');
  });

  it('redacts long matches in SECURITY snippets', () => {
    const secret = 'sk_live_ABCDEFGHIJKLMNOP';
    const inventory = [file({ path: 'app.js', content: `const key = "${secret}";` })];
    const rs = ruleset([
      rule({
        ruleId: 'SEC-SECRET',
        category: 'SECURITY',
        matchers: [{ id: 'm', type: 'regex', pattern: 'sk_live_[A-Za-z0-9]+', fileGlobs: [] }]
      })
    ]);

    const [f] = runScan(inventory, rs, defaultConfig, noop);
    expect(f?.snippet).not.toContain(secret);
    expect(f?.snippet).toContain('sk_l***MNOP');
  });

  it('classifies location by file type (json string, source map, test)', () => {
    const inventory = [
      file({ path: 'data.json', content: '{"cmd":"eval"}', ext: '.json' }),
      file({ path: 'vendor.js.map', content: 'eval', ext: '.map', tags: ['SOURCE_MAP'] }),
      file({ path: 'app.test.js', content: 'eval(x)' })
    ];
    const rs = ruleset([rule({ ruleId: 'R', matchers: [{ id: 'm', type: 'regex', pattern: 'eval', fileGlobs: [] }] })]);

    const findings = runScan(inventory, rs, defaultConfig, noop);
    const byPath = Object.fromEntries(findings.map((f) => [f.filePath, f.locationType]));
    expect(byPath['data.json']).toBe('STRING');
    expect(byPath['vendor.js.map']).toBe('SOURCE_MAP');
    expect(byPath['app.test.js']).toBe('TEST');
  });
});
