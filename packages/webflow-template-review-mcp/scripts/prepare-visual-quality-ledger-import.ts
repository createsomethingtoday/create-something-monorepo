import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

type CliOptions = {
  inputDir: string;
  outDir?: string;
  approvalManifestPath?: string;
  policySnapshotId?: string;
  reviewedAt: string;
};

type AliasProposal = {
  id: string;
  raw_phrase: string;
  canonical_bucket: string;
  reviewer?: string;
  source_count: number;
  confidence?: number;
  status: string;
  example_version_ids: string[];
};

type GoldenCaseProposal = {
  id: string;
  asset_id?: string;
  version_id: string;
  template_name?: string;
  published_url?: string;
  golden_set_version: string;
  case_label: string;
  normalized_buckets: string[];
  reviewer_confirmed: boolean;
  reviewer?: string;
  evidence: Record<string, unknown>;
  status: string;
};

type CalibrationSummary = {
  generated_at?: string;
  golden_set_version?: string;
  sampled_counts?: Record<string, number>;
  alias_source_row_count?: number;
  alias_proposal_count?: number;
};

type ApprovalManifest = {
  approved_by?: string;
  approved_alias_ids?: string[];
  approved_golden_case_ids?: string[];
  rejected_alias_ids?: string[];
  rejected_golden_case_ids?: string[];
  notes?: string;
};

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    reviewedAt: new Date().toISOString(),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    if (arg === '--input' && next) {
      options.inputDir = next;
      i += 1;
      continue;
    }
    if (arg === '--out' && next) {
      options.outDir = next;
      i += 1;
      continue;
    }
    if (arg === '--approval-manifest' && next) {
      options.approvalManifestPath = next;
      i += 1;
      continue;
    }
    if (arg === '--policy-snapshot-id' && next) {
      options.policySnapshotId = next;
      i += 1;
      continue;
    }
    if (arg === '--reviewed-at' && next) {
      options.reviewedAt = next;
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.inputDir) throw new Error('Missing required --input <calibration-output-dir>');
  return {
    inputDir: options.inputDir,
    outDir: options.outDir,
    approvalManifestPath: options.approvalManifestPath,
    policySnapshotId: options.policySnapshotId,
    reviewedAt: options.reviewedAt ?? new Date().toISOString(),
  };
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp calibration:visual-quality:prepare-ledger -- [options]

Options:
  --input <dir>                 Calibration output directory. Required.
  --out <dir>                   Output directory. Default: <input>/ledger-import
  --approval-manifest <file>    Optional approval manifest JSON.
  --policy-snapshot-id <id>     Optional policy snapshot id for approved rows.
  --reviewed-at <iso>           Optional reviewed timestamp for approved rows.
  --help                        Show this help.

Behavior:
  Emits proposed policy-proposal SQL for all candidates.
  Emits active alias/golden-case import SQL only for IDs approved in the approval manifest.
`);
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

async function readJsonl<T>(filePath: string): Promise<T[]> {
  const content = await readFile(filePath, 'utf8');
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

function sqlString(value: unknown): string {
  if (value === undefined || value === null || value === '') return 'null';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlNumber(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : 'null';
}

function sqlJson(value: unknown): string {
  return sqlString(JSON.stringify(value));
}

function stableId(prefix: string, parts: unknown[]): string {
  const hash = createHash('sha256').update(parts.map((part) => String(part ?? '')).join('|')).digest('hex').slice(0, 16);
  return `${prefix}_${hash}`;
}

function statusFor(id: string, approvedIds: Set<string>, rejectedIds: Set<string>): 'proposed' | 'approved' | 'rejected' {
  if (approvedIds.has(id)) return 'approved';
  if (rejectedIds.has(id)) return 'rejected';
  return 'proposed';
}

function insertPolicyProposalSql(args: {
  id: string;
  proposalType: string;
  status: 'proposed' | 'approved' | 'rejected';
  proposal: unknown;
  evidence: unknown;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}) {
  const approvedBy = args.status === 'approved' ? args.approvedBy : undefined;
  const approvedAt = args.status === 'approved' ? args.approvedAt : undefined;
  return `insert into visual_quality_policy_proposals (
  id, proposal_type, status, proposal_json, evidence_json, approved_by, approved_at, created_at
) values (
  ${sqlString(args.id)},
  ${sqlString(args.proposalType)},
  ${sqlString(args.status)},
  ${sqlJson(args.proposal)},
  ${sqlJson(args.evidence)},
  ${sqlString(approvedBy)},
  ${sqlString(approvedAt)},
  ${sqlString(args.createdAt)}
) on conflict(id) do update set
  status = excluded.status,
  proposal_json = excluded.proposal_json,
  evidence_json = excluded.evidence_json,
  approved_by = excluded.approved_by,
  approved_at = excluded.approved_at;`;
}

function insertActiveAliasSql(alias: AliasProposal, args: { policySnapshotId?: string; reviewedAt: string; reviewedBy?: string }) {
  const id = stableId('visual_alias', [alias.raw_phrase, alias.canonical_bucket, alias.reviewer]);
  return `insert into visual_quality_feedback_aliases (
  id, raw_phrase, canonical_bucket, reviewer_id, source_count, confidence, status,
  evidence_json, policy_snapshot_id, created_at, reviewed_at, reviewed_by
) values (
  ${sqlString(id)},
  ${sqlString(alias.raw_phrase)},
  ${sqlString(alias.canonical_bucket)},
  ${sqlString(alias.reviewer)},
  ${sqlNumber(alias.source_count)},
  ${sqlNumber(alias.confidence)},
  'active',
  ${sqlJson({ source_proposal_id: alias.id, example_version_ids: alias.example_version_ids })},
  ${sqlString(args.policySnapshotId)},
  ${sqlString(args.reviewedAt)},
  ${sqlString(args.reviewedAt)},
  ${sqlString(args.reviewedBy)}
) on conflict(id) do update set
  source_count = excluded.source_count,
  confidence = excluded.confidence,
  status = 'active',
  evidence_json = excluded.evidence_json,
  policy_snapshot_id = excluded.policy_snapshot_id,
  reviewed_at = excluded.reviewed_at,
  reviewed_by = excluded.reviewed_by;`;
}

function insertActiveGoldenCaseSql(
  goldenCase: GoldenCaseProposal,
  args: { policySnapshotId?: string; reviewedAt: string; reviewedBy?: string },
) {
  return `insert into visual_quality_golden_cases (
  id, asset_id, version_id, golden_set_version, case_label, normalized_buckets_json,
  evidence_json, reviewer_confirmed, reviewer_id, policy_snapshot_id, status, created_at
) values (
  ${sqlString(goldenCase.id)},
  ${sqlString(goldenCase.asset_id)},
  ${sqlString(goldenCase.version_id)},
  ${sqlString(goldenCase.golden_set_version)},
  ${sqlString(goldenCase.case_label)},
  ${sqlJson(goldenCase.normalized_buckets)},
  ${sqlJson({
    template_name: goldenCase.template_name,
    published_url: goldenCase.published_url,
    evidence: goldenCase.evidence,
    approved_by: args.reviewedBy,
    approved_at: args.reviewedAt,
  })},
  ${goldenCase.reviewer_confirmed ? 1 : 0},
  ${sqlString(goldenCase.reviewer)},
  ${sqlString(args.policySnapshotId)},
  'active',
  ${sqlString(args.reviewedAt)}
) on conflict(id) do update set
  case_label = excluded.case_label,
  normalized_buckets_json = excluded.normalized_buckets_json,
  evidence_json = excluded.evidence_json,
  reviewer_confirmed = excluded.reviewer_confirmed,
  policy_snapshot_id = excluded.policy_snapshot_id,
  status = 'active';`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const outDir = options.outDir ?? path.join(options.inputDir, 'ledger-import');
  const aliases = await readJsonl<AliasProposal>(path.join(options.inputDir, 'visual-quality-alias-proposals.jsonl'));
  const goldenCases = await readJsonl<GoldenCaseProposal>(path.join(options.inputDir, 'visual-quality-golden-cases.proposed.jsonl'));
  const summary = await readJson<CalibrationSummary>(path.join(options.inputDir, 'visual-quality-summary.json'));
  const manifest = options.approvalManifestPath
    ? await readJson<ApprovalManifest>(options.approvalManifestPath)
    : ({
        approved_alias_ids: [],
        approved_golden_case_ids: [],
        rejected_alias_ids: [],
        rejected_golden_case_ids: [],
      } satisfies ApprovalManifest);

  const approvedAliasIds = new Set(manifest.approved_alias_ids ?? []);
  const approvedGoldenCaseIds = new Set(manifest.approved_golden_case_ids ?? []);
  const rejectedAliasIds = new Set(manifest.rejected_alias_ids ?? []);
  const rejectedGoldenCaseIds = new Set(manifest.rejected_golden_case_ids ?? []);
  const createdAt = summary.generated_at ?? new Date().toISOString();

  await mkdir(outDir, { recursive: true });

  const policyProposalStatements = [
    '-- Generated visual-quality policy proposals.',
    '-- Review before applying. Proposed rows do not activate aliases or golden cases.',
    ...aliases.map((alias) =>
      insertPolicyProposalSql({
        id: stableId('visual_policy_proposal', ['alias', alias.raw_phrase, alias.canonical_bucket, alias.reviewer]),
        proposalType: 'alias_addition',
        status: statusFor(alias.id, approvedAliasIds, rejectedAliasIds),
        proposal: alias,
        evidence: { example_version_ids: alias.example_version_ids, source_count: alias.source_count },
        approvedBy: manifest.approved_by,
        approvedAt: options.reviewedAt,
        createdAt,
      }),
    ),
    ...goldenCases.map((goldenCase) =>
      insertPolicyProposalSql({
        id: stableId('visual_policy_proposal', ['golden_case', goldenCase.id]),
        proposalType: 'golden_case_addition',
        status: statusFor(goldenCase.id, approvedGoldenCaseIds, rejectedGoldenCaseIds),
        proposal: goldenCase,
        evidence: goldenCase.evidence,
        approvedBy: manifest.approved_by,
        approvedAt: options.reviewedAt,
        createdAt,
      }),
    ),
  ];

  const activeImportStatements = [
    '-- Generated visual-quality active imports.',
    '-- Empty unless an approval manifest approved specific proposal IDs.',
    ...aliases.filter((alias) => approvedAliasIds.has(alias.id)).map((alias) =>
      insertActiveAliasSql(alias, {
        policySnapshotId: options.policySnapshotId,
        reviewedAt: options.reviewedAt,
        reviewedBy: manifest.approved_by,
      }),
    ),
    ...goldenCases.filter((goldenCase) => approvedGoldenCaseIds.has(goldenCase.id)).map((goldenCase) =>
      insertActiveGoldenCaseSql(goldenCase, {
        policySnapshotId: options.policySnapshotId,
        reviewedAt: options.reviewedAt,
        reviewedBy: manifest.approved_by,
      }),
    ),
  ];

  const manifestTemplate: ApprovalManifest & {
    candidate_alias_ids: string[];
    candidate_golden_case_ids: string[];
  } = {
    approved_by: '',
    approved_alias_ids: [],
    approved_golden_case_ids: [],
    rejected_alias_ids: [],
    rejected_golden_case_ids: [],
    notes: 'Copy candidate IDs into approved_* or rejected_* after reviewer or lead review.',
    candidate_alias_ids: aliases.map((alias) => alias.id),
    candidate_golden_case_ids: goldenCases.map((goldenCase) => goldenCase.id),
  };

  const outputSummary = {
    generated_at: new Date().toISOString(),
    input_dir: options.inputDir,
    out_dir: outDir,
    golden_set_version: summary.golden_set_version,
    candidate_alias_count: aliases.length,
    candidate_golden_case_count: goldenCases.length,
    approved_alias_count: approvedAliasIds.size,
    approved_golden_case_count: approvedGoldenCaseIds.size,
    rejected_alias_count: rejectedAliasIds.size,
    rejected_golden_case_count: rejectedGoldenCaseIds.size,
    files: {
      approval_manifest_template: path.join(outDir, 'visual-quality-approval-manifest.template.json'),
      policy_proposals_sql: path.join(outDir, 'visual-quality-policy-proposals.sql'),
      active_import_sql: path.join(outDir, 'visual-quality-approved-import.sql'),
      summary: path.join(outDir, 'visual-quality-ledger-import-summary.json'),
    },
    notes: [
      'Policy proposal SQL is reviewable and does not activate aliases or golden cases.',
      'Active import SQL only includes IDs explicitly approved in the approval manifest.',
      'No Airtable or D1 writes are performed by this script.',
    ],
  };

  await writeFile(path.join(outDir, 'visual-quality-policy-proposals.sql'), `${policyProposalStatements.join('\n\n')}\n`);
  await writeFile(path.join(outDir, 'visual-quality-approved-import.sql'), `${activeImportStatements.join('\n\n')}\n`);
  await writeFile(
    path.join(outDir, 'visual-quality-approval-manifest.template.json'),
    `${JSON.stringify(manifestTemplate, null, 2)}\n`,
  );
  await writeFile(path.join(outDir, 'visual-quality-ledger-import-summary.json'), `${JSON.stringify(outputSummary, null, 2)}\n`);

  console.log(JSON.stringify(outputSummary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
