export const DEFAULT_REVIEWER_EXCEPTIONS_BASE_ID = 'appXfYXnivsUT1kLg';
export const DEFAULT_REVIEWER_EXCEPTIONS_TABLE_ID = 'tblqkbW0SptshgPiw';
export const DEFAULT_DIFY_KNOWLEDGE_ID = 'reviewer-exceptions';

export const REVIEWER_EXCEPTION_FIELD_NAMES = {
  title: 'Title',
  guidance: 'Guidance',
  reviewerOwner: 'Reviewer / Owner',
  workflowStatus: 'Workflow Status',
  evidenceAttachments: 'Evidence Attachments',
  knowledgeStatus: 'Knowledge Status',
  scope: 'Scope',
  sourceType: 'Source Type',
  sourceUrl: 'Source URL',
  sourceRecordId: 'Source Record ID',
  reviewDecisionImpact: 'Review Decision Impact',
  appliesTo: 'Applies To',
  effectiveDate: 'Effective Date',
  expiresAt: 'Expires At',
  confidence: 'Confidence',
  includeInDifyRetrieval: 'Include in Dify Retrieval',
  canonicalPromotionTarget: 'Canonical Promotion Target',
  promotionNotes: 'Promotion Notes',
  retrievalText: 'Retrieval Text',
  lastReviewedAt: 'Last Reviewed At',
} as const;

export const REVIEWER_EXCEPTION_KNOWLEDGE_STATUS_OPTIONS = [
  'Draft',
  'Proposed',
  'Approved',
  'Active',
  'Promoted',
  'Expired',
  'Rejected',
] as const;

export const REVIEWER_EXCEPTION_SCOPE_OPTIONS = [
  'App Review',
  'Template Review',
  'Submission Guidelines',
  'Grading Rubric',
  'Creator Support',
  'Zendesk / Slack Reply',
  'General Marketplace',
] as const;

export const REVIEWER_EXCEPTION_SOURCE_TYPE_OPTIONS = [
  'Reviewer Note',
  'Slack Thread',
  'Zendesk Ticket',
  'Airtable Record',
  'Dify Output',
  'Google Doc',
  'Policy Doc',
  'Meeting',
] as const;

export const REVIEWER_EXCEPTION_IMPACT_OPTIONS = [
  'Clarifies existing rule',
  'Temporary exception',
  'Blocks approval',
  'Allows approval with caveat',
  'Requires escalation',
  'No direct decision impact',
] as const;

export const REVIEWER_EXCEPTION_APPLIES_TO_OPTIONS = [
  'Template',
  'App',
  'Extension',
  'Bundle',
  'Listing copy',
  'Pricing',
  'Privacy / Security',
  'Install / OAuth',
  'Creator communication',
  'Internal operations',
] as const;

export const REVIEWER_EXCEPTION_CONFIDENCE_OPTIONS = ['Low', 'Medium', 'High', 'Policy-confirmed'] as const;

export const REVIEWER_EXCEPTION_PROMOTION_TARGET_OPTIONS = [
  'Submission Guidelines',
  'Grading Rubric',
  'Reviewer Prompt',
  'Dify Knowledge',
  'MCP Resource',
  'Zendesk Macro',
  'Do not promote',
] as const;

export type ReviewerExceptionKnowledgeStatus = (typeof REVIEWER_EXCEPTION_KNOWLEDGE_STATUS_OPTIONS)[number];
export type ReviewerExceptionScope = (typeof REVIEWER_EXCEPTION_SCOPE_OPTIONS)[number];
export type ReviewerExceptionSourceType = (typeof REVIEWER_EXCEPTION_SOURCE_TYPE_OPTIONS)[number];
export type ReviewerExceptionImpact = (typeof REVIEWER_EXCEPTION_IMPACT_OPTIONS)[number];
export type ReviewerExceptionAppliesTo = (typeof REVIEWER_EXCEPTION_APPLIES_TO_OPTIONS)[number];
export type ReviewerExceptionConfidence = (typeof REVIEWER_EXCEPTION_CONFIDENCE_OPTIONS)[number];
export type ReviewerExceptionPromotionTarget = (typeof REVIEWER_EXCEPTION_PROMOTION_TARGET_OPTIONS)[number];

export interface ReviewerException {
  exceptionId: string;
  title: string;
  guidance?: string;
  reviewerOwner?: string;
  workflowStatus?: string;
  knowledgeStatus?: ReviewerExceptionKnowledgeStatus | string;
  scope?: ReviewerExceptionScope | string;
  sourceType?: ReviewerExceptionSourceType | string;
  sourceUrl?: string;
  sourceRecordId?: string;
  reviewDecisionImpact?: ReviewerExceptionImpact | string;
  appliesTo?: string[];
  effectiveDate?: string;
  expiresAt?: string;
  confidence?: ReviewerExceptionConfidence | string;
  includeInDifyRetrieval?: boolean;
  canonicalPromotionTarget?: string[];
  promotionNotes?: string;
  retrievalText?: string;
  lastReviewedAt?: string;
  createdTime?: string;
}

export interface ReviewerExceptionWriteInput {
  title?: string;
  guidance?: string;
  reviewer_owner?: string;
  workflow_status?: string;
  knowledge_status?: ReviewerExceptionKnowledgeStatus;
  scope?: ReviewerExceptionScope;
  source_type?: ReviewerExceptionSourceType;
  source_url?: string;
  source_record_id?: string;
  review_decision_impact?: ReviewerExceptionImpact;
  applies_to?: ReviewerExceptionAppliesTo[];
  effective_date?: string;
  expires_at?: string | null;
  confidence?: ReviewerExceptionConfidence;
  include_in_dify_retrieval?: boolean;
  canonical_promotion_target?: ReviewerExceptionPromotionTarget[];
  promotion_notes?: string;
  retrieval_text?: string;
  last_reviewed_at?: string;
}

export interface ReviewerExceptionCreateInput extends ReviewerExceptionWriteInput {
  title: string;
  guidance: string;
}

export interface ReviewerExceptionUpdateInput extends ReviewerExceptionWriteInput {
  exceptionId: string;
}

export interface ReviewerExceptionDeleteResult {
  exceptionId: string;
  deleted: boolean;
}

export interface ReviewerExceptionQuery {
  limit?: number;
  knowledgeStatus?: ReviewerExceptionKnowledgeStatus;
  scope?: ReviewerExceptionScope;
  includeInDifyRetrieval?: boolean;
  search?: string;
}

export interface DifyKnowledgeRecord {
  content: string;
  score: number;
  title: string;
  metadata: Record<string, unknown>;
}

const WRITE_FIELDS = [
  REVIEWER_EXCEPTION_FIELD_NAMES.title,
  REVIEWER_EXCEPTION_FIELD_NAMES.guidance,
  REVIEWER_EXCEPTION_FIELD_NAMES.reviewerOwner,
  REVIEWER_EXCEPTION_FIELD_NAMES.workflowStatus,
  REVIEWER_EXCEPTION_FIELD_NAMES.knowledgeStatus,
  REVIEWER_EXCEPTION_FIELD_NAMES.scope,
  REVIEWER_EXCEPTION_FIELD_NAMES.sourceType,
  REVIEWER_EXCEPTION_FIELD_NAMES.sourceUrl,
  REVIEWER_EXCEPTION_FIELD_NAMES.sourceRecordId,
  REVIEWER_EXCEPTION_FIELD_NAMES.reviewDecisionImpact,
  REVIEWER_EXCEPTION_FIELD_NAMES.appliesTo,
  REVIEWER_EXCEPTION_FIELD_NAMES.effectiveDate,
  REVIEWER_EXCEPTION_FIELD_NAMES.expiresAt,
  REVIEWER_EXCEPTION_FIELD_NAMES.confidence,
  REVIEWER_EXCEPTION_FIELD_NAMES.includeInDifyRetrieval,
  REVIEWER_EXCEPTION_FIELD_NAMES.canonicalPromotionTarget,
  REVIEWER_EXCEPTION_FIELD_NAMES.promotionNotes,
  REVIEWER_EXCEPTION_FIELD_NAMES.retrievalText,
  REVIEWER_EXCEPTION_FIELD_NAMES.lastReviewedAt,
] as const;

export const REVIEWER_EXCEPTION_FIELD_MAP = {
  baseId: DEFAULT_REVIEWER_EXCEPTIONS_BASE_ID,
  tableId: DEFAULT_REVIEWER_EXCEPTIONS_TABLE_ID,
  fieldNames: REVIEWER_EXCEPTION_FIELD_NAMES,
  writable: {
    create: WRITE_FIELDS,
    update: WRITE_FIELDS,
    delete: ['Airtable record ID'],
  },
  retrievalGate: {
    includeInDifyRetrieval: true,
    knowledgeStatus: ['Approved', 'Active'],
    notExpired: true,
  },
  statusOptions: {
    knowledgeStatus: REVIEWER_EXCEPTION_KNOWLEDGE_STATUS_OPTIONS,
    scope: REVIEWER_EXCEPTION_SCOPE_OPTIONS,
    sourceType: REVIEWER_EXCEPTION_SOURCE_TYPE_OPTIONS,
    impact: REVIEWER_EXCEPTION_IMPACT_OPTIONS,
    appliesTo: REVIEWER_EXCEPTION_APPLIES_TO_OPTIONS,
    confidence: REVIEWER_EXCEPTION_CONFIDENCE_OPTIONS,
    promotionTarget: REVIEWER_EXCEPTION_PROMOTION_TARGET_OPTIONS,
  },
} as const;
