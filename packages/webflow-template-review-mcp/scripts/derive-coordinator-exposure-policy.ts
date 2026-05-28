import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

type ReadinessLevel =
  | 'blocked_no_calibration'
  | 'creator_guidance_only'
  | 'shadow_only'
  | 'reviewer_assist_candidate'
  | 'quality_band_shadow_expansion_candidate';

type PromotionGateStatus = 'blocked' | 'candidate_for_human_review';

type CliOptions = {
  inputFile: string;
  outDir: string;
  policyId?: string;
  leadApprovedReviewerAssist: boolean;
};

type ReadinessSummary = {
  schema_version?: string;
  run_id?: string;
  generated_at?: string;
  review_posture?: string;
  readiness_level?: string;
  promotion_gate?: {
    status?: string;
    reasons?: string[];
  };
  aggregate_metrics?: Record<string, unknown>;
  input_exclusions?: string[];
  notes?: string[];
};

type ExposurePolicy = {
  schema_version: 'template_review_coordinator_exposure_policy.v0.1';
  policy_id: string;
  generated_at: string;
  source_readiness_run_id?: string;
  source_readiness_schema_version?: string;
  readiness_level: ReadinessLevel;
  promotion_gate_status: PromotionGateStatus;
  coordinator_mode:
    | 'evidence_only'
    | 'creator_guidance_only'
    | 'shadow_calibration_only'
    | 'reviewer_assist_pending_lead_approval'
    | 'reviewer_assist_enabled'
    | 'quality_band_shadow_expansion_only';
  allowed_lanes: string[];
  allowed_outputs: string[];
  blocked_outputs: string[];
  required_human_gates: string[];
  dify_contract: {
    may_show_to_reviewer: string[];
    must_keep_internal: string[];
    must_not_emit: string[];
    requires_lead_approval: string[];
  };
  input_exclusions: string[];
  gate_reasons: string[];
  notes: string[];
};

const DEFAULT_OUT_DIR = '/tmp/webflow-template-review-coordinator-exposure-policy';
const REQUIRED_INPUT_EXCLUSIONS = ['popularity', 'sales', 'views', 'favorites', 'marketplace_engagement'];
const BASE_ALLOWED_LANES = [
  'intake_context',
  'published_site_validation',
  'validator_app_submission_contract',
  'validator_app_results_if_persisted',
  'visual_proxy_evidence',
  'appeal_equity_evidence',
  'artifact_inventory',
];
const BASE_BLOCKED_OUTPUTS = [
  'autonomous_approval',
  'autonomous_rejection',
  'final_quality_band',
  'featured_or_exceptional_decision',
  'airtable_write_without_reviewer_confirmation',
  'creator_facing_final_decision_language',
  'quality_decision_from_popularity_sales_views_or_engagement',
];

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    outDir: DEFAULT_OUT_DIR,
    leadApprovedReviewerAssist: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    if ((arg === '--input' || arg === '--readiness-summary') && next) {
      options.inputFile = next;
      index += 1;
      continue;
    }
    if (arg === '--out' && next) {
      options.outDir = next;
      index += 1;
      continue;
    }
    if (arg === '--policy-id' && next) {
      options.policyId = next;
      index += 1;
      continue;
    }
    if (arg === '--lead-approved-reviewer-assist') {
      options.leadApprovedReviewerAssist = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.inputFile) throw new Error('Missing required --input <quality-band-readiness-summary.json>.');
  return {
    inputFile: options.inputFile,
    outDir: options.outDir ?? DEFAULT_OUT_DIR,
    policyId: options.policyId,
    leadApprovedReviewerAssist: options.leadApprovedReviewerAssist ?? false,
  };
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp coordinator:exposure-policy -- [options]

Options:
  --input <file>                         quality-band-readiness-summary.json. Required.
  --out <dir>                            Output directory. Default: ${DEFAULT_OUT_DIR}
  --policy-id <id>                       Optional stable exposure policy id.
  --lead-approved-reviewer-assist        Allows reviewer-assist quality cues when readiness is reviewer_assist_candidate.
  --help                                 Show this help.

Behavior:
  Converts a quality-band readiness summary into a Dify/coordinator exposure
  contract. It does not call providers and does not write Airtable, D1,
  reviewer feedback, approvals, rejections, ratings, or featured decisions.
`);
}

function stableHash(value: unknown, length = 16): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, length);
}

function stableId(prefix: string, parts: unknown[]): string {
  return `${prefix}_${stableHash(parts)}`;
}

function asReadinessLevel(value: unknown): ReadinessLevel {
  if (
    value === 'blocked_no_calibration' ||
    value === 'creator_guidance_only' ||
    value === 'shadow_only' ||
    value === 'reviewer_assist_candidate' ||
    value === 'quality_band_shadow_expansion_candidate'
  ) {
    return value;
  }
  throw new Error(`Unsupported readiness_level: ${String(value ?? 'missing')}`);
}

function asPromotionGateStatus(value: unknown): PromotionGateStatus {
  if (value === 'blocked' || value === 'candidate_for_human_review') return value;
  throw new Error(`Unsupported promotion_gate.status: ${String(value ?? 'missing')}`);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function inputExclusions(summary: ReadinessSummary): string[] {
  return unique([...(summary.input_exclusions ?? []), ...REQUIRED_INPUT_EXCLUSIONS]);
}

function buildPolicy(summary: ReadinessSummary, options: CliOptions): ExposurePolicy {
  const readinessLevel = asReadinessLevel(summary.readiness_level);
  const promotionGateStatus = asPromotionGateStatus(summary.promotion_gate?.status);
  const gateReasons = Array.isArray(summary.promotion_gate?.reasons) ? summary.promotion_gate.reasons : [];
  const allowedLanes = [...BASE_ALLOWED_LANES];
  const allowedOutputs = ['objective_evidence_summary', 'artifact_links', 'manual_checks_remaining'];
  const blockedOutputs = [...BASE_BLOCKED_OUTPUTS];
  const requiredHumanGates = ['final_marketplace_decision'];
  const mayShowToReviewer = ['objective_evidence_summary', 'artifact_links', 'manual_checks_remaining'];
  const mustKeepInternal = ['raw_metric_snapshots', 'calibration_private_outcomes'];
  const requiresLeadApproval: string[] = [];
  let coordinatorMode: ExposurePolicy['coordinator_mode'] = 'evidence_only';

  if (readinessLevel !== 'blocked_no_calibration') {
    allowedLanes.push('creator_guidance_draft');
    allowedOutputs.push('creator_guidance_draft');
    mayShowToReviewer.push('creator_guidance_draft');
  }

  if (readinessLevel === 'creator_guidance_only') {
    coordinatorMode = 'creator_guidance_only';
    blockedOutputs.push('reviewer_facing_quality_cue', 'quality_band_shadow_output');
  }

  if (readinessLevel === 'shadow_only') {
    coordinatorMode = 'shadow_calibration_only';
    allowedOutputs.push('quality_band_shadow_output');
    mustKeepInternal.push('quality_band_shadow_output');
    blockedOutputs.push('reviewer_facing_quality_cue');
  }

  if (readinessLevel === 'reviewer_assist_candidate') {
    if (options.leadApprovedReviewerAssist) {
      coordinatorMode = 'reviewer_assist_enabled';
      allowedOutputs.push('reviewer_facing_quality_cue');
      mayShowToReviewer.push('reviewer_facing_quality_cue');
      requiredHumanGates.push('reviewer_confirms_quality_cue');
    } else {
      coordinatorMode = 'reviewer_assist_pending_lead_approval';
      blockedOutputs.push('reviewer_facing_quality_cue');
      requiresLeadApproval.push('reviewer_facing_quality_cue');
    }
    allowedOutputs.push('quality_band_shadow_output');
    mustKeepInternal.push('quality_band_shadow_output');
  }

  if (readinessLevel === 'quality_band_shadow_expansion_candidate') {
    coordinatorMode = 'quality_band_shadow_expansion_only';
    allowedOutputs.push('quality_band_shadow_output', 'shadow_expansion_case_selection');
    mustKeepInternal.push('quality_band_shadow_output', 'shadow_expansion_case_selection');
    blockedOutputs.push('reviewer_facing_quality_cue');
    requiredHumanGates.push('shadow_expansion_plan_approval');
  }

  if (readinessLevel === 'blocked_no_calibration') {
    blockedOutputs.push('creator_guidance_draft', 'reviewer_facing_quality_cue', 'quality_band_shadow_output');
    requiredHumanGates.push('calibration_summaries_available');
  }

  return {
    schema_version: 'template_review_coordinator_exposure_policy.v0.1',
    policy_id:
      options.policyId ??
      stableId('coordinator_exposure_policy', [
        summary.run_id,
        readinessLevel,
        promotionGateStatus,
        gateReasons,
        options.leadApprovedReviewerAssist,
      ]),
    generated_at: new Date().toISOString(),
    source_readiness_run_id: summary.run_id,
    source_readiness_schema_version: summary.schema_version,
    readiness_level: readinessLevel,
    promotion_gate_status: promotionGateStatus,
    coordinator_mode: coordinatorMode,
    allowed_lanes: unique(allowedLanes),
    allowed_outputs: unique(allowedOutputs),
    blocked_outputs: unique(blockedOutputs),
    required_human_gates: unique(requiredHumanGates),
    dify_contract: {
      may_show_to_reviewer: unique(mayShowToReviewer),
      must_keep_internal: unique(mustKeepInternal),
      must_not_emit: unique(blockedOutputs),
      requires_lead_approval: unique(requiresLeadApproval),
    },
    input_exclusions: inputExclusions(summary),
    gate_reasons: gateReasons,
    notes: [
      'This exposure policy is derived from a quality-band readiness artifact.',
      'It is a coordinator control artifact, not a marketplace review outcome.',
      'Final approvals, rejections, quality ratings, and featured decisions remain human-owned.',
      'Popularity, sales, views, favorites, and marketplace engagement must not influence quality decisions.',
    ],
  };
}

function markdown(policy: ExposurePolicy): string {
  return `# Coordinator Exposure Policy

Generated: ${policy.generated_at}
Policy ID: ${policy.policy_id}
Readiness level: ${policy.readiness_level}
Coordinator mode: ${policy.coordinator_mode}
Promotion gate: ${policy.promotion_gate_status}

This is a Dify/coordinator control artifact. It does not authorize autonomous approval, rejection, quality rating, or featured decisions.

## Allowed Outputs

${policy.allowed_outputs.map((output) => `- ${output}`).join('\n')}

## Blocked Outputs

${policy.blocked_outputs.map((output) => `- ${output}`).join('\n')}

## Required Human Gates

${policy.required_human_gates.map((gate) => `- ${gate}`).join('\n')}

## Dify Contract

- May show to reviewer: ${policy.dify_contract.may_show_to_reviewer.join(', ') || 'none'}
- Must keep internal: ${policy.dify_contract.must_keep_internal.join(', ') || 'none'}
- Must not emit: ${policy.dify_contract.must_not_emit.join(', ') || 'none'}
- Requires lead approval: ${policy.dify_contract.requires_lead_approval.join(', ') || 'none'}

## Excluded Inputs

${policy.input_exclusions.map((input) => `- ${input}`).join('\n')}
`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const summary = JSON.parse(await readFile(options.inputFile, 'utf8')) as ReadinessSummary;
  const policy = buildPolicy(summary, options);

  await mkdir(options.outDir, { recursive: true });
  const jsonFile = path.join(options.outDir, 'coordinator-exposure-policy.json');
  const markdownFile = path.join(options.outDir, 'coordinator-exposure-policy.md');
  await writeFile(jsonFile, `${JSON.stringify(policy, null, 2)}\n`);
  await writeFile(markdownFile, markdown(policy));

  console.log(
    JSON.stringify(
      {
        ok: true,
        policy_id: policy.policy_id,
        coordinator_mode: policy.coordinator_mode,
        readiness_level: policy.readiness_level,
        out_dir: options.outDir,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
