import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { link, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import Ajv from 'ajv';
import { SymphonyError } from './errors.js';

export const CANONICAL_HARNESS_RECEIPT_VERSION = 'canonical-harness-receipt.v1';

const receipt_schema = JSON.parse(readFileSync(
  new URL('../schemas/canonical-harness-receipt.v1.schema.json', import.meta.url),
  'utf8',
));
const validate_receipt_schema = new Ajv({ allErrors: true, strict: true }).compile(receipt_schema);

function format_schema_error(error) {
  const path = error.instancePath || '/';
  if (error.keyword === 'additionalProperties') {
    return `schema ${path} must NOT have additional property: ${error.params.additionalProperty}`;
  }
  return `schema ${path} ${error.message ?? 'is invalid'}`;
}

function has_acceptance_evidence(value) {
  return Array.isArray(value?.criteria)
    && value.criteria.length > 0
    && Array.isArray(value?.results)
    && value.results.length > 0;
}

function has_source_evidence(value) {
  const changed = Array.isArray(value?.changed_paths)
    && value.changed_paths.length > 0
    && typeof value?.before_fingerprint === 'string'
    && value.before_fingerprint.length > 0
    && typeof value?.after_fingerprint === 'string'
    && value.after_fingerprint.length > 0;
  const no_op = value?.no_op?.verified === true;
  return changed || no_op;
}

function source_blockers(value) {
  if (!value || typeof value !== 'object') return [];
  const changed_paths = Array.isArray(value.changed_paths) ? value.changed_paths : [];
  const has_changes = changed_paths.length > 0;
  const claims_no_op = value.no_op !== null && value.no_op !== undefined;
  const blockers = [];
  if (has_changes && claims_no_op) {
    blockers.push('source evidence must describe changed paths or a verified no-op, not both');
  }
  if (has_changes && value.before_fingerprint === value.after_fingerprint) {
    blockers.push('changed source requires different before and after fingerprints');
  }
  if (
    claims_no_op
    && (
      value.no_op?.verified !== true
      || changed_paths.length !== 0
      || value.before_fingerprint !== value.after_fingerprint
    )
  ) {
    blockers.push('verified no-op requires unchanged source fingerprints and zero changed paths');
  }
  return blockers;
}

function acceptance_blockers(value) {
  if (!has_acceptance_evidence(value)) return [];
  const blockers = [];
  const declared_ids = new Set(value.criteria.map((criterion) => criterion?.id));
  if (declared_ids.size !== value.criteria.length) {
    blockers.push('acceptance criterion ids must be unique');
  }
  for (const criterion of value.criteria) {
    const results = value.results.filter((entry) => entry?.criterion_id === criterion?.id);
    if (results.length !== 1) {
      blockers.push(`acceptance criterion ${criterion?.id ?? '<unknown>'} must have exactly one result`);
    }
    if (results.length !== 1 || results[0].status !== 'passed') {
      blockers.push(`acceptance criterion ${criterion?.id ?? '<unknown>'} did not pass`);
    }
  }
  for (const result of value.results) {
    if (!declared_ids.has(result?.criterion_id)) {
      blockers.push(`acceptance result ${result?.criterion_id ?? '<unknown>'} has no declared criterion`);
    }
  }
  return blockers;
}

function same_paths(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  return isDeepStrictEqual([...new Set(left)].sort(), [...new Set(right)].sort());
}

function passed_stage(value) {
  return value?.status === 'passed'
    && Array.isArray(value?.commands)
    && value.commands.length > 0
    && value.commands.every((command) => command?.exit_code === 0);
}

function stage_identity_blockers(candidate, stage_name) {
  const stage = candidate.stages?.[stage_name];
  if (!stage) return [];
  const blockers = [];
  if (stage.role !== stage_name) {
    blockers.push(`${stage_name} receipt must declare role ${stage_name}`);
  }
  if (stage.run_id !== candidate.run_id) {
    blockers.push(`${stage_name} receipt must target canonical run ${candidate.run_id ?? '<missing>'}`);
  }
  if (stage.linear?.issue !== candidate.linear?.issue) {
    blockers.push(`${stage_name} receipt must target Linear issue ${candidate.linear?.issue ?? '<missing>'}`);
  }
  return blockers;
}

function reviewed_evidence_ok(value) {
  return value?.required === true
    && value?.independent === true
    && value?.sandbox === 'read-only'
    && typeof value?.before === 'string'
    && value.before.length > 0
    && value.before === value?.after
    && value?.unchanged === true
    && Array.isArray(value?.findings);
}

function lane_blockers(candidate) {
  const level = candidate.routing?.autonomy_level;
  const lane = candidate.routing?.lane;
  const blockers = [];
  const expected_lane = {
    A0: 'scout',
    A1: 'solo',
    A2: 'reviewed',
    A3: 'reviewed',
    A4: 'escalation',
  }[level];
  if (expected_lane && lane !== expected_lane) {
    blockers.push(`${level} requires lane ${expected_lane}`);
  }
  const permitted_stages = {
    A0: ['scout'],
    A1: ['worker'],
    A2: ['worker', 'reviewer', 'integrator'],
    A3: ['worker', 'reviewer', 'integrator'],
    A4: [],
  }[level];
  for (const stage_name of ['scout', 'worker', 'reviewer', 'integrator']) {
    blockers.push(...stage_identity_blockers(candidate, stage_name));
    if (
      Array.isArray(permitted_stages)
      && candidate.stages?.[stage_name] != null
      && !permitted_stages.includes(stage_name)
    ) {
      blockers.push(`${level} does not permit a ${stage_name} receipt`);
    }
  }
  const execution_stage_name = level === 'A0' ? 'scout' : 'worker';
  const execution_stage = candidate.stages?.[execution_stage_name];
  if (['A0', 'A1', 'A2', 'A3'].includes(level) && !passed_stage(execution_stage)) {
    blockers.push(`${level} requires a passed ${execution_stage_name} receipt`);
  }
  if (['A0', 'A1', 'A2', 'A3'].includes(level) && passed_stage(execution_stage)) {
    const execution_stage_paths = Array.isArray(execution_stage.changed_paths)
      ? execution_stage.changed_paths
      : [];
    const integrator_paths = Array.isArray(candidate.stages?.integrator?.changed_paths)
      ? candidate.stages.integrator.changed_paths
      : [];
    const execution_paths = [
      ...execution_stage_paths,
      ...(['A2', 'A3'].includes(level) ? integrator_paths : []),
    ];
    if (!same_paths(execution_paths, candidate.source?.changed_paths)) {
      blockers.push('execution changed paths must match source changed paths');
    }
  }
  if (
    Array.isArray(candidate.review?.findings)
    && candidate.review.findings.some((finding) => finding?.status === 'actionable')
  ) {
    blockers.push('actionable review findings must be resolved before done');
  }
  if (['A2', 'A3'].includes(level)) {
    if (!passed_stage(candidate.stages?.reviewer) || !passed_stage(candidate.stages?.integrator)) {
      blockers.push(`${level} requires passed reviewer and integrator receipts`);
    }
    if (!reviewed_evidence_ok(candidate.review)) {
      blockers.push(`${level} requires independent read-only review with an unchanged fingerprint`);
    }
    if ((candidate.stages?.reviewer?.changed_paths?.length ?? 0) !== 0) {
      blockers.push('reviewer receipt must have zero changed paths');
    }
  }
  if (level === 'A3') {
    const promotion = candidate.promotion;
    const targets = [promotion?.packet?.target, promotion?.live?.target, promotion?.rollback?.target];
    if (
      promotion?.packet?.status !== 'passed'
      || promotion?.live?.status !== 'passed'
      || promotion?.rollback?.status !== 'passed'
      || targets.some((target) => typeof target !== 'string' || target.length === 0)
      || new Set(targets).size !== 1
    ) {
      blockers.push('A3 requires matching passed promotion packet, live proof, and rollback proof');
    }
  }
  if (level === 'A2' && candidate.promotion?.rollback?.status !== 'passed') {
    blockers.push('A2 requires passed rollback proof');
  }
  if (level === 'A0' && candidate.source?.no_op?.verified !== true) {
    blockers.push('A0 is read-only and requires verified no-op source evidence');
  }
  if (level === 'A4') {
    blockers.push('A4 always requires an operator decision and is never eligible for autonomous done');
  }
  return blockers;
}

export function evaluate_canonical_harness_receipt(input, options = {}) {
  const candidate = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const blockers = [];

  if (candidate.schema_version !== CANONICAL_HARNESS_RECEIPT_VERSION) {
    blockers.push(`input.schema_version must be ${CANONICAL_HARNESS_RECEIPT_VERSION}`);
  }
  if (Object.hasOwn(candidate, 'eligible_for_done')) {
    blockers.push('input.eligible_for_done is computed by the canonical gate');
  }
  if (Object.hasOwn(candidate, 'blockers')) {
    blockers.push('input.blockers is computed by the canonical gate');
  }
  if (Object.hasOwn(candidate, 'schema_validation')) {
    blockers.push('input.schema_validation is computed by the canonical gate');
  }
  if (!has_acceptance_evidence(candidate.acceptance)) {
    blockers.push('acceptance evidence is required');
  }
  if (candidate.status !== 'passed') {
    blockers.push('canonical outcome status must be passed');
  }
  if (candidate.outcome?.delivered !== true) {
    blockers.push('canonical outcome must be delivered');
  }
  blockers.push(...acceptance_blockers(candidate.acceptance));
  blockers.push(...lane_blockers(candidate));
  if (options.issue_identifier && candidate.linear?.issue !== options.issue_identifier) {
    blockers.push(`receipt issue ${candidate.linear?.issue ?? '<missing>'} does not match completion issue ${options.issue_identifier}`);
  }
  if (!has_source_evidence(candidate.source)) {
    blockers.push('source diff or verified no-op evidence is required');
  }
  blockers.push(...source_blockers(candidate.source));

  const {
    eligible_for_done: _caller_eligibility,
    blockers: _caller_blockers,
    schema_validation: _caller_schema_validation,
    ...evidence
  } = candidate;
  const receipt = {
    ...evidence,
    schema_version: CANONICAL_HARNESS_RECEIPT_VERSION,
    schema_validation: { ok: true, errors: [] },
    eligible_for_done: false,
    blockers: [],
  };
  const schema_ok = validate_receipt_schema(receipt);
  const schema_errors = schema_ok ? [] : validate_receipt_schema.errors.map(format_schema_error);
  blockers.push(...schema_errors);
  receipt.schema_validation = { ok: schema_errors.length === 0, errors: schema_errors };
  receipt.eligible_for_done = blockers.length === 0;
  receipt.blockers = [...new Set(blockers)];
  return receipt;
}

export function verify_canonical_harness_receipt(receipt, options = {}) {
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
    return { ok: false, errors: ['persisted receipt must be a JSON object'], receipt: null };
  }

  const schema_ok = validate_receipt_schema(receipt);
  const errors = schema_ok ? [] : validate_receipt_schema.errors.map(format_schema_error);
  const {
    schema_validation: _schema_validation,
    eligible_for_done: _eligible_for_done,
    blockers: _blockers,
    ...candidate
  } = receipt;
  const recomputed = evaluate_canonical_harness_receipt(candidate, {
    issue_identifier: options.issue_identifier,
  });

  if (!isDeepStrictEqual(receipt.schema_validation, recomputed.schema_validation)) {
    errors.push('persisted schema_validation does not match the gate computation');
  }
  if (receipt.eligible_for_done !== recomputed.eligible_for_done) {
    errors.push('persisted eligible_for_done does not match the gate computation');
  }
  if (!isDeepStrictEqual(receipt.blockers, recomputed.blockers)) {
    errors.push('persisted blockers do not match the gate computation');
  }
  if (options.expected_receipt && !isDeepStrictEqual(receipt, options.expected_receipt)) {
    errors.push('persisted receipt does not match the receipt published by this completion attempt');
  }

  return { ok: errors.length === 0, errors: [...new Set(errors)], receipt: recomputed };
}

export class CanonicalHarnessGate {
  constructor(options = {}) {
    this.tracker = options.tracker;
    this.output_root = resolve(options.output_root ?? join(process.cwd(), 'output/canonical-agent-harness/runs'));
    this.file_operations = options.file_operations ?? { link, mkdir, readFile, realpath, rm, writeFile };
    this.random_id = options.random_id ?? randomUUID;
    this.logger = options.logger ?? { warn() {} };
  }

  receipt_path(run_id) {
    if (typeof run_id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(run_id)) {
      throw new SymphonyError('invalid_canonical_run_id', `Invalid canonical harness run id: ${run_id}`);
    }
    return join(this.output_root, run_id, 'receipt.v1.json');
  }

  async record(candidate, options = {}) {
    const receipt = evaluate_canonical_harness_receipt(candidate, options);
    const receipt_path = this.receipt_path(receipt.run_id);
    const run_directory = dirname(receipt_path);
    const temporary_path = `${receipt_path}.${process.pid}.${this.random_id()}.tmp`;
    await this.file_operations.mkdir(this.output_root, { recursive: true });
    await this.file_operations.mkdir(run_directory, { recursive: true });
    const [resolved_output_root, resolved_run_directory] = await Promise.all([
      this.file_operations.realpath(this.output_root),
      this.file_operations.realpath(run_directory),
    ]);
    if (relative(resolved_output_root, resolved_run_directory) !== receipt.run_id) {
      throw new SymphonyError(
        'canonical_receipt_path_escape',
        `Canonical harness run directory resolves outside the evidence root: ${run_directory}`,
        { details: { output_root: resolved_output_root, run_directory: resolved_run_directory } },
      );
    }
    try {
      await this.file_operations.writeFile(
        temporary_path,
        `${JSON.stringify(receipt, null, 2)}\n`,
        { encoding: 'utf8', flag: 'wx' },
      );
      try {
        await this.file_operations.link(temporary_path, receipt_path);
      }
      catch (error) {
        if (error?.code === 'EEXIST') {
          throw new SymphonyError(
            'canonical_receipt_exists',
            `Canonical harness receipt already exists for run ${receipt.run_id}.`,
            { cause: error, details: { receipt_path } },
          );
        }
        throw error;
      }
    }
    finally {
      try {
        await this.file_operations.rm(temporary_path, { force: true });
      }
      catch (error) {
        this.logger.warn('canonical receipt temporary-file cleanup failed', {
          temporary_path,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return { receipt, receipt_path };
  }

  async read(receipt_path, options = {}) {
    let persisted;
    try {
      persisted = JSON.parse(await this.file_operations.readFile(receipt_path, 'utf8'));
    }
    catch (error) {
      throw new SymphonyError(
        'canonical_receipt_unreadable',
        `Canonical harness receipt could not be read: ${receipt_path}`,
        { cause: error, details: { receipt_path } },
      );
    }

    const verification = verify_canonical_harness_receipt(persisted, options);
    if (!verification.ok) {
      throw new SymphonyError(
        'canonical_receipt_invalid',
        `Canonical harness receipt failed verification: ${receipt_path}`,
        { details: { receipt_path, errors: verification.errors } },
      );
    }
    return verification.receipt;
  }

  async complete(issue, candidate) {
    const issue_identifier = issue?.identifier;
    if (typeof issue_identifier !== 'string' || issue_identifier.length === 0) {
      throw new SymphonyError(
        'canonical_issue_identifier_required',
        'Canonical completion requires a non-empty Linear issue identifier.',
      );
    }
    const recorded = await this.record(candidate, { issue_identifier });
    if (!recorded.receipt.eligible_for_done) {
      return { ...recorded, completed: false, completed_issue: null };
    }
    if (typeof this.tracker?.complete_issue !== 'function') {
      throw new SymphonyError('canonical_tracker_unavailable', 'Canonical completion requires a tracker completion seam.');
    }
    const persisted_receipt = await this.read(recorded.receipt_path, {
      issue_identifier,
      expected_receipt: recorded.receipt,
    });
    if (!persisted_receipt.eligible_for_done) {
      return { ...recorded, receipt: persisted_receipt, completed: false, completed_issue: null };
    }
    if (typeof this.tracker?.fetch_issue_identity_by_identifier !== 'function') {
      throw new SymphonyError(
        'canonical_tracker_identity_unavailable',
        'Canonical completion requires an authoritative tracker identity readback seam.',
      );
    }
    const authoritative_issue = await this.tracker.fetch_issue_identity_by_identifier(issue_identifier);
    if (
      !authoritative_issue
      || authoritative_issue.identifier !== issue_identifier
      || authoritative_issue.id !== issue?.id
    ) {
      throw new SymphonyError(
        'canonical_issue_identity_mismatch',
        `Canonical completion issue identity changed before Linear mutation: ${issue_identifier}`,
        {
          details: {
            requested_id: issue?.id ?? null,
            authoritative_id: authoritative_issue?.id ?? null,
            authoritative_identifier: authoritative_issue?.identifier ?? null,
          },
        },
      );
    }
    const completed_issue = await this.tracker.complete_issue(authoritative_issue, {
      message: `Canonical harness receipt: ${recorded.receipt_path}\n\n${JSON.stringify(persisted_receipt, null, 2)}`,
    });
    return { ...recorded, receipt: persisted_receipt, completed: true, completed_issue };
  }
}
