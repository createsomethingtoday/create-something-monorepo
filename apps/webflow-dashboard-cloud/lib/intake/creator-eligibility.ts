import {
  calculateLocalSubmissionData,
  fetchExternalSubmissionStatus,
  formatTimeUntil,
  type ExternalSubmissionStatus
} from '@create-something/webflow-dashboard-core/submission';
import type { Asset } from '@create-something/webflow-dashboard-core/airtable';
import { getServerAirtable } from '../server/airtable';
import { checkRemoteCreatorEligibility, type RemoteCreatorEligibility } from './external';

export interface CreatorEligibilityResult {
  allowed: boolean;
  userExists: boolean;
  hasError: boolean;
  message: string;
  source: 'remote' | 'local' | 'hybrid';
  remote?: RemoteCreatorEligibility;
  publishedCount?: number;
  activeReviewCount?: number;
  remainingSubmissions?: number;
}

function isActiveReviewAsset(asset: Asset): boolean {
  const status = (asset.status || '').toLowerCase();
  if (!status) return false;

  if (status.includes('published') || status.includes('rejected') || status.includes('delisted')) {
    return false;
  }

  return /ready|review|submitted|changes requested|response/i.test(status);
}

function localEligibilityMessage(remainingSubmissions: number, activeReviewCount: number, publishedCount: number) {
  if (publishedCount < 5 && activeReviewCount > 0) {
    return {
      allowed: false,
      message: 'Creators with fewer than 5 published templates can only have 1 active review at a time.'
    };
  }

  if (remainingSubmissions <= 0) {
    return {
      allowed: false,
      message: 'This creator has reached the rolling 30-day submission limit.'
    };
  }

  return {
    allowed: true,
    message: 'Creator profile found. Local eligibility checks passed.'
  };
}

export async function evaluateCreatorEligibility(email: string): Promise<CreatorEligibilityResult> {
  const airtable = await getServerAirtable();
  const creator = await airtable.getCreatorByEmail(email);

  if (!creator) {
    return {
      allowed: false,
      userExists: false,
      hasError: true,
      message: 'Creator profile not found. Complete creator registration first.',
      source: 'local'
    };
  }

  const assets = await airtable.getAssetsByEmail(email).catch(() => []);
  const publishedCount = assets.filter((asset) => asset.status === 'Published').length;
  const activeReviewCount = assets.filter(isActiveReviewAsset).length;
  const localSubmission = calculateLocalSubmissionData(
    assets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      status: asset.status,
      submittedDate: asset.submittedDate
    }))
  );

  const externalSubmission = await fetchExternalSubmissionStatus(email).catch(
    (): ExternalSubmissionStatus => ({
      hasError: true,
      assetsSubmitted30: 0,
      isWhitelisted: false
    })
  );

  const remainingSubmissions = externalSubmission.hasError
    ? localSubmission.remainingSubmissions
    : externalSubmission.isWhitelisted
      ? Number.POSITIVE_INFINITY
      : Math.max(0, 6 - externalSubmission.assetsSubmitted30);

  try {
    const remote = await checkRemoteCreatorEligibility(email);

    if (remote.userExists === true && remote.hasError === false) {
      return {
        allowed: true,
        userExists: true,
        hasError: false,
        message: remote.message || 'Creator is eligible to submit.',
        source: 'remote',
        remote,
        publishedCount,
        activeReviewCount,
        remainingSubmissions
      };
    }

    if (remote.hasError && /banned|suspend|review|limit|submission/i.test(remote.message || '')) {
      return {
        allowed: false,
        userExists: true,
        hasError: true,
        message: remote.message || 'Creator is not eligible to submit.',
        source: 'hybrid',
        remote,
        publishedCount,
        activeReviewCount,
        remainingSubmissions
      };
    }

    const fallback = localEligibilityMessage(remainingSubmissions, activeReviewCount, publishedCount);
    const nextWindowMessage =
      !fallback.allowed && localSubmission.timeUntilNextSlot
        ? ` Next slot opens ${formatTimeUntil(localSubmission.timeUntilNextSlot)}.`
        : '';

    return {
      allowed: fallback.allowed,
      userExists: true,
      hasError: !fallback.allowed,
      message:
        remote.message && remote.message !== 'User not found in our system.'
          ? `${remote.message} Falling back to local creator checks.`
          : `${fallback.message}${nextWindowMessage}`,
      source: 'hybrid',
      remote,
      publishedCount,
      activeReviewCount,
      remainingSubmissions:
        Number.isFinite(remainingSubmissions) ? remainingSubmissions : undefined
    };
  } catch {
    const fallback = localEligibilityMessage(remainingSubmissions, activeReviewCount, publishedCount);
    const nextWindowMessage =
      !fallback.allowed && localSubmission.timeUntilNextSlot
        ? ` Next slot opens ${formatTimeUntil(localSubmission.timeUntilNextSlot)}.`
        : '';

    return {
      allowed: fallback.allowed,
      userExists: true,
      hasError: !fallback.allowed,
      message: `${fallback.message}${nextWindowMessage}`,
      source: 'local',
      publishedCount,
      activeReviewCount,
      remainingSubmissions:
        Number.isFinite(remainingSubmissions) ? remainingSubmissions : undefined
    };
  }
}
