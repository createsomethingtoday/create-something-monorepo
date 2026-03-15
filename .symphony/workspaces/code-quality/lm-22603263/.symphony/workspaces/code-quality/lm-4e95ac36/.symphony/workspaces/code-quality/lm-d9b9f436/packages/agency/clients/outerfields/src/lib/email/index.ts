/**
 * Email Module - OUTERFIELDS
 *
 * Centralized email functionality.
 */

export { sendEmail, type EmailResult } from './service';
export { renderEmailLayout, escapeHtml, ctaButton, divider, type EmailLayoutOptions } from './layout';
export { generateWelcomeEmail, type WelcomeEmailData } from './welcome-template';
export { sendPresentationEmail, type PresentationEmailData } from './presentation-template';
export {
	sendVideoLandingUpdateEmail,
	type VideoLandingUpdateData
} from './templates/video-landing-update';
