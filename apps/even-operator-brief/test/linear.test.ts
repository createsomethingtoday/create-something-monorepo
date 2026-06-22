import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatClaimPrompt,
  formatClaimResult,
  formatPrepResult,
  formatIssueDetail,
  formatLinearQueue,
  moveSelection,
  normalizeClaimResult,
  normalizeLinearQueue,
  normalizePrepResult
} from '../src/linear';

describe('linear queue formatting', () => {
  it('formats open Linear issues as a compact queue', () => {
    const queue = normalizeLinearQueue({
      generated_at: '2026-06-18T23:10:00.000Z',
      issues: [
        {
          identifier: 'CRE-701',
          title: 'Add Even G2 operator brief app',
          state: { name: 'In Progress' },
          assignee: 'Micah Johnson',
          primary_action: 'prep',
          action_label: 'Prepare handoff',
          reason: 'Started work likely needs continuation or handoff.'
        },
        {
          identifier: 'CRE-702',
          title: 'Review dashboard package',
          state: { name: 'Todo' },
          primary_action: 'claim'
        }
      ],
      primary_action: 'prep',
      confidence: 81
    });

    const content = formatLinearQueue(queue, 0);

    assert.match(content, /ROUTE 1\/2/);
    assert.match(content, /PREP 81%/);
    assert.match(content, />CRE-701 Add Even G2\.\.\./);
    for (const line of content.split('\n')) {
      assert.ok(line.length <= 24, line);
    }
  });

  it('formats an empty open queue', () => {
    assert.match(formatLinearQueue(normalizeLinearQueue({ issues: [] })), /No open CRE items/);
  });

  it('moves selection with wraparound', () => {
    const queue = normalizeLinearQueue({
      issues: [{ identifier: 'CRE-1' }, { identifier: 'CRE-2' }]
    });

    assert.equal(moveSelection(queue, 0, 1), 1);
    assert.equal(moveSelection(queue, 1, 1), 0);
    assert.equal(moveSelection(queue, 0, -1), 1);
  });

  it('formats detail and claim screens compactly', () => {
    const queue = normalizeLinearQueue({
      issues: [
        {
          identifier: 'CRE-701',
          title: 'Add Even G2 operator brief app',
          state: { name: 'In Progress' },
          assignee: 'Micah Johnson',
          project: 'Even',
          primary_action: 'prep',
          action_label: 'Prepare handoff'
        }
      ]
    });

    const detail = formatIssueDetail(queue, 0);
    const prompt = formatClaimPrompt(queue.issues?.[0] ?? null);
    const claimed = formatClaimResult(
      normalizeClaimResult({
        ok: true,
        claimed_by: 'Micah Johnson',
        issue: queue.issues?.[0]
      })
    );
    const prepped = formatPrepResult(
      normalizePrepResult({
        ok: true,
        issue: queue.issues?.[0],
        prep: {
          next_action: 'Review current owner state and continue the issue.'
        }
      })
    );

    assert.match(detail, /tap action/);
    assert.match(prompt, /PREP ISSUE/);
    assert.match(claimed, /CLAIMED/);
    assert.match(prepped, /PREP READY/);
    for (const content of [detail, prompt, claimed, prepped]) {
      for (const line of content.split('\n')) {
        assert.ok(line.length <= 24, line);
      }
    }
  });
});
