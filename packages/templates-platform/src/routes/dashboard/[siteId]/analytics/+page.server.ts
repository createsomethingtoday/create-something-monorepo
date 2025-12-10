/**
 * Site Analytics - Server Load
 *
 * Loads analytics data for the site.
 * Only available for Pro tier and above.
 */

import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { getTenantById } from '$lib/db';

export const load: PageServerLoad = async ({ params, platform }) => {
  const db = platform?.env?.DB;

  if (!db) {
    // Development mode: return mock data
    return {
      site: {
        id: params.siteId,
        subdomain: 'demo-site',
        tier: 'pro',
        config: { name: 'Demo Site' }
      },
      analytics: generateMockAnalytics()
    };
  }

  const site = await getTenantById(db, params.siteId);

  if (!site) {
    throw error(404, 'Site not found');
  }

  // Check tier - analytics is Pro feature
  if (site.tier === 'free') {
    throw redirect(302, `/dashboard/${params.siteId}?upgrade=analytics`);
  }

  // In production, this would query analytics data from D1 or Analytics Engine
  const analytics = generateMockAnalytics();

  return { site, analytics };
};

function generateMockAnalytics() {
  const now = new Date();
  const days = [];

  // Generate 30 days of mock data
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    days.push({
      date: date.toISOString().split('T')[0],
      pageViews: Math.floor(Math.random() * 200) + 50,
      uniqueVisitors: Math.floor(Math.random() * 100) + 20,
      avgSessionDuration: Math.floor(Math.random() * 180) + 30
    });
  }

  // Calculate totals
  const totalPageViews = days.reduce((sum, d) => sum + d.pageViews, 0);
  const totalVisitors = days.reduce((sum, d) => sum + d.uniqueVisitors, 0);
  const avgDuration = Math.floor(days.reduce((sum, d) => sum + d.avgSessionDuration, 0) / days.length);

  return {
    period: '30d',
    totals: {
      pageViews: totalPageViews,
      uniqueVisitors: totalVisitors,
      avgSessionDuration: avgDuration,
      bounceRate: Math.floor(Math.random() * 30) + 30
    },
    daily: days,
    topPages: [
      { path: '/', views: Math.floor(totalPageViews * 0.4) },
      { path: '/services', views: Math.floor(totalPageViews * 0.25) },
      { path: '/about', views: Math.floor(totalPageViews * 0.15) },
      { path: '/contact', views: Math.floor(totalPageViews * 0.12) },
      { path: '/team', views: Math.floor(totalPageViews * 0.08) }
    ],
    topReferrers: [
      { source: 'google.com', visits: Math.floor(totalVisitors * 0.45) },
      { source: 'direct', visits: Math.floor(totalVisitors * 0.3) },
      { source: 'linkedin.com', visits: Math.floor(totalVisitors * 0.12) },
      { source: 'twitter.com', visits: Math.floor(totalVisitors * 0.08) },
      { source: 'other', visits: Math.floor(totalVisitors * 0.05) }
    ]
  };
}
