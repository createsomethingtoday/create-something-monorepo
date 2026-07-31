export type EvidenceStatus = 'measured' | 'derived' | 'unmeasured';

const TEMPLATE_REVIEW_AGENT_ELAPSED_MS = 99_537;
const TEMPLATE_REVIEW_HUMAN_TEMPLATES_PER_HOUR = { low: 2, high: 4 } as const;
const TEMPLATE_REVIEW_MODELED_AGENT_TEMPLATES_PER_HOUR =
  3_600_000 / TEMPLATE_REVIEW_AGENT_ELAPSED_MS;

export type TemplateReviewFieldReport = {
  id: '#FR-2026-01';
  slug: 'template-review';
  workflow: 'Marketplace template review';
  verifiedPeriod: 'May–June 2026';
  title: string;
  dek: string;
  hypothesis: string;
  evidence: {
    selectedCases: number;
    usableCases: number;
    screenshots: number;
    reviewerBuckets: number;
    largestReviewerShare: number;
    externalWrites: number;
    status: EvidenceStatus;
  };
  limits: {
    expectedExceptionalCases: number;
    initialMissedExceptionalCases: number;
    currentMissedExceptionalCases: number;
    promotionStatus: 'blocked';
    status: EvidenceStatus;
    reason: string;
  };
  runtime: {
    checkedAt: string;
    classification: 'synthetic_eval';
    centralCases: number;
    centralLiveCases: number;
    centralFailedCases: number;
    reviewerAgents: number;
    reviewerCases: number;
    reviewerLiveCases: number;
    reviewerFailedCases: number;
    reviewerMedianLatencyMs: number;
    reviewerP95LatencyMs: number;
    langfuseReadback: 'unverified';
    status: EvidenceStatus;
  };
  providerPilot: {
    checkedAt: string;
    classification: 'live_single_case_cost';
    sampleSize: 1;
    collectorDurationMs: number;
    reviewerDurationMs: number;
    sequentialActiveRuntimeMs: number;
    endToEndElapsedMs: number;
    collectorProviderCostUsd: number;
    reviewerProviderCostUsd: number;
    totalMeasuredProviderCostUsd: number;
    storageAndToolCost: 'unmeasured';
    annualSavings: 'unmeasured';
    status: EvidenceStatus;
  };
  capacityScenario: {
    checkedAt: string;
    classification: 'modeled_capacity';
    humanBaselineSource: 'user_provided';
    humanTemplatesPerHour: {
      low: number;
      high: number;
    };
    agentBasis: 'single_case_end_to_end';
    agentEndToEndElapsedMs: number;
    modeledAgentTemplatesPerHour: number;
    modeledCapacityMultiple: {
      low: number;
      high: number;
    };
    qualityEquivalence: 'unmeasured';
    cashSavings: 'unmeasured';
    status: EvidenceStatus;
  };
  savings: {
    status: 'unmeasured';
    statement: string;
    formula: string;
    instrumentation: string[];
  };
  sources: Array<{
    label: string;
    kind: 'Calibration record' | 'Delivery report' | 'Runtime eval record';
    artifact: string;
    date: string;
    href: string;
    state: 'verified' | 'review';
  }>;
};

export const templateReviewFieldReport: TemplateReviewFieldReport = {
  id: '#FR-2026-01',
  slug: 'template-review',
  workflow: 'Marketplace template review',
  verifiedPeriod: 'May–June 2026',
  title: 'Automation prepared the evidence. Human judgment still decided.',
  dek: 'We tested whether automation could prepare objective evidence before a human reviewed a Webflow template. It completed 49 of 50 selected evidence packets, but automated judgment did not earn promotion and reviewer time savings remain unmeasured.',
  hypothesis:
    'Preparing objective evidence before judgment may reduce review work without moving consequential decisions to automation.',
  evidence: {
    selectedCases: 50,
    usableCases: 49,
    screenshots: 98,
    reviewerBuckets: 7,
    largestReviewerShare: 36,
    externalWrites: 0,
    status: 'measured'
  },
  limits: {
    expectedExceptionalCases: 2,
    initialMissedExceptionalCases: 2,
    currentMissedExceptionalCases: 1,
    promotionStatus: 'blocked',
    status: 'measured',
    reason:
      'The initial broad reviewer missed both historical exceptional examples. A later specialist recovered one, but promotion remains blocked after the best current run still missed one of two.'
  },
  runtime: {
    checkedAt: '2026-07-12',
    classification: 'synthetic_eval',
    centralCases: 8,
    centralLiveCases: 7,
    centralFailedCases: 0,
    reviewerAgents: 4,
    reviewerCases: 40,
    reviewerLiveCases: 32,
    reviewerFailedCases: 0,
    reviewerMedianLatencyMs: 10_023,
    reviewerP95LatencyMs: 20_167,
    langfuseReadback: 'unverified',
    status: 'measured'
  },
  providerPilot: {
    checkedAt: '2026-07-13',
    classification: 'live_single_case_cost',
    sampleSize: 1,
    collectorDurationMs: 32_661,
    reviewerDurationMs: 44_956,
    sequentialActiveRuntimeMs: 77_617,
    endToEndElapsedMs: TEMPLATE_REVIEW_AGENT_ELAPSED_MS,
    collectorProviderCostUsd: 0.001208457,
    reviewerProviderCostUsd: 0.110515,
    totalMeasuredProviderCostUsd: 0.111723457,
    storageAndToolCost: 'unmeasured',
    annualSavings: 'unmeasured',
    status: 'measured'
  },
  capacityScenario: {
    checkedAt: '2026-07-13',
    classification: 'modeled_capacity',
    humanBaselineSource: 'user_provided',
    humanTemplatesPerHour: TEMPLATE_REVIEW_HUMAN_TEMPLATES_PER_HOUR,
    agentBasis: 'single_case_end_to_end',
    agentEndToEndElapsedMs: TEMPLATE_REVIEW_AGENT_ELAPSED_MS,
    modeledAgentTemplatesPerHour: TEMPLATE_REVIEW_MODELED_AGENT_TEMPLATES_PER_HOUR,
    modeledCapacityMultiple: {
      low:
        TEMPLATE_REVIEW_MODELED_AGENT_TEMPLATES_PER_HOUR /
        TEMPLATE_REVIEW_HUMAN_TEMPLATES_PER_HOUR.high,
      high:
        TEMPLATE_REVIEW_MODELED_AGENT_TEMPLATES_PER_HOUR /
        TEMPLATE_REVIEW_HUMAN_TEMPLATES_PER_HOUR.low
    },
    qualityEquivalence: 'unmeasured',
    cashSavings: 'unmeasured',
    status: 'derived'
  },
  savings: {
    status: 'unmeasured',
    statement:
      'The workflow demonstrates evidence capacity. Reviewer active-time savings still require a before-and-after pilot measurement.',
    formula:
      'eligible submissions × (manual objective-check minutes − reviewer verification minutes)',
    instrumentation: [
      'Capture active minutes spent on objective checks before assisted review.',
      'Capture reviewer verification minutes after the evidence packet is available.',
      'Compare matched submission types and report the sample size with the result.',
      'Track false positives, missed objective issues, escalations, and reviewer overrides beside time.'
    ]
  },
  sources: [
    {
      label: 'Balanced 50-case multimodal calibration',
      kind: 'Calibration record',
      artifact: 'balanced-50-multimodal-calibration-2026-05-27.md',
      date: 'May 27, 2026',
      href: 'https://github.com/createsomethingtoday/create-something-monorepo/blob/main/specs/webflow-marketplace/delivery/template-review-hub/balanced-50-multimodal-calibration-2026-05-27.md',
      state: 'verified'
    },
    {
      label: 'Eight-case multimodal shadow evaluation',
      kind: 'Calibration record',
      artifact: 'multimodal-8case-shadow-eval-2026-05-27.md',
      date: 'May 27, 2026',
      href: 'https://github.com/createsomethingtoday/create-something-monorepo/blob/main/specs/webflow-marketplace/delivery/template-review-hub/multimodal-8case-shadow-eval-2026-05-27.md',
      state: 'verified'
    },
    {
      label: 'Submission quality loop report',
      kind: 'Delivery report',
      artifact: '2026-06-05-submission-quality-loop-report.md',
      date: 'June 5, 2026',
      href: 'https://github.com/createsomethingtoday/create-something-monorepo/blob/main/docs/deliveries/webflow-marketplace/2026-06-05-submission-quality-loop-report.md',
      state: 'review'
    },
    {
      label: 'Template Review Dify eval evidence',
      kind: 'Runtime eval record',
      artifact: '2026-07-12-template-review-dify-eval-evidence.md',
      date: 'July 12, 2026',
      href: 'https://github.com/createsomethingtoday/create-something-monorepo/blob/1e32ebbfd1db06b98e3a6bf45c92120f06775115/docs/deliveries/webflow-marketplace/2026-07-12-template-review-dify-eval-evidence.md',
      state: 'verified'
    },
    {
      label: 'Single-case provider cost pilot',
      kind: 'Delivery report',
      artifact: '2026-07-13-template-review-unit-economics-pilot.md',
      date: 'July 13, 2026',
      href: 'https://github.com/createsomethingtoday/create-something-monorepo/blob/main/docs/deliveries/webflow-marketplace/2026-07-13-template-review-unit-economics-pilot.md',
      state: 'verified'
    }
  ]
};

export function getTemplateReviewPacketCompletion(report: TemplateReviewFieldReport): number {
  return Math.round((report.evidence.usableCases / report.evidence.selectedCases) * 100);
}
