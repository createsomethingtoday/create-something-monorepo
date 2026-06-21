import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { compactText, formatBriefScreen, normalizeBrief } from '../src/brief';

describe('operator brief formatting', () => {
  it('normalizes bridge payloads into display-safe brief data', () => {
    const brief = normalizeBrief({
      headline: 'OPERATOR PRIORITY',
      line1: 'Ship Even G2 operator surface',
      line2: 'Needs package-local validation',
      action: 'Run check and build',
      signal: 'linear',
      counts: { active_alerts: 2, poor_health: 1 },
      source_links: [
        { kind: 'linear', label: 'CRE-701', url: 'https://linear.app/example' },
        { kind: 'codex', label: 'current thread' }
      ]
    });

    assert.equal(brief.headline, 'OPERATOR PRIORITY');
    assert.equal(brief.counts?.active_alerts, 2);
    assert.equal(brief.source_links?.[0]?.kind, 'linear');
  });

  it('formats the home screen around focus, risk, and next action', () => {
    const content = formatBriefScreen(
      normalizeBrief({
        headline: 'OPERATOR PRIORITY',
        line1: 'Review dashboard health',
        line2: 'Dify proof is stale',
        action: 'Run inventory check',
        signal: 'health'
      }),
      'home'
    );

    assert.match(content, /OPERATOR PRIORITY/);
    assert.match(content, /Review dashboard health/);
    assert.match(content, /Next: Run inventory\.\.\./);
  });

  it('compacts long strings for the G2 canvas', () => {
    assert.equal(compactText('abcdefghijklmnopqrstuvwxyz', 10), 'abcdefg...');
  });

  it('keeps the home screen within the phone install viewport', () => {
    const content = formatBriefScreen(
      normalizeBrief({
        headline: 'HEALTH ATTENTION',
        line1: 'CREATE SOMETHING health',
        line2: '2 poor, 5 stale health checks',
        action: 'Review agent/MCP health source',
        urgent: true,
        signal: 'operator',
        clock: { display_time: '6:10 PM' }
      }),
      'home'
    );

    assert.doesNotMatch(content, /HEALTH ATTENTION\nATTENTION/);
    for (const line of content.split('\n')) {
      assert.ok(line.length <= 24, line);
    }
  });
});
