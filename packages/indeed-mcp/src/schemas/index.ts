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

