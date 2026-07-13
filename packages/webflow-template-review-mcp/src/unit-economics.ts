import { z } from 'zod';

const nonNegativeFinite = z.number().finite().nonnegative();
const positiveFinite = z.number().finite().positive();

const tokenUsageSchema = z.object({
  status: z.enum(['not_applicable', 'observed_successful_response']),
  input_tokens: z.number().int().nonnegative(),
  cached_input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
  reasoning_tokens: z.number().int().nonnegative(),
  total_tokens: z.number().int().nonnegative(),
});

const measuredCostSchema = z
  .object({
    status: z.enum(['observed', 'synthetic', 'unmeasured', 'not_applicable']),
    usd: nonNegativeFinite,
  })
  .superRefine((cost, context) => {
    if ((cost.status === 'unmeasured' || cost.status === 'not_applicable') && cost.usd !== 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['usd'],
        message: `${cost.status} costs must use zero as a non-billed placeholder.`,
      });
    }
  });

const otherCostsSchema = z.object({
  storage: measuredCostSchema,
  tools: measuredCostSchema,
});

const receiptBaseSchema = z.object({
  schema_version: z.literal('template-review-unit-economics.v1'),
  packet_id: z.string().trim().min(1),
  status: z.literal('completed'),
  started_at: z.string().datetime(),
  completed_at: z.string().datetime(),
  duration_ms: z.number().int().positive(),
  other_costs_usd: otherCostsSchema,
  evidence_note: z.string().trim().min(1),
});

export const collectorReceiptSchema = receiptBaseSchema
  .extend({
    lane: z.literal('evidence_collection'),
    provider: z.literal('e2b'),
    sandbox: z.object({
      vcpu: positiveFinite,
      memory_gib: positiveFinite,
      duration_basis: z.literal('coordinator_observed_sandbox_runtime'),
    }),
    tokens: tokenUsageSchema,
  })
  .superRefine((receipt, context) => {
    const tokenValues = [
      receipt.tokens.input_tokens,
      receipt.tokens.cached_input_tokens,
      receipt.tokens.output_tokens,
      receipt.tokens.reasoning_tokens,
      receipt.tokens.total_tokens,
    ];
    if (receipt.tokens.status !== 'not_applicable' || tokenValues.some((value) => value !== 0)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tokens'],
        message: 'Evidence collection does not call a model; token status must be not_applicable and all token counts must be zero.',
      });
    }
  });

export const reviewerReceiptSchema = receiptBaseSchema
  .extend({
    lane: z.literal('reviewer_agent'),
    provider: z.literal('openai'),
    model: z.string().trim().min(1),
    tokens: tokenUsageSchema,
  })
  .superRefine((receipt, context) => {
    if (receipt.tokens.status !== 'observed_successful_response') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tokens', 'status'],
        message: 'A completed OpenAI reviewer receipt must contain observed successful-response usage.',
      });
    }
    if (receipt.tokens.cached_input_tokens > receipt.tokens.input_tokens) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tokens', 'cached_input_tokens'],
        message: 'Cached input tokens must be a subset of input tokens.',
      });
    }
    if (receipt.tokens.reasoning_tokens > receipt.tokens.output_tokens) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tokens', 'reasoning_tokens'],
        message: 'Reasoning tokens are included in output tokens and cannot exceed them.',
      });
    }
    if (receipt.tokens.total_tokens !== receipt.tokens.input_tokens + receipt.tokens.output_tokens) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tokens', 'total_tokens'],
        message: 'Total tokens must equal input plus output tokens; reasoning tokens are already included in output.',
      });
    }
  });

export const rateCardSchema = z.object({
  schema_version: z.literal('template-review-rate-card.v1'),
  as_of: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, 'Rate card as_of must be YYYY-MM-DD.'),
  classification: z.string().trim().min(1),
  sources: z.array(z.string().url()).min(1),
  e2b: z.object({
    cpu_usd_per_vcpu_second: nonNegativeFinite,
    memory_usd_per_gib_second: nonNegativeFinite,
  }),
  openai_models: z.record(
    z.object({
      input_usd_per_million_tokens: nonNegativeFinite,
      cached_input_usd_per_million_tokens: nonNegativeFinite,
      output_usd_per_million_tokens: nonNegativeFinite,
    }),
  ),
});

export const annualScenarioSchema = z
  .object({
    schema_version: z.literal('template-review-annual-scenario.v1'),
    generated_at: z.string().datetime(),
    classification: z.string().trim().min(1),
    annual_submissions: z.number().int().positive(),
    eligible_share: z.number().finite().min(0).max(1),
    projected_completed_packets: z.number().int().positive(),
    human_minutes_saved: z.object({
      low: nonNegativeFinite,
      high: nonNegativeFinite,
      evidence_status: z.string().trim().min(1),
    }),
    hourly_cost_scenario: z
      .object({
        usd_per_hour: nonNegativeFinite,
        classification: z.string().trim().min(1),
      })
      .optional(),
    annual_maintenance_usd: nonNegativeFinite,
  })
  .superRefine((scenario, context) => {
    if (scenario.human_minutes_saved.low > scenario.human_minutes_saved.high) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['human_minutes_saved'],
        message: 'Human minutes saved low must not exceed high.',
      });
    }
  });

export type CollectorReceipt = z.infer<typeof collectorReceiptSchema>;
export type ReviewerReceipt = z.infer<typeof reviewerReceiptSchema>;
export type RateCard = z.infer<typeof rateCardSchema>;
export type AnnualScenario = z.infer<typeof annualScenarioSchema>;

function durationMs(startedAt: string, completedAt: string): number {
  const duration = Date.parse(completedAt) - Date.parse(startedAt);
  if (!Number.isInteger(duration) || duration <= 0) {
    throw new Error('Receipt completion time must be after its start time.');
  }
  return duration;
}

export function createCollectorReceipt(args: {
  packetId: string;
  startedAt: string;
  completedAt: string;
  cpuCount: number;
  memoryMiB: number;
  evidenceNote: string;
}): CollectorReceipt {
  return collectorReceiptSchema.parse({
    schema_version: 'template-review-unit-economics.v1',
    packet_id: args.packetId,
    lane: 'evidence_collection',
    status: 'completed',
    provider: 'e2b',
    started_at: args.startedAt,
    completed_at: args.completedAt,
    duration_ms: durationMs(args.startedAt, args.completedAt),
    sandbox: {
      vcpu: args.cpuCount,
      memory_gib: args.memoryMiB / 1024,
      duration_basis: 'coordinator_observed_sandbox_runtime',
    },
    tokens: {
      status: 'not_applicable',
      input_tokens: 0,
      cached_input_tokens: 0,
      output_tokens: 0,
      reasoning_tokens: 0,
      total_tokens: 0,
    },
    other_costs_usd: {
      storage: { status: 'unmeasured', usd: 0 },
      tools: { status: 'unmeasured', usd: 0 },
    },
    evidence_note: args.evidenceNote,
  });
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function tokenCount(value: unknown, label: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
  return value as number;
}

export function createReviewerReceiptFromOpenAiUsage(args: {
  packetId: string;
  model: string;
  startedAt: string;
  completedAt: string;
  usage: unknown;
  evidenceNote: string;
}): ReviewerReceipt {
  const usage = record(args.usage, 'OpenAI usage');
  const inputDetails = record(usage.input_tokens_details ?? {}, 'OpenAI input token details');
  const outputDetails = record(usage.output_tokens_details ?? {}, 'OpenAI output token details');

  return reviewerReceiptSchema.parse({
    schema_version: 'template-review-unit-economics.v1',
    packet_id: args.packetId,
    lane: 'reviewer_agent',
    status: 'completed',
    provider: 'openai',
    model: args.model,
    started_at: args.startedAt,
    completed_at: args.completedAt,
    duration_ms: durationMs(args.startedAt, args.completedAt),
    tokens: {
      status: 'observed_successful_response',
      input_tokens: tokenCount(usage.input_tokens, 'OpenAI input_tokens'),
      cached_input_tokens: tokenCount(inputDetails.cached_tokens ?? 0, 'OpenAI cached_tokens'),
      output_tokens: tokenCount(usage.output_tokens, 'OpenAI output_tokens'),
      reasoning_tokens: tokenCount(outputDetails.reasoning_tokens ?? 0, 'OpenAI reasoning_tokens'),
      total_tokens: tokenCount(usage.total_tokens, 'OpenAI total_tokens'),
    },
    other_costs_usd: {
      storage: { status: 'unmeasured', usd: 0 },
      tools: { status: 'unmeasured', usd: 0 },
    },
    evidence_note: args.evidenceNote,
  });
}

const CASH_SAVINGS_MISSING_EVIDENCE = [
  'Actual time-on-task per human review',
  'Fully loaded reviewer cost reconciled to actual hours',
  'Contracted-versus-actual utilization',
  'Approved displaced-cost counterfactual',
  'Finance actuals and finance sign-off',
] as const;

function round(value: number): number {
  return Number(value.toFixed(12));
}

export function buildUnitEconomicsReport(args: {
  collector: unknown;
  reviewer: unknown;
  rateCard: unknown;
  scenario: unknown;
}) {
  const collector = collectorReceiptSchema.parse(args.collector);
  const reviewer = reviewerReceiptSchema.parse(args.reviewer);
  const rateCard = rateCardSchema.parse(args.rateCard);
  const scenario = annualScenarioSchema.parse(args.scenario);

  if (collector.packet_id !== reviewer.packet_id) {
    throw new Error(`Packet mismatch: collector=${collector.packet_id} reviewer=${reviewer.packet_id}`);
  }

  const modelRate = rateCard.openai_models[reviewer.model];
  if (!modelRate) throw new Error(`Rate card does not include reviewer model: ${reviewer.model}`);

  const collectorSeconds = collector.duration_ms / 1_000;
  const collectorProviderCost = round(
    collectorSeconds *
      (collector.sandbox.vcpu * rateCard.e2b.cpu_usd_per_vcpu_second +
        collector.sandbox.memory_gib * rateCard.e2b.memory_usd_per_gib_second),
  );
  const uncachedInputTokens = reviewer.tokens.input_tokens - reviewer.tokens.cached_input_tokens;
  const reviewerProviderCost = round(
    (uncachedInputTokens * modelRate.input_usd_per_million_tokens +
      reviewer.tokens.cached_input_tokens * modelRate.cached_input_usd_per_million_tokens +
      reviewer.tokens.output_tokens * modelRate.output_usd_per_million_tokens) /
      1_000_000,
  );
  const otherCost = round(
    collector.other_costs_usd.storage.usd +
      collector.other_costs_usd.tools.usd +
      reviewer.other_costs_usd.storage.usd +
      reviewer.other_costs_usd.tools.usd,
  );
  const packetTotal = round(collectorProviderCost + reviewerProviderCost + otherCost);

  const eligibleReviews = round(scenario.annual_submissions * scenario.eligible_share);
  const rawHoursLow = (eligibleReviews * scenario.human_minutes_saved.low) / 60;
  const rawHoursHigh = (eligibleReviews * scenario.human_minutes_saved.high) / 60;
  const hoursLow = round(rawHoursLow);
  const hoursHigh = round(rawHoursHigh);
  const annualProviderAndToolCost = round(packetTotal * scenario.projected_completed_packets);
  const annualTotalCost = round(annualProviderAndToolCost + scenario.annual_maintenance_usd);
  const capacityValue = scenario.hourly_cost_scenario
    ? {
        status: 'scenario_not_cash_savings' as const,
        hourly_cost_scenario: scenario.hourly_cost_scenario,
        gross_low_usd: round(rawHoursLow * scenario.hourly_cost_scenario.usd_per_hour),
        gross_high_usd: round(rawHoursHigh * scenario.hourly_cost_scenario.usd_per_hour),
        net_low_usd: round(rawHoursLow * scenario.hourly_cost_scenario.usd_per_hour - annualTotalCost),
        net_high_usd: round(rawHoursHigh * scenario.hourly_cost_scenario.usd_per_hour - annualTotalCost),
      }
    : {
        status: 'not_calculated_without_hourly_scenario' as const,
      };

  return {
    schema_version: 'template-review-unit-economics-report.v1',
    generated_at: scenario.generated_at,
    classification: scenario.classification,
    rate_card: rateCard,
    packet: {
      packet_id: collector.packet_id,
      collector,
      reviewer,
      costs: {
        collector_provider_usd: collectorProviderCost,
        reviewer_provider_usd: reviewerProviderCost,
        other_usd: otherCost,
        other_cost_measurement: {
          collector_storage: collector.other_costs_usd.storage.status,
          collector_tools: collector.other_costs_usd.tools.status,
          reviewer_storage: reviewer.other_costs_usd.storage.status,
          reviewer_tools: reviewer.other_costs_usd.tools.status,
        },
        total_usd: packetTotal,
        notes: [
          'Collector cost uses coordinator-observed sandbox runtime and the supplied E2B resource rates.',
          'Reviewer reasoning tokens are included in billed output tokens and are not priced twice.',
          'Reviewer usage covers the observed successful response; unobserved failed-retry usage is not inferred.',
          'Storage and tool values marked unmeasured are zero placeholders, not evidence of zero actual cost.',
        ],
      },
    },
    annual: {
      inputs: scenario,
      capacity: {
        evidence_status: scenario.human_minutes_saved.evidence_status,
        eligible_reviews: eligibleReviews,
        hours_low: hoursLow,
        hours_high: hoursHigh,
      },
      operating_cost: {
        projected_completed_packets: scenario.projected_completed_packets,
        provider_and_tool_usd: annualProviderAndToolCost,
        maintenance_usd: scenario.annual_maintenance_usd,
        total_usd: annualTotalCost,
      },
      capacity_value: capacityValue,
      cash_savings: {
        status: 'unmeasured' as const,
        missing_evidence: [...CASH_SAVINGS_MISSING_EVIDENCE],
        note: 'Capacity value is not realized cash savings. Cash savings requires a verified displaced-cost counterfactual and finance actuals.',
      },
    },
  };
}

function money(value: number): string {
  return `$${value.toFixed(4)}`;
}

export function renderUnitEconomicsMarkdown(report: ReturnType<typeof buildUnitEconomicsReport>): string {
  const capacityValue = report.annual.capacity_value;
  const capacityRows =
    capacityValue.status === 'scenario_not_cash_savings'
      ? `| Gross capacity value | ${money(capacityValue.gross_low_usd)} | ${money(capacityValue.gross_high_usd)} |\n| Net capacity value | ${money(capacityValue.net_low_usd)} | ${money(capacityValue.net_high_usd)} |`
      : '| Capacity value | Not calculated | Not calculated |';
  const hourlyScenario =
    capacityValue.status === 'scenario_not_cash_savings'
      ? `Hourly scenario: ${money(capacityValue.hourly_cost_scenario.usd_per_hour)}/hour (\`${capacityValue.hourly_cost_scenario.classification}\`)\n`
      : 'Hourly scenario: not supplied\n';
  const measurement = report.packet.costs.other_cost_measurement;

  return `# Template Review unit economics\n\nGenerated: ${report.generated_at}  \nScenario classification: \`${report.classification}\`  \nRate-card classification: \`${report.rate_card.classification}\`\n\n> Capacity value is not realized cash savings. The cash-savings status remains **unmeasured**.\n\n## Completed packet\n\n- Packet: \`${report.packet.packet_id}\`\n- Collector provider cost: ${money(report.packet.costs.collector_provider_usd)}\n- Reviewer provider cost: ${money(report.packet.costs.reviewer_provider_usd)}\n- Storage and tool cost: ${money(report.packet.costs.other_usd)}\n- Other-cost measurement: collector storage=${measurement.collector_storage}, collector tools=${measurement.collector_tools}, reviewer storage=${measurement.reviewer_storage}, reviewer tools=${measurement.reviewer_tools}\n- Total operating cost per completed packet: ${money(report.packet.costs.total_usd)}\n- Reviewer model: \`${report.packet.reviewer.model}\`\n- Reviewer tokens: ${report.packet.reviewer.tokens.input_tokens} input (${report.packet.reviewer.tokens.cached_input_tokens} cached), ${report.packet.reviewer.tokens.output_tokens} output (${report.packet.reviewer.tokens.reasoning_tokens} reasoning)\n- Collector tokens: not applicable (0)\n\n## Annual scenario\n\n${hourlyScenario}\n| Measure | Low | High |\n|---|---:|---:|\n| Capacity hours | ${report.annual.capacity.hours_low} | ${report.annual.capacity.hours_high} |\n${capacityRows}\n\nAnnual provider, storage, and tool cost: ${money(report.annual.operating_cost.provider_and_tool_usd)}  \nAnnual maintenance scenario: ${money(report.annual.operating_cost.maintenance_usd)}  \nAnnual total operating cost: ${money(report.annual.operating_cost.total_usd)}\n\nHuman timing evidence: \`${report.annual.capacity.evidence_status}\`\n\n## Cash savings\n\nStatus: **unmeasured**\n\nRequired evidence:\n\n${report.annual.cash_savings.missing_evidence.map((item) => `- ${item}`).join('\n')}\n\n${report.annual.cash_savings.note}\n`;
}
