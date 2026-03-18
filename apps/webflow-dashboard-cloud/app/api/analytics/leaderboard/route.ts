import { getSyncMetadata } from '@create-something/webflow-dashboard-core/sync-schedule';
import { jsonNoStore } from '../../../../lib/server/responses';
import { getUserFromRequest } from '../../../../lib/server/session';
import { getServerAirtable } from '../../../../lib/server/airtable';

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const airtable = await getServerAirtable();
    const [leaderboardResult, creator] = await Promise.all([
      airtable.getLeaderboard(),
      airtable.getCreatorByEmail(user.email)
    ]);

    const userEmails = new Set<string>([user.email.toLowerCase()]);
    if (creator?.email) userEmails.add(creator.email.toLowerCase());
    if (creator?.emails) {
      for (const email of creator.emails) {
        if (email) userEmails.add(email.toLowerCase());
      }
    }

    const leaderboard = leaderboardResult.records.map((record) => {
      const creatorEmail = record.creatorEmail || '';
      const isUserTemplate = userEmails.has(creatorEmail.toLowerCase());

      return {
        templateName: record.templateName || '',
        category: record.category || '',
        creatorEmail: isUserTemplate ? creatorEmail : undefined,
        totalSales30d: record.totalSales30d || 0,
        totalRevenue30d: isUserTemplate ? record.totalRevenue30d || 0 : undefined,
        avgRevenuePerSale: isUserTemplate ? record.avgRevenuePerSale || 0 : undefined,
        salesRank: record.salesRank || 0,
        revenueRank: record.revenueRank || 0,
        isUserTemplate
      };
    });

    const userTemplates = leaderboard.filter((template) => template.isUserTemplate);
    const topTemplate = leaderboard[0] || null;
    const totalMarketplaceSales = leaderboard.reduce((sum, template) => sum + template.totalSales30d, 0);
    const userTotalRevenue = userTemplates.reduce(
      (sum, template) => sum + (template.totalRevenue30d || 0),
      0
    );
    const syncMetadata = getSyncMetadata({
      actualLastSyncTime: leaderboardResult.freshness.timestamp,
      actualSource: leaderboardResult.freshness.source
    });

    return jsonNoStore({
      leaderboard,
      userTemplates,
      summary: {
        topTemplate: topTemplate
          ? {
              name: topTemplate.templateName,
              revenue: topTemplate.isUserTemplate ? topTemplate.totalRevenue30d : undefined,
              sales: topTemplate.totalSales30d
            }
          : null,
        totalMarketplaceSales,
        userTotalRevenue,
        userBestRank:
          userTemplates.length > 0 ? Math.min(...userTemplates.map((template) => template.revenueRank)) : null,
        userTemplateCount: userTemplates.length,
        lastUpdated: syncMetadata.lastSyncTime,
        nextUpdateDate: syncMetadata.nextSyncTime,
        expectedLastSyncTime: syncMetadata.expectedLastSyncTime,
        syncSchedule: syncMetadata.syncSchedule,
        dataWindow: syncMetadata.dataWindow,
        timeUntilNextSync: syncMetadata.timeUntilNextSync,
        freshnessSource: syncMetadata.freshnessSource,
        isFreshnessEstimated: syncMetadata.isEstimated,
        isStale: syncMetadata.isStale,
        staleSinceHours: syncMetadata.staleSinceHours
      }
    });
  } catch (error) {
    console.error('[Analytics Leaderboard] Error:', error);
    return jsonNoStore({ error: 'Failed to fetch leaderboard data' }, { status: 500 });
  }
}
