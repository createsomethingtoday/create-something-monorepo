import type {
  BundleReview,
  PreflightArtifactReceipt
} from '@create-something/webflow-app-review-preflight';
import type { AuthenticatedUser, Env } from './types';

interface UploadedArtifact {
  fileName: string;
  bytes: ArrayBuffer;
  contentType: string;
}

interface ReceiptRow {
  id: string;
  review_id: string;
  review_version_id: string;
  artifact_set_sequence: number;
  artifact_set_sha256: string;
  bundle_sha256: string;
  source_map_artifact_sha256: string | null;
  policy_version: 'source_maps.v1';
  scan_status: 'passed';
  reconciliation_status: 'not_checked' | 'matched' | 'mismatch';
  created_at: string;
}

function safePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function safeExtension(fileName: string, fallback: string): string {
  const match = fileName.toLowerCase().match(/(\.[a-z0-9]+)$/);
  return match?.[1] ?? fallback;
}

function receiptFromRow(row: ReceiptRow): PreflightArtifactReceipt {
  return {
    schemaVersion: 'preflight_artifact_receipt.v1',
    id: row.id,
    reviewId: row.review_id,
    reviewVersionId: row.review_version_id,
    artifactSetVersion: row.artifact_set_sequence,
    artifactSetSha256: row.artifact_set_sha256,
    bundleSha256: row.bundle_sha256,
    sourceMapArtifactSha256: row.source_map_artifact_sha256,
    policyVersion: row.policy_version,
    scanStatus: row.scan_status,
    reconciliationStatus: row.reconciliation_status,
    createdAt: row.created_at
  };
}

async function putPrivateArtifact(
  env: Env,
  objectKey: string,
  artifact: UploadedArtifact,
  sha256: string,
  metadata: Record<string, string>
): Promise<void> {
  if (await env.ARTIFACTS.head(objectKey)) return;
  await env.ARTIFACTS.put(objectKey, artifact.bytes, {
    httpMetadata: { contentType: artifact.contentType },
    customMetadata: { sha256, ...metadata }
  });
}

export async function prepareArtifactSetPersistence(input: {
  env: Env;
  user: AuthenticatedUser;
  reviewId: string;
  reviewVersionId: string;
  result: BundleReview;
  bundle: UploadedArtifact;
  sourceMapArtifact?: UploadedArtifact;
  artifactSetVersion?: number;
}): Promise<{
  receipt: PreflightArtifactReceipt;
  statements: D1PreparedStatement[];
}> {
  const artifactSet = input.result.artifactSet;
  const sourceMapPolicy = input.result.sourceMapPolicy;
  if (!artifactSet || !sourceMapPolicy) {
    throw new Error('The review result is missing its submission artifact-set contract.');
  }

  const now = input.result.createdAt;
  const artifactSetId = crypto.randomUUID();
  const receiptId = crypto.randomUUID();
  const artifactSetVersion = input.artifactSetVersion ?? 1;
  const owner = safePathSegment(input.user.id);
  const bundleKey = `${owner}/artifacts/sha256/${artifactSet.bundle.sha256}.zip`;
  const sourceMapIdentity = artifactSet.sourceMapArtifact;
  const sourceMapKey = sourceMapIdentity
    ? `${owner}/source-maps/sha256/${sourceMapIdentity.sha256}${safeExtension(sourceMapIdentity.fileName, '.zip')}`
    : null;

  await putPrivateArtifact(
    input.env,
    bundleKey,
    input.bundle,
    artifactSet.bundle.sha256,
    {
      kind: 'bundle',
      policyVersion: sourceMapPolicy.policyVersion
    }
  );
  if (sourceMapIdentity && sourceMapKey && input.sourceMapArtifact) {
    await putPrivateArtifact(
      input.env,
      sourceMapKey,
      input.sourceMapArtifact,
      sourceMapIdentity.sha256,
      {
        kind: 'source_maps',
        policyVersion: sourceMapPolicy.policyVersion
      }
    );
  }

  const receipt: PreflightArtifactReceipt = {
    schemaVersion: 'preflight_artifact_receipt.v1',
    id: receiptId,
    reviewId: input.reviewId,
    reviewVersionId: input.reviewVersionId,
    artifactSetVersion,
    artifactSetSha256: artifactSet.sha256,
    bundleSha256: artifactSet.bundle.sha256,
    sourceMapArtifactSha256: sourceMapIdentity?.sha256 ?? null,
    policyVersion: sourceMapPolicy.policyVersion,
    scanStatus: 'passed',
    reconciliationStatus: 'not_checked',
    createdAt: now
  };

  const statements: D1PreparedStatement[] = [
    input.env.DB.prepare(
      `INSERT INTO review_artifact_sets
        (id, review_version_id, sequence, artifact_set_sha256, policy_version,
         scan_status, review_json, created_at)
       VALUES (?, ?, ?, ?, ?, 'passed', ?, ?)`
    ).bind(
      artifactSetId,
      input.reviewVersionId,
      artifactSetVersion,
      artifactSet.sha256,
      sourceMapPolicy.policyVersion,
      JSON.stringify(input.result),
      now
    ),
    input.env.DB.prepare(
      `INSERT INTO review_version_artifacts
        (id, artifact_set_id, review_version_id, kind, file_name, sha256,
         object_key, bytes, content_type, created_at)
       VALUES (?, ?, ?, 'bundle', ?, ?, ?, ?, ?, ?)`
    ).bind(
      crypto.randomUUID(),
      artifactSetId,
      input.reviewVersionId,
      artifactSet.bundle.fileName,
      artifactSet.bundle.sha256,
      bundleKey,
      artifactSet.bundle.bytes,
      input.bundle.contentType,
      now
    ),
    input.env.DB.prepare(
      `INSERT INTO artifact_receipts
        (id, artifact_set_id, review_id, review_version_id, artifact_set_sequence,
         artifact_set_sha256, bundle_sha256, source_map_artifact_sha256,
         policy_version, scan_status, reconciliation_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'passed', 'not_checked', ?, ?)`
    ).bind(
      receiptId,
      artifactSetId,
      input.reviewId,
      input.reviewVersionId,
      artifactSetVersion,
      artifactSet.sha256,
      artifactSet.bundle.sha256,
      sourceMapIdentity?.sha256 ?? null,
      sourceMapPolicy.policyVersion,
      now,
      now
    )
  ];

  if (sourceMapIdentity && sourceMapKey && input.sourceMapArtifact) {
    statements.splice(
      2,
      0,
      input.env.DB.prepare(
        `INSERT INTO review_version_artifacts
          (id, artifact_set_id, review_version_id, kind, file_name, sha256,
           object_key, bytes, content_type, created_at)
         VALUES (?, ?, ?, 'source_maps', ?, ?, ?, ?, ?, ?)`
      ).bind(
        crypto.randomUUID(),
        artifactSetId,
        input.reviewVersionId,
        sourceMapIdentity.fileName,
        sourceMapIdentity.sha256,
        sourceMapKey,
        sourceMapIdentity.bytes,
        input.sourceMapArtifact.contentType,
        now
      )
    );
  }

  return { receipt, statements };
}

export async function getLatestArtifactReceipt(
  env: Env,
  reviewVersionId: string
): Promise<PreflightArtifactReceipt | null> {
  const row = await env.DB.prepare(
    `SELECT id, review_id, review_version_id, artifact_set_sequence,
            artifact_set_sha256, bundle_sha256, source_map_artifact_sha256,
            policy_version, scan_status, reconciliation_status, created_at
       FROM artifact_receipts
      WHERE review_version_id = ?
      ORDER BY artifact_set_sequence DESC
      LIMIT 1`
  )
    .bind(reviewVersionId)
    .first<ReceiptRow>();
  return row ? receiptFromRow(row) : null;
}

export async function getArtifactReceiptById(
  env: Env,
  receiptId: string
): Promise<PreflightArtifactReceipt | null> {
  const row = await env.DB.prepare(
    `SELECT id, review_id, review_version_id, artifact_set_sequence,
            artifact_set_sha256, bundle_sha256, source_map_artifact_sha256,
            policy_version, scan_status, reconciliation_status, created_at
       FROM artifact_receipts
      WHERE id = ?`
  )
    .bind(receiptId)
    .first<ReceiptRow>();
  return row ? receiptFromRow(row) : null;
}
