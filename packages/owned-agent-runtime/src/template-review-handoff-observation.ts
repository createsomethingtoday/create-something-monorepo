import { z } from 'zod';

const digest = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const timestamp = z.string().datetime({ precision: 3 });
const schema = z
  .object({
    schema: z.literal('create-something/template-handoff-observation@1'),
    dataClassification: z.literal('minimized_status_evidence'),
    requestSha256: digest,
    observedAt: timestamp,
    state: z.enum(['confirmed', 'insufficient_evidence', 'conflicting_evidence']),
    reason: z.enum([
      'review_ready',
      'review_progressed',
      'asset_missing',
      'version_missing',
      'source_identity_mismatch',
      'version_asset_mismatch',
      'review_status_missing',
      'review_status_unknown',
      'review_state_unproven'
    ]),
    nextAction: z.enum([
      'await_review',
      'inspect_review_outcome',
      'inspect_source_evidence',
      'escalate_source_conflict'
    ]),
    evidenceSha256: digest
  })
  .strict();

export type TemplateReviewHandoffObservation = z.infer<typeof schema>;

const disposition: Record<
  TemplateReviewHandoffObservation['reason'],
  readonly [
    TemplateReviewHandoffObservation['state'],
    TemplateReviewHandoffObservation['nextAction']
  ]
> = {
  review_ready: ['confirmed', 'await_review'],
  review_progressed: ['confirmed', 'inspect_review_outcome'],
  asset_missing: ['insufficient_evidence', 'inspect_source_evidence'],
  version_missing: ['insufficient_evidence', 'inspect_source_evidence'],
  source_identity_mismatch: ['conflicting_evidence', 'escalate_source_conflict'],
  version_asset_mismatch: ['conflicting_evidence', 'escalate_source_conflict'],
  review_status_missing: ['insufficient_evidence', 'inspect_source_evidence'],
  review_status_unknown: ['insufficient_evidence', 'inspect_source_evidence'],
  review_state_unproven: ['insufficient_evidence', 'inspect_source_evidence']
};

/** Validates a result obtained through the owning authenticated source transport.
 * This is not signature verification, dispatch authority, or proof of a webhook.
 * Freshness is a host policy for this observation, never a submission deadline.
 */
export function validateTemplateReviewHandoffObservation(
  value: unknown,
  context: {
    requestSha256: string;
    dispatchedAt: string;
    receivedAt: string;
    maximumAgeMs: number;
  }
): TemplateReviewHandoffObservation {
  const parsed = schema.safeParse(value);
  const validContext = z
    .object({
      requestSha256: digest,
      dispatchedAt: timestamp,
      receivedAt: timestamp,
      maximumAgeMs: z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
    })
    .strict()
    .safeParse(context);
  if (!parsed.success || !validContext.success) throw new Error('handoff_observation_invalid');
  const result = parsed.data;
  const expected = disposition[result.reason];
  const dispatched = Date.parse(context.dispatchedAt);
  const received = Date.parse(context.receivedAt);
  const observed = Date.parse(result.observedAt);
  if (
    result.requestSha256 !== context.requestSha256 ||
    result.state !== expected[0] ||
    result.nextAction !== expected[1] ||
    received < dispatched ||
    observed < dispatched ||
    observed > received ||
    received - observed > context.maximumAgeMs
  ) {
    throw new Error('handoff_observation_context_mismatch');
  }
  return result;
}
