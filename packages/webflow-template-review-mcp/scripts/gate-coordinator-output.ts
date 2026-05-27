import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

type IntendedAudience = 'internal' | 'reviewer' | 'creator';

type CliOptions = {
  policyFile: string;
  requestFile: string;
  outDir: string;
  gateId?: string;
};

type ExposurePolicy = {
  schema_version?: string;
  policy_id?: string;
  coordinator_mode?: string;
  allowed_lanes?: string[];
  allowed_outputs?: string[];
  blocked_outputs?: string[];
  required_human_gates?: string[];
  dify_contract?: {
    may_show_to_reviewer?: string[];
    must_keep_internal?: string[];
    must_not_emit?: string[];
    requires_lead_approval?: string[];
  };
  input_exclusions?: string[];
};

type CoordinatorOutputRequest = {
  schema_version?: string;
  request_id?: string;
  intended_audience?: IntendedAudience;
  requested_lanes?: string[];
  requested_outputs?: string[];
  input_sources?: string[];
  human_gate_confirmations?: string[];
  notes?: string[];
};

type BlockedItem = {
  value: string;
  reason: string;
};

type CoordinatorOutputGate = {
  schema_version: 'template_review_coordinator_output_gate.v0.1';
  gate_id: string;
  generated_at: string;
  policy_id: string | null;
  request_id: string | null;
  status: 'allowed' | 'blocked';
  coordinator_mode: string | null;
  intended_audience: IntendedAudience;
  allowed_requested_lanes: string[];
  allowed_requested_outputs: string[];
  blocked_lanes: BlockedItem[];
  blocked_outputs: BlockedItem[];
  blocked_input_sources: BlockedItem[];
  missing_human_gates: BlockedItem[];
  notes: string[];
};

const DEFAULT_OUT_DIR = '/tmp/webflow-template-review-coordinator-output-gate';
const EXPECTED_POLICY_SCHEMA = 'template_review_coordinator_exposure_policy.v0.1';
const EXPECTED_REQUEST_SCHEMA = 'template_review_coordinator_output_request.v0.1';
const OUTPUT_HUMAN_GATES: Record<string, string[]> = {
  reviewer_facing_quality_cue: ['reviewer_confirms_quality_cue'],
  shadow_expansion_case_selection: ['shadow_expansion_plan_approval'],
};

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    outDir: DEFAULT_OUT_DIR,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    if (arg === '--policy' && next) {
      options.policyFile = next;
      index += 1;
      continue;
    }
    if ((arg === '--request' || arg === '--output-request') && next) {
      options.requestFile = next;
      index += 1;
      continue;
    }
    if (arg === '--out' && next) {
      options.outDir = next;
      index += 1;
      continue;
    }
    if (arg === '--gate-id' && next) {
      options.gateId = next;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.policyFile) throw new Error('Missing required --policy <coordinator-exposure-policy.json>.');
  if (!options.requestFile) throw new Error('Missing required --request <coordinator-output-request.json>.');
  return {
    policyFile: options.policyFile,
    requestFile: options.requestFile,
    outDir: options.outDir ?? DEFAULT_OUT_DIR,
    gateId: options.gateId,
  };
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp coordinator:output-gate -- [options]

Options:
  --policy <file>       coordinator-exposure-policy.json. Required.
  --request <file>      coordinator output request JSON. Required.
  --out <dir>           Output directory. Default: ${DEFAULT_OUT_DIR}
  --gate-id <id>        Optional stable output gate id.
  --help                Show this help.

Behavior:
  Fails closed on coordinator outputs that are not allowed by the exposure
  policy, are explicitly blocked, use excluded inputs, require missing human
  gates, or attempt to show internal-only outputs to reviewers or creators.
`);
}

function stableHash(value: unknown, length = 16): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, length);
}

function stableId(prefix: string, parts: unknown[]): string {
  return `${prefix}_${stableHash(parts)}`;
}

function list(value: string[] | undefined): string[] {
  return Array.isArray(value) ? value : [];
}

function set(value: string[] | undefined): Set<string> {
  return new Set(list(value));
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function intendedAudience(value: unknown): IntendedAudience {
  if (value === undefined) return 'internal';
  if (value === 'internal' || value === 'reviewer' || value === 'creator') return value;
  throw new Error(`Unsupported intended_audience: ${String(value)}`);
}

function validateInputs(policy: ExposurePolicy, request: CoordinatorOutputRequest) {
  if (policy.schema_version !== EXPECTED_POLICY_SCHEMA) {
    throw new Error(`Unsupported policy schema_version: ${String(policy.schema_version ?? 'missing')}`);
  }
  if (request.schema_version !== undefined && request.schema_version !== EXPECTED_REQUEST_SCHEMA) {
    throw new Error(`Unsupported request schema_version: ${String(request.schema_version)}`);
  }
}

function buildOutputGate(
  policy: ExposurePolicy,
  request: CoordinatorOutputRequest,
  options: CliOptions,
): CoordinatorOutputGate {
  validateInputs(policy, request);

  const audience = intendedAudience(request.intended_audience);
  const requestedLanes = unique(list(request.requested_lanes));
  const requestedOutputs = unique(list(request.requested_outputs));
  const inputSources = unique(list(request.input_sources));
  const confirmations = set(request.human_gate_confirmations);
  const allowedLaneSet = set(policy.allowed_lanes);
  const allowedOutputSet = set(policy.allowed_outputs);
  const blockedOutputSet = new Set([...list(policy.blocked_outputs), ...list(policy.dify_contract?.must_not_emit)]);
  const excludedInputSet = set(policy.input_exclusions);
  const reviewerVisibleSet = set(policy.dify_contract?.may_show_to_reviewer);
  const internalOnlySet = set(policy.dify_contract?.must_keep_internal);
  const leadApprovalSet = set(policy.dify_contract?.requires_lead_approval);

  const blockedLanes: BlockedItem[] = [];
  const blockedOutputs: BlockedItem[] = [];
  const blockedInputSources: BlockedItem[] = [];
  const missingHumanGates: BlockedItem[] = [];
  const allowedRequestedLanes: string[] = [];
  const allowedRequestedOutputs: string[] = [];

  for (const lane of requestedLanes) {
    if (allowedLaneSet.has(lane)) {
      allowedRequestedLanes.push(lane);
    } else {
      blockedLanes.push({ value: lane, reason: 'lane_not_allowed_by_exposure_policy' });
    }
  }

  for (const input of inputSources) {
    if (excludedInputSet.has(input)) {
      blockedInputSources.push({ value: input, reason: 'input_source_excluded_from_quality_review' });
    }
  }

  for (const output of requestedOutputs) {
    if (blockedOutputSet.has(output)) {
      blockedOutputs.push({ value: output, reason: 'output_explicitly_blocked_by_exposure_policy' });
      continue;
    }
    if (!allowedOutputSet.has(output)) {
      blockedOutputs.push({ value: output, reason: 'output_not_allowed_by_exposure_policy' });
      continue;
    }
    if (leadApprovalSet.has(output) && !confirmations.has(`lead_approved:${output}`)) {
      missingHumanGates.push({ value: output, reason: 'lead_approval_required' });
      continue;
    }
    let missingOutputHumanGate = false;
    for (const gate of OUTPUT_HUMAN_GATES[output] ?? []) {
      if (!confirmations.has(gate)) {
        missingHumanGates.push({ value: `${output}:${gate}`, reason: 'human_gate_confirmation_required' });
        missingOutputHumanGate = true;
      }
    }
    if (missingOutputHumanGate) continue;
    if ((audience === 'reviewer' || audience === 'creator') && !reviewerVisibleSet.has(output)) {
      blockedOutputs.push({ value: output, reason: 'output_not_visible_to_reviewer_or_creator' });
      continue;
    }
    if ((audience === 'reviewer' || audience === 'creator') && internalOnlySet.has(output)) {
      blockedOutputs.push({ value: output, reason: 'output_marked_internal_only' });
      continue;
    }
    allowedRequestedOutputs.push(output);
  }

  const blockedCount =
    blockedLanes.length + blockedOutputs.length + blockedInputSources.length + missingHumanGates.length;

  return {
    schema_version: 'template_review_coordinator_output_gate.v0.1',
    gate_id:
      options.gateId ??
      stableId('coordinator_output_gate', [
        policy.policy_id,
        request.request_id,
        audience,
        requestedLanes,
        requestedOutputs,
        inputSources,
        request.human_gate_confirmations,
      ]),
    generated_at: new Date().toISOString(),
    policy_id: policy.policy_id ?? null,
    request_id: request.request_id ?? null,
    status: blockedCount === 0 ? 'allowed' : 'blocked',
    coordinator_mode: policy.coordinator_mode ?? null,
    intended_audience: audience,
    allowed_requested_lanes: allowedRequestedLanes,
    allowed_requested_outputs: allowedRequestedOutputs,
    blocked_lanes: blockedLanes,
    blocked_outputs: blockedOutputs,
    blocked_input_sources: blockedInputSources,
    missing_human_gates: missingHumanGates,
    notes: [
      'This gate validates a proposed coordinator output against a coordinator exposure policy.',
      'A blocked gate means Dify or another coordinator must not emit the requested output.',
      'Final marketplace decisions remain human-owned even when evidence or guidance outputs are allowed.',
    ],
  };
}

function markdown(gate: CoordinatorOutputGate): string {
  const blockedReasons = [
    ...gate.blocked_lanes.map((item) => `- lane ${item.value}: ${item.reason}`),
    ...gate.blocked_outputs.map((item) => `- output ${item.value}: ${item.reason}`),
    ...gate.blocked_input_sources.map((item) => `- input ${item.value}: ${item.reason}`),
    ...gate.missing_human_gates.map((item) => `- gate ${item.value}: ${item.reason}`),
  ];
  return `# Coordinator Output Gate

Generated: ${gate.generated_at}
Gate ID: ${gate.gate_id}
Policy ID: ${gate.policy_id ?? 'unknown'}
Request ID: ${gate.request_id ?? 'unknown'}
Status: ${gate.status}
Intended audience: ${gate.intended_audience}

## Allowed Outputs

${gate.allowed_requested_outputs.map((output) => `- ${output}`).join('\n') || '- none'}

## Blockers

${blockedReasons.join('\n') || '- none'}
`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const policy = JSON.parse(await readFile(options.policyFile, 'utf8')) as ExposurePolicy;
  const request = JSON.parse(await readFile(options.requestFile, 'utf8')) as CoordinatorOutputRequest;
  const gate = buildOutputGate(policy, request, options);

  await mkdir(options.outDir, { recursive: true });
  const jsonFile = path.join(options.outDir, 'coordinator-output-gate.json');
  const markdownFile = path.join(options.outDir, 'coordinator-output-gate.md');
  await writeFile(jsonFile, `${JSON.stringify(gate, null, 2)}\n`);
  await writeFile(markdownFile, markdown(gate));

  console.log(
    JSON.stringify(
      {
        ok: gate.status === 'allowed',
        status: gate.status,
        gate_id: gate.gate_id,
        policy_id: gate.policy_id,
        request_id: gate.request_id,
        out_dir: options.outDir,
      },
      null,
      2,
    ),
  );

  if (gate.status === 'blocked') process.exit(2);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
