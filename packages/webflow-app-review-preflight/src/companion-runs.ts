import type {
  CompanionActorRole,
  CompanionExecutionAuthority,
  CompanionMissionId,
  CompanionRun,
  RuntimeEvidenceTrust
} from './types';

export const COMPANION_MISSIONS = [
  'install_authorize',
  'configure',
  'publish',
  'production_runtime',
  'uninstall_cleanup'
] as const satisfies readonly CompanionMissionId[];

const SHA256 = /^[a-f0-9]{64}$/;

interface ReviewVersionBinding {
  reviewId: string;
  reviewVersionId: string;
  bundleSha256: string;
}

interface CompanionRunAuthority {
  runId: string;
  actorRole: CompanionActorRole;
  executionAuthority: CompanionExecutionAuthority;
  policyVersion: string;
  now: string;
  replayOfRunId?: string | null;
}

interface CompanionMissionInput {
  reviewVersionId: string;
  evidenceTrust: RuntimeEvidenceTrust;
  status: 'passed' | 'failed' | 'blocked';
  evidenceDigest: string;
  eventCount: number;
  artifactCount: number;
  observedAt: string;
}

function trustForAuthority(authority: CompanionExecutionAuthority): RuntimeEvidenceTrust {
  return authority === 'webflow' ? 'webflow_observed' : 'partner_supplied';
}

function assertAuthority(
  actorRole: CompanionActorRole,
  executionAuthority: CompanionExecutionAuthority
): void {
  if (
    (actorRole === 'developer' && executionAuthority !== 'partner') ||
    (actorRole === 'reviewer' && executionAuthority !== 'webflow')
  ) {
    throw new Error('Companion actor role does not match the server execution authority.');
  }
}

function validDate(value: string): boolean {
  return value.length > 0 && Number.isFinite(Date.parse(value));
}

export function createCompanionRun(
  binding: ReviewVersionBinding,
  authority: CompanionRunAuthority
): CompanionRun {
  assertAuthority(authority.actorRole, authority.executionAuthority);
  if (
    !binding.reviewId ||
    !binding.reviewVersionId ||
    !SHA256.test(binding.bundleSha256) ||
    !authority.runId ||
    !authority.policyVersion ||
    !validDate(authority.now)
  ) {
    throw new Error('Companion run requires an exact review-version binding.');
  }

  return {
    schemaVersion: 'app_review_companion_run.v1',
    id: authority.runId,
    ...binding,
    actorRole: authority.actorRole,
    evidenceTrust: trustForAuthority(authority.executionAuthority),
    policyVersion: authority.policyVersion,
    status: 'ready',
    missions: COMPANION_MISSIONS.map((id) => ({
      id,
      required: true,
      status: 'pending',
      receipt: null,
      approvedNotApplicableReason: null
    })),
    replayOfRunId: authority.replayOfRunId ?? null,
    officialDecision: null,
    createdAt: authority.now,
    updatedAt: authority.now
  };
}

export function recordCompanionMission(
  run: CompanionRun,
  missionId: CompanionMissionId,
  input: CompanionMissionInput,
  authority: Pick<CompanionRunAuthority, 'actorRole' | 'executionAuthority'>
): CompanionRun {
  assertAuthority(authority.actorRole, authority.executionAuthority);
  const expectedTrust = trustForAuthority(authority.executionAuthority);
  if (run.actorRole !== authority.actorRole || run.evidenceTrust !== expectedTrust) {
    throw new Error('Companion run authority does not match the server session.');
  }
  if (input.evidenceTrust !== expectedTrust) {
    throw new Error('The browser cannot choose or elevate its evidence trust level.');
  }
  if (input.reviewVersionId !== run.reviewVersionId) {
    throw new Error('Mission evidence does not match the bound review version.');
  }
  if (
    !SHA256.test(input.evidenceDigest) ||
    !Number.isInteger(input.eventCount) ||
    input.eventCount < 1 ||
    !Number.isInteger(input.artifactCount) ||
    input.artifactCount < 0 ||
    !validDate(input.observedAt)
  ) {
    throw new Error('Mission evidence receipt is invalid.');
  }

  const mission = run.missions.find((candidate) => candidate.id === missionId);
  if (!mission) throw new Error('Mission is not part of the active policy.');

  const missions = run.missions.map((candidate) =>
    candidate.id === missionId
      ? {
          ...candidate,
          status: input.status,
          receipt: {
            evidenceDigest: input.evidenceDigest,
            eventCount: input.eventCount,
            artifactCount: input.artifactCount,
            observedAt: input.observedAt,
            evidenceTrust: expectedTrust
          }
        }
      : candidate
  );
  const requiredComplete = missions.every(
    (candidate) => candidate.status === 'passed' || candidate.status === 'not_applicable'
  );
  const hasFailed = missions.some((candidate) => candidate.status === 'failed');
  const hasBlocked = missions.some((candidate) => candidate.status === 'blocked');

  return {
    ...run,
    missions,
    status: requiredComplete
      ? 'validated'
      : hasFailed
        ? 'failed'
        : hasBlocked
          ? 'blocked'
          : 'running',
    updatedAt: input.observedAt
  };
}

export function finalizeCompanionRun(
  run: CompanionRun,
  authority: Pick<CompanionRunAuthority, 'actorRole' | 'executionAuthority'>,
  now: string
): CompanionRun {
  assertAuthority(authority.actorRole, authority.executionAuthority);
  const expectedTrust = trustForAuthority(authority.executionAuthority);
  if (
    run.actorRole !== authority.actorRole ||
    run.evidenceTrust !== expectedTrust ||
    !validDate(now)
  ) {
    throw new Error('Companion run authority does not match the server session.');
  }
  const complete = run.missions.every(
    (mission) =>
      (mission.status === 'passed' && mission.receipt?.evidenceTrust === expectedTrust) ||
      (mission.status === 'not_applicable' && Boolean(mission.approvedNotApplicableReason))
  );
  return { ...run, status: complete ? 'validated' : 'blocked', updatedAt: now };
}
