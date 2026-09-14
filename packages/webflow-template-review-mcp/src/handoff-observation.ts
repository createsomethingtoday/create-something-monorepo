import { z } from 'zod';
import { REVIEW_STATUS_OPTIONS } from './schema.js';

const recordId = z.string().regex(/^rec[A-Za-z0-9]{14}$/);
export const templateHandoffRequestSchema = z
  .object({ assetId: recordId, versionId: recordId })
  .strict();

export interface TemplateHandoffSource {
  getAssetById(id: string): Promise<{ assetId: string } | null>;
  getVersionById(
    id: string
  ): Promise<{ versionId: string; assetId?: string; reviewStatus?: string } | null>;
}

export interface TemplateHandoffObservation {
  schema: 'create-something/template-handoff-observation@1';
  dataClassification: 'minimized_status_evidence';
  requestSha256: string;
  observedAt: string;
  state: 'confirmed' | 'insufficient_evidence' | 'conflicting_evidence';
  reason:
    | 'review_ready'
    | 'review_progressed'
    | 'asset_missing'
    | 'version_missing'
    | 'source_identity_mismatch'
    | 'version_asset_mismatch'
    | 'review_status_missing'
    | 'review_status_unknown'
    | 'review_state_unproven';
  nextAction:
    | 'await_review'
    | 'inspect_review_outcome'
    | 'inspect_source_evidence'
    | 'escalate_source_conflict';
  evidenceSha256: string;
}

async function sha256(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(value))
  );
  return `sha256:${Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

/** Source-owned readback, not proof of a webhook or permission to resubmit.
 * Raw identifiers, names, feedback and actor fields never cross this boundary.
 * Missing records/status remain unknown; no processing deadline is inferred.
 */
export async function observeTemplateHandoff(
  source: TemplateHandoffSource,
  input: unknown,
  clock: { observedAt: string }
): Promise<TemplateHandoffObservation> {
  const request = templateHandoffRequestSchema.parse(input);
  const observedAt = z.string().datetime({ precision: 3 }).parse(clock.observedAt);
  const [asset, version] = await Promise.all([
    source.getAssetById(request.assetId),
    source.getVersionById(request.versionId)
  ]);
  let state: TemplateHandoffObservation['state'] = 'confirmed';
  let reason: TemplateHandoffObservation['reason'] = 'review_ready';
  let nextAction: TemplateHandoffObservation['nextAction'] = 'await_review';
  if (
    (asset && asset.assetId !== request.assetId) ||
    (version && version.versionId !== request.versionId)
  ) {
    state = 'conflicting_evidence';
    reason = 'source_identity_mismatch';
  } else if (version?.assetId && version.assetId !== request.assetId) {
    state = 'conflicting_evidence';
    reason = 'version_asset_mismatch';
  } else if (!asset) {
    state = 'insufficient_evidence';
    reason = 'asset_missing';
  } else if (!version) {
    state = 'insufficient_evidence';
    reason = 'version_missing';
  } else if (!version.assetId) {
    state = 'conflicting_evidence';
    reason = 'version_asset_mismatch';
  } else if (!version.reviewStatus) {
    state = 'insufficient_evidence';
    reason = 'review_status_missing';
  } else if (!(REVIEW_STATUS_OPTIONS as readonly string[]).includes(version.reviewStatus)) {
    state = 'insufficient_evidence';
    reason = 'review_status_unknown';
  } else if (version.reviewStatus === '☠️Archived') {
    state = 'insufficient_evidence';
    reason = 'review_state_unproven';
  } else if (
    version.reviewStatus !== '🆕Ready for Review' &&
    version.reviewStatus !== '🔁Response to Review'
  ) {
    reason = 'review_progressed';
    nextAction = 'inspect_review_outcome';
  }
  if (state === 'insufficient_evidence') nextAction = 'inspect_source_evidence';
  if (state === 'conflicting_evidence') nextAction = 'escalate_source_conflict';
  const requestSha256 = await sha256({ schema: 'template-handoff-request@1', ...request });
  const evidenceSha256 = await sha256({
    schema: 'template-handoff-evidence@1',
    requestSha256,
    observedAt,
    assetId: asset?.assetId ?? null,
    versionId: version?.versionId ?? null,
    linkedAssetId: version?.assetId ?? null,
    reviewStatus: version?.reviewStatus ?? null,
    state,
    reason,
    nextAction
  });
  return {
    schema: 'create-something/template-handoff-observation@1',
    dataClassification: 'minimized_status_evidence',
    requestSha256,
    observedAt,
    state,
    reason,
    nextAction,
    evidenceSha256
  };
}
