import type { ControlRequestContext, FirstPartyControlIdentity } from './control-identity.js';
import { ControlRunAccessError } from './control.js';
import { composeTemplateReviewControl } from './template-review-control-composition.js';
import { R2WorkflowArtifactReader } from './workflow-artifact-reader.js';
import { AuthenticatedTemplateReviewHandoffSource } from './template-review-handoff-source.js';
import type { WorkflowRuntimeWake } from './workflow-runtime-queue.js';

type CompositionInput = Parameters<typeof composeTemplateReviewControl>[0];
export type TemplateReviewDeployment = Pick<CompositionInput, 'activation' | 'policy' | 'parameters' |
  'observationStep' | 'maximumAgeMs' | 'maximumClockSkewMs' | 'approvalPolicies'> & {
  schema: 'template-review-deployment@1';
};

export interface TemplateReviewWorkerBindings {
  AGENT_RUNTIME_DB: D1Database;
  CONTROL_DB: D1Database;
  TEMPLATE_REVIEW_DEPLOYMENT?: string;
  WORKFLOW_ARTIFACTS?: R2Bucket;
  WORKFLOW_RUNTIME_QUEUE?: Queue<WorkflowRuntimeWake>;
  CONTROL_SCHEDULER_TOKEN?: string;
  TEMPLATE_REVIEW_SOURCE_TOKEN?: string;
}

/** Deployment configuration is operator-owned, never read from request bodies.
 * The host subsequently verifies every frozen activation field, registration,
 * signed artifact and policy. Malformed configuration cannot admit a release.
 */
export async function templateReviewWorkerComposition(env: TemplateReviewWorkerBindings,
  context: ControlRequestContext) {
  if (!env.TEMPLATE_REVIEW_DEPLOYMENT || !env.WORKFLOW_ARTIFACTS ||
      !env.WORKFLOW_RUNTIME_QUEUE || !env.TEMPLATE_REVIEW_SOURCE_TOKEN)
    throw new Error('template_review_unconfigured');
  if (new TextEncoder().encode(env.TEMPLATE_REVIEW_DEPLOYMENT).length > 1_048_576)
    throw new Error('template_review_configuration_too_large');
  const configuration = JSON.parse(env.TEMPLATE_REVIEW_DEPLOYMENT) as TemplateReviewDeployment;
  if (!configuration || configuration.schema !== 'template-review-deployment@1' ||
      !Number.isSafeInteger(configuration.maximumAgeMs) || configuration.maximumAgeMs <= 0 ||
      !Number.isSafeInteger(configuration.maximumClockSkewMs) || configuration.maximumClockSkewMs < 0)
    throw new Error('template_review_configuration_invalid');
  const queue = env.WORKFLOW_RUNTIME_QUEUE;
  const token = env.TEMPLATE_REVIEW_SOURCE_TOKEN;
  return composeTemplateReviewControl({ ...configuration, context,
    runtimeDb: env.AGENT_RUNTIME_DB, agencyDb: env.CONTROL_DB,
    artifacts: new R2WorkflowArtifactReader(env.WORKFLOW_ARTIFACTS),
    source: new AuthenticatedTemplateReviewHandoffSource(async () => token),
    clock: () => new Date().toISOString(), async send(message) { await queue.send(message); } });
}

/** Scheduled/queue work uses the same JWT verifier as HTTP. A secret binding
 * is not itself authority: expired, wrong-resource and unbound tokens fail.
 */
export async function templateReviewScheduler(env: TemplateReviewWorkerBindings,
  identity: FirstPartyControlIdentity) {
  if (!env.CONTROL_SCHEDULER_TOKEN) throw new Error('control_scheduler_unconfigured');
  const context = await identity.resolve(new Request('https://control.invalid/internal-scheduler', {
    headers: { authorization: `Bearer ${env.CONTROL_SCHEDULER_TOKEN}` }
  }));
  if (!context || context.actor.role !== 'control_scheduler' || !context.schedulerActivationId)
    throw new ControlRunAccessError('Verified scheduler credential required');
  return templateReviewWorkerComposition(env, context);
}
