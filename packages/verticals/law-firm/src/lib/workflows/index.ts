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
 * import { defineWorkflow } from '@workwayco/sdk';
 *
 * export default defineWorkflow(consultationBookingWorkflow);
 * ```
 */

export { consultationBookingWorkflow, type ConsultationBookingWorkflow } from './consultation-booking';
export { reminderWorkflow, type ReminderWorkflow } from './reminder';
export { followUpWorkflow, type FollowUpWorkflow } from './follow-up';

/**
 * Workflow integration status
 *
 * These workflows are designed for parallel development with WORKWAY SDK.
 * Current status: Stubs defined, awaiting SDK integration.
 *
 * Integration checklist:
 * - [ ] Import defineWorkflow from @workwayco/sdk
 * - [ ] Add typed integrations from @workwayco/integrations
 * - [ ] Connect webhook triggers to API routes
 * - [ ] Test with local WORKWAY development environment
 * - [ ] Deploy to WORKWAY marketplace
 */
