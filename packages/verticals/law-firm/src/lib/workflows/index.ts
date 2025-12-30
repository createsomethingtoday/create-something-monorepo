/**
 * Professional Services Workflow Templates
 *
 * These workflows integrate with WORKWAY SDK to automate
 * common professional services business processes.
 *
 * Workflows included:
 * 1. Consultation Booking - Calendar + CRM + Notifications
 * 2. Appointment Reminder - 24hr SMS/Email reminders
 * 3. Post-Meeting Follow-Up - Thank you + Proposals + Reviews
 *
 * Usage with WORKWAY:
 * ```typescript
 * import { consultationBookingWorkflow } from './consultation-booking';
 *
 * // Workflow is already defined using defineWorkflow from @workwayco/sdk
 * // Deploy to WORKWAY marketplace or use in private workflows
 * ```
 */

export { consultationBookingWorkflow, type ConsultationBookingWorkflow } from './consultation-booking';
export { reminderWorkflow, type ReminderWorkflow } from './reminder';
export { followUpWorkflow, type FollowUpWorkflow } from './follow-up';

/**
 * Workflow integration status
 *
 * These workflows are built with WORKWAY SDK.
 * Current status: SDK connected, workflows defined.
 *
 * Integration checklist:
 * - [x] Import defineWorkflow from @workwayco/sdk
 * - [x] Add typed integrations from @workwayco/sdk
 * - [x] Connect webhook triggers to API routes
 * - [ ] Add actual integration implementations (Calendly, HubSpot, Slack)
 * - [ ] Test with local WORKWAY development environment
 * - [ ] Deploy to WORKWAY marketplace
 *
 * Note: Integration implementations are TODO comments - waiting for
 * Calendly, HubSpot, and Slack integrations to be available in WORKWAY.
 */
