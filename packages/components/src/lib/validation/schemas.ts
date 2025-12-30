/**
 * Zod Validation Schemas
 *
 * Shared validation schemas for API endpoints.
 * Use these to validate incoming request bodies.
 *
 * @example
 * import { contactSchema, parseBody } from '@create-something/components/validation';
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
	subject: z.string().max(200).optional()
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
