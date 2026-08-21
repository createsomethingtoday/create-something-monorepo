/**
 * Newsletter Module
 *
 * Shared newsletter subscription and unsubscribe functionality
 * for all CREATE SOMETHING properties.
 *
 * @packageDocumentation
 */

// Types
export type {
	UnsubscribeResult,
	UnsubscribePageProps,
	NewsletterRequest,
	NewsletterResult,
	TurnstileResponse
} from './types.js';

// Server-side logic
export { processUnsubscribe } from './unsubscribe.js';
export {
	createNewsletterHandler,
	processSubscription,
	generateWelcomeEmailHtml,
	generateWelcomeEmailText,
	generateConfirmationEmailHtml,
	generateConfirmationEmailText
} from './subscribe.js';
export { buildSubscriberReengagementEmail } from './reengagement-email.js';
export type {
	SubscriberReengagementEmail,
	SubscriberReengagementEmailInput
} from './reengagement-email.js';
export { ELIGIBLE_SUBSCRIBERS_SQL, classifySubscriberEligibility } from './audience.js';
export type { NewsletterAudienceRecord, NewsletterEligibilityReason } from './audience.js';

// Components
export { default as UnsubscribePage } from './UnsubscribePage.svelte';
export { default as NewsletterSignup } from './NewsletterSignup.svelte';
