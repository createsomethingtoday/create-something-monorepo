import { errorContent, jsonContent } from '@create-something/mcp-core';
import type { AccountContext, ScopedMcpServer } from '@create-something/mcp-core';

import { buildIndeedApplyQueryString } from '../feed.js';
import {
  IndeedApplicationListInputSchema,
  IndeedApplicationListToolShape,
  IndeedDispositionInputSchema,
  IndeedDispositionToolShape,
  IndeedFeedInputSchema,
  IndeedFeedToolShape,
  IndeedJobInputSchema,
  IndeedJobListInputSchema,
  IndeedJobListToolShape,
  IndeedJobLookupInputSchema,
  IndeedJobLookupToolShape,
  IndeedJobToolShape,
  IndeedQuestionsInputSchema,
  IndeedQuestionsToolShape,
} from '../schemas/index.js';
import { getIndeedApplyToken, getRuntimeMetadata, requireDb } from '../runtime.js';
import {
  expireJob,
  generateLocalId,
  getJobByLocalId,
  listApplications,
  listJobs,
  recordDisposition,
  renderFeedFromStorage,
  updateJobQuestions,
  upsertJobConfig,
} from '../storage.js';

function toolError(error: unknown) {
  return errorContent(error instanceof Error ? error.message : String(error));
}

async function buildFeedRuntime(ctx: AccountContext) {
  const runtime = getRuntimeMetadata(ctx);
  return {
    apiToken: await getIndeedApplyToken(ctx),
    publisher: runtime.feedPublisher,
    publisherUrl: runtime.feedPublisherUrl,
    publicBaseUrl: runtime.publicBaseUrl,
  };
}

export function registerTools(server: ScopedMcpServer): void {
  server.tool(
    'indeed_apply_list_jobs',
    'List stored Indeed jobs, including draft, active, and expired entries when requested.',
    IndeedJobListToolShape,
    async (params, ctx) => {
      try {
        const db = requireDb(ctx);
        const input = IndeedJobListInputSchema.parse(params);
        const jobs = await listJobs(db, ctx.accountId, {
          statuses: input.statuses,
          search: input.search,
          limit: input.limit ?? 50,
        });

        return jsonContent({
          count: jobs.length,
          jobs,
        });
      } catch (error) {
        return toolError(error);
      }
    },
    { readOnly: true },
  );

  server.tool(
    'indeed_apply_upsert_job',
    'Create or update an Indeed Apply job configuration and return the generated metadata snippet.',
    IndeedJobToolShape,
    async (params, ctx) => {
      try {
        const db = requireDb(ctx);
        const input = IndeedJobInputSchema.parse(params);
        const localJobId = input.local_job_id ?? generateLocalId('indeedjob');
        const job = await upsertJobConfig(db, {
          accountId: ctx.accountId,
          localJobId,
          status: input.status ?? 'active',
          referenceNumber: input.reference_number ?? localJobId,
          requisitionId: input.requisition_id ?? input.reference_number ?? localJobId,
          title: input.title,
          companyName: input.company_name,
          sourceName: input.source_name,
          url: input.url,
          city: input.city,
          state: input.state,
          country: input.country,
          postalCode: input.postal_code,
          streetAddress: input.street_address,
          descriptionHtml: input.description_html,
          employmentType: input.employment_type,
          email: input.email,
          jobMeta: input.job_meta,
          phoneConfig: input.phone ?? 'optional',
          coverletterConfig: input.coverletter ?? 'optional',
          resumeConfig: input.resume ?? 'required',
          nameConfig: input.name ?? 'firstlastname',
          resumeFieldsRequired: input.resume_fields_required,
          resumeFieldsOptional: input.resume_fields_optional,
          metadata: {
            ...(input.metadata ?? {}),
            ...(input.adv_num ? { adv_num: input.adv_num } : {}),
          },
        });

        const runtime = await buildFeedRuntime(ctx);
        const metadata = buildIndeedApplyQueryString(job, runtime, {
          baseUrl: input.base_url,
          postUrl: input.post_url,
          questionsUrl: input.questions_url,
        });

        return jsonContent({
          local_job_id: job.id,
          status: job.status,
          job,
          indeed_apply_data: metadata,
          warnings: [
            !job.email ? 'Feed entry is missing <email>; Indeed launch review often expects this.' : null,
            !input.base_url && !runtime.publicBaseUrl
              ? 'No public base URL is configured yet; generated postUrl/questionsUrl fall back to example.invalid until deployment.'
              : null,
          ].filter(Boolean),
        });
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.tool(
    'indeed_apply_set_questions',
    'Store the screener question JSON for a job and return the hosted questions URL.',
    IndeedQuestionsToolShape,
    async (params, ctx) => {
      try {
        const db = requireDb(ctx);
        const input = IndeedQuestionsInputSchema.parse(params);
        const parsed = JSON.parse(input.questions_json) as unknown;
        const canonicalJson = JSON.stringify(parsed, null, 2);
        const job = await updateJobQuestions(db, ctx.accountId, input.local_job_id, canonicalJson);
        const runtime = getRuntimeMetadata(ctx);
        const baseUrl = runtime.publicBaseUrl ?? runtime.requestBaseUrl;

        return jsonContent({
          local_job_id: job.id,
          questions_url: baseUrl ? `${baseUrl.replace(/\/+$/, '')}/questions/${encodeURIComponent(job.id)}.json` : null,
          bytes: canonicalJson.length,
        });
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.tool(
    'indeed_apply_render_feed',
    'Render the current Indeed Apply XML feed for all active jobs or a selected subset.',
    IndeedFeedToolShape,
    async (params, ctx) => {
      try {
        const db = requireDb(ctx);
        const input = IndeedFeedInputSchema.parse(params);
        const runtime = await buildFeedRuntime(ctx);
        const rendered = await renderFeedFromStorage(db, ctx.accountId, runtime, {
          includeDrafts: input.include_drafts,
          localJobIds: input.local_job_ids,
          baseUrl: input.base_url,
        });

        return jsonContent({
          job_count: rendered.jobs.length,
          xml: rendered.xml,
        });
      } catch (error) {
        return toolError(error);
      }
    },
    { readOnly: true },
  );

  server.tool(
    'indeed_apply_expire_job',
    'Mark a local Indeed job as expired so it stops appearing in the generated feed.',
    IndeedJobLookupToolShape,
    async (params, ctx) => {
      try {
        const db = requireDb(ctx);
        const input = IndeedJobLookupInputSchema.parse(params);
        const job = await expireJob(db, ctx.accountId, input.local_job_id);
        return jsonContent({
          local_job_id: job.id,
          status: job.status,
        });
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.tool(
    'indeed_apply_list_applications',
    'List stored Indeed applications with optional job, applicant, or disposition filters.',
    IndeedApplicationListToolShape,
    async (params, ctx) => {
      try {
        const db = requireDb(ctx);
        const input = IndeedApplicationListInputSchema.parse(params);
        const applications = await listApplications(db, ctx.accountId, {
          localJobId: input.local_job_id,
          applicantEmail: input.applicant_email,
          dispositionStatus: input.disposition_status,
          search: input.search,
          limit: input.limit ?? 50,
        });

        return jsonContent({
          count: applications.length,
          applications,
        });
      } catch (error) {
        return toolError(error);
      }
    },
    { readOnly: true },
  );

  server.tool(
    'indeed_apply_record_disposition',
    'Record a recruiter disposition locally for a received Indeed application.',
    IndeedDispositionToolShape,
    async (params, ctx) => {
      try {
        const db = requireDb(ctx);
        const input = IndeedDispositionInputSchema.parse(params);
        const application = await recordDisposition(
          db,
          ctx.accountId,
          input.local_application_id,
          input.status,
          input.notes,
        );

        return jsonContent({
          local_application_id: application.id,
          disposition_status: application.disposition_status,
          sync_state: 'recorded_local_only',
          note:
            'Remote disposition sync is not wired yet. Indeed Apply credentials are stored; Sponsored Jobs and other employer APIs still require a separate OAuth app.',
        });
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.tool(
    'indeed_apply_get_job',
    'Return a stored Indeed job configuration and the generated metadata string.',
    IndeedJobLookupToolShape,
    async (params, ctx) => {
      try {
        const db = requireDb(ctx);
        const input = IndeedJobLookupInputSchema.parse(params);
        const job = await getJobByLocalId(db, ctx.accountId, input.local_job_id);
        const runtime = await buildFeedRuntime(ctx);
        return jsonContent({
          job,
          indeed_apply_data: buildIndeedApplyQueryString(job, runtime),
        });
      } catch (error) {
        return toolError(error);
      }
    },
    { readOnly: true },
  );
}
