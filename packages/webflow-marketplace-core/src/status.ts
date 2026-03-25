export const MARKETPLACE_SUBMISSION_STATUS = {
  PROCESSING: 'processing',
  PENDING: 'pending',
  WEBHOOK_SUCCESS: 'webhook_success',
  WEBHOOK_FAILED: 'webhook_failed',
} as const;

export const MARKETPLACE_SUBMISSION_STATUSES = [
  MARKETPLACE_SUBMISSION_STATUS.PROCESSING,
  MARKETPLACE_SUBMISSION_STATUS.PENDING,
  MARKETPLACE_SUBMISSION_STATUS.WEBHOOK_SUCCESS,
  MARKETPLACE_SUBMISSION_STATUS.WEBHOOK_FAILED,
] as const;

export type MarketplaceSubmissionStatus =
  (typeof MARKETPLACE_SUBMISSION_STATUSES)[number];

export type MarketplaceRetryPolicy = {
  maxAttempts: number;
  cooldownMinutes: number;
  cleanupDelayHours: number;
};

export type MarketplaceTemplateSubmissionPolicy = {
  rollingWindowDays: number;
  rollingWindowMs: number;
  submissionLimit: number;
  warningThreshold: number;
};

export const MARKETPLACE_RETRY_POLICY: MarketplaceRetryPolicy = {
  maxAttempts: 3,
  cooldownMinutes: 15,
  cleanupDelayHours: 24,
};

export const MARKETPLACE_TEMPLATE_SUBMISSION_POLICY: MarketplaceTemplateSubmissionPolicy = {
  rollingWindowDays: 30,
  rollingWindowMs: 30 * 24 * 60 * 60 * 1000,
  submissionLimit: 6,
  warningThreshold: 2,
};

export function isMarketplaceSubmissionStatus(
  value: string,
): value is MarketplaceSubmissionStatus {
  return (
    MARKETPLACE_SUBMISSION_STATUSES as readonly string[]
  ).includes(value);
}

export function canRetrySubmission(
  status: string,
  retryCount: number,
): boolean {
  return (
    status === MARKETPLACE_SUBMISSION_STATUS.WEBHOOK_FAILED &&
    retryCount < MARKETPLACE_RETRY_POLICY.maxAttempts
  );
}

export function needsManualReview(retryCount: number): boolean {
  return retryCount >= MARKETPLACE_RETRY_POLICY.maxAttempts;
}

export function calculateMarketplaceWarningLevel(
  remaining: number,
  isWhitelisted: boolean,
): 'none' | 'caution' | 'critical' {
  if (isWhitelisted) return 'none';
  if (remaining <= 0) return 'critical';
  if (remaining <= MARKETPLACE_TEMPLATE_SUBMISSION_POLICY.warningThreshold) {
    return 'caution';
  }
  return 'none';
}

export function calculateRemainingSubmissionSlots(
  assetsSubmitted30: number,
  isWhitelisted: boolean,
): number {
  if (isWhitelisted) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(
    0,
    MARKETPLACE_TEMPLATE_SUBMISSION_POLICY.submissionLimit - assetsSubmitted30,
  );
}

export function isMarketplaceTemplateActiveReviewStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  if (
    normalized.includes('published') ||
    normalized.includes('rejected') ||
    normalized.includes('delisted')
  ) {
    return false;
  }

  return /ready|review|submitted|changes requested|response/i.test(normalized);
}
