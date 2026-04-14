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
	nursePersonSchema,
	nurseCandidateProfileSchema,
	nurseOpeningSchema,
	sourceListingSchema,
	eligibilityCheckRequestSchema,
	recruiterHandoffSchema,
	nurseIntakeDocumentsSchema,
	nurseIntakeConsentSchema,
	nurseIntakeContextSchema,
	nurseIntakeSchema,
	nurseMessageContactSchema,
	nurseMessagePayloadSchema,
	nurseMessageIntakeSchema,
	nurseInboundEmailSchema,
	nurseInboxActionSchema,
	nurseHandoffActionSchema,
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
	type NursePersonInput,
	type NurseCandidateProfileInput,
	type NurseOpeningInput,
	type SourceListingInput,
	type EligibilityCheckRequestInput,
	type RecruiterHandoffInput,
	type NurseIntakeDocumentsInput,
	type NurseIntakeConsentInput,
	type NurseIntakeContextInput,
	type NurseIntakeInput,
	type NurseMessageContactInput,
	type NurseMessagePayloadInput,
	type NurseMessageIntakeInput,
	type NurseInboundEmailInput,
	type NurseInboxActionInput,
	type NurseHandoffActionInput,
	type PaginationInput
} from './schemas.js';
