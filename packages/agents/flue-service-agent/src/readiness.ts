import * as v from 'valibot';

export const DELIVERY_READINESS_RUNTIME = {
  runtime: 'flue',
  role: 'service_agent',
  agentName: 'delivery-readiness',
  endpointPattern: '/agents/delivery-readiness/:id',
  goldenTaskId: 'runtime-routing-pi-flue',
} as const;

const policyCheckSchema = v.object({
  id: v.string(),
  result: v.picklist(['pass', 'review', 'block']),
  notes: v.string(),
});

export const deliveryReadinessPayloadSchema = v.object({
  taskId: v.string(),
  clientName: v.string(),
  workflowName: v.string(),
  request: v.optional(v.string()),
  contractBundle: v.object({
    agentContractPath: v.string(),
    goldenTasksPath: v.string(),
    goldenTaskId: v.optional(v.string()),
    agentContractText: v.optional(v.string()),
    goldenTasksText: v.optional(v.string()),
  }),
  goldenTaskPayload: v.optional(v.unknown()),
  goldenTaskPayloadPath: v.optional(v.string()),
});

export type DeliveryReadinessPayload = v.InferOutput<typeof deliveryReadinessPayloadSchema>;

export interface NormalizedDeliveryReadinessPayload extends DeliveryReadinessPayload {
  request: string;
  contractBundle: DeliveryReadinessPayload['contractBundle'] & {
    goldenTaskId: string;
    agentContractText: string;
    goldenTasksText: string;
  };
}

export const deliveryReadinessReportSchema = v.object({
  taskId: v.string(),
  clientName: v.string(),
  workflowName: v.string(),
  runtime: v.literal('flue'),
  route: v.literal('delivery_readiness'),
  readiness: v.picklist(['ready', 'review_required', 'blocked']),
  score: v.number(),
  summary: v.string(),
  checks: v.array(policyCheckSchema),
  missingEvidence: v.array(v.string()),
  recommendedNextActions: v.array(v.string()),
  evidence: v.object({
    contractRefs: v.object({
      agentContract: v.string(),
      goldenTasks: v.string(),
      goldenTaskId: v.string(),
    }),
    endpointPattern: v.literal('/agents/delivery-readiness/:id'),
    serviceAgentEndpoint: v.literal('/agents/service-delivery/:id'),
    runtimeChoice: v.object({
      primaryRuntime: v.literal('flue'),
      channelGateway: v.literal('pi_openclaw'),
      serviceAgentRuntime: v.literal('flue'),
    }),
  }),
});

export type DeliveryReadinessReport = v.InferOutput<typeof deliveryReadinessReportSchema>;

export function parseDeliveryReadinessPayload(payload: unknown): NormalizedDeliveryReadinessPayload {
  const parsed = v.parse(deliveryReadinessPayloadSchema, payload);

  return {
    ...parsed,
    request: parsed.request ?? 'Evaluate delivery readiness for the supplied Policy OS contract bundle.',
    contractBundle: {
      ...parsed.contractBundle,
      goldenTaskId: parsed.contractBundle.goldenTaskId ?? DELIVERY_READINESS_RUNTIME.goldenTaskId,
      agentContractText: parsed.contractBundle.agentContractText ?? '',
      goldenTasksText: parsed.contractBundle.goldenTasksText ?? '',
    },
  };
}

function containsNeedle(text: string, needle: string): boolean {
  return text.includes(needle);
}

function containsQuotedOrBareValue(text: string, key: string, value: string): boolean {
  const pattern = new RegExp(`["']?${key}["']?\\s*:\\s*["']?${value}["']?`);
  return pattern.test(text);
}

function pushCheck(
  checks: DeliveryReadinessReport['checks'],
  missingEvidence: string[],
  check: DeliveryReadinessReport['checks'][number],
  missing?: string,
): void {
  checks.push(check);
  if (check.result === 'block' && missing) {
    missingEvidence.push(missing);
  }
}

export function createDeliveryReadinessReport(
  input: NormalizedDeliveryReadinessPayload,
): DeliveryReadinessReport {
  const checks: DeliveryReadinessReport['checks'] = [];
  const missingEvidence: string[] = [];
  const contractText = input.contractBundle.agentContractText;
  const goldenText = input.contractBundle.goldenTasksText;
  const goldenTaskPayloadText =
    input.goldenTaskPayload === undefined ? '' : JSON.stringify(input.goldenTaskPayload);

  pushCheck(
    checks,
    missingEvidence,
    {
      id: 'agent-contract-loaded',
      result: contractText.trim() ? 'pass' : 'block',
      notes: contractText.trim()
        ? `Loaded ${input.contractBundle.agentContractPath}.`
        : `Missing contract text for ${input.contractBundle.agentContractPath}.`,
    },
    input.contractBundle.agentContractPath,
  );

  pushCheck(
    checks,
    missingEvidence,
    {
      id: 'golden-tasks-loaded',
      result: goldenText.trim() ? 'pass' : 'block',
      notes: goldenText.trim()
        ? `Loaded ${input.contractBundle.goldenTasksPath}.`
        : `Missing golden-task text for ${input.contractBundle.goldenTasksPath}.`,
    },
    input.contractBundle.goldenTasksPath,
  );

  pushCheck(
    checks,
    missingEvidence,
    {
      id: 'flue-runtime-declared',
      result:
        containsNeedle(contractText, 'runtime_integrations:') &&
        containsQuotedOrBareValue(contractText, 'primary_runtime', 'flue')
          ? 'pass'
          : 'block',
      notes: 'agent_contract.yaml must declare Flue as the primary service-agent runtime.',
    },
    'runtime_integrations.primary_runtime',
  );

  pushCheck(
    checks,
    missingEvidence,
    {
      id: 'service-agent-endpoint-declared',
      result:
        containsNeedle(contractText, '@create-something/flue-service-agent') &&
        containsNeedle(contractText, '/agents/service-delivery/:id')
          ? 'pass'
          : 'block',
      notes: 'Contract must identify the Flue pilot package and service-delivery endpoint.',
    },
    'runtime_integrations.service_agent.endpoint_pattern',
  );

  pushCheck(
    checks,
    missingEvidence,
    {
      id: 'golden-task-runtime-routing-present',
      result: containsNeedle(goldenText, input.contractBundle.goldenTaskId) ? 'pass' : 'block',
      notes: `Golden tasks must include ${input.contractBundle.goldenTaskId}.`,
    },
    input.contractBundle.goldenTaskId,
  );

  pushCheck(
    checks,
    missingEvidence,
    {
      id: 'golden-task-validation-artifacts-present',
      result:
        containsNeedle(goldenText, 'validation_artifacts:') &&
        containsNeedle(goldenText, 'packages/agents/flue-service-agent')
          ? 'pass'
          : 'review',
      notes: 'Golden task should point at the Flue pilot fixture and tests.',
    },
  );

  pushCheck(
    checks,
    missingEvidence,
    {
      id: 'fixture-runtime-aligned',
      result:
        !goldenTaskPayloadText || containsQuotedOrBareValue(goldenTaskPayloadText, 'expectedRuntime', 'flue')
          ? 'pass'
          : 'review',
      notes: 'Golden task fixture should expect the Flue service-agent runtime.',
    },
  );

  const blockCount = checks.filter((check) => check.result === 'block').length;
  const reviewCount = checks.filter((check) => check.result === 'review').length;
  const score = Math.round(((checks.length - blockCount - reviewCount * 0.5) / checks.length) * 100) / 100;
  const readiness = blockCount > 0 ? 'blocked' : reviewCount > 0 ? 'review_required' : 'ready';

  return v.parse(deliveryReadinessReportSchema, {
    taskId: input.taskId,
    clientName: input.clientName,
    workflowName: input.workflowName,
    runtime: 'flue',
    route: 'delivery_readiness',
    readiness,
    score,
    summary:
      readiness === 'ready'
        ? `${input.workflowName} has the required Flue service-agent contract and golden-task evidence.`
        : `${input.workflowName} needs ${readiness === 'blocked' ? 'missing evidence resolved' : 'operator review'} before promotion.`,
    checks,
    missingEvidence,
    recommendedNextActions:
      readiness === 'ready'
        ? [
            'Attach the readiness report to Linear.',
            'Run the Flue build before deployment.',
            'Promote only with provider secrets managed outside repo files.',
          ]
        : [
            'Resolve blocked or review checks in the contract bundle.',
            'Re-run the deterministic Flue smoke command.',
            'Keep the workflow behind operator review until all checks pass.',
          ],
    evidence: {
      contractRefs: {
        agentContract: input.contractBundle.agentContractPath,
        goldenTasks: input.contractBundle.goldenTasksPath,
        goldenTaskId: input.contractBundle.goldenTaskId,
      },
      endpointPattern: DELIVERY_READINESS_RUNTIME.endpointPattern,
      serviceAgentEndpoint: '/agents/service-delivery/:id',
      runtimeChoice: {
        primaryRuntime: 'flue',
        channelGateway: 'pi_openclaw',
        serviceAgentRuntime: 'flue',
      },
    },
  });
}

export function createDeliveryReadinessPrompt(input: NormalizedDeliveryReadinessPayload): string {
  const deterministicReport = createDeliveryReadinessReport(input);

  return [
    'Evaluate this CREATE SOMETHING Policy OS contract bundle for Flue delivery readiness.',
    '',
    'Request:',
    input.request,
    '',
    'Baseline readiness report:',
    JSON.stringify(deterministicReport, null, 2),
    '',
    'Contract bundle excerpts:',
    JSON.stringify(
      {
        agentContractPath: input.contractBundle.agentContractPath,
        goldenTasksPath: input.contractBundle.goldenTasksPath,
        goldenTaskId: input.contractBundle.goldenTaskId,
        agentContractText: input.contractBundle.agentContractText,
        goldenTasksText: input.contractBundle.goldenTasksText,
        goldenTaskPayload: input.goldenTaskPayload,
      },
      null,
      2,
    ),
    '',
    'Return the final report using the provided schema. Preserve the check ids and do not include secrets or raw environment values.',
  ].join('\n');
}

export function validateDeliveryReadinessReport(result: unknown): DeliveryReadinessReport {
  return v.parse(deliveryReadinessReportSchema, result);
}
