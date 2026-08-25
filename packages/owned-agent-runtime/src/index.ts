import { OpenAIAgentExecutor } from './openai.js';
import { CloudflareAgentAdmission, CloudflareControlRunAdmission } from './admission.js';
import { createControlRunService } from './control.js';
import { RegisteredControlWorkflowExecutor } from './control-executor.js';
import {
  ControlIdentityConfigurationError,
  FirstPartyControlIdentity
} from './control-identity.js';
import { D1ControlActivationAuthority, D1ControlRunRepository } from './control-store.js';
import { createControlRunWorker } from './control-worker.js';
import { D1AgentStore } from './store.js';
import { createOwnedAgentWorker } from './worker.js';

export type {
  AgentAdmission,
  AgentConversation,
  AgentExecutor,
  AgentRunReceipt,
  AgentStore
} from './types.js';
export { createOwnedAgentWorker } from './worker.js';
export { createControlRunService, MemoryControlRunRepository } from './control.js';
export { createControlRunWorker } from './control-worker.js';
export { D1WorkflowRuntimeCheckpointStore } from './workflow-runtime-store.js';
export { D1WorkflowRuntimeProofReader } from './workflow-runtime-proof-projection.js';
export type { WorkflowRuntimeManifestAuthority } from './workflow-runtime-manifest-authority.js';
export type {
  WorkflowRuntimeProofApproval,
  WorkflowRuntimeProofApprovalContext,
  WorkflowRuntimeProofCapabilityObservation,
  WorkflowRuntimeProofProjection
} from './workflow-runtime-proof-projection.js';
export {
  D1TemplateReviewQueueObservationAdapter,
  TemplateReviewQueueObservationError,
  TEMPLATE_REVIEW_QUEUE_OBSERVATION_CAPABILITY,
  TEMPLATE_REVIEW_QUEUE_OBSERVATION_PARAMETERS,
  TEMPLATE_REVIEW_QUEUE_OBSERVATION_SOURCE,
  assertTemplateReviewQueueObservationIntent,
  assertTemplateReviewQueueObservationProjection
} from './template-review-queue-observation.js';
export type {
  TemplateReviewQueueObservationIntent,
  TemplateReviewQueueObservationPreparation,
  TemplateReviewQueueObservationProjection,
  TemplateReviewQueueObservationRegistration,
  TemplateReviewQueueObservationResult,
  TemplateReviewQueueObservationVerifier,
  TemplateReviewQueueObservationVerifierResult
} from './template-review-queue-observation.js';
export type {
  ControlActivationAuthority,
  ControlActor,
  ControlRunExecutor,
  ControlRunReceipt,
  ControlRunRecord,
  ControlRunRepository,
  ControlRunStatus,
  ControlScope,
  FrozenControlActivation
} from './control.js';

export type Env = {
  AGENT_RUNTIME_DB: D1Database;
  CONTROL_DB: D1Database;
  OPENAI_API_KEY: string;
  CS_IDENTITY_ISSUER: string;
  CS_IDENTITY_JWKS_URL: string;
  CS_IDENTITY_AUDIENCE: string;
  CREATE_SOMETHING_MCP: Fetcher;
  THREE_TIER_FRAMEWORK_MCP: Fetcher;
  PLAYBOOK_MCP: Fetcher;
  PUBLIC_AGENT_CLIENT_RATE_LIMITER: RateLimit;
  PUBLIC_AGENT_BUDGET_RATE_LIMITER: RateLimit;
  CONTROL_TENANT_RATE_LIMITER: RateLimit;
  CONTROL_BUDGET_RATE_LIMITER: RateLimit;
};

function serviceFetch(binding: Fetcher): typeof fetch {
  return ((input: RequestInfo | URL, init?: RequestInit) =>
    binding.fetch(input, init)) as typeof fetch;
}

let cachedControlIdentity: { key: string; resolver: FirstPartyControlIdentity } | undefined;

function controlIdentity(env: Env): FirstPartyControlIdentity {
  if (
    typeof env.CS_IDENTITY_ISSUER !== 'string' ||
    typeof env.CS_IDENTITY_JWKS_URL !== 'string' ||
    typeof env.CS_IDENTITY_AUDIENCE !== 'string'
  ) {
    throw new ControlIdentityConfigurationError(
      'Control identity requires an exact issuer, JWKS URL, and audience'
    );
  }
  const key = JSON.stringify([
    env.CS_IDENTITY_ISSUER,
    env.CS_IDENTITY_JWKS_URL,
    env.CS_IDENTITY_AUDIENCE
  ]);
  if (cachedControlIdentity?.key === key) return cachedControlIdentity.resolver;
  const resolver = new FirstPartyControlIdentity({
    issuer: env.CS_IDENTITY_ISSUER,
    jwksUrl: env.CS_IDENTITY_JWKS_URL,
    audience: env.CS_IDENTITY_AUDIENCE
  });
  cachedControlIdentity = { key, resolver };
  return resolver;
}

function controlTransportFailure(
  pathname: string,
  mcpRequestId: string | number | null,
  message: string
): Response {
  if (pathname !== '/mcp') {
    return Response.json({ error: message }, { status: 503 });
  }
  return Response.json(
    { jsonrpc: '2.0', id: mcpRequestId, error: { code: -32000, message } },
    {
      status: 503,
      headers: {
        'cache-control': 'no-store',
        'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
        'x-content-type-options': 'nosniff'
      }
    }
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const pathname = new URL(request.url).pathname;
    if (pathname.startsWith('/v1/control/') || pathname === '/mcp') {
      let mcpRequestId: string | number | null = null;
      if (pathname === '/mcp') {
        const payload = (await request
          .clone()
          .json()
          .catch(() => null)) as Record<string, unknown> | null;
        const candidateId = payload?.id;
        if (
          typeof candidateId === 'string' ||
          typeof candidateId === 'number' ||
          candidateId === null
        ) {
          mcpRequestId = candidateId;
        }
      }
      try {
        const control = createControlRunWorker({
          identity: controlIdentity(env),
          service: createControlRunService({
            repository: new D1ControlRunRepository(env.AGENT_RUNTIME_DB),
            activations: new D1ControlActivationAuthority(env.CONTROL_DB),
            executor: new RegisteredControlWorkflowExecutor([])
          }),
          admission: new CloudflareControlRunAdmission(
            env.CONTROL_TENANT_RATE_LIMITER,
            env.CONTROL_BUDGET_RATE_LIMITER
          )
        });
        return (
          (await control.fetch(request)) ?? Response.json({ error: 'not_found' }, { status: 404 })
        );
      } catch (error) {
        if (error instanceof ControlIdentityConfigurationError) {
          return controlTransportFailure(pathname, mcpRequestId, 'control_identity_unconfigured');
        }
        return controlTransportFailure(pathname, mcpRequestId, 'control_runtime_unavailable');
      }
    }
    if (!env.OPENAI_API_KEY)
      return Response.json({ error: 'runtime_not_configured' }, { status: 503 });
    return createOwnedAgentWorker({
      store: new D1AgentStore(env.AGENT_RUNTIME_DB),
      executor: new OpenAIAgentExecutor(env.OPENAI_API_KEY, {
        'create-something': serviceFetch(env.CREATE_SOMETHING_MCP),
        'three-tier-framework': serviceFetch(env.THREE_TIER_FRAMEWORK_MCP),
        playbook: serviceFetch(env.PLAYBOOK_MCP)
      }),
      admission: new CloudflareAgentAdmission(
        env.PUBLIC_AGENT_CLIENT_RATE_LIMITER,
        env.PUBLIC_AGENT_BUDGET_RATE_LIMITER
      )
    }).fetch(request);
  }
};
