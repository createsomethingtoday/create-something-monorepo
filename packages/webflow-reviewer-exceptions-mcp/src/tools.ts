import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { AirtableClient } from './airtable.js';
import {
  REVIEWER_EXCEPTION_APPLIES_TO_OPTIONS,
  REVIEWER_EXCEPTION_CONFIDENCE_OPTIONS,
  REVIEWER_EXCEPTION_FIELD_MAP,
  REVIEWER_EXCEPTION_IMPACT_OPTIONS,
  REVIEWER_EXCEPTION_KNOWLEDGE_STATUS_OPTIONS,
  REVIEWER_EXCEPTION_PROMOTION_TARGET_OPTIONS,
  REVIEWER_EXCEPTION_SCOPE_OPTIONS,
  REVIEWER_EXCEPTION_SOURCE_TYPE_OPTIONS,
} from './schema.js';

type ClientFactory = () => AirtableClient;

function asSuccess(value: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ ok: true, ...((value && typeof value === 'object') ? value : { value }) }, null, 2),
      },
    ],
  };
}

function asError(error: unknown) {
  const err = error as { code?: string; status?: number; message?: string };
  return {
    isError: true,
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            ok: false,
            error: {
              code: err.code ?? 'ERROR',
              status: err.status,
              message: err.message ?? String(error),
            },
          },
          null,
          2,
        ),
      },
    ],
  };
}

const knowledgeStatusSchema = z.enum(REVIEWER_EXCEPTION_KNOWLEDGE_STATUS_OPTIONS);
const scopeSchema = z.enum(REVIEWER_EXCEPTION_SCOPE_OPTIONS);
const sourceTypeSchema = z.enum(REVIEWER_EXCEPTION_SOURCE_TYPE_OPTIONS);
const impactSchema = z.enum(REVIEWER_EXCEPTION_IMPACT_OPTIONS);
const appliesToSchema = z.enum(REVIEWER_EXCEPTION_APPLIES_TO_OPTIONS);
const confidenceSchema = z.enum(REVIEWER_EXCEPTION_CONFIDENCE_OPTIONS);
const promotionTargetSchema = z.enum(REVIEWER_EXCEPTION_PROMOTION_TARGET_OPTIONS);

const reviewerExceptionQuerySchema = {
  limit: z.number().int().min(1).max(100).optional().describe('Maximum records to return. Defaults to 100.'),
  knowledge_status: knowledgeStatusSchema.optional().describe('Filter by Knowledge Status.'),
  scope: scopeSchema.optional().describe('Filter by exception scope.'),
  include_in_dify_retrieval: z.boolean().optional().describe('Filter by Dify retrieval inclusion flag.'),
  search: z.string().min(2).optional().describe('Simple text search across title, guidance, scope, source record, and retrieval text.'),
};

const reviewerExceptionWriteSchema = {
  title: z.string().min(3).optional().describe('Short title for the reviewer exception or update.'),
  guidance: z.string().min(10).optional().describe('Reviewer-facing guidance that should be considered in future reviews.'),
  reviewer_owner: z.string().optional().describe('Reviewer or owner who raised the exception.'),
  workflow_status: z.string().optional().describe('Optional workflow status label for Airtable triage.'),
  knowledge_status: knowledgeStatusSchema.optional().describe('Knowledge lifecycle state. Active or Approved records can be retrieved when include_in_dify_retrieval is true.'),
  scope: scopeSchema.optional().describe('Review surface or policy area this exception applies to.'),
  source_type: sourceTypeSchema.optional().describe('Where this exception came from.'),
  source_url: z.string().url().optional().describe('Source Slack, Zendesk, doc, Airtable, or policy URL.'),
  source_record_id: z.string().optional().describe('Source record ID, thread TS, ticket ID, or other traceable identifier.'),
  review_decision_impact: impactSchema.optional().describe('How the exception affects review judgment.'),
  applies_to: z.array(appliesToSchema).optional().describe('Review artifact categories this exception applies to.'),
  effective_date: z.string().optional().describe('YYYY-MM-DD effective date.'),
  expires_at: z.string().optional().describe('YYYY-MM-DD expiration date when temporary.'),
  confidence: confidenceSchema.optional().describe('Confidence in the exception before canonical promotion.'),
  include_in_dify_retrieval: z.boolean().optional().describe('Set true to make Approved or Active records available to Dify external knowledge.'),
  canonical_promotion_target: z.array(promotionTargetSchema).optional().describe('Where this should eventually be promoted if accepted.'),
  promotion_notes: z.string().optional().describe('Notes for promoting this into canonical knowledge.'),
  retrieval_text: z.string().optional().describe('Optional text Dify should retrieve. Defaults to a synthesized summary.'),
  last_reviewed_at: z.string().optional().describe('ISO timestamp for the last agent/reviewer review. Defaults when publishing to knowledge.'),
};

const reviewerExceptionCreateSchema = {
  ...reviewerExceptionWriteSchema,
  title: z.string().min(3).describe('Short title for the reviewer exception or update.'),
  guidance: z.string().min(10).describe('Reviewer-facing guidance that should be considered in future reviews.'),
  knowledge_status: knowledgeStatusSchema.default('Proposed').describe('Knowledge lifecycle state. Use Active plus include_in_dify_retrieval for immediate retrieval.'),
  scope: scopeSchema.default('Template Review').describe('Review surface or policy area this exception applies to.'),
  source_type: sourceTypeSchema.default('Reviewer Note').describe('Where this exception came from.'),
  confidence: confidenceSchema.default('Medium').describe('Confidence in the exception before canonical promotion.'),
  include_in_dify_retrieval: z.boolean().default(false).describe('Set true to publish this exception to Dify retrieval immediately.'),
};

const reviewerExceptionUpdateSchema = {
  exception_id: z.string().min(1).describe('Airtable record ID for the reviewer exception.'),
  ...reviewerExceptionWriteSchema,
};

const reviewerExceptionDeleteSchema = {
  exception_id: z.string().min(1).describe('Airtable record ID for the reviewer exception to delete. Use list/search first when uncertain.'),
  reason: z.string().min(3).optional().describe('Optional human-readable reason for the deletion, used only in the tool response/audit transcript.'),
};

const previewKnowledgeSchema = {
  query: z.string().min(1).describe('Dify-style retrieval query.'),
  top_k: z.number().int().min(1).max(20).optional().describe('Maximum records to return. Defaults to 3.'),
  score_threshold: z.number().min(0).max(1).optional().describe('Minimum simple lexical score. Defaults to 0.'),
};

export function registerTools(server: McpServer, getClient: ClientFactory): void {
  server.tool(
    'reviewer_exceptions_health',
    'Runtime health check for the standalone Airtable-backed reviewer exceptions database.',
    {},
    async () => {
      try {
        return asSuccess(await getClient().healthCheck());
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'reviewer_exceptions_get_field_map',
    'Return field mappings, allowed values, and Dify retrieval gates for reviewer exceptions.',
    {},
    async () => asSuccess({ field_map: REVIEWER_EXCEPTION_FIELD_MAP }),
  );

  server.tool(
    'reviewer_exceptions_list',
    'List reviewer exceptions and pending policy updates from the standalone Airtable base.',
    reviewerExceptionQuerySchema,
    async ({ limit, knowledge_status, scope, include_in_dify_retrieval, search }) => {
      try {
        const exceptions = await getClient().listReviewerExceptions({
          limit,
          knowledgeStatus: knowledge_status,
          scope,
          includeInDifyRetrieval: include_in_dify_retrieval,
          search,
        });
        return asSuccess({ count: exceptions.length, exceptions });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'reviewer_exceptions_create',
    'Create a reviewer exception. Agents can write draft/proposed records or publish directly to Dify retrieval with include_in_dify_retrieval.',
    reviewerExceptionCreateSchema,
    async (params) => {
      try {
        const exception = await getClient().createReviewerException(params);
        return asSuccess({
          exception,
          retrieval_state:
            exception.includeInDifyRetrieval && (exception.knowledgeStatus === 'Approved' || exception.knowledgeStatus === 'Active')
              ? 'retrievable'
              : 'stored_not_retrievable',
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'reviewer_exceptions_update',
    'Update an existing reviewer exception, including publishing or unpublishing it from Dify external knowledge retrieval.',
    reviewerExceptionUpdateSchema,
    async ({ exception_id, ...params }) => {
      try {
        const exception = await getClient().updateReviewerException({
          exceptionId: exception_id,
          ...params,
        });
        return asSuccess({
          exception,
          retrieval_state:
            exception.includeInDifyRetrieval && (exception.knowledgeStatus === 'Approved' || exception.knowledgeStatus === 'Active')
              ? 'retrievable'
              : 'stored_not_retrievable',
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'reviewer_exceptions_delete',
    'Delete a reviewer exception by Airtable record ID. Use this to revert mistakenly-created exception records after listing or searching to confirm the target.',
    reviewerExceptionDeleteSchema,
    async ({ exception_id, reason }) => {
      try {
        const result = await getClient().deleteReviewerException(exception_id);
        return asSuccess({
          deletion: result,
          reason,
          retrieval_state: 'deleted_not_retrievable',
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'reviewer_exceptions_preview_knowledge',
    'Preview the records the Dify external knowledge endpoint would retrieve from approved/active exceptions.',
    previewKnowledgeSchema,
    async ({ query, top_k, score_threshold }) => {
      try {
        const records = await getClient().retrieveReviewerExceptionKnowledge({
          query,
          topK: top_k,
          scoreThreshold: score_threshold,
        });
        return asSuccess({ count: records.length, records });
      } catch (error) {
        return asError(error);
      }
    },
  );
}
