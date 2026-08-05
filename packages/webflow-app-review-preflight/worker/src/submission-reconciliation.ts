import type {
  SubmissionArtifactReconciliation
} from '@create-something/webflow-app-review-preflight';
import { getArtifactReceiptById } from './artifact-receipts';
import type { Env } from './types';

const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export class SubmissionReconciliationInputError extends Error {}

function requireRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new SubmissionReconciliationInputError('Provide a reconciliation JSON object.');
  }
  return value as Record<string, unknown>;
}

function requireText(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== 'string') {
    throw new SubmissionReconciliationInputError(`${label} is required.`);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new SubmissionReconciliationInputError(`${label} is invalid.`);
  }
  return normalized;
}

function requireSha256(value: unknown, label: string): string {
  const normalized = requireText(value, label, 64).toLowerCase();
  if (!SHA256_PATTERN.test(normalized)) {
    throw new SubmissionReconciliationInputError(
      `${label} must be a 64-character SHA-256 digest.`
    );
  }
  return normalized;
}

function optionalSha256(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  return requireSha256(value, 'sourceMapArtifactSha256');
}

export async function reconcileSubmissionArtifacts(
  request: Request,
  env: Env
): Promise<SubmissionArtifactReconciliation> {
  const raw = requireRecord(await request.json());
  const submissionId = requireText(raw.submissionId, 'submissionId', 200);
  const receiptId = raw.receiptId === undefined || raw.receiptId === null || raw.receiptId === ''
    ? null
    : requireText(raw.receiptId, 'receiptId', 200);
  const bundleSha256 = requireSha256(raw.bundleSha256, 'bundleSha256');
  const sourceMapArtifactSha256 = optionalSha256(raw.sourceMapArtifactSha256);
  const checkedAt = new Date().toISOString();

  if (!receiptId) {
    const reconciliation: SubmissionArtifactReconciliation = {
      schemaVersion: 'submission_artifact_reconciliation.v1',
      submissionId,
      receiptId: null,
      status: 'receipt_not_provided',
      receiptValid: null,
      enforcement: 'fail_open',
      mismatches: [],
      checkedAt
    };
    await persistReconciliation(
      env,
      reconciliation,
      bundleSha256,
      sourceMapArtifactSha256
    );
    return reconciliation;
  }

  const receipt = await getArtifactReceiptById(env, receiptId);
  if (!receipt) {
    const reconciliation: SubmissionArtifactReconciliation = {
      schemaVersion: 'submission_artifact_reconciliation.v1',
      submissionId,
      receiptId,
      status: 'receipt_not_found',
      receiptValid: false,
      enforcement: 'invalid',
      mismatches: [],
      checkedAt
    };
    await persistReconciliation(
      env,
      reconciliation,
      bundleSha256,
      sourceMapArtifactSha256,
      false
    );
    return reconciliation;
  }

  const mismatches: SubmissionArtifactReconciliation['mismatches'] = [];
  if (receipt.bundleSha256 !== bundleSha256) mismatches.push('bundle');
  if (receipt.sourceMapArtifactSha256 !== sourceMapArtifactSha256) {
    mismatches.push('source_maps');
  }
  const matched = mismatches.length === 0;
  const reconciliation: SubmissionArtifactReconciliation = {
    schemaVersion: 'submission_artifact_reconciliation.v1',
    submissionId,
    receiptId,
    status: matched ? 'matched' : 'mismatch',
    receiptValid: matched,
    enforcement: matched ? 'verified' : 'invalid',
    mismatches,
    checkedAt
  };

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO submission_artifact_reconciliations
        (id, submission_id, receipt_id, status, receipt_valid, bundle_sha256,
         source_map_artifact_sha256, mismatches_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      crypto.randomUUID(),
      submissionId,
      receiptId,
      reconciliation.status,
      matched ? 1 : 0,
      bundleSha256,
      sourceMapArtifactSha256,
      JSON.stringify(mismatches),
      checkedAt
    ),
    env.DB.prepare(
      `UPDATE artifact_receipts
          SET reconciliation_status = ?, updated_at = ?
        WHERE id = ?`
    ).bind(matched ? 'matched' : 'mismatch', checkedAt, receiptId)
  ]);

  return reconciliation;
}

async function persistReconciliation(
  env: Env,
  reconciliation: SubmissionArtifactReconciliation,
  bundleSha256: string,
  sourceMapArtifactSha256: string | null,
  linkReceipt = true
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO submission_artifact_reconciliations
      (id, submission_id, receipt_id, status, receipt_valid, bundle_sha256,
       source_map_artifact_sha256, mismatches_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?)`
  )
    .bind(
      crypto.randomUUID(),
      reconciliation.submissionId,
      linkReceipt ? reconciliation.receiptId : null,
      reconciliation.status,
      reconciliation.receiptValid === null ? null : reconciliation.receiptValid ? 1 : 0,
      bundleSha256,
      sourceMapArtifactSha256,
      reconciliation.checkedAt
    )
    .run();
}
