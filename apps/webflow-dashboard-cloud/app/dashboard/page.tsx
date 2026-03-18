import {
  SUBMISSION_LIMIT,
  calculateLocalSubmissionData,
  calculateWarningLevel,
  fetchExternalSubmissionStatus,
  formatTimeUntil,
  type ExternalSubmissionStatus
} from '@create-something/webflow-dashboard-core';
import { AccountPanel } from '../../components/account-panel';
import { AssetList } from '../../components/asset-list';
import { getServerAirtable } from '../../lib/server/airtable';
import { requireUser } from '../../lib/server/session';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await requireUser();
  const airtable = await getServerAirtable();

  const [assets, profile, keys, externalSubmissionStatus] = await Promise.all([
    airtable.getAssetsByEmail(user.email).catch(() => []),
    airtable.getCreatorByEmail(user.email).catch(() => null),
    airtable.listApiKeys(user.email).catch(() => []),
    fetchExternalSubmissionStatus(user.email).catch(
      (): ExternalSubmissionStatus => ({
        hasError: true,
        message: 'Failed to connect to external API',
        assetsSubmitted30: 0,
        isWhitelisted: false
      })
    )
  ]);

  const localSubmission = calculateLocalSubmissionData(
    assets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      status: asset.status,
      submittedDate: asset.submittedDate
    }))
  );

  const remainingSubmissions = externalSubmissionStatus.hasError
    ? localSubmission.remainingSubmissions
    : Math.max(
        0,
        (externalSubmissionStatus.isWhitelisted ? Number.POSITIVE_INFINITY : SUBMISSION_LIMIT) -
          externalSubmissionStatus.assetsSubmitted30
      );

  const isAtLimit = externalSubmissionStatus.hasError
    ? localSubmission.isAtLimit
    : !externalSubmissionStatus.isWhitelisted && externalSubmissionStatus.assetsSubmitted30 >= SUBMISSION_LIMIT;

  const warningLevel = calculateWarningLevel(
    Number.isFinite(remainingSubmissions) ? remainingSubmissions : SUBMISSION_LIMIT,
    Boolean(externalSubmissionStatus.isWhitelisted)
  );

  const publishedCount = assets.filter((asset) => asset.status === 'Published').length;
  const scheduledCount = assets.filter((asset) => ['Scheduled', 'Upcoming'].includes(asset.status)).length;
  const rejectedCount = assets.filter((asset) => asset.status === 'Rejected').length;
  const activeKeys = keys.filter((key) => key.status === 'Active').length;

  return (
    <main className="container">
      <div className="page-stack">
        <section className="page-header">
          <div>
            <h1 className="page-title">Your Webflow template portfolio</h1>
            <p className="page-subtitle">
              Track asset status, creator metadata, marketplace access, and submission capacity from the new Webflow
              Cloud dashboard shell.
            </p>
          </div>
        </section>

        <section className="grid grid-3">
          <div className="metric">
            <div className="metric-value">{assets.length}</div>
            <div className="metric-label">Total assets</div>
          </div>
          <div className="metric">
            <div className="metric-value">{publishedCount}</div>
            <div className="metric-label">Published assets</div>
          </div>
          <div className="metric">
            <div className="metric-value">{scheduledCount}</div>
            <div className="metric-label">Scheduled or upcoming</div>
          </div>
          <div className="metric">
            <div className="metric-value">{rejectedCount}</div>
            <div className="metric-label">Rejected assets</div>
          </div>
          <div className="metric">
            <div className="metric-value">{activeKeys}</div>
            <div className="metric-label">Active API keys</div>
          </div>
          <div className="metric">
            <div className="metric-value">
              {externalSubmissionStatus.isWhitelisted ? 'Whitelisted' : Number.isFinite(remainingSubmissions) ? remainingSubmissions : '∞'}
            </div>
            <div className="metric-label">Submission slots remaining</div>
          </div>
        </section>

        <section
          className={`notice ${
            warningLevel === 'critical'
              ? 'notice-error'
              : warningLevel === 'caution'
                ? 'notice-warning'
                : ''
          }`}
        >
          <strong>Submission tracker</strong>
          <div style={{ marginTop: '0.5rem', color: 'inherit' }}>
            {externalSubmissionStatus.hasError ? (
              <>
                External status lookup failed, so this summary is using the local asset history. You have{' '}
                <strong>{localSubmission.remainingSubmissions}</strong> submission slots remaining in the rolling
                30-day window.
                {localSubmission.timeUntilNextSlot ? (
                  <> Next slot opens {formatTimeUntil(localSubmission.timeUntilNextSlot)}.</>
                ) : null}
              </>
            ) : externalSubmissionStatus.isWhitelisted ? (
              <>This creator is whitelisted and is not subject to the standard 30-day submission limit.</>
            ) : (
              <>
                You have submitted <strong>{externalSubmissionStatus.assetsSubmitted30}</strong> assets in the last
                30 days and have <strong>{remainingSubmissions}</strong> slots remaining.
                {isAtLimit && localSubmission.timeUntilNextSlot ? (
                  <> Next slot opens {formatTimeUntil(localSubmission.timeUntilNextSlot)}.</>
                ) : null}
              </>
            )}
          </div>
        </section>

        <div className="split">
          <AssetList assets={assets} />
          <AccountPanel initialProfile={profile} initialKeys={keys} userEmail={user.email} />
        </div>
      </div>
    </main>
  );
}
