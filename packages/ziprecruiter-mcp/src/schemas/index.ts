import { z } from 'zod';

export const JobTypeSchema = z.enum([
  'full_time',
  'part_time',
  'contractor',
  'contract',
  'temporary',
  'other',
]);

export const CountrySchema = z.enum(['US', 'CA', 'AU']);

export const ZipRecruiterJobMetadataSchema = z.object({
  specialty: z.string().optional(),
  discipline: z.string().optional(),
  shift: z.string().optional(),
  starts_on: z.string().optional(),
  compensation_min: z.number().int().nonnegative().optional(),
  compensation_max: z.number().int().nonnegative().optional(),
  compensation_currency: z.string().optional(),
}).partial();

const BaseZipRecruiterJobSchema = z.object({
  job_id: z.string().min(1).max(64),
  employer_id: z.string().min(1),
  employer_name: z.string().min(1).optional(),
  title: z.string().min(3),
  job_type: JobTypeSchema,
  country: CountrySchema,
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  description: z.string().min(25),
  apply_url: z.string().url().optional().nullable(),
  requirements: z.string().optional().nullable(),
  compensation_min: z.number().int().nonnegative().optional().nullable(),
  compensation_max: z.number().int().nonnegative().optional().nullable(),
  compensation_currency: z.string().optional().nullable(),
  partner_attributes: z.record(z.string()).optional(),
  metadata: ZipRecruiterJobMetadataSchema.optional(),
});

export const ZipRecruiterJobSchema = BaseZipRecruiterJobSchema.superRefine((job, ctx) => {
  const hasPostalCode = Boolean(job.postal_code);
  const hasCityState = Boolean(job.city && job.state);
  const hasCoordinates = typeof job.latitude === 'number' && typeof job.longitude === 'number';

  if (!hasPostalCode && !hasCityState && !hasCoordinates) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide postal_code, city/state, or latitude/longitude.',
      path: ['postal_code'],
    });
  }
});

export const CreateJobInputSchema = BaseZipRecruiterJobSchema.extend({
  local_job_id: z.string().optional(),
  job_id: z.string().min(1).max(64).optional(),
}).transform((input) => ({
  ...input,
  job_id: input.job_id ?? input.local_job_id,
}));

export const CreateJobToolShape = {
  local_job_id: z.string().optional(),
  job_id: z.string().min(1).max(64).optional(),
  employer_id: z.string().min(1),
  employer_name: z.string().min(1).optional(),
  title: z.string().min(3),
  job_type: JobTypeSchema,
  country: CountrySchema,
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  description: z.string().min(25),
  apply_url: z.string().url().optional().nullable(),
  requirements: z.string().optional().nullable(),
  compensation_min: z.number().int().nonnegative().optional().nullable(),
  compensation_max: z.number().int().nonnegative().optional().nullable(),
  compensation_currency: z.string().optional().nullable(),
  partner_attributes: z.record(z.string()).optional(),
  metadata: ZipRecruiterJobMetadataSchema.optional(),
} as const;

export const UpdateJobInputSchema = z.object({
  local_job_id: z.string().optional(),
  ziprecruiter_job_id: z.string().optional(),
  employer_id: z.string().optional(),
  employer_name: z.string().optional(),
  title: z.string().min(3).optional(),
  job_type: JobTypeSchema.optional(),
  country: CountrySchema.optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  description: z.string().min(25).optional(),
  apply_url: z.string().url().nullable().optional(),
  requirements: z.string().nullable().optional(),
  compensation_min: z.number().int().nonnegative().nullable().optional(),
  compensation_max: z.number().int().nonnegative().nullable().optional(),
  compensation_currency: z.string().nullable().optional(),
  partner_attributes: z.record(z.string()).optional(),
  metadata: ZipRecruiterJobMetadataSchema.optional(),
}).refine((input) => Boolean(input.local_job_id || input.ziprecruiter_job_id), {
  message: 'Provide local_job_id or ziprecruiter_job_id.',
  path: ['local_job_id'],
});

export const UpdateJobToolShape = {
  local_job_id: z.string().optional(),
  ziprecruiter_job_id: z.string().optional(),
  employer_id: z.string().optional(),
  employer_name: z.string().optional(),
  title: z.string().min(3).optional(),
  job_type: JobTypeSchema.optional(),
  country: CountrySchema.optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  description: z.string().min(25).optional(),
  apply_url: z.string().url().nullable().optional(),
  requirements: z.string().nullable().optional(),
  compensation_min: z.number().int().nonnegative().nullable().optional(),
  compensation_max: z.number().int().nonnegative().nullable().optional(),
  compensation_currency: z.string().nullable().optional(),
  partner_attributes: z.record(z.string()).optional(),
  metadata: ZipRecruiterJobMetadataSchema.optional(),
} as const;

const BaseJobLookupInputSchema = z.object({
  local_job_id: z.string().optional(),
  ziprecruiter_job_id: z.string().optional(),
});

export const JobLookupInputSchema = BaseJobLookupInputSchema.refine((input) => Boolean(input.local_job_id || input.ziprecruiter_job_id), {
  message: 'Provide local_job_id or ziprecruiter_job_id.',
  path: ['local_job_id'],
});

export const JobLookupToolShape = {
  local_job_id: z.string().optional(),
  ziprecruiter_job_id: z.string().optional(),
} as const;

const QuestionOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

const BaseQuestionSchema = z.object({
  question_id: z.string().min(1),
  question: z.string().min(1),
  required: z.boolean().optional(),
});

export const ZipRecruiterQuestionSchema = z.discriminatedUnion('type', [
  BaseQuestionSchema.extend({
    type: z.literal('text'),
    format: z.enum(['integer', 'decimal']).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
  }),
  BaseQuestionSchema.extend({
    type: z.literal('date'),
    format: z.literal('YYYY-MM-DD'),
    min: z.string().optional(),
    max: z.string().optional(),
  }),
  BaseQuestionSchema.extend({
    type: z.literal('select'),
    options: z.array(QuestionOptionSchema).min(1),
  }),
  BaseQuestionSchema.extend({
    type: z.literal('multiselect'),
    options: z.array(QuestionOptionSchema).min(1),
  }),
  BaseQuestionSchema.extend({
    type: z.literal('upload'),
  }),
]);

export const ZipRecruiterQuestionsSchema = z.array(ZipRecruiterQuestionSchema);

export const QuestionsInputSchema = BaseJobLookupInputSchema.extend({
  questions: ZipRecruiterQuestionsSchema,
}).refine((input) => Boolean(input.local_job_id || input.ziprecruiter_job_id), {
  message: 'Provide local_job_id or ziprecruiter_job_id.',
  path: ['local_job_id'],
});

export const QuestionsToolShape = {
  local_job_id: z.string().optional(),
  ziprecruiter_job_id: z.string().optional(),
  questions: ZipRecruiterQuestionsSchema,
} as const;

export const ZipRecruiterApplyWebhookPayloadSchema = z.object({
  response_id: z.string().min(1),
  zr_application_id: z.string().optional(),
  job_id: z.string().min(1),
  name: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  resume: z.string().optional(),
  attributes: z.record(z.string()).optional(),
  answers: z.array(z.record(z.unknown())).optional(),
  profile: z.object({
    mobile: z.string().optional(),
    executive_summary: z.string().optional(),
    objective: z.string().optional(),
    text_resume: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    job_records: z.array(z.record(z.unknown())).optional(),
    education_records: z.array(z.record(z.unknown())).optional(),
    achievement_records: z.array(z.record(z.unknown())).optional(),
    license_certification_records: z.array(z.record(z.unknown())).optional(),
    association_records: z.array(z.record(z.unknown())).optional(),
  }).passthrough().optional(),
}).passthrough();

export const HiringSignalEventSchema = z.enum([
  'received',
  'viewed',
  'contacted',
  'assessment',
  'interviewed',
  'offered',
  'prehire',
  'hired',
  'rejected',
  'unable_to_map',
]);

export const HiringSignalReasonSchema = z.enum([
  'automatic',
  'closed',
  'failed_checks',
  'uncertified',
  'unresponsive',
  'out_of_area',
  'unavailable',
  'unqualified',
  'consider_for_other_role',
  'hired_for_other_role',
  'other',
]);

export const ZipRecruiterHiringSignalSchema = z.object({
  zr_application_id: z.string().min(1),
  event: HiringSignalEventSchema,
  event_timestamp: z.string().datetime({ offset: true }),
  status_name: z.string().optional(),
  status_group: z.string().optional(),
  reason: HiringSignalReasonSchema.optional(),
  additional_data: z.record(z.unknown()).optional(),
}).superRefine((input, ctx) => {
  if (input.event === 'rejected' && !input.reason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'reason is required when event is rejected.',
      path: ['reason'],
    });
  }
  if (input.event === 'unable_to_map' && !input.status_name && !input.status_group) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'status_name or status_group is required when event is unable_to_map.',
      path: ['status_name'],
    });
  }
});

export const SendHiringSignalInputSchema = z.object({
  local_application_id: z.string().optional(),
  zr_application_id: z.string().optional(),
  event: HiringSignalEventSchema,
  event_timestamp: z.string().datetime({ offset: true }).optional(),
  status_name: z.string().optional(),
  status_group: z.string().optional(),
  reason: HiringSignalReasonSchema.optional(),
  additional_data: z.record(z.unknown()).optional(),
}).refine((input) => Boolean(input.local_application_id || input.zr_application_id), {
  message: 'Provide local_application_id or zr_application_id.',
  path: ['local_application_id'],
});

export const SendHiringSignalToolShape = {
  local_application_id: z.string().optional(),
  zr_application_id: z.string().optional(),
  event: HiringSignalEventSchema,
  event_timestamp: z.string().datetime({ offset: true }).optional(),
  status_name: z.string().optional(),
  status_group: z.string().optional(),
  reason: HiringSignalReasonSchema.optional(),
  additional_data: z.record(z.unknown()).optional(),
} as const;

export type ZipRecruiterJob = z.infer<typeof ZipRecruiterJobSchema>;
export type CreateJobInput = z.input<typeof CreateJobInputSchema>;
export type CreateJobResolvedInput = z.output<typeof CreateJobInputSchema>;
export type UpdateJobInput = z.infer<typeof UpdateJobInputSchema>;
export type JobLookupInput = z.infer<typeof JobLookupInputSchema>;
export type ZipRecruiterQuestion = z.infer<typeof ZipRecruiterQuestionSchema>;
export type ZipRecruiterQuestions = z.infer<typeof ZipRecruiterQuestionsSchema>;
export type QuestionsInput = z.infer<typeof QuestionsInputSchema>;
export type ZipRecruiterApplyWebhookPayload = z.infer<typeof ZipRecruiterApplyWebhookPayloadSchema>;
export type ZipRecruiterHiringSignal = z.infer<typeof ZipRecruiterHiringSignalSchema>;
export type SendHiringSignalInput = z.infer<typeof SendHiringSignalInputSchema>;
