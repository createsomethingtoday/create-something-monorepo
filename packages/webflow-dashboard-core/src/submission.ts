export interface AssetSubmissionLike {
  id: string;
  name: string;
  status: string;
  submittedDate?: string;
}

export interface Submission {
  id: string;
  name: string;
  submittedDate: Date;
  expiryDate: Date;
  status: string;
  daysUntilExpiry: number;
}

export interface ExternalSubmissionStatus {
  assetsSubmitted30: number;
  hasError: boolean;
  message?: string;
  publishedTemplates?: number;
  submittedTemplates?: number;
  isWhitelisted?: boolean;
}

export const SUBMISSION_LIMIT = 6;
export const ROLLING_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export const WARNING_THRESHOLD = 2;
export const SUBMISSION_STATUS_URL = 'https://check-asset-name.vercel.app/api/checkTemplateuser';

export function formatTimeUntil(ms: number | null): string {
  if (ms === null || ms <= 0) return 'now';

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function daysUntil(date: Date): number {
  const diffMs = date.getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

export function calculateWarningLevel(
  remaining: number,
  isWhitelisted: boolean
): 'none' | 'caution' | 'critical' {
  if (isWhitelisted) return 'none';
  if (remaining <= 0) return 'critical';
  if (remaining <= WARNING_THRESHOLD) return 'caution';
  return 'none';
}

export function calculateLocalSubmissionData(assets: AssetSubmissionLike[]) {
  const now = new Date();
  const thirtyDaysAgo = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 30, 0, 0, 0, 0)
  );

  const submissions: Submission[] = [];

  for (const asset of assets) {
    if (asset.status === 'Delisted' || !asset.submittedDate) continue;

    const submissionDate = new Date(asset.submittedDate);
    const submissionDateUTC = new Date(
      Date.UTC(
        submissionDate.getUTCFullYear(),
        submissionDate.getUTCMonth(),
        submissionDate.getUTCDate(),
        submissionDate.getUTCHours(),
        submissionDate.getUTCMinutes(),
        submissionDate.getUTCSeconds()
      )
    );

    if (submissionDateUTC >= thirtyDaysAgo) {
      const expiryDate = new Date(submissionDateUTC.getTime() + ROLLING_WINDOW_MS);
      submissions.push({
        id: asset.id,
        name: asset.name,
        submittedDate: submissionDateUTC,
        expiryDate,
        status: asset.status,
        daysUntilExpiry: daysUntil(expiryDate)
      });
    }
  }

  submissions.sort((a, b) => a.submittedDate.getTime() - b.submittedDate.getTime());

  const remainingSubmissions = Math.max(0, SUBMISSION_LIMIT - submissions.length);
  const nextExpiryDate = submissions[0]?.expiryDate || null;
  const isAtLimit = remainingSubmissions <= 0;

  return {
    submissions,
    remainingSubmissions,
    isAtLimit,
    nextExpiryDate,
    publishedCount: assets.filter((asset) => asset.status === 'Published').length,
    totalSubmitted: assets.filter((asset) => asset.status !== 'Delisted').length,
    timeUntilNextSlot:
      isAtLimit && nextExpiryDate ? Math.max(0, nextExpiryDate.getTime() - now.getTime()) : null,
    warningLevel: calculateWarningLevel(remainingSubmissions, false),
    showWarning: remainingSubmissions <= WARNING_THRESHOLD
  };
}

export async function fetchExternalSubmissionStatus(
  email: string,
  fetchImpl: typeof fetch = fetch
): Promise<ExternalSubmissionStatus> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetchImpl(SUBMISSION_STATUS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Webflow-Dashboard-Cloud/1.0'
      },
      body: JSON.stringify({ email }),
      signal: controller.signal
    });

    if (!response.ok) {
      return {
        hasError: true,
        message: `External API error: ${response.status}`,
        assetsSubmitted30: 0
      };
    }

    const data = (await response.json()) as ExternalSubmissionStatus;
    if (typeof data.assetsSubmitted30 !== 'number') {
      return {
        hasError: true,
        message: 'Invalid response from external API',
        assetsSubmitted30: 0
      };
    }

    return data;
  } catch (error) {
    return {
      hasError: true,
      message: error instanceof Error && error.name === 'AbortError' ? 'Request timeout' : 'Failed to connect to external API',
      assetsSubmitted30: 0
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
