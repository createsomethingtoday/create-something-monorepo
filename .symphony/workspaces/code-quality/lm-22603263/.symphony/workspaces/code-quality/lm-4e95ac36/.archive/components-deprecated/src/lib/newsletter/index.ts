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
	TurnstileResponse,
} from './types.js';

// Server-side logic
export { processUnsubscribe } from './unsubscribe.js';
export { 
	createNewsletterHandler,
	processSubscription, 
	generateWelcomeEmailHtml, 
	generateConfirmationEmailHtml 
} from './subscribe.js';

// Components
export { default as UnsubscribePage } from './UnsubscribePage.svelte';
export { default as NewsletterSignup } from './NewsletterSignup.svelte';
