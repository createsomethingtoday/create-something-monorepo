import { errorContent, jsonContent } from '@create-something/mcp-core';
import type { AccountContext, ScopedMcpServer } from '@create-something/mcp-core';

import {
  CreateJobInputSchema,
  CreateJobToolShape,
  JobLookupInputSchema,
  JobLookupToolShape,
  QuestionsInputSchema,
  QuestionsToolShape,
  SendHiringSignalInputSchema,
  SendHiringSignalToolShape,
  UpdateJobInputSchema,
  UpdateJobToolShape,
  ZipRecruiterHiringSignalSchema,
  ZipRecruiterJobSchema,
} from '../schemas/index.js';
import { getRuntimeMetadata, getZipRecruiterApiKey, requireDb } from '../runtime.js';
import { createZipRecruiterClient, ZipRecruiterApiError } from '../services/api.js';
import {
  generateLocalId,
  getApplicationForSignal,
  getJobDetailByLocalId,
  type JobDetail,
  logHiringSignalEvent,
  markJobClosed,
  resolveJobLink,
  setQuestionSnapshot,
  updateApplicationStatusFromHiringSignal,
  upsertStaffingJobAndLink,
} from '../storage.js';

function buildClient(ctx: AccountContext) {
  return (async () => {
    const runtime = getRuntimeMetadata(ctx);
    const apiKey = await getZipRecruiterApiKey(ctx);
    return createZipRecruiterClient({
      apiKey,
      apiBaseUrl: runtime.zipRecruiterApiBaseUrl,
      hiringSignalBaseUrl: runtime.zipRecruiterHiringSignalBaseUrl,
    });
  })();
}

function buildStoredJobPayload(detail: JobDetail) {
  return {
    job_id: detail.ziprecruiter_job_id ?? detail.id,
    employer_id: detail.employer_id,
    employer_name: detail.employer_name ?? undefined,
    title: detail.title,
    job_type: detail.job_type,
    country: detail.country,
    city: detail.city ?? undefined,
    state: detail.state ?? undefined,
    postal_code: detail.postal_code ?? undefined,
    description: detail.description,
    apply_url: detail.apply_url ?? undefined,
    requirements: detail.requirements ?? undefined,
    compensation_min: detail.compensation_min ?? undefined,
    compensation_max: detail.compensation_max ?? undefined,
    compensation_currency: detail.compensation_currency ?? undefined,
    partner_attributes: Object.keys(detail.partner_attributes).length > 0 ? detail.partner_attributes : undefined,
    metadata: Object.keys(detail.metadata).length > 0
      ? {
          ...detail.metadata,
          specialty: detail.specialty ?? undefined,
          discipline: detail.discipline ?? undefined,
          shift: detail.shift ?? undefined,
          starts_on: detail.starts_on ?? undefined,
          compensation_min: detail.compensation_min ?? undefined,
          compensation_max: detail.compensation_max ?? undefined,
          compensation_currency: detail.compensation_currency ?? undefined,
        }
      : {
          specialty: detail.specialty ?? undefined,
          discipline: detail.discipline ?? undefined,
          shift: detail.shift ?? undefined,
          starts_on: detail.starts_on ?? undefined,
          compensation_min: detail.compensation_min ?? undefined,
          compensation_max: detail.compensation_max ?? undefined,
          compensation_currency: detail.compensation_currency ?? undefined,
        },
  };
}

function zipRecruiterError(error: unknown) {
  if (error instanceof ZipRecruiterApiError) {
    return errorContent(
      `ZipRecruiter request failed (${error.status}) at ${error.url}: ${JSON.stringify(error.responseBody)}`,
    );
  }
  return errorContent(error instanceof Error ? error.message : String(error));
}

export function registerTools(server: ScopedMcpServer): void {
  server.tool(
    'ziprecruiter_create_job',
    'Create a ZipRecruiter job and persist the canonical staffing job locally.',
    CreateJobToolShape,
    async (params, ctx) => {
      try {
        const db = requireDb(ctx);
        const input = CreateJobInputSchema.parse(params);
        const localJobId = input.local_job_id ?? generateLocalId('staffjob');
        const remoteJobId = input.job_id ?? localJobId;
        const payload = ZipRecruiterJobSchema.parse({ ...input, job_id: remoteJobId });
        const client = await buildClient(ctx);

        const remote = await client.createJob(payload);
        const local = await upsertStaffingJobAndLink(db, {
          localJobId,
          remoteJobId,
          payload,
        });

        return jsonContent({
          local_job_id: local.id,
          ziprecruiter_job_id: remoteJobId,
          local,
          remote,
        });
      } catch (error) {
        return zipRecruiterError(error);
      }
    },
  );

  server.tool(
    'ziprecruiter_update_job',
    'Update a ZipRecruiter job and keep the canonical staffing job in sync.',
    UpdateJobToolShape,
    async (params, ctx) => {
      try {
        const db = requireDb(ctx);
        const input = UpdateJobInputSchema.parse(params);
        const resolved = await resolveJobLink(db, {
          localJobId: input.local_job_id,
          ziprecruiterJobId: input.ziprecruiter_job_id,
        });
        const basePayload = buildStoredJobPayload(resolved.detail);
        const payload = ZipRecruiterJobSchema.parse({
          ...basePayload,
          ...input,
          job_id: resolved.ziprecruiterJobId,
          metadata: {
            ...(basePayload.metadata ?? {}),
            ...(input.metadata ?? {}),
          },
        });
        const client = await buildClient(ctx);

        const remote = await client.updateJob(payload, resolved.ziprecruiterJobId);
        const local = await upsertStaffingJobAndLink(db, {
          localJobId: resolved.localJobId,
          remoteJobId: resolved.ziprecruiterJobId,
          payload,
        });

        return jsonContent({
          local_job_id: resolved.localJobId,
          ziprecruiter_job_id: resolved.ziprecruiterJobId,
          local,
          remote,
        });
      } catch (error) {
        return zipRecruiterError(error);
      }
    },
  );

  server.tool(
    'ziprecruiter_get_job',
    'Fetch a ZipRecruiter job and return it with the canonical local record.',
    JobLookupToolShape,
    async (params, ctx) => {
      try {
        const db = requireDb(ctx);
        const input = JobLookupInputSchema.parse(params);
        const resolved = await resolveJobLink(db, {
          localJobId: input.local_job_id,
          ziprecruiterJobId: input.ziprecruiter_job_id,
        });
        const client = await buildClient(ctx);
        const remote = await client.getJob(resolved.ziprecruiterJobId);

        return jsonContent({
          local_job_id: resolved.localJobId,
          ziprecruiter_job_id: resolved.ziprecruiterJobId,
          local: resolved.detail,
          remote,
        });
      } catch (error) {
        return zipRecruiterError(error);
      }
    },
    { readOnly: true },
  );

  server.tool(
    'ziprecruiter_close_job',
    'Close a ZipRecruiter job and mark the canonical local job as closed.',
    JobLookupToolShape,
    async (params, ctx) => {
      try {
        const db = requireDb(ctx);
        const input = JobLookupInputSchema.parse(params);
        const resolved = await resolveJobLink(db, {
          localJobId: input.local_job_id,
          ziprecruiterJobId: input.ziprecruiter_job_id,
        });
        const client = await buildClient(ctx);
        const remote = await client.closeJob(resolved.ziprecruiterJobId);
        await markJobClosed(db, resolved.localJobId);
        const local = await getJobDetailByLocalId(db, resolved.localJobId);

        return jsonContent({
          local_job_id: resolved.localJobId,
          ziprecruiter_job_id: resolved.ziprecruiterJobId,
          local,
          remote,
        });
      } catch (error) {
        return zipRecruiterError(error);
      }
    },
  );

  server.tool(
    'ziprecruiter_set_questions',
    'Replace the screening questions attached to a ZipRecruiter job.',
    QuestionsToolShape,
    async (params, ctx) => {
      try {
        const db = requireDb(ctx);
        const input = QuestionsInputSchema.parse(params);
        const resolved = await resolveJobLink(db, {
          localJobId: input.local_job_id,
          ziprecruiterJobId: input.ziprecruiter_job_id,
        });
        const client = await buildClient(ctx);
        const remote = await client.setQuestions(resolved.ziprecruiterJobId, input.questions, 'PUT');
        await setQuestionSnapshot(db, resolved.localJobId, input.questions);

        return jsonContent({
          local_job_id: resolved.localJobId,
          ziprecruiter_job_id: resolved.ziprecruiterJobId,
          questions: input.questions,
          remote,
        });
      } catch (error) {
        return zipRecruiterError(error);
      }
    },
  );

  server.tool(
    'ziprecruiter_get_questions',
    'Fetch the screening questions attached to a ZipRecruiter job.',
    JobLookupToolShape,
    async (params, ctx) => {
      try {
        const db = requireDb(ctx);
        const input = JobLookupInputSchema.parse(params);
        const resolved = await resolveJobLink(db, {
          localJobId: input.local_job_id,
          ziprecruiterJobId: input.ziprecruiter_job_id,
        });
        const client = await buildClient(ctx);
        const remote = await client.getQuestions(resolved.ziprecruiterJobId);

        return jsonContent({
          local_job_id: resolved.localJobId,
          ziprecruiter_job_id: resolved.ziprecruiterJobId,
          stored_questions: resolved.detail.questions,
          remote,
        });
      } catch (error) {
        return zipRecruiterError(error);
      }
    },
    { readOnly: true },
  );

  server.tool(
    'ziprecruiter_clear_questions',
    'Delete all screening questions from a ZipRecruiter job.',
    JobLookupToolShape,
    async (params, ctx) => {
      try {
        const db = requireDb(ctx);
        const input = JobLookupInputSchema.parse(params);
        const resolved = await resolveJobLink(db, {
          localJobId: input.local_job_id,
          ziprecruiterJobId: input.ziprecruiter_job_id,
        });
        const client = await buildClient(ctx);
        const remote = await client.deleteQuestions(resolved.ziprecruiterJobId);
        await setQuestionSnapshot(db, resolved.localJobId, []);

        return jsonContent({
          local_job_id: resolved.localJobId,
          ziprecruiter_job_id: resolved.ziprecruiterJobId,
          remote,
        });
      } catch (error) {
        return zipRecruiterError(error);
      }
    },
  );

  server.tool(
    'ziprecruiter_send_hiring_signal',
    'Send a ZipRecruiter hiring signal for a canonical staffing application and log the result.',
    SendHiringSignalToolShape,
    async (params, ctx) => {
      const db = requireDb(ctx);
      let applicationIdForLog: string | null = null;
      let zrApplicationIdForLog: string | null = null;
      let eventForLog = 'unknown';
      try {
        const input = SendHiringSignalInputSchema.parse(params);
        const application = await getApplicationForSignal(db, {
          localApplicationId: input.local_application_id,
          zrApplicationId: input.zr_application_id,
        });
        applicationIdForLog = application.id;
        zrApplicationIdForLog = input.zr_application_id ?? application.zr_application_id ?? null;
        eventForLog = input.event;
        const payload = ZipRecruiterHiringSignalSchema.parse({
          zr_application_id: zrApplicationIdForLog,
          event: input.event,
          event_timestamp: input.event_timestamp ?? new Date().toISOString(),
          status_name: input.status_name,
          status_group: input.status_group,
          reason: input.reason,
          additional_data: {
            ...(application.additional_data && typeof application.additional_data === 'object'
              ? (application.additional_data as Record<string, unknown>)
              : {}),
            ...(input.additional_data ?? {}),
          },
        });
        const client = await buildClient(ctx);
        const remote = await client.sendHiringSignal(payload);
        await updateApplicationStatusFromHiringSignal(db, application.id, payload);
        await logHiringSignalEvent(db, {
          applicationId: application.id,
          zrApplicationId: payload.zr_application_id,
          event: payload.event,
          requestBody: payload,
          responseStatus: 200,
          responseBody: remote,
          success: true,
        });

        return jsonContent({
          local_application_id: application.id,
          zr_application_id: payload.zr_application_id,
          remote,
        });
      } catch (error) {
        if (applicationIdForLog && zrApplicationIdForLog) {
          await logHiringSignalEvent(db, {
            applicationId: applicationIdForLog,
            zrApplicationId: zrApplicationIdForLog,
            event: eventForLog,
            requestBody: params,
            responseStatus: error instanceof ZipRecruiterApiError ? error.status : null,
            responseBody: error instanceof ZipRecruiterApiError ? error.responseBody : null,
            success: false,
            errorMessage: error instanceof Error ? error.message : String(error),
          }).catch(() => {});
        }

        return zipRecruiterError(error);
      }
    },
  );
}
