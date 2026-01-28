// Re-export Zod for convenience
export { z } from 'zod';
export type { ZodError, ZodSchema } from 'zod';

// Export all schemas and types
export {
	// Common field schemas
	emailSchema,
	nameSchema,
	phoneSchema,
	optionalPhoneSchema,
	passwordSchema,
	urlSchema,
	uuidSchema,
	positiveIntSchema,
	nonNegativeIntSchema,
	// Form schemas
	contactSchema,
	newsletterSchema,
	// Auth schemas
	loginSchema,
	signupSchema,
	magicLinkSchema,
	// Abundance schemas
	seekerSchema,
	talentSchema,
	// Pagination
	paginationSchema,
	// Utility functions
	parseBody,
	parseQuery,
	// Types
	type ContactInput,
	type NewsletterInput,
	type LoginInput,
	type SignupInput,
	type MagicLinkInput,
	type SeekerInput,
	type TalentInput,
	type PaginationInput
} from './schemas.js';
