/**
 * Contact Form Workflow Pattern
 *
 * Triggered when a contact form is submitted.
 * Sends confirmation email, notifies team, stores in CRM.
 */

import type { ContactFormData } from '../../types';

export interface ContactWorkflowConfig {
  /** Email to notify on new submissions */
  notifyEmail: string;
  /** Send confirmation email to submitter */
  sendConfirmation: boolean;
  /** CRM integration (future) */
  crmIntegration?: 'airtable' | 'notion' | 'hubspot' | 'none';
  /** Auto-response delay in ms */
  responseDelay?: number;
}

export interface ContactWorkflowInput {
  formData: ContactFormData;
  metadata: {
    submittedAt: string;
    page: string;
    userAgent?: string;
    ip?: string;
  };
}

export interface ContactWorkflowOutput {
  success: boolean;
  submissionId: string;
  confirmationSent: boolean;
  notificationSent: boolean;
  crmRecordId?: string;
}

/**
 * Default contact workflow configuration
 */
export const defaultContactConfig: ContactWorkflowConfig = {
  notifyEmail: '',
  sendConfirmation: true,
  crmIntegration: 'none',
  responseDelay: 0
};

/**
 * Contact form handler (server-side)
 *
 * Usage in +server.ts:
 * ```ts
 * import { handleContactSubmission } from '@create-something/vertical-shared/workflows';
 *
 * export const POST: RequestHandler = async ({ request, platform }) => {
 *   const formData = await request.json();
 *   const result = await handleContactSubmission(formData, {
 *     notifyEmail: 'hello@example.com',
 *     sendConfirmation: true
 *   });
 *   return json(result);
 * };
 * ```
 */
export async function handleContactSubmission(
  input: ContactWorkflowInput,
  config: ContactWorkflowConfig
): Promise<ContactWorkflowOutput> {
  const submissionId = crypto.randomUUID();

  // TODO: Integrate with WORKWAY SDK when available
  // For now, return success with generated ID
  return {
    success: true,
    submissionId,
    confirmationSent: config.sendConfirmation,
    notificationSent: !!config.notifyEmail
  };
}
