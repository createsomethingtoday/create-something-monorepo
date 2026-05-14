import * as v from 'valibot';

export const FLUE_SERVICE_AGENT_RUNTIME = {
  runtime: 'flue',
  role: 'service_agent',
  packageName: '@create-something/flue-service-agent',
  agentName: 'service-delivery',
  endpointPattern: '/agents/service-delivery/:id',
  triggerSurface: 'webhook',
  sandboxMode: 'virtual',
  channelGatewayRuntime: 'pi_openclaw',
  goldenTaskId: 'runtime-routing-pi-flue',
} as const;

export const DEFAULT_CONTRACT_REFS = {
  agentContract: 'templates/agent_contract.yaml',
  goldenTasks: 'templates/golden_tasks.yaml',
  goldenTaskId: FLUE_SERVICE_AGENT_RUNTIME.goldenTaskId,
} as const;

export const runtimeCandidateSchema = v.picklist([
  'pi_openclaw',
  'flue',
  'codex_harness',
  'custom',
]);

export const triggerSurfaceSchema = v.picklist([
  'channel',
  'webhook',
  'cli',
  'cron',
  'manual',
]);

export const riskSchema = v.picklist(['low', 'medium', 'high', 'critical']);

export const deliveryTaskPayloadSchema = v.object({
  taskId: v.string(),
  clientName: v.string(),
  workflowName: v.string(),
  request: v.string(),
  source: v.optional(triggerSurfaceSchema),
  risk: v.optional(riskSchema),
  expectedRuntime: v.optional(runtimeCandidateSchema),
  requiresOperatorReview: v.optional(v.boolean()),
  contractRefs: v.optional(
    v.object({
      agentContract: v.optional(v.string()),
      goldenTasks: v.optional(v.string()),
      goldenTaskId: v.optional(v.string()),
    }),
  ),
});

export type DeliveryTaskPayload = v.InferOutput<typeof deliveryTaskPayloadSchema>;
export type RuntimeCandidate = v.InferOutput<typeof runtimeCandidateSchema>;
export type TriggerSurface = v.InferOutput<typeof triggerSurfaceSchema>;
export type RiskLevel = v.InferOutput<typeof riskSchema>;

export interface NormalizedDeliveryTaskPayload extends DeliveryTaskPayload {
  source: TriggerSurface;
  risk: RiskLevel;
  expectedRuntime: RuntimeCandidate;
  requiresOperatorReview: boolean;
  contractRefs: {
    agentContract: string;
    goldenTasks: string;
    goldenTaskId: string;
  };
}

export const serviceDeliveryResultSchema = v.object({
  taskId: v.string(),
  clientName: v.string(),
  workflowName: v.string(),
  runtime: v.literal('flue'),
  route: v.literal('service_agent'),
  disposition: v.picklist([
    'ready_for_delivery_handoff',
    'needs_operator_review',
    'blocked_missing_contract',
  ]),
  summary: v.string(),
  recommendedNextActions: v.array(v.string()),
  evidence: v.object({
    contractRefs: v.object({
      agentContract: v.string(),
      goldenTasks: v.string(),
      goldenTaskId: v.string(),
    }),
    runtimeChoice: v.object({
      primaryRuntime: v.literal('flue'),
      channelGateway: v.literal('pi_openclaw'),
      serviceAgentRuntime: v.literal('flue'),
      endpointPattern: v.literal('/agents/service-delivery/:id'),
      reason: v.string(),
    }),
    policyChecks: v.array(
      v.object({
        id: v.string(),
        result: v.picklist(['pass', 'review', 'block']),
        notes: v.string(),
      }),
    ),
  }),
});

export type ServiceDeliveryResult = v.InferOutput<typeof serviceDeliveryResultSchema>;

export function parseDeliveryTaskPayload(payload: unknown): NormalizedDeliveryTaskPayload {
  const parsed = v.parse(deliveryTaskPayloadSchema, payload);

  return {
    ...parsed,
    source: parsed.source ?? 'webhook',
    risk: parsed.risk ?? 'medium',
    expectedRuntime: parsed.expectedRuntime ?? 'flue',
    requiresOperatorReview: parsed.requiresOperatorReview ?? true,
    contractRefs: {
      agentContract: parsed.contractRefs?.agentContract ?? DEFAULT_CONTRACT_REFS.agentContract,
      goldenTasks: parsed.contractRefs?.goldenTasks ?? DEFAULT_CONTRACT_REFS.goldenTasks,
      goldenTaskId: parsed.contractRefs?.goldenTaskId ?? DEFAULT_CONTRACT_REFS.goldenTaskId,
    },
  };
}

export function createPilotResult(input: NormalizedDeliveryTaskPayload): ServiceDeliveryResult {
  const needsReview = input.requiresOperatorReview || input.risk === 'high' || input.risk === 'critical';
  const sourceReason =
    input.source === 'channel'
      ? 'The workflow originates in a channel, so Pi/OpenClaw should remain the operator-visible gateway while Flue handles typed service-agent follow-up.'
      : 'The workflow is a repeatable typed service task, so Flue should own the service-agent endpoint while Pi/OpenClaw remains available for operator review and channel handoff.';

  return v.parse(serviceDeliveryResultSchema, {
    taskId: input.taskId,
    clientName: input.clientName,
    workflowName: input.workflowName,
    runtime: 'flue',
    route: 'service_agent',
    disposition: needsReview ? 'needs_operator_review' : 'ready_for_delivery_handoff',
    summary: `${input.workflowName} is routed to the Flue service-agent pilot with Pi/OpenClaw preserved as the channel gateway.`,
    recommendedNextActions: [
      'Attach this runtime evidence to the tracked Linear issue.',
      'Run the matching golden task before promotion.',
      needsReview
        ? 'Keep operator approval in the loop before any outbound or write action.'
        : 'Proceed with service-agent handoff under the active contract guardrails.',
    ],
    evidence: {
      contractRefs: input.contractRefs,
      runtimeChoice: {
        primaryRuntime: 'flue',
        channelGateway: 'pi_openclaw',
        serviceAgentRuntime: 'flue',
        endpointPattern: FLUE_SERVICE_AGENT_RUNTIME.endpointPattern,
        reason: sourceReason,
      },
      policyChecks: [
        {
          id: 'contract-reference-present',
          result: input.contractRefs.agentContract && input.contractRefs.goldenTasks ? 'pass' : 'block',
          notes: `Uses ${input.contractRefs.agentContract} and ${input.contractRefs.goldenTasks}.`,
        },
        {
          id: 'runtime-routing-pi-flue',
          result: input.expectedRuntime === 'flue' ? 'pass' : 'review',
          notes: `Expected runtime is ${input.expectedRuntime}; service endpoint runtime is flue.`,
        },
        {
          id: 'operator-approval-boundary',
          result: needsReview ? 'review' : 'pass',
          notes: needsReview
            ? 'Operator review remains required before external side effects.'
            : 'No elevated approval requirement was declared for this payload.',
        },
      ],
    },
  });
}

export function createServiceDeliveryPrompt(input: NormalizedDeliveryTaskPayload): string {
  const deterministicEvidence = createPilotResult(input);

  return [
    'Run the CREATE SOMETHING Flue service-agent pilot for this Policy OS workflow.',
    '',
    'Input payload:',
    JSON.stringify(input, null, 2),
    '',
    'Required baseline evidence:',
    JSON.stringify(deterministicEvidence, null, 2),
    '',
    'Return the final answer using the provided result schema. Preserve the runtime routing evidence, keep the summary compact, and do not include secrets or raw environment values.',
  ].join('\n');
}

export function validateServiceDeliveryResult(result: unknown): ServiceDeliveryResult {
  return v.parse(serviceDeliveryResultSchema, result);
}
