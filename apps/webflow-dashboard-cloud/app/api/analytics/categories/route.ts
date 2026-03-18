import { getSyncMetadata } from '@create-something/webflow-dashboard-core/sync-schedule';
import { jsonNoStore } from '../../../../lib/server/responses';
import { getUserFromRequest } from '../../../../lib/server/session';
import { getServerAirtable } from '../../../../lib/server/airtable';

function getCompetitionLevel(templateCount: number): string {
  if (templateCount < 10) return 'Low';
  if (templateCount < 30) return 'Medium';
  if (templateCount < 70) return 'High';
  return 'Very High';
}

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const airtable = await getServerAirtable();
    const categoryResult = await airtable.getCategoryPerformance();
    const categories = categoryResult.records;
    const topCategories = categories.slice(0, 5);
    const totalSales = categories.reduce((sum, category) => sum + category.totalSales30d, 0);
    const avgRevenue =
      categories.length > 0
        ? categories.reduce((sum, category) => sum + category.avgRevenuePerTemplate, 0) / categories.length
        : 0;

    const lowestCompetition = categories
      .filter((category) => category.templatesInSubcategory < 10 && category.avgRevenuePerTemplate > 0)
      .sort((a, b) => a.templatesInSubcategory - b.templatesInSubcategory)
      .slice(0, 3)
      .map((category) => ({
        category: category.category,
        subcategory: category.subcategory,
        templateCount: category.templatesInSubcategory,
        avgRevenue: category.avgRevenuePerTemplate,
        competitionLevel: getCompetitionLevel(category.templatesInSubcategory)
      }));

    const insights: Array<{ type: 'opportunity' | 'trend' | 'warning'; message: string }> = [];

    if (lowestCompetition.length > 0) {
      insights.push({
        type: 'opportunity',
        message: `"${lowestCompetition[0].subcategory}" has low competition with ${lowestCompetition[0].templateCount} templates and $${Math.round(lowestCompetition[0].avgRevenue)} avg revenue.`
      });
    }

    if (topCategories.length > 0) {
      const topCategory = topCategories[0];
      insights.push({
        type: 'trend',
        message: `"${topCategory.subcategory}" leads with $${Math.round(topCategory.avgRevenuePerTemplate)} avg revenue per template.`
      });
    }

    const syncMetadata = getSyncMetadata({
      actualLastSyncTime: categoryResult.freshness.timestamp,
      actualSource: categoryResult.freshness.source
    });

    const totalRevenue = categories.reduce((sum, category) => sum + (category.totalRevenue30d || 0), 0);
    const totalTemplates = categories.reduce(
      (sum, category) => sum + category.templatesInSubcategory,
      0
    );

    return jsonNoStore({
      categories,
      topCategories,
      insights,
      summary: {
        totalCategories: categories.length,
        totalTemplates,
        totalSales,
        totalRevenue,
        avgRevenue: Math.round(avgRevenue),
        lowestCompetition,
        lastUpdated: syncMetadata.lastSyncTime,
        nextUpdate: syncMetadata.nextSyncTime,
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
    console.error('[Analytics Categories] Error:', error);
    return jsonNoStore({ error: 'Failed to fetch category data' }, { status: 500 });
  }
}
