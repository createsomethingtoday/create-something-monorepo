import {
  parseRunHistoryJsonl,
  type RunHistoryRecord,
} from '@create-something/flue-service-agent/mcp-resource-core';

export type GovernedRunHistoryRecord = RunHistoryRecord & {
  governance: NonNullable<RunHistoryRecord['governance']>;
};

export interface FlueRunHistoryGovernanceIssue {
  path: string;
  message: string;
}

export interface FlueRunHistoryGovernanceSummary {
  tier: GovernedRunHistoryRecord['governance']['tier'];
  evidenceCount: number;
  validationStatus: GovernedRunHistoryRecord['governance']['validation']['status'];
  rollback: string;
}

export interface FlueRunHistoryGovernanceOptions {
  source?: string;
}

const LINEAR_ISSUE_PATTERN = /^CRE-\d+$/;

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function defaultValidationStatus(record: RunHistoryRecord): GovernedRunHistoryRecord['governance']['validation']['status'] {
  if (record.status === 'blocked') return 'failed';
  if (record.status === 'review_required') return 'review_required';
  return 'passed';
}

export function normalizeFlueRunHistoryRecordGovernance(
  record: RunHistoryRecord,
): GovernedRunHistoryRecord {
  const governance = record.governance ?? {
    tier: 'automation' as const,
    evidence: [
      { kind: 'validation_command', path: record.validationCommand },
      ...(record.issue ? [{ kind: 'linear_issue', path: record.issue }] : []),
      ...record.artifacts,
    ],
    validation: {
      command: record.validationCommand,
      status: defaultValidationStatus(record),
      checkedAt: record.checkedAt,
    },
    rollback: record.guardrails.rollbackNote,
  };

  return { ...record, governance };
}

export function parseFlueRunHistoryRecordJson(
  recordJson: string,
  source = 'flue.run_history.record_json',
): GovernedRunHistoryRecord {
  let parsed: unknown;

  try {
    parsed = JSON.parse(recordJson);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid Flue run-history JSON at ${source}: ${message}`);
  }

  const records = parseRunHistoryJsonl(JSON.stringify(parsed), source);
  if (records.length !== 1) {
    throw new Error(`Expected exactly one Flue run-history record at ${source}; got ${records.length}`);
  }

  return assertFlueRunHistoryRecordGoverned(records[0] as RunHistoryRecord, { source });
}

export function createFlueRunHistoryGovernanceSummary(
  record: GovernedRunHistoryRecord,
): FlueRunHistoryGovernanceSummary {
  return {
    tier: record.governance.tier,
    evidenceCount: record.governance.evidence.length,
    validationStatus: record.governance.validation.status,
    rollback: record.governance.rollback,
  };
}

export function getFlueRunHistoryGovernanceIssues(
  record: RunHistoryRecord,
  options: FlueRunHistoryGovernanceOptions = {},
): FlueRunHistoryGovernanceIssue[] {
  const governed = normalizeFlueRunHistoryRecordGovernance(record);
  const source = options.source ?? governed.runId;
  const issues: FlueRunHistoryGovernanceIssue[] = [];

  if (!nonEmpty(governed.issue) || !LINEAR_ISSUE_PATTERN.test(governed.issue)) {
    issues.push({
      path: `${source}.issue`,
      message: 'Expected a Linear issue ID like CRE-123.',
    });
  }

  if (!nonEmpty(governed.validationCommand)) {
    issues.push({
      path: `${source}.validationCommand`,
      message: 'Expected the command that produced this run-history record.',
    });
  }

  if (!nonEmpty(governed.governance.tier)) {
    issues.push({
      path: `${source}.governance.tier`,
      message: 'Expected one Three-Tier Framework tier: database, automation, or judgment.',
    });
  }

  if (governed.governance.evidence.length === 0) {
    issues.push({
      path: `${source}.governance.evidence`,
      message: 'Expected at least one evidence reference.',
    });
  }

  governed.governance.evidence.forEach((evidence, index) => {
    if (!nonEmpty(evidence.kind)) {
      issues.push({
        path: `${source}.governance.evidence[${index}].kind`,
        message: 'Expected an evidence kind.',
      });
    }
    if (!nonEmpty(evidence.path)) {
      issues.push({
        path: `${source}.governance.evidence[${index}].path`,
        message: 'Expected an evidence path, URI, command, or issue reference.',
      });
    }
  });

  if (!nonEmpty(governed.governance.validation.command)) {
    issues.push({
      path: `${source}.governance.validation.command`,
      message: 'Expected the validation command or gate name.',
    });
  }

  if (!nonEmpty(governed.governance.validation.checkedAt)) {
    issues.push({
      path: `${source}.governance.validation.checkedAt`,
      message: 'Expected the validation timestamp.',
    });
  }

  if (governed.guardrails.deployable && governed.governance.validation.status !== 'passed') {
    issues.push({
      path: `${source}.governance.validation.status`,
      message: 'Deployable records must have passed validation.',
    });
  }

  if (governed.guardrails.deployable && governed.status !== 'ready') {
    issues.push({
      path: `${source}.status`,
      message: 'Deployable records must have ready status.',
    });
  }

  if (governed.guardrails.deployable && governed.runtime.deploymentTarget !== 'cloudflare') {
    issues.push({
      path: `${source}.runtime.deploymentTarget`,
      message: 'Deployable Flue service-agent records must target cloudflare.',
    });
  }

  if (governed.runtime.deploymentTarget === 'cloudflare' && !governed.readiness.cloudflare) {
    issues.push({
      path: `${source}.readiness.cloudflare`,
      message: 'Cloudflare-targeted records must include Cloudflare readiness evidence.',
    });
  }

  if (!nonEmpty(governed.governance.rollback)) {
    issues.push({
      path: `${source}.governance.rollback`,
      message: 'Expected a rollback note.',
    });
  }

  if (!nonEmpty(governed.guardrails.rollbackNote)) {
    issues.push({
      path: `${source}.guardrails.rollbackNote`,
      message: 'Expected guardrail rollback guidance.',
    });
  }

  if (!nonEmpty(governed.guardrails.secretsLocation)) {
    issues.push({
      path: `${source}.guardrails.secretsLocation`,
      message: 'Expected the approved secret storage location.',
    });
  }

  return issues;
}

export function assertFlueRunHistoryRecordGoverned(
  record: RunHistoryRecord,
  options: FlueRunHistoryGovernanceOptions = {},
): GovernedRunHistoryRecord {
  const governed = normalizeFlueRunHistoryRecordGovernance(record);
  const issues = getFlueRunHistoryGovernanceIssues(governed, options);

  if (issues.length > 0) {
    const details = issues.map((issue) => `- ${issue.path}: ${issue.message}`).join('\n');
    throw new Error(`Flue run-history record failed governance validation:\n${details}`);
  }

  return governed;
}

export function assertFlueRunHistoryRecordsGoverned(
  records: RunHistoryRecord[],
  options: FlueRunHistoryGovernanceOptions = {},
): GovernedRunHistoryRecord[] {
  return records.map((record, index) =>
    assertFlueRunHistoryRecordGoverned(record, {
      ...options,
      source: `${options.source ?? 'flue.run_history'}:${index + 1}`,
    }),
  );
}
