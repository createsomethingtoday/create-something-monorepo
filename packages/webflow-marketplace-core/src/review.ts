export const TEMPLATE_REVIEW_QUEUE_STATUSES = [
  'ready_to_review',
  'in_review',
  'changes_requested',
  'approved',
  'published',
] as const;

export type TemplateReviewQueueStatus =
  (typeof TEMPLATE_REVIEW_QUEUE_STATUSES)[number];

export const TEMPLATE_REVIEW_STATUS_OPTIONS = [
  '🆕Ready for Review',
  '🏃🏾In Review',
  '👀Admin Feedback Review',
  '📤Changes Requested',
  '🔁Response to Review',
  '✅Approved',
  '❌Rejected',
  '☠️Archived',
] as const;

export type TemplateReviewStatusOption =
  (typeof TEMPLATE_REVIEW_STATUS_OPTIONS)[number];

export const REVIEWER_CONTROLLED_TEMPLATE_REVIEW_STATUS_OPTIONS = [
  '🏃🏾In Review',
  '👀Admin Feedback Review',
  '🔁Response to Review',
] as const;

export type ReviewerControlledTemplateReviewStatusOption =
  (typeof REVIEWER_CONTROLLED_TEMPLATE_REVIEW_STATUS_OPTIONS)[number];

export const APP_REVIEW_QUEUE_STATUSES = [
  'ready_to_review',
  'in_review',
  'changes_requested',
  'approved',
  'rejected',
  'on_hold',
  'archived',
] as const;

export type AppReviewQueueStatus =
  (typeof APP_REVIEW_QUEUE_STATUSES)[number];

export const APP_REVIEW_STATUS_OPTIONS = [
  '🆕Ready for Review',
  '🏃🏾In Review',
  'Training Check',
  '👀Admin Feedback Review',
  '👀Managed Feedback Review',
  '📤Changes Requested',
  '📤Changes Requested (No Notification)',
  '🔁Response to Review',
  '👀Admin Approval Review',
  '✅Approved',
  '✅Approved (No Notification)',
  '⏸️On Hold',
  '👀Admin Rejection Review',
  '❌Rejected',
  '❌Rejected (No Notification)',
  '🚨Error: Reason Missing',
  '🚨Error: Release Missing',
  '🚨Error: Feedback Missing',
  '🚨Error: Review Not Started',
  '🚨Error: Field Missing (Email, Type, etc.)',
  '🚨Error: Publishing Checklist Incomplete',
  '☠️Archived',
  '☠️Archived (Auto)',
] as const;

export type AppReviewStatusOption =
  (typeof APP_REVIEW_STATUS_OPTIONS)[number];

export const APP_REVIEW_REVIEWER_CONTROLLED_STATUS_OPTIONS = [
  '🏃🏾In Review',
  'Training Check',
  '👀Admin Feedback Review',
  '👀Managed Feedback Review',
  '🔁Response to Review',
  '👀Admin Approval Review',
  '👀Admin Rejection Review',
  '⏸️On Hold',
] as const;

export type AppReviewReviewerControlledStatusOption =
  (typeof APP_REVIEW_REVIEWER_CONTROLLED_STATUS_OPTIONS)[number];

export const APP_REVIEW_REQUEST_CHANGES_STATUS_OPTIONS = [
  '📤Changes Requested',
  '📤Changes Requested (No Notification)',
] as const;

export type AppReviewRequestChangesStatusOption =
  (typeof APP_REVIEW_REQUEST_CHANGES_STATUS_OPTIONS)[number];

export function normalizeTemplateReviewQueueStatus(
  values: Array<string | null | undefined>,
): TemplateReviewQueueStatus | null {
  for (const value of values) {
    const candidate = value?.trim();
    if (!candidate) continue;

    if (/ready/i.test(candidate)) return 'ready_to_review';
    if (/in review/i.test(candidate)) return 'in_review';
    if (/changes requested|response to review/i.test(candidate)) {
      return 'changes_requested';
    }
    if (/approved/i.test(candidate)) return 'approved';
    if (/published|live/i.test(candidate)) return 'published';
  }

  return null;
}

export function normalizeAppReviewQueueStatus(
  values: Array<string | null | undefined>,
): AppReviewQueueStatus | null {
  for (const value of values) {
    const candidate = value?.trim();
    if (!candidate) continue;

    if (/ready/i.test(candidate)) return 'ready_to_review';
    if (
      /training check|in review|admin feedback review|managed feedback review|admin approval review|admin rejection review/i.test(
        candidate,
      )
    ) {
      return 'in_review';
    }
    if (/changes requested|response to review/i.test(candidate)) {
      return 'changes_requested';
    }
    if (/approved/i.test(candidate)) return 'approved';
    if (/rejected/i.test(candidate)) return 'rejected';
    if (/on hold/i.test(candidate)) return 'on_hold';
    if (/archived/i.test(candidate)) return 'archived';
  }

  return null;
}
