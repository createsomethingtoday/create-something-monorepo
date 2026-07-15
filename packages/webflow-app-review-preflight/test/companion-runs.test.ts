import { describe, expect, test } from 'vitest';
import {
  COMPANION_MISSIONS,
  createCompanionRun,
  finalizeCompanionRun,
  recordCompanionMission
} from '../src/index';

const VERSION = {
  reviewId: 'review-consent-pro',
  reviewVersionId: 'version-2',
  bundleSha256: 'a'.repeat(64)
};

describe('App Review Companion runs', () => {
  test('binds a developer run to all required missions without trusting a client verdict', () => {
    const run = createCompanionRun(VERSION, {
      runId: 'run-developer-1',
      actorRole: 'developer',
      executionAuthority: 'partner',
      policyVersion: 'companion-policy.v1',
      now: '2026-07-14T20:00:00.000Z'
    });

    expect(run).toMatchObject({
      schemaVersion: 'app_review_companion_run.v1',
      ...VERSION,
      status: 'ready',
      evidenceTrust: 'partner_supplied',
      officialDecision: null
    });
    expect(run.missions.map((mission) => mission.id)).toEqual(COMPANION_MISSIONS);
    expect(run.missions.every((mission) => mission.required && mission.status === 'pending')).toBe(
      true
    );

    expect(() =>
      recordCompanionMission(
        run,
        'install_authorize',
        {
          reviewVersionId: VERSION.reviewVersionId,
          evidenceTrust: 'webflow_observed',
          status: 'passed',
          evidenceDigest: 'b'.repeat(64),
          eventCount: 4,
          artifactCount: 1,
          observedAt: '2026-07-14T20:01:00.000Z'
        },
        { actorRole: 'developer', executionAuthority: 'partner' }
      )
    ).toThrow(/trust level/i);
  });

  test('blocks a final result until every required mission has matching evidence', () => {
    const authority = {
      actorRole: 'developer' as const,
      executionAuthority: 'partner' as const
    };
    let run = createCompanionRun(VERSION, {
      runId: 'run-developer-2',
      ...authority,
      policyVersion: 'companion-policy.v1',
      now: '2026-07-14T20:00:00.000Z'
    });
    for (const [index, mission] of COMPANION_MISSIONS.slice(0, 4).entries()) {
      run = recordCompanionMission(
        run,
        mission,
        {
          reviewVersionId: VERSION.reviewVersionId,
          evidenceTrust: 'partner_supplied',
          status: 'passed',
          evidenceDigest: String(index + 1).repeat(64),
          eventCount: 2,
          artifactCount: 0,
          observedAt: `2026-07-14T20:0${index + 1}:00.000Z`
        },
        authority
      );
    }

    expect(finalizeCompanionRun(run, authority, '2026-07-14T20:10:00.000Z').status).toBe(
      'blocked'
    );
  });
});
