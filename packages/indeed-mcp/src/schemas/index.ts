import { z } from 'zod';

export const IndeedJobInputSchema = z.object({
  local_job_id: z.string().optional(),
  status: z.enum(['draft', 'active', 'expired']).optional(),
  reference_number: z.string().optional(),
  requisition_id: z.string().optional(),
  title: z.string(),
  company_name: z.string(),
  source_name: z.string().optional(),
  url: z.string().url(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().default('US'),
  postal_code: z.string().optional(),
  street_address: z.string().optional(),
  description_html: z.string(),
  employment_type: z.string().optional(),
  email: z.string().email().optional(),
  job_meta: z.string().optional(),
  phone: z.enum(['optional', 'hidden', 'required']).optional(),
  coverletter: z.enum(['optional', 'hidden', 'required']).optional(),
  resume: z.enum(['optional', 'hidden', 'required']).optional(),
  name: z.enum(['fullname', 'firstlastname']).optional(),
  questions_url: z.string().url().optional(),
  post_url: z.string().url().optional(),
  base_url: z.string().url().optional(),
  adv_num: z.string().optional(),
  resume_fields_required: z.array(z.string()).optional(),
  resume_fields_optional: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const IndeedJobToolShape = IndeedJobInputSchema.shape;

export const IndeedJobLookupInputSchema = z.object({
  local_job_id: z.string(),
});

export const IndeedJobLookupToolShape = IndeedJobLookupInputSchema.shape;

export const IndeedJobListInputSchema = z.object({
  statuses: z.array(z.enum(['draft', 'active', 'expired'])).optional(),
  search: z
    .string()
    .optional()
    .describe('Optional text filter against title, company, reference number, requisition, and location fields.'),
  limit: z.number().int().min(1).max(200).optional(),
});

export const IndeedJobListToolShape = IndeedJobListInputSchema.shape;

export const IndeedQuestionsInputSchema = z.object({
  local_job_id: z.string(),
  questions_json: z.string().describe('The full Indeed Apply screener questions JSON document.'),
});

export const IndeedQuestionsToolShape = IndeedQuestionsInputSchema.shape;

export const IndeedFeedInputSchema = z.object({
  local_job_ids: z.array(z.string()).optional(),
  include_drafts: z.boolean().optional(),
  base_url: z.string().url().optional(),
});

export const IndeedFeedToolShape = IndeedFeedInputSchema.shape;

export const IndeedDispositionInputSchema = z.object({
  local_application_id: z.string(),
  status: z.string().describe('Internal recruiter status or Indeed disposition label.'),
  notes: z.string().optional(),
});

export const IndeedDispositionToolShape = IndeedDispositionInputSchema.shape;

export const IndeedApplicationListInputSchema = z.object({
  local_job_id: z.string().optional(),
  applicant_email: z.string().email().optional(),
  disposition_status: z.string().optional(),
  search: z
    .string()
    .optional()
    .describe('Optional text filter against applicant name, email, phone, or Indeed apply ID.'),
  limit: z.number().int().min(1).max(200).optional(),
});

export const IndeedApplicationListToolShape = IndeedApplicationListInputSchema.shape;

const SponsoredJobsEmployerInputSchema = z.object({
  employer_id: z
    .string()
    .optional()
    .describe(
      'Indeed employer ID to scope the OAuth token to. Optional if INDEED_SPONSORED_JOBS_EMPLOYER_ID is already configured.',
    ),
});

export const SponsoredJobsSubaccountsInputSchema = z.object({
  per_page: z.number().int().min(1).max(500).optional(),
  start: z.string().optional(),
});

export const SponsoredJobsSubaccountsToolShape = SponsoredJobsSubaccountsInputSchema.shape;

export const SponsoredJobsAccountInputSchema = SponsoredJobsEmployerInputSchema.extend({
  fields: z
    .array(
      z.enum(['id', 'employerId', 'email', 'contact', 'company', 'jobSourceList', 'billingActive', 'currencyCode']),
    )
    .optional(),
});

export const SponsoredJobsAccountToolShape = SponsoredJobsAccountInputSchema.shape;

export const SponsoredJobsQuotaUsageInputSchema = SponsoredJobsEmployerInputSchema.extend({
  month_year: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\d{4}$/)
    .optional()
    .describe('Month in MMyyyy format, for example 042026.'),
});

export const SponsoredJobsQuotaUsageToolShape = SponsoredJobsQuotaUsageInputSchema.shape;

export const SponsoredJobsAccountBudgetUpdateInputSchema = SponsoredJobsEmployerInputSchema.extend({
  jobs_monthly_budget: z.number().positive(),
});

export const SponsoredJobsAccountBudgetUpdateToolShape = SponsoredJobsAccountBudgetUpdateInputSchema.shape;

export const SponsoredJobsCampaignListInputSchema = SponsoredJobsEmployerInputSchema.extend({
  per_page: z.number().int().min(1).max(500).optional(),
  start: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
});

export const SponsoredJobsCampaignListToolShape = SponsoredJobsCampaignListInputSchema.shape;

export const SponsoredJobsCampaignLookupInputSchema = SponsoredJobsEmployerInputSchema.extend({
  campaign_id: z.string(),
});

export const SponsoredJobsCampaignLookupToolShape = SponsoredJobsCampaignLookupInputSchema.shape;

export const SponsoredJobsCampaignStatsInputSchema = SponsoredJobsCampaignLookupInputSchema.extend({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  merge: z.boolean().optional(),
});

export const SponsoredJobsCampaignStatsToolShape = SponsoredJobsCampaignStatsInputSchema.shape;

export const SponsoredJobsCampaignPayloadInputSchema = SponsoredJobsEmployerInputSchema.extend({
  payload_json: z
    .string()
    .describe('Raw JSON body for the Sponsored Jobs campaign API request, matching Indeed documentation.'),
});

export const SponsoredJobsCampaignCreateToolShape = SponsoredJobsCampaignPayloadInputSchema.shape;

export const SponsoredJobsCampaignUpdateInputSchema = SponsoredJobsCampaignLookupInputSchema.extend({
  payload_json: z
    .string()
    .describe('Raw JSON body for the Sponsored Jobs update-campaign API request, matching Indeed documentation.'),
});

export const SponsoredJobsCampaignUpdateToolShape = SponsoredJobsCampaignUpdateInputSchema.shape;

export const SponsoredJobsCampaignBudgetUpdateInputSchema = SponsoredJobsCampaignLookupInputSchema.extend({
  budget_onetime_limit: z.number().positive().optional(),
  budget_monthly_limit: z.number().positive().optional(),
  budget_first_month_behavior: z
    .enum(['startNowFullAmount', 'startNowProratedAmount', 'startNextMonthFullAmount'])
    .optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fixed_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const SponsoredJobsCampaignBudgetUpdateToolShape = SponsoredJobsCampaignBudgetUpdateInputSchema.shape;

export const SponsoredJobsApiAccessInputSchema = SponsoredJobsEmployerInputSchema.extend({
  api_access_status: z.enum(['ACTIVE', 'BLOCKED']),
});

export const SponsoredJobsApiAccessToolShape = SponsoredJobsApiAccessInputSchema.shape;

const ResumeFileSchema = z
  .object({
    fileName: z.string().optional(),
    contentType: z.string().optional(),
    data: z.string().optional(),
  })
  .passthrough();

const ResumeSchema = z
  .object({
    file: ResumeFileSchema.optional(),
    html: z.string().optional(),
    text: z.string().optional(),
    json: z.unknown().optional(),
  })
  .passthrough();

const ApplicantSchema = z
  .object({
    schemaVersion: z.string().optional(),
    fullName: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phoneNumber: z.string().optional(),
    coverletter: z.string().optional(),
    verified: z.boolean().optional(),
    resume: ResumeSchema.optional(),
  })
  .passthrough();

const JobSchema = z
  .object({
    schemaVersion: z.string().optional(),
    jobId: z.string().optional(),
    jobKey: z.string().optional(),
    jobTitle: z.string().optional(),
    jobCompany: z.string().optional(),
    jobLocation: z.string().optional(),
    jobUrl: z.string().optional(),
    jobMeta: z.string().optional(),
  })
  .passthrough();

export const IndeedApplyWebhookPayloadSchema = z
  .object({
    schemaVersion: z.string().optional(),
    id: z.string(),
    appliedOnMillis: z.number().optional(),
    locale: z.string().optional(),
    job: JobSchema,
    applicant: ApplicantSchema,
    analytics: z.record(z.string(), z.unknown()).optional(),
    screenerQuestionsAndAnswers: z.unknown().optional(),
    questionsAndAnswers: z.unknown().optional(),
  })
  .passthrough();

export type IndeedJobInput = z.infer<typeof IndeedJobInputSchema>;
export type IndeedApplyWebhookPayload = z.infer<typeof IndeedApplyWebhookPayloadSchema>;
