/**
 * Email Module - OUTERFIELDS
 *
 * Centralized email functionality.
 */

export { sendEmail, type EmailResult } from './service';
export { generateWelcomeEmail, type WelcomeEmailData } from './welcome-template';
export { sendPresentationEmail, type PresentationEmailData } from './presentation-template';
