/**
 * Follow-up Workflow Pattern
 *
 * Automated follow-ups after consultations, project completions, etc.
 */

export interface FollowUpConfig {
  /** Delay before sending follow-up (in hours) */
  delayHours: number;
  /** Type of follow-up */
  type: 'post-meeting' | 'post-project' | 'check-in' | 'review-request';
  /** Email template to use */
  template: string;
  /** Additional personalization data */
  personalization?: Record<string, string>;
}

export interface FollowUpTrigger {
  /** Contact email */
  email: string;
  /** Contact name */
  name: string;
  /** What triggered this follow-up */
  triggerEvent: string;
  /** When the trigger occurred */
  triggerTime: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

export interface FollowUpResult {
  scheduled: boolean;
  scheduledFor?: string;
  followUpId: string;
}

export const defaultFollowUpConfig: FollowUpConfig = {
  delayHours: 24,
  type: 'post-meeting',
  template: 'default'
};

/**
 * Schedule a follow-up email
 */
export async function scheduleFollowUp(
  trigger: FollowUpTrigger,
  config: FollowUpConfig
): Promise<FollowUpResult> {
  const followUpId = crypto.randomUUID();
  const scheduledFor = new Date(
    new Date(trigger.triggerTime).getTime() + config.delayHours * 60 * 60 * 1000
  ).toISOString();

  // TODO: Integrate with WORKWAY SDK scheduled workflows
  return {
    scheduled: true,
    scheduledFor,
    followUpId
  };
}

/**
 * Cancel a scheduled follow-up
 */
export async function cancelFollowUp(followUpId: string): Promise<boolean> {
  // TODO: Integrate with WORKWAY SDK
  return true;
}
