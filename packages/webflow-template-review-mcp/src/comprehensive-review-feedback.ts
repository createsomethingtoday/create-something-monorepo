import { COMPREHENSIVE_REVIEW_CONTRACT_VERSION, RUBRIC_DIMENSIONS } from './comprehensive-review-contract.js';

export const COMPREHENSIVE_REVIEW_LANE_IDS = [
  'intake_context',
  'published_site_validator',
  'e2b_public_site_pass',
  'rubric_dimension_matrix',
  'designer_admin_manual_checks',
] as const;

export const EVIDENCE_LABELS = ['Auto', 'Partial', 'Manual'] as const;

export type ComprehensiveReviewLaneId = (typeof COMPREHENSIVE_REVIEW_LANE_IDS)[number];
export type ComprehensiveEvidenceLabel = (typeof EVIDENCE_LABELS)[number];
export type RubricDimension = (typeof RUBRIC_DIMENSIONS)[number];

export interface ComprehensiveReviewIntake {
  template_name: string;
  version_id: string;
  asset_id?: string;
  published_url: string;
  review_status?: string;
  submitted_date?: string;
  agent_review_feedback_was_blank_before_write?: boolean;
}

export interface ComprehensiveCoverageRow {
  lane_id: ComprehensiveReviewLaneId;
  label: ComprehensiveEvidenceLabel;
  summary: string;
  evidence?: string[];
  gaps?: string[];
}

export interface ComprehensiveFinding {
  title: string;
  label: ComprehensiveEvidenceLabel;
  source: 'review_context' | 'published_site_validator' | 'e2b_public_site_pass' | 'manual_input' | 'other';
  evidence: string;
  url?: string;
  rubric_dimension?: RubricDimension;
  severity?: 'critical' | 'warning' | 'info';
}

export interface RubricDimensionRow {
  dimension: RubricDimension;
  label: ComprehensiveEvidenceLabel;
  evidence_or_reason: string;
}

export interface ValidatorSummary {
  rubric_coverage?: string;
  crawl_coverage?: string;
  pages_analyzed?: number;
  critical_errors?: number;
  warnings?: number;
}

export interface ComprehensiveAgentFeedbackInput {
  intake: ComprehensiveReviewIntake;
  coverage_matrix: ComprehensiveCoverageRow[];
  confirmed_findings: ComprehensiveFinding[];
  rubric_dimension_matrix: RubricDimensionRow[];
  e2b_urls_fetched: string[];
  human_follow_up: string[];
  manual_checks_remaining: string[];
  validator_summary?: ValidatorSummary;
  caveats?: string[];
  generated_by?: string;
}

export interface ComprehensiveAgentFeedbackValidation {
  passed: boolean;
  errors: string[];
  warnings: string[];
  missing_lanes: ComprehensiveReviewLaneId[];
  missing_rubric_dimensions: RubricDimension[];
  missing_manual_check_topics: string[];
}

export interface ComprehensiveAgentFeedbackResult {
  contract_version: string;
  agent_review_feedback: string;
  validation: ComprehensiveAgentFeedbackValidation;
  section_headings: string[];
}

const MANUAL_CHECK_TOPICS = [
  { label: 'components', tokens: ['components'] },
  { label: 'variables', tokens: ['variables'] },
  { label: 'unused styles/classes', tokens: ['unused styles', 'unused classes', 'styles classes'] },
  { label: 'interactions cleanup', tokens: ['interactions cleanup', 'interaction cleanup', 'interactions'] },
  { label: 'Designer responsive QA', tokens: ['designer responsive', 'responsive qa', 'breakpoints'] },
  { label: 'forms', tokens: ['forms'] },
  { label: 'CMS/dynamic page setup', tokens: ['cms', 'dynamic page'] },
  { label: 'site settings', tokens: ['site settings'] },
  { label: 'custom fonts and licenses', tokens: ['custom fonts', 'font licenses', 'fonts licenses'] },
  { label: 'asset thumbnail', tokens: ['asset thumbnail', 'thumbnail'] },
  { label: 'template name and categories', tokens: ['template name', 'categories'] },
  { label: 'pricing/page-count calculation', tokens: ['pricing', 'page count', 'page-count'] },
  { label: 'MRP/admin publishing prerequisites', tokens: ['mrp', 'admin publishing', 'publishing prerequisites'] },
  { label: 'visual quality', tokens: ['visual quality'] },
  { label: 'originality', tokens: ['originality'] },
  { label: 'similarity/flooding', tokens: ['similarity', 'flooding'] },
  { label: 'category fit', tokens: ['category fit'] },
] as const;

const SECTION_HEADINGS = [
  'Supplemental agent initial review evidence',
  'Coverage matrix',
  'Confirmed findings',
  'Human follow-up',
  'Manual checks remaining',
  'Rubric dimension matrix',
  'Decision boundary',
];

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function uniqueValues<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function formatDimension(dimension: RubricDimension): string {
  return dimension
    .split('_')
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}

function bulletList(values: string[] | undefined, fallback: string): string {
  if (!values?.length) return `- ${fallback}`;
  return values.map((value) => `- ${value}`).join('\n');
}

function validateComprehensiveAgentFeedbackInput(input: ComprehensiveAgentFeedbackInput): ComprehensiveAgentFeedbackValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const laneIds = new Set(input.coverage_matrix.map((row) => row.lane_id));
  const missing_lanes = COMPREHENSIVE_REVIEW_LANE_IDS.filter((laneId) => !laneIds.has(laneId));
  if (missing_lanes.length > 0) {
    errors.push(`Missing coverage matrix lanes: ${missing_lanes.join(', ')}`);
  }

  const duplicateLanes = input.coverage_matrix
    .map((row) => row.lane_id)
    .filter((laneId, index, all) => all.indexOf(laneId) !== index);
  if (duplicateLanes.length > 0) {
    warnings.push(`Duplicate coverage matrix lanes were provided: ${uniqueValues(duplicateLanes).join(', ')}`);
  }

  const rubricDimensions = new Set(input.rubric_dimension_matrix.map((row) => row.dimension));
  const missing_rubric_dimensions = RUBRIC_DIMENSIONS.filter((dimension) => !rubricDimensions.has(dimension));
  if (missing_rubric_dimensions.length > 0) {
    errors.push(`Missing rubric dimensions: ${missing_rubric_dimensions.join(', ')}`);
  }

  const duplicateDimensions = input.rubric_dimension_matrix
    .map((row) => row.dimension)
    .filter((dimension, index, all) => all.indexOf(dimension) !== index);
  if (duplicateDimensions.length > 0) {
    warnings.push(`Duplicate rubric dimensions were provided: ${uniqueValues(duplicateDimensions).join(', ')}`);
  }

  if (input.e2b_urls_fetched.length === 0) {
    errors.push('At least one E2B fetched URL is required for a comprehensive Agent Review Feedback draft.');
  }

  const manualText = normalize(input.manual_checks_remaining.join(' '));
  const missing_manual_check_topics = MANUAL_CHECK_TOPICS.filter((topic) => !topic.tokens.some((token) => manualText.includes(normalize(token)))).map((topic) => topic.label);
  if (missing_manual_check_topics.length > 0) {
    errors.push(`Missing manual check topics: ${missing_manual_check_topics.join(', ')}`);
  }

  if (input.confirmed_findings.some((finding) => finding.label === 'Manual')) {
    warnings.push('Confirmed findings include Manual labels; use Manual only for reviewer-confirmed input or move the item to Human follow-up.');
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    missing_lanes,
    missing_rubric_dimensions,
    missing_manual_check_topics,
  };
}

function formatCoverageRow(row: ComprehensiveCoverageRow): string {
  const evidence = row.evidence?.length ? `\n  Evidence:\n${row.evidence.map((item) => `  - ${item}`).join('\n')}` : '';
  const gaps = row.gaps?.length ? `\n  Gaps:\n${row.gaps.map((item) => `  - ${item}`).join('\n')}` : '';
  return `- ${row.lane_id} [${row.label}]: ${row.summary}${evidence}${gaps}`;
}

function formatFinding(finding: ComprehensiveFinding): string {
  const metadata = [
    `source: ${finding.source}`,
    finding.url ? `url: ${finding.url}` : null,
    finding.rubric_dimension ? `rubric: ${finding.rubric_dimension}` : null,
    finding.severity ? `severity: ${finding.severity}` : null,
  ]
    .filter(Boolean)
    .join('; ');
  return `- [${finding.label}] ${finding.title}${metadata ? ` (${metadata})` : ''}\n  Evidence: ${finding.evidence}`;
}

function formatRubricDimension(row: RubricDimensionRow): string {
  return `- ${formatDimension(row.dimension)} [${row.label}]: ${row.evidence_or_reason}`;
}

export function formatComprehensiveAgentReviewFeedback(input: ComprehensiveAgentFeedbackInput): ComprehensiveAgentFeedbackResult {
  const validation = validateComprehensiveAgentFeedbackInput(input);
  if (!validation.passed) {
    return {
      contract_version: COMPREHENSIVE_REVIEW_CONTRACT_VERSION,
      agent_review_feedback: '',
      validation,
      section_headings: SECTION_HEADINGS,
    };
  }

  const generatedBy = input.generated_by?.trim() || 'TEMPLATE REVIEW HUB';
  const assetSuffix = input.intake.asset_id ? `, asset ${input.intake.asset_id}` : '';
  const reviewStatus = input.intake.review_status ? ` Review status: ${input.intake.review_status}.` : '';
  const submittedDate = input.intake.submitted_date ? ` Submitted date: ${input.intake.submitted_date}.` : '';
  const feedbackBlank =
    input.intake.agent_review_feedback_was_blank_before_write === undefined
      ? ''
      : ` Agent Review Feedback was ${input.intake.agent_review_feedback_was_blank_before_write ? 'blank' : 'not blank'} before the proposed write.`;

  const validatorSummary = input.validator_summary
    ? [
        input.validator_summary.rubric_coverage ? `rubricCoverage=${input.validator_summary.rubric_coverage}` : null,
        input.validator_summary.crawl_coverage ? `crawlCoverage=${input.validator_summary.crawl_coverage}` : null,
        input.validator_summary.pages_analyzed === undefined ? null : `pagesAnalyzed=${input.validator_summary.pages_analyzed}`,
        input.validator_summary.critical_errors === undefined ? null : `criticalErrors=${input.validator_summary.critical_errors}`,
        input.validator_summary.warnings === undefined ? null : `warnings=${input.validator_summary.warnings}`,
      ]
        .filter(Boolean)
        .join('; ')
    : '';

  const text = [
    `Supplemental agent initial review evidence for ${input.intake.template_name} (version ${input.intake.version_id}${assetSuffix}). Generated by ${generatedBy} as internal triage support only; not an official review decision.`,
    `Published URL: ${input.intake.published_url}.${reviewStatus}${submittedDate}${feedbackBlank}`,
    '',
    'Coverage matrix',
    input.coverage_matrix.map(formatCoverageRow).join('\n'),
    '',
    'Confirmed findings',
    input.confirmed_findings.length > 0 ? input.confirmed_findings.map(formatFinding).join('\n') : '- No confirmed automated findings were provided in this packet.',
    '',
    'Human follow-up',
    bulletList(input.human_follow_up, 'Human reviewer should complete rubric and Designer/Admin checks before any official action.'),
    '',
    'Manual checks remaining',
    bulletList(input.manual_checks_remaining, 'Manual checks were not itemized.'),
    '',
    'Rubric dimension matrix',
    input.rubric_dimension_matrix.map(formatRubricDimension).join('\n'),
    '',
    'E2B public-site pass',
    bulletList(input.e2b_urls_fetched, 'No E2B URLs were fetched.'),
    '',
    'Validator summary',
    validatorSummary || '- Validator summary was not provided.',
    '',
    'Caveats',
    bulletList(input.caveats, 'Automated evidence is partial and must be reviewed before any creator-facing feedback or official action.'),
    '',
    'Decision boundary',
    'This Agent Review Feedback is internal supplemental evidence and not an official review decision. Do not approve, reject, request changes, publish, assign a quality rating, or issue creator-facing feedback based only on this summary. Any official action requires current review context/capability verification, assigned reviewer approval when required, and explicit reviewer confirmation.',
  ].join('\n');

  return {
    contract_version: COMPREHENSIVE_REVIEW_CONTRACT_VERSION,
    agent_review_feedback: text,
    validation,
    section_headings: SECTION_HEADINGS,
  };
}
