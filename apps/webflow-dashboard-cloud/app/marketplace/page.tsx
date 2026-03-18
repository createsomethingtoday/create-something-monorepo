import { getSyncMetadata } from '@create-something/webflow-dashboard-core';
import { getCompetitionLevel } from '../../lib/marketplace';
import { getServerAirtable } from '../../lib/server/airtable';
import { requireUser } from '../../lib/server/session';

export const dynamic = 'force-dynamic';

export default async function MarketplacePage() {
  const user = await requireUser();
  const airtable = await getServerAirtable();

  const [leaderboardResult, categoryResult, creator] = await Promise.all([
    airtable.getLeaderboard(),
    airtable.getCategoryPerformance(),
    airtable.getCreatorByEmail(user.email)
  ]);

  const userEmails = new Set<string>([user.email.toLowerCase()]);
  if (creator?.email) userEmails.add(creator.email.toLowerCase());
  if (creator?.emails) {
    for (const email of creator.emails) {
      if (email) userEmails.add(email.toLowerCase());
    }
  }

  const leaderboard = leaderboardResult.records.map((record) => ({
    ...record,
    isUserTemplate: userEmails.has(record.creatorEmail.toLowerCase())
  }));
  const userTemplates = leaderboard.filter((template) => template.isUserTemplate);
  const leaderboardSync = getSyncMetadata({
    actualLastSyncTime: leaderboardResult.freshness.timestamp,
    actualSource: leaderboardResult.freshness.source
  });
  const categorySync = getSyncMetadata({
    actualLastSyncTime: categoryResult.freshness.timestamp,
    actualSource: categoryResult.freshness.source
  });

  const lowestCompetition = categoryResult.records
    .filter((category) => category.templatesInSubcategory < 10 && category.avgRevenuePerTemplate > 0)
    .slice(0, 3)
    .map((category) => ({
      ...category,
      competitionLevel: getCompetitionLevel(category.templatesInSubcategory)
    }));

  return (
    <main className="container">
      <div className="page-stack">
        <section className="page-header">
          <div>
            <h1 className="page-title">Marketplace insights</h1>
            <p className="page-subtitle">
              Weekly leaderboard and category data, redacted for competitor privacy but still aligned with the
              original dashboard contracts.
            </p>
          </div>
        </section>

        <section className="grid grid-3">
          <div className="metric">
            <div className="metric-value">{leaderboard.length}</div>
            <div className="metric-label">Leaderboard rows</div>
          </div>
          <div className="metric">
            <div className="metric-value">{userTemplates.length}</div>
            <div className="metric-label">Your ranked templates</div>
          </div>
          <div className="metric">
            <div className="metric-value">{categoryResult.records.length}</div>
            <div className="metric-label">Category rows</div>
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">Freshness</h2>
          <p className="card-subtitle">
            Leaderboard refreshed {new Date(leaderboardSync.lastSyncTime).toLocaleString()} and category data refreshed{' '}
            {new Date(categorySync.lastSyncTime).toLocaleString()}.
          </p>
          <div className="grid grid-2" style={{ marginTop: '1rem' }}>
            <div className="notice">
              <strong>Leaderboard cadence</strong>
              <div style={{ marginTop: '0.4rem' }}>{leaderboardSync.syncSchedule}</div>
            </div>
            <div className="notice">
              <strong>Next expected update</strong>
              <div style={{ marginTop: '0.4rem' }}>{new Date(leaderboardSync.nextSyncTime).toLocaleString()}</div>
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">Opportunity watchlist</h2>
          <div className="grid grid-3" style={{ marginTop: '1rem' }}>
            {lowestCompetition.length === 0 ? (
              <div className="notice">No low-competition opportunities surfaced from the current category snapshot.</div>
            ) : (
              lowestCompetition.map((entry) => (
                <div className="notice" key={`${entry.category}-${entry.subcategory}`}>
                  <strong>{entry.subcategory}</strong>
                  <div style={{ marginTop: '0.35rem' }}>{entry.competitionLevel} competition</div>
                  <div style={{ marginTop: '0.2rem' }}>
                    {entry.templatesInSubcategory} templates, ${Math.round(entry.avgRevenuePerTemplate)} avg revenue
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">Top templates leaderboard</h2>
          <table className="analytics-table" style={{ marginTop: '1rem' }}>
            <thead>
              <tr>
                <th>Template</th>
                <th>Category</th>
                <th>Sales (30d)</th>
                <th>Revenue rank</th>
                <th>Your revenue</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => (
                <tr key={`${entry.templateName}-${entry.salesRank}`}>
                  <td>
                    <strong>{entry.templateName}</strong>
                    {entry.isUserTemplate ? (
                      <div style={{ color: 'var(--color-primary)', marginTop: '0.25rem' }}>Your template</div>
                    ) : null}
                  </td>
                  <td>{entry.category}</td>
                  <td>{entry.totalSales30d}</td>
                  <td>{entry.revenueRank}</td>
                  <td>{entry.isUserTemplate ? `$${Math.round(entry.totalRevenue30d)}` : 'Redacted'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h2 className="card-title">Category performance</h2>
          <table className="analytics-table" style={{ marginTop: '1rem' }}>
            <thead>
              <tr>
                <th>Category</th>
                <th>Subcategory</th>
                <th>Templates</th>
                <th>Sales (30d)</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {categoryResult.records.map((entry) => (
                <tr key={`${entry.category}-${entry.subcategory}`}>
                  <td>{entry.category}</td>
                  <td>{entry.subcategory}</td>
                  <td>{entry.templatesInSubcategory}</td>
                  <td>{entry.totalSales30d}</td>
                  <td>${Math.round(entry.totalRevenue30d)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
