import type { ReviewGuidance } from '@create-something/webflow-app-review-preflight';
import { serviceTokenAuthorized } from './service-auth';
import type { Env } from './types';

export class PatternApprovalError extends Error {}

export interface AnonymizedPatternEvidence {
  schemaVersion: 'app_review_pattern_evidence.v1';
  ruleId: string;
  occurrenceCount: number;
  reviewCount: number;
  versionCount: number;
  firstSeen: string;
  lastSeen: string;
}

export interface PatternProposal {
  schemaVersion: 'app_review_guidance_proposal.v1';
  ruleId: string;
  classification: ReviewGuidance['label'];
  title: string;
  explanation: string;
  proposedGuidance: string;
  humanApprovalRequired: true;
  writesPerformed: false;
}

export interface PatternCandidate {
  id: string;
  status: 'draft' | 'approved' | 'rejected' | 'handed_off';
  evidence: AnonymizedPatternEvidence;
  proposal: PatternProposal;
}

interface PatternAggregateRow {
  rule_id: string;
  label: ReviewGuidance['label'];
  title: string;
  finding_json: string;
  occurrence_count: number;
  review_count: number;
  version_count: number;
  first_seen: string;
  last_seen: string;
}

async function candidateId(ruleId: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`app-review-pattern:${ruleId}`)
  );
  const hex = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return `pattern-${hex.slice(0, 24)}`;
}

function safeRuleText(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const normalized = value.replace(/\s+/g, ' ').trim().slice(0, 600);
  return normalized || fallback;
}

function candidateFromRow(
  id: string,
  status: PatternCandidate['status'],
  row: PatternAggregateRow
): PatternCandidate {
  const finding = JSON.parse(row.finding_json) as Partial<ReviewGuidance>;
  return {
    id,
    status,
    evidence: {
      schemaVersion: 'app_review_pattern_evidence.v1',
      ruleId: row.rule_id,
      occurrenceCount: row.occurrence_count,
      reviewCount: row.review_count,
      versionCount: row.version_count,
      firstSeen: row.first_seen,
      lastSeen: row.last_seen
    },
    proposal: {
      schemaVersion: 'app_review_guidance_proposal.v1',
      ruleId: row.rule_id,
      classification: row.label,
      title: safeRuleText(finding.title, row.title),
      explanation: safeRuleText(
        finding.explanation,
        'This deterministic rule is recurring across independently submitted app bundles.'
      ),
      proposedGuidance: safeRuleText(
        finding.nextMove,
        'Document the compliant implementation pattern and its verification step.'
      ),
      humanApprovalRequired: true,
      writesPerformed: false
    }
  };
}

export async function derivePatternCandidates(
  request: Request,
  env: Env
): Promise<{ unauthorized: true } | { candidates: PatternCandidate[] }> {
  if (!(await serviceTokenAuthorized(request, env.PATTERN_COORDINATOR_TOKEN))) {
    return { unauthorized: true };
  }

  const aggregates = await env.DB.prepare(
    `SELECT f.rule_id,
            MIN(f.label) AS label,
            MIN(f.title) AS title,
            MIN(f.finding_json) AS finding_json,
            COUNT(*) AS occurrence_count,
            COUNT(DISTINCT v.review_id) AS review_count,
            COUNT(DISTINCT f.review_version_id) AS version_count,
            MIN(f.created_at) AS first_seen,
            MAX(f.created_at) AS last_seen
       FROM review_findings f
       JOIN review_versions v ON v.id = f.review_version_id
      GROUP BY f.rule_id
     HAVING COUNT(DISTINCT v.review_id) >= 2
      ORDER BY COUNT(*) DESC, f.rule_id ASC`
  ).all<PatternAggregateRow>();

  const now = new Date().toISOString();
  const candidates: PatternCandidate[] = [];
  for (const row of aggregates.results) {
    const id = await candidateId(row.rule_id);
    const current = await env.DB.prepare(
      'SELECT status FROM pattern_candidates WHERE id = ?'
    )
      .bind(id)
      .first<{ status: PatternCandidate['status'] }>();
    const candidate = candidateFromRow(id, current?.status ?? 'draft', row);
    await env.DB.prepare(
      `INSERT INTO pattern_candidates
        (id, rule_id, status, anonymized_evidence_json, proposal_json,
         approved_by_user_id, approved_at, created_at, updated_at)
       VALUES (?, ?, 'draft', ?, ?, NULL, NULL, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         anonymized_evidence_json = excluded.anonymized_evidence_json,
         proposal_json = excluded.proposal_json,
         updated_at = excluded.updated_at
       WHERE pattern_candidates.status = 'draft'`
    )
      .bind(
        id,
        row.rule_id,
        JSON.stringify(candidate.evidence),
        JSON.stringify(candidate.proposal),
        now,
        now
      )
      .run();
    candidates.push(candidate);
  }

  return { candidates };
}

export interface GovernanceHandoffArtifact {
  schemaVersion: 'app_governance_guidance_handoff.v1';
  candidateId: string;
  approvedAt: string;
  destinations: ['App Governance', 'webflow/openapi-internal'];
  mutationPerformed: false;
  evidence: AnonymizedPatternEvidence;
  proposal: PatternProposal;
}

export async function approvePatternHandoff(
  candidateIdValue: string,
  request: Request,
  env: Env
): Promise<
  | { unauthorized: true }
  | { notFound: true }
  | { artifact: GovernanceHandoffArtifact }
> {
  if (!(await serviceTokenAuthorized(request, env.GOVERNANCE_APPROVER_TOKEN))) {
    return { unauthorized: true };
  }
  let body: { approved?: unknown };
  try {
    body = (await request.json()) as { approved?: unknown };
  } catch {
    throw new PatternApprovalError('Human approval is required before a handoff is produced.');
  }
  if (body.approved !== true) {
    throw new PatternApprovalError('Human approval is required before a handoff is produced.');
  }

  const row = await env.DB.prepare(
    `SELECT id, status, anonymized_evidence_json, proposal_json, approved_at
       FROM pattern_candidates
      WHERE id = ?`
  )
    .bind(candidateIdValue)
    .first<{
      id: string;
      status: PatternCandidate['status'];
      anonymized_evidence_json: string;
      proposal_json: string;
      approved_at: string | null;
    }>();
  if (!row || row.status === 'rejected') return { notFound: true };

  const approvedAt = row.approved_at ?? new Date().toISOString();
  if (row.status !== 'handed_off') {
    await env.DB.prepare(
      `UPDATE pattern_candidates
          SET status = 'handed_off',
              approved_by_user_id = 'authorized-governance-reviewer',
              approved_at = ?,
              updated_at = ?
        WHERE id = ? AND status IN ('draft', 'approved')`
    )
      .bind(approvedAt, approvedAt, row.id)
      .run();
  }

  return {
    artifact: {
      schemaVersion: 'app_governance_guidance_handoff.v1',
      candidateId: row.id,
      approvedAt,
      destinations: ['App Governance', 'webflow/openapi-internal'],
      mutationPerformed: false,
      evidence: JSON.parse(row.anonymized_evidence_json) as AnonymizedPatternEvidence,
      proposal: JSON.parse(row.proposal_json) as PatternProposal
    }
  };
}
