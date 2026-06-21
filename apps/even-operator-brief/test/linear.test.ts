import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatClaimPrompt,
  formatClaimResult,
  formatIssueDetail,
  formatLinearQueue,
  moveSelection,
  normalizeClaimResult,
  normalizeLinearQueue
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
          assignee: 'Micah Johnson'
        },
        {
          identifier: 'CRE-702',
          title: 'Review dashboard package',
          state: { name: 'Todo' }
        }
      ]
    });

    const content = formatLinearQueue(queue, 0);

    assert.match(content, /LINEAR OPEN 1\/2/);
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
          project: 'Even'
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

    assert.match(detail, /tap claim/);
    assert.match(prompt, /CLAIM ISSUE/);
    assert.match(claimed, /CLAIMED/);
    for (const content of [detail, prompt, claimed]) {
      for (const line of content.split('\n')) {
        assert.ok(line.length <= 24, line);
      }
    }
  });
});
