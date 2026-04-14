/**
 * Zod Validation Schemas
 *
 * Shared validation schemas for API endpoints.
 * Use these to validate incoming request bodies.
 *
 * @example
 * import { contactSchema, parseBody } from '@create-something/canon/validation';
 *
 * export const POST: RequestHandler = async ({ request }) => {
 *   const result = await parseBody(request, contactSchema);
 *   if (!result.success) {
 *     return json({ success: false, error: result.error }, { status: 400 });
 *   }
 *   const { name, email, message } = result.data;
 *   // ... handle validated data
 * };
 */

import { z } from 'zod';

// ============================================
// Common Field Schemas
// ============================================

/**
 * RFC 5322 compliant email validation
 */
export const emailSchema = z
	.string()
	.min(1, 'Email is required')
	.email('Invalid email format')
	.transform((v) => v.toLowerCase().trim());

/**
 * Name field (1-100 chars, trimmed)
 */
export const nameSchema = z
	.string()
	.min(1, 'Name is required')
	.max(100, 'Name must be under 100 characters')
	.transform((v) => v.trim());

/**
 * Phone number (E.164 format recommended)
 */
export const phoneSchema = z
	.string()
	.min(1, 'Phone number is required')
	.regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format');

/**
 * Optional phone number
 */
export const optionalPhoneSchema = z
	.string()
	.regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
	.optional()
	.or(z.literal(''));

/**
 * Password field (min 8 chars)
 */
export const passwordSchema = z
	.string()
	.min(8, 'Password must be at least 8 characters')
	.max(128, 'Password must be under 128 characters');

/**
 * URL field
 */
export const urlSchema = z.string().url('Invalid URL format');

/**
 * UUID field
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Positive integer
 */
export const positiveIntSchema = z.number().int().positive();

/**
 * Non-negative integer (includes 0)
 */
export const nonNegativeIntSchema = z.number().int().nonnegative();

// ============================================
// Form Schemas
// ============================================

/**
 * Contact form submission
 */
export const contactSchema = z.object({
	name: nameSchema,
	email: emailSchema,
	message: z
		.string()
		.min(1, 'Message is required')
		.max(5000, 'Message must be under 5000 characters')
		.transform((v) => v.trim()),
	phone: optionalPhoneSchema,
	company: z.string().max(100).optional(),
	subject: z.string().max(200).optional(),
	service: z.string().max(100).optional(),
	assessment_id: z.string().max(50).optional()
});

export type ContactInput = z.infer<typeof contactSchema>;

/**
 * Newsletter subscription
 */
export const newsletterSchema = z.object({
	email: emailSchema,
	source: z.string().max(50).optional(),
	tags: z.array(z.string().max(50)).max(10).optional()
});

export type NewsletterInput = z.infer<typeof newsletterSchema>;

// ============================================
// Auth Schemas
// ============================================

/**
 * Login request
 */
export const loginSchema = z.object({
	email: emailSchema,
	password: z.string().min(1, 'Password is required')
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Signup/registration request
 */
export const signupSchema = z.object({
	email: emailSchema,
	password: passwordSchema,
	name: nameSchema.optional(),
	source: z.string().max(50).optional()
});

export type SignupInput = z.infer<typeof signupSchema>;

/**
 * Magic link request
 */
export const magicLinkSchema = z.object({
	email: emailSchema,
	sessionId: z.string().min(32, 'Invalid session ID')
});

export type MagicLinkInput = z.infer<typeof magicLinkSchema>;

// ============================================
// Abundance Network Schemas
// ============================================

/**
 * Seeker creation/update
 */
export const seekerSchema = z.object({
	phone: phoneSchema,
	name: nameSchema,
	location: z.string().max(100).optional(),
	preferences: z.record(z.string(), z.unknown()).optional()
});

export type SeekerInput = z.infer<typeof seekerSchema>;

/**
 * Talent creation/update
 */
export const talentSchema = z.object({
	phone: phoneSchema,
	name: nameSchema,
	skills: z.array(z.string().max(50)).min(1, 'At least one skill is required').max(20),
	rate_min: positiveIntSchema.optional(),
	rate_max: positiveIntSchema.optional(),
	location: z.string().max(100).optional(),
	bio: z.string().max(1000).optional()
});

export type TalentInput = z.infer<typeof talentSchema>;

const trimmedStringSchema = (max: number) =>
	z
		.string()
		.min(1, 'Field is required')
		.max(max, `Must be under ${max} characters`)
		.transform((v) => v.trim());

const optionalTrimmedStringSchema = (max: number) =>
	z
		.string()
		.max(max, `Must be under ${max} characters`)
		.transform((v) => v.trim())
		.optional();

const identifierSchema = z.string().min(1, 'Identifier is required').max(100);

const isoDateLikeSchema = z
	.string()
	.min(1, 'Date is required')
	.max(40, 'Date must be under 40 characters');

/**
 * Stable person identity for nurse staffing.
 * Requires at least one contact surface so intake history is not orphaned.
 */
export const nursePersonSchema = z
	.object({
		phone: phoneSchema.optional(),
		email: emailSchema.optional(),
		name: nameSchema,
		primary_role: z
			.enum(['candidate', 'recruiter', 'facility_contact', 'operator', 'unknown'])
			.default('candidate'),
		status: z.enum(['active', 'inactive', 'onboarding']).default('onboarding'),
		source: optionalTrimmedStringSchema(100)
	})
	.refine((value) => value.phone || value.email, {
		message: 'Phone or email is required',
		path: ['phone']
	});

export type NursePersonInput = z.infer<typeof nursePersonSchema>;

/**
 * Candidate-side nurse profile used before recruiter handoff.
 */
export const nurseCandidateProfileSchema = z.object({
	person_id: identifierSchema,
	profession: z.enum(['rn', 'lpn', 'lvn', 'cna', 'allied', 'other']).default('rn'),
	specialty_primary: optionalTrimmedStringSchema(100),
	specialties: z.array(trimmedStringSchema(100)).max(20).default([]),
	years_experience: nonNegativeIntSchema.optional(),
	recent_specialty_months: nonNegativeIntSchema.optional(),
	contract_preferences: z.array(trimmedStringSchema(50)).max(10).optional(),
	shift_preferences: z.array(trimmedStringSchema(50)).max(10).optional(),
	start_window_start: isoDateLikeSchema.optional(),
	start_window_end: isoDateLikeSchema.optional(),
	travel_radius_miles: nonNegativeIntSchema.optional(),
	preferred_locations: z.array(trimmedStringSchema(100)).max(20).optional(),
	home_state: optionalTrimmedStringSchema(32),
	compact_license: z.boolean().default(false),
	compact_states: z.array(trimmedStringSchema(32)).max(60).optional(),
	pay_floor_weekly: positiveIntSchema.optional(),
	pay_target_weekly: positiveIntSchema.optional(),
	available_from: isoDateLikeSchema.optional(),
	recruiter_notes: z.string().max(2000).optional(),
	profile_status: z.enum(['draft', 'ready_for_review', 'eligible', 'inactive']).default('draft')
});

export type NurseCandidateProfileInput = z.infer<typeof nurseCandidateProfileSchema>;

export const nurseOpeningSchema = z.object({
	external_dedupe_key: optionalTrimmedStringSchema(150),
	facility_name: trimmedStringSchema(150),
	profession: trimmedStringSchema(50).default('rn'),
	specialty: trimmedStringSchema(100),
	sub_specialty: optionalTrimmedStringSchema(100),
	city: optionalTrimmedStringSchema(100),
	state: optionalTrimmedStringSchema(32),
	location_label: optionalTrimmedStringSchema(150),
	contract_type: z.enum(['travel', 'staff', 'local_contract', 'per_diem', 'other']).default('travel'),
	shift_type: optionalTrimmedStringSchema(50),
	schedule_summary: optionalTrimmedStringSchema(100),
	start_date: isoDateLikeSchema.optional(),
	assignment_length_weeks: positiveIntSchema.optional(),
	pay_package_min_weekly: positiveIntSchema.optional(),
	pay_package_max_weekly: positiveIntSchema.optional(),
	stipend_housing_weekly: positiveIntSchema.optional(),
	stipend_meals_weekly: positiveIntSchema.optional(),
	license_states: z.array(trimmedStringSchema(32)).max(60).optional(),
	compact_eligible: z.boolean().default(false),
	required_credentials: z.array(trimmedStringSchema(100)).max(30).optional(),
	required_documents: z.array(trimmedStringSchema(100)).max(30).optional(),
	source_count: nonNegativeIntSchema.default(0),
	status: z.enum(['open', 'paused', 'closed', 'stale']).default('open')
});

export type NurseOpeningInput = z.infer<typeof nurseOpeningSchema>;

export const sourceListingSchema = z.object({
	canonical_opening_id: identifierSchema.optional(),
	source_slug: trimmedStringSchema(60),
	external_listing_id: trimmedStringSchema(120),
	source_url: urlSchema,
	listing_type: z.enum(['travel', 'staff', 'local_contract', 'per_diem', 'other']).default('travel'),
	freshness_status: z.enum(['fresh', 'stale', 'unknown']).default('unknown'),
	trust_tier: z.enum(['primary', 'secondary', 'manual', 'unknown']).default('unknown'),
	fetched_at: isoDateLikeSchema.optional(),
	raw_payload: z.unknown().optional()
});

export type SourceListingInput = z.infer<typeof sourceListingSchema>;

export const eligibilityCheckRequestSchema = z.object({
	candidate_profile_id: identifierSchema,
	opening_id: identifierSchema
});

export type EligibilityCheckRequestInput = z.infer<typeof eligibilityCheckRequestSchema>;

export const recruiterHandoffSchema = z.object({
	candidate_profile_id: identifierSchema.optional(),
	opening_id: identifierSchema.optional(),
	recruiter_person_id: identifierSchema.optional(),
	queue_slug: optionalTrimmedStringSchema(100),
	status: z.enum(['open', 'accepted', 'completed', 'cancelled']).default('open'),
	reason: trimmedStringSchema(500),
	sla_due_at: isoDateLikeSchema.optional(),
	acknowledged_at: isoDateLikeSchema.optional(),
	resolved_at: isoDateLikeSchema.optional(),
	notes_json: z.record(z.string(), z.unknown()).optional()
});

export type RecruiterHandoffInput = z.infer<typeof recruiterHandoffSchema>;

export const nurseIntakeDocumentsSchema = z
	.object({
		resume_url: urlSchema.optional(),
		skills_checklist_url: urlSchema.optional(),
		license_copy_url: urlSchema.optional()
	})
	.optional();

export type NurseIntakeDocumentsInput = z.infer<typeof nurseIntakeDocumentsSchema>;

export const nurseIntakeConsentSchema = z.object({
	granted: z.boolean().default(false),
	scope: trimmedStringSchema(200).default('candidate_intake'),
	granted_at: isoDateLikeSchema.optional(),
	disclosure: optionalTrimmedStringSchema(500)
});

export type NurseIntakeConsentInput = z.infer<typeof nurseIntakeConsentSchema>;

export const nurseIntakeContextSchema = z.object({
	intake_channel: trimmedStringSchema(50).default('web'),
	opening_id: identifierSchema.optional(),
	source_listing_id: identifierSchema.optional(),
	recruiter_person_id: identifierSchema.optional(),
	source: optionalTrimmedStringSchema(100),
	notes: z.string().max(2000).optional()
});

export type NurseIntakeContextInput = z.infer<typeof nurseIntakeContextSchema>;

export const nurseIntakeSchema = z.object({
	person: nursePersonSchema.extend({
		primary_role: z.literal('candidate').default('candidate')
	}),
	profile: nurseCandidateProfileSchema.omit({ person_id: true }),
	documents: nurseIntakeDocumentsSchema,
	consent: nurseIntakeConsentSchema.default({
		granted: false,
		scope: 'candidate_intake'
	}),
	context: nurseIntakeContextSchema.default({
		intake_channel: 'web'
	})
});

export type NurseIntakeInput = z.infer<typeof nurseIntakeSchema>;

export const nurseMessageContactSchema = z
	.object({
		name: optionalTrimmedStringSchema(100),
		phone: phoneSchema.optional(),
		email: emailSchema.optional(),
		source: optionalTrimmedStringSchema(100)
	})
	.refine((value) => value.phone || value.email, {
		message: 'Phone or email is required',
		path: ['phone']
	});

export type NurseMessageContactInput = z.infer<typeof nurseMessageContactSchema>;

export const nurseMessagePayloadSchema = z.object({
	message_id: optionalTrimmedStringSchema(120),
	message_type: optionalTrimmedStringSchema(50),
	subject: optionalTrimmedStringSchema(200),
	content: z.string().min(1, 'Message content is required').max(10000),
	received_at: isoDateLikeSchema.optional(),
	raw_payload: z.unknown().optional()
});

export type NurseMessagePayloadInput = z.infer<typeof nurseMessagePayloadSchema>;

export const nurseMessageIntakeSchema = z.object({
	channel: z.enum(['sms', 'email', 'whatsapp', 'manual', 'web']).default('manual'),
	contact: nurseMessageContactSchema,
	message: nurseMessagePayloadSchema,
	profile: nurseCandidateProfileSchema
		.omit({ person_id: true })
		.partial()
		.optional(),
	context: nurseIntakeContextSchema.partial().optional()
});

export type NurseMessageIntakeInput = z.infer<typeof nurseMessageIntakeSchema>;

export const nurseInboundEmailSchema = z
	.object({
		provider: optionalTrimmedStringSchema(50),
		from: trimmedStringSchema(320),
		reply_to: optionalTrimmedStringSchema(320),
		subject: optionalTrimmedStringSchema(200),
		text: z.string().max(10000).optional(),
		html: z.string().max(50000).optional(),
		message_id: optionalTrimmedStringSchema(255),
		received_at: isoDateLikeSchema.optional(),
		raw_payload: z.unknown().optional()
	})
	.refine((value) => value.text || value.html || value.subject, {
		message: 'Email body or subject is required',
		path: ['text']
	});

export type NurseInboundEmailInput = z.infer<typeof nurseInboundEmailSchema>;

export const nurseInboxActionSchema = z
	.object({
		action: z.enum(['mark_reviewed', 'assign_recruiter', 'create_handoff']),
		candidate_profile_id: identifierSchema,
		recruiter_person_id: identifierSchema.optional(),
		opening_id: identifierSchema.optional(),
		note: z.string().max(2000).optional(),
		reason: optionalTrimmedStringSchema(200),
		queue_slug: optionalTrimmedStringSchema(80),
		sla_due_at: isoDateLikeSchema.optional(),
		source: optionalTrimmedStringSchema(100)
	})
	.superRefine((value, ctx) => {
		if (value.action === 'assign_recruiter' && !value.recruiter_person_id) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'recruiter_person_id is required when assigning a recruiter',
				path: ['recruiter_person_id']
			});
		}
	});

export type NurseInboxActionInput = z.infer<typeof nurseInboxActionSchema>;

export const nurseHandoffActionSchema = z.object({
	handoff_id: identifierSchema,
	action: z.enum(['accept', 'complete', 'cancel']),
	recruiter_person_id: identifierSchema.optional(),
	note: z.string().max(2000).optional(),
	source: optionalTrimmedStringSchema(100)
});

export type NurseHandoffActionInput = z.infer<typeof nurseHandoffActionSchema>;

// ============================================
// Pagination Schemas
// ============================================

/**
 * Pagination query parameters
 */
export const paginationSchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(20),
	offset: z.coerce.number().int().nonnegative().default(0)
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// ============================================
// Utility Functions
// ============================================

/**
 * Parse and validate request body
 *
 * @example
 * const result = await parseBody(request, contactSchema);
 * if (!result.success) {
 *   return json({ success: false, error: result.error }, { status: 400 });
 * }
 */
export async function parseBody<T extends z.ZodTypeAny>(
	request: Request,
	schema: T
): Promise<
	| { success: true; data: z.infer<T> }
	| { success: false; error: string; details?: z.ZodError['issues'] }
> {
	try {
		const body = await request.json();
		const result = schema.safeParse(body);

		if (!result.success) {
			const firstError = result.error.issues[0];
			const errorMessage = firstError
				? `${firstError.path.join('.')}: ${firstError.message}`.replace(/^: /, '')
				: 'Invalid request body';

			return {
				success: false,
				error: errorMessage,
				details: result.error.issues
			};
		}

		return { success: true, data: result.data };
	} catch {
		return { success: false, error: 'Invalid JSON body' };
	}
}

/**
 * Parse and validate query parameters
 *
 * @example
 * const result = parseQuery(url.searchParams, paginationSchema);
 */
export function parseQuery<T extends z.ZodTypeAny>(
	params: URLSearchParams,
	schema: T
): { success: true; data: z.infer<T> } | { success: false; error: string } {
	const obj: Record<string, string> = {};
	params.forEach((value, key) => {
		obj[key] = value;
	});

	const result = schema.safeParse(obj);

	if (!result.success) {
		const firstError = result.error.issues[0];
		const errorMessage = firstError
			? `${firstError.path.join('.')}: ${firstError.message}`.replace(/^: /, '')
			: 'Invalid query parameters';

		return { success: false, error: errorMessage };
	}

	return { success: true, data: result.data };
}
