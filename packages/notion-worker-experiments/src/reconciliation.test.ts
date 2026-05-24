import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  reconcileAgencyOpsSnapshot,
  sampleAgencyOpsSnapshot,
  type AgencyOpsSnapshot
} from './reconciliation.js';

describe('reconcileAgencyOpsSnapshot', () => {
  it('flags status drift, missing evidence, and stale active engagements', () => {
    const findings = reconcileAgencyOpsSnapshot(sampleAgencyOpsSnapshot(), {
      now: new Date('2026-05-22T12:00:00Z')
    });

    assert.deepEqual(
      findings.map((finding) => finding.kind),
      [
        'task-linear-status-drift',
        'linear-pm-reference-missing',
        'deliverable-evidence-missing',
        'engagement-actions-missing',
        'engagement-review-stale'
      ]
    );
  });

  it('does not flag a clean snapshot', () => {
    const snapshot: AgencyOpsSnapshot = {
      linearIssues: [
        {
          identifier: 'CRE-1',
          title: 'Complete PM handoff',
          url: 'https://linear.app/createsomething/issue/CRE-1/complete-pm-handoff',
          status: 'Done',
          statusType: 'completed',
          labels: ['linear-coordination']
        }
      ],
      notionTasks: [
        {
          action: 'Complete PM handoff',
          status: 'Done',
          source: 'Linear',
          linearIssueUrl: 'https://linear.app/createsomething/issue/CRE-1/complete-pm-handoff'
        }
      ],
      deliverables: [
        {
          name: 'PM handoff',
          status: 'Review',
          evidenceCount: 1
        }
      ],
      engagements: [
        {
          name: 'Agency Ops PM',
          status: 'Active',
          taskCount: 1,
          lastPmReview: '2026-05-21'
        }
      ]
    };

    assert.equal(
      reconcileAgencyOpsSnapshot(snapshot, {
        now: new Date('2026-05-22T12:00:00Z')
      }).length,
      0
    );
  });
});
