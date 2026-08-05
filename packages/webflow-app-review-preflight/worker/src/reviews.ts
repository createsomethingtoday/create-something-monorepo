import {
  createBundleReview,
  SourceMapValidationError,
  type BundleReview
} from '@create-something/webflow-app-review-preflight';
import type { AuthenticatedUser, Env, StoredReview } from './types';
import {
  getArtifactReceiptById,
  getLatestArtifactReceipt,
  prepareArtifactSetPersistence
} from './artifact-receipts';

const MAX_BUNDLE_BYTES = 10 * 1024 * 1024;
const MAX_SOURCE_MAP_BYTES = 10 * 1024 * 1024;

export class ReviewInputError extends Error {}

function safePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function asName(value: FormDataEntryValue | null, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().slice(0, 120);
  return normalized || fallback;
}

function sourceMapArtifact(form: FormData): File | undefined {
  const value = form.get('sourceMaps');
  if (value === null) return undefined;
  if (!(value instanceof File)) {
    throw new ReviewInputError('Choose a source-map ZIP or one .map file.');
  }
  const lowerName = value.name.toLowerCase();
  if (!lowerName.endsWith('.zip') && !lowerName.endsWith('.map')) {
    throw new ReviewInputError('Source maps must be a .zip archive or one .map file.');
  }
  if (value.size === 0 || value.size > MAX_SOURCE_MAP_BYTES) {
    throw new ReviewInputError('The source-map artifact must be between 1 byte and 10 MB.');
  }
  return value;
}

async function analyzeBundle(
  bytes: ArrayBuffer,
  fileName: string,
  sourceMaps?: { fileName: string; content: ArrayBuffer }
): Promise<BundleReview> {
  try {
    return await createBundleReview({
      bundle: bytes,
      fileName,
      ...(sourceMaps ? { sourceMapArtifact: sourceMaps } : {})
    });
  } catch (error) {
    if (error instanceof SourceMapValidationError) throw error;
    throw new ReviewInputError('We could not read this zip. Re-export the bundle and try again.');
  }
}

function storedReview(
  name: string,
  versionId: string,
  result: BundleReview,
  receipt: StoredReview['latestVersion']['receipt']
): StoredReview {
  return {
    id: result.reviewId,
    name,
    createdAt: result.createdAt,
    updatedAt: result.createdAt,
    latestVersion: {
      id: versionId,
      sequence: 1,
      createdAt: result.createdAt,
      result,
      receipt
    }
  };
}

export async function createReview(
  request: Request,
  env: Env,
  user: AuthenticatedUser
): Promise<StoredReview> {
  const form = await request.formData();
  const bundle = form.get('bundle');
  const sourceMaps = sourceMapArtifact(form);

  if (!(bundle instanceof File)) {
    throw new ReviewInputError('Choose a .zip app bundle to start the review.');
  }
  if (!bundle.name.toLowerCase().endsWith('.zip')) {
    throw new ReviewInputError('The uploaded bundle must be a .zip file.');
  }
  if (bundle.size === 0 || bundle.size > MAX_BUNDLE_BYTES) {
    throw new ReviewInputError('The bundle must be between 1 byte and 10 MB.');
  }

  const bytes = await bundle.arrayBuffer();
  const sourceMapBytes = sourceMaps ? await sourceMaps.arrayBuffer() : undefined;
  const result = await analyzeBundle(
    bytes,
    bundle.name,
    sourceMaps && sourceMapBytes
      ? { fileName: sourceMaps.name, content: sourceMapBytes }
      : undefined
  );
  const versionId = crypto.randomUUID();
  const name = asName(form.get('name'), result.artifactScope.appName ?? bundle.name);
  const owner = safePathSegment(user.id);
  const artifactKey = `${owner}/artifacts/sha256/${result.artifact.sha256}.zip`;

  const artifactPersistence = await prepareArtifactSetPersistence({
    env,
    user,
    reviewId: result.reviewId,
    reviewVersionId: versionId,
    result,
    bundle: {
      fileName: bundle.name,
      bytes,
      contentType: bundle.type || 'application/zip'
    },
    ...(sourceMaps && sourceMapBytes
      ? {
          sourceMapArtifact: {
            fileName: sourceMaps.name,
            bytes: sourceMapBytes,
            contentType: sourceMaps.type ||
              (sourceMaps.name.toLowerCase().endsWith('.map')
                ? 'application/json'
                : 'application/zip')
          }
        }
      : {})
  });

  const statements = [
    env.DB.prepare(
      `INSERT INTO reviews
        (id, owner_user_id, site_id, name, created_at, updated_at, latest_version_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      result.reviewId,
      user.id,
      user.siteId,
      name,
      result.createdAt,
      result.createdAt,
      versionId
    ),
    env.DB.prepare(
      `INSERT INTO review_versions
        (id, review_id, sequence, artifact_sha256, artifact_key, file_name,
         compressed_bytes, policy_ruleset_version, policy_config_version,
         review_json, created_at)
       VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      versionId,
      result.reviewId,
      result.artifact.sha256,
      artifactKey,
      bundle.name,
      result.artifact.compressedBytes,
      result.policySnapshot.rulesetVersion,
      result.policySnapshot.configVersion,
      JSON.stringify(result),
      result.createdAt
    ),
    ...result.guidance.map((finding) =>
      env.DB.prepare(
        `INSERT INTO review_findings
          (id, review_version_id, rule_id, label, title, severity, confidence,
           finding_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        `${versionId}:${finding.id}`,
        versionId,
        finding.id,
        finding.label,
        finding.title,
        finding.severity,
        finding.confidence,
        JSON.stringify(finding),
        result.createdAt
      )
    ),
    env.DB.prepare(
      `INSERT INTO review_events
        (id, review_id, review_version_id, actor_user_id, event_type,
         payload_json, created_at)
       VALUES (?, ?, ?, ?, 'review_created', ?, ?)`
    ).bind(
      crypto.randomUUID(),
      result.reviewId,
      versionId,
      user.id,
      JSON.stringify({
        sequence: 1,
        artifactSha256: result.artifact.sha256,
        scope: result.artifactScope.primary
      }),
      result.createdAt
    ),
    ...artifactPersistence.statements
  ];

  await env.DB.batch(statements);
  return storedReview(name, versionId, result, artifactPersistence.receipt);
}

interface LatestReviewRow {
  name: string;
  created_at: string;
  version_id: string;
  sequence: number;
  review_json: string;
}

export interface ReviewComparison {
  resolved: string[];
  remaining: string[];
  added: string[];
}

function compareResults(
  previous: BundleReview,
  current: BundleReview
): ReviewComparison {
  const previousIds = new Set(previous.guidance.map((item) => item.id));
  const currentIds = new Set(current.guidance.map((item) => item.id));

  return {
    resolved: [...previousIds].filter((id) => !currentIds.has(id)).sort(),
    remaining: [...previousIds].filter((id) => currentIds.has(id)).sort(),
    added: [...currentIds].filter((id) => !previousIds.has(id)).sort()
  };
}

export async function addRevision(
  reviewId: string,
  request: Request,
  env: Env,
  user: AuthenticatedUser
): Promise<{
  review: StoredReview;
  comparison: ReviewComparison;
  deduplicated: boolean;
} | null> {
  const currentRow = await env.DB.prepare(
    `SELECT r.name, r.created_at, v.id AS version_id, v.sequence,
            COALESCE(
              (SELECT artifact_set.review_json
                 FROM review_artifact_sets artifact_set
                WHERE artifact_set.review_version_id = v.id
                ORDER BY artifact_set.sequence DESC
                LIMIT 1),
              v.review_json
            ) AS review_json
       FROM reviews r
       JOIN review_versions v ON v.id = r.latest_version_id
      WHERE r.id = ? AND r.owner_user_id = ?`
  )
    .bind(reviewId, user.id)
    .first<LatestReviewRow>();

  if (!currentRow) return null;

  const form = await request.formData();
  const bundle = form.get('bundle');
  const sourceMaps = sourceMapArtifact(form);
  if (!(bundle instanceof File)) {
    throw new ReviewInputError('Choose a .zip app bundle to add a revision.');
  }
  if (!bundle.name.toLowerCase().endsWith('.zip')) {
    throw new ReviewInputError('The uploaded bundle must be a .zip file.');
  }
  if (bundle.size === 0 || bundle.size > MAX_BUNDLE_BYTES) {
    throw new ReviewInputError('The bundle must be between 1 byte and 10 MB.');
  }

  const bytes = await bundle.arrayBuffer();
  const sourceMapBytes = sourceMaps ? await sourceMaps.arrayBuffer() : undefined;
  const result = await analyzeBundle(
    bytes,
    bundle.name,
    sourceMaps && sourceMapBytes
      ? { fileName: sourceMaps.name, content: sourceMapBytes }
      : undefined
  );
  result.reviewId = reviewId;
  const previous = JSON.parse(currentRow.review_json) as BundleReview;

  const duplicate = await env.DB.prepare(
    `SELECT v.id, v.sequence, artifact_set.created_at,
            artifact_set.review_json, receipt.id AS receipt_id
       FROM review_artifact_sets artifact_set
       JOIN review_versions v ON v.id = artifact_set.review_version_id
       JOIN artifact_receipts receipt ON receipt.artifact_set_id = artifact_set.id
      WHERE v.review_id = ? AND artifact_set.artifact_set_sha256 = ?
      ORDER BY artifact_set.created_at DESC
      LIMIT 1`
  )
    .bind(reviewId, result.artifactSet!.sha256)
    .first<{
      id: string;
      sequence: number;
      created_at: string;
      review_json: string;
      receipt_id: string;
    }>();

  if (duplicate) {
    const duplicateResult = JSON.parse(duplicate.review_json) as BundleReview;
    const receipt = await getArtifactReceiptById(env, duplicate.receipt_id);
    return {
      review: {
        id: reviewId,
        name: currentRow.name,
        createdAt: currentRow.created_at,
        updatedAt: duplicate.created_at,
        latestVersion: {
          id: duplicate.id,
          sequence: duplicate.sequence,
          createdAt: duplicate.created_at,
          result: duplicateResult,
          receipt
        }
      },
      comparison: compareResults(previous, duplicateResult),
      deduplicated: true
    };
  }

  if (previous.artifact.sha256 === result.artifact.sha256) {
    const nextArtifactSetVersionRow = await env.DB.prepare(
      `SELECT COALESCE(MAX(sequence), 0) + 1 AS sequence
         FROM review_artifact_sets
        WHERE review_version_id = ?`
    )
      .bind(currentRow.version_id)
      .first<{ sequence: number }>();
    const artifactPersistence = await prepareArtifactSetPersistence({
      env,
      user,
      reviewId,
      reviewVersionId: currentRow.version_id,
      result,
      artifactSetVersion: nextArtifactSetVersionRow?.sequence ?? 1,
      bundle: {
        fileName: bundle.name,
        bytes,
        contentType: bundle.type || 'application/zip'
      },
      ...(sourceMaps && sourceMapBytes
        ? {
            sourceMapArtifact: {
              fileName: sourceMaps.name,
              bytes: sourceMapBytes,
              contentType: sourceMaps.type ||
                (sourceMaps.name.toLowerCase().endsWith('.map')
                  ? 'application/json'
                  : 'application/zip')
            }
          }
        : {})
    });
    await env.DB.batch([
      ...artifactPersistence.statements,
      env.DB.prepare(
        `UPDATE reviews SET updated_at = ? WHERE id = ? AND owner_user_id = ?`
      ).bind(result.createdAt, reviewId, user.id),
      env.DB.prepare(
        `INSERT INTO review_events
          (id, review_id, review_version_id, actor_user_id, event_type,
           payload_json, created_at)
         VALUES (?, ?, ?, ?, 'artifact_set_revised', ?, ?)`
      ).bind(
        crypto.randomUUID(),
        reviewId,
        currentRow.version_id,
        user.id,
        JSON.stringify({
          sequence: currentRow.sequence,
          artifactSetVersion: artifactPersistence.receipt.artifactSetVersion,
          artifactSetSha256: result.artifactSet!.sha256
        }),
        result.createdAt
      )
    ]);
    return {
      review: {
        id: reviewId,
        name: currentRow.name,
        createdAt: currentRow.created_at,
        updatedAt: result.createdAt,
        latestVersion: {
          id: currentRow.version_id,
          sequence: currentRow.sequence,
          createdAt: result.createdAt,
          result,
          receipt: artifactPersistence.receipt
        }
      },
      comparison: compareResults(previous, result),
      deduplicated: false
    };
  }

  const nextSequence = currentRow.sequence + 1;
  const versionId = crypto.randomUUID();
  const owner = safePathSegment(user.id);
  const artifactKey = `${owner}/artifacts/sha256/${result.artifact.sha256}.zip`;

  const artifactPersistence = await prepareArtifactSetPersistence({
    env,
    user,
    reviewId,
    reviewVersionId: versionId,
    result,
    bundle: {
      fileName: bundle.name,
      bytes,
      contentType: bundle.type || 'application/zip'
    },
    ...(sourceMaps && sourceMapBytes
      ? {
          sourceMapArtifact: {
            fileName: sourceMaps.name,
            bytes: sourceMapBytes,
            contentType: sourceMaps.type ||
              (sourceMaps.name.toLowerCase().endsWith('.map')
                ? 'application/json'
                : 'application/zip')
          }
        }
      : {})
  });

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO review_versions
        (id, review_id, sequence, artifact_sha256, artifact_key, file_name,
         compressed_bytes, policy_ruleset_version, policy_config_version,
         review_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      versionId,
      reviewId,
      nextSequence,
      result.artifact.sha256,
      artifactKey,
      bundle.name,
      result.artifact.compressedBytes,
      result.policySnapshot.rulesetVersion,
      result.policySnapshot.configVersion,
      JSON.stringify(result),
      result.createdAt
    ),
    ...result.guidance.map((finding) =>
      env.DB.prepare(
        `INSERT INTO review_findings
          (id, review_version_id, rule_id, label, title, severity, confidence,
           finding_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        `${versionId}:${finding.id}`,
        versionId,
        finding.id,
        finding.label,
        finding.title,
        finding.severity,
        finding.confidence,
        JSON.stringify(finding),
        result.createdAt
      )
    ),
    env.DB.prepare(
      `UPDATE reviews
          SET latest_version_id = ?, updated_at = ?
        WHERE id = ? AND owner_user_id = ?`
    ).bind(versionId, result.createdAt, reviewId, user.id),
    env.DB.prepare(
      `INSERT INTO review_events
        (id, review_id, review_version_id, actor_user_id, event_type,
         payload_json, created_at)
       VALUES (?, ?, ?, ?, 'revision_added', ?, ?)`
    ).bind(
      crypto.randomUUID(),
      reviewId,
      versionId,
      user.id,
      JSON.stringify({
        sequence: nextSequence,
        artifactSha256: result.artifact.sha256,
        comparison: compareResults(previous, result)
      }),
      result.createdAt
    ),
    ...artifactPersistence.statements
  ]);

  return {
    review: {
      id: reviewId,
      name: currentRow.name,
      createdAt: currentRow.created_at,
      updatedAt: result.createdAt,
      latestVersion: {
        id: versionId,
        sequence: nextSequence,
        createdAt: result.createdAt,
        result,
        receipt: artifactPersistence.receipt
      }
    },
    comparison: compareResults(previous, result),
    deduplicated: false
  };
}

interface StoredReviewRow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  version_id: string;
  sequence: number;
  version_created_at: string;
  review_json: string;
}

export interface ReviewSummary {
  id: string;
  name: string;
  updatedAt: string;
  latestSequence: number;
  readiness: BundleReview['summary']['readiness'];
  appName: string | null;
  coverage: BundleReview['coverage'];
}

export async function listReviews(
  env: Env,
  user: AuthenticatedUser,
  options: { includeAll?: boolean } = {}
): Promise<ReviewSummary[]> {
  const rows = await env.DB.prepare(
    `SELECT r.id, r.name, r.updated_at, v.sequence,
            COALESCE(
              (SELECT artifact_set.review_json
                 FROM review_artifact_sets artifact_set
                WHERE artifact_set.review_version_id = v.id
                ORDER BY artifact_set.sequence DESC
                LIMIT 1),
              v.review_json
            ) AS review_json
       FROM reviews r
       JOIN review_versions v ON v.id = r.latest_version_id
      WHERE (? = 1 OR r.owner_user_id = ?)
      ORDER BY r.updated_at DESC
      LIMIT 50`
  )
    .bind(options.includeAll ? 1 : 0, user.id)
    .all<{
      id: string;
      name: string;
      updated_at: string;
      sequence: number;
      review_json: string;
    }>();

  return rows.results.map((row) => {
    const result = JSON.parse(row.review_json) as BundleReview;
    return {
      id: row.id,
      name: row.name,
      updatedAt: row.updated_at,
      latestSequence: row.sequence,
      readiness: result.summary.readiness,
      appName: result.artifactScope.appName,
      coverage: result.coverage
    };
  });
}

export async function getReview(
  reviewId: string,
  env: Env,
  user: AuthenticatedUser,
  options: { includeAll?: boolean } = {}
): Promise<StoredReview | null> {
  const row = await env.DB.prepare(
    `SELECT r.id, r.name, r.created_at, r.updated_at,
            v.id AS version_id, v.sequence, v.created_at AS version_created_at,
            COALESCE(
              (SELECT artifact_set.review_json
                 FROM review_artifact_sets artifact_set
                WHERE artifact_set.review_version_id = v.id
                ORDER BY artifact_set.sequence DESC
                LIMIT 1),
              v.review_json
            ) AS review_json
       FROM reviews r
       JOIN review_versions v ON v.id = r.latest_version_id
      WHERE r.id = ? AND (? = 1 OR r.owner_user_id = ?)`
  )
    .bind(reviewId, options.includeAll ? 1 : 0, user.id)
    .first<StoredReviewRow>();

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    latestVersion: {
      id: row.version_id,
      sequence: row.sequence,
      createdAt: row.version_created_at,
      result: JSON.parse(row.review_json) as BundleReview,
      receipt: await getLatestArtifactReceipt(env, row.version_id)
    }
  };
}
