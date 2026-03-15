/**
 * Admin Proposals Page - Server
 */
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { isAdminUser } from '$lib/server/auth';

export const load: PageServerLoad = async ({ platform, locals }) => {
  if (!locals.user) {
    redirect(302, '/login?redirect=/admin/proposals');
  }

  if (!isAdminUser(locals.user)) {
    redirect(302, '/library');
  }

  const db = platform?.env?.DB;
  
  if (!db) {
    return { proposals: [], stats: null };
  }
  
  try {
    // Get pending proposals
    const pendingResult = await db.prepare(`
      SELECT * FROM agent_proposals 
      WHERE status = 'pending'
      ORDER BY 
        CASE impact_level WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        created_at DESC
      LIMIT 20
    `).all();
    
    // Get stats
    const statsResult = await db.prepare(`
      SELECT 
        status,
        COUNT(*) as count
      FROM agent_proposals
      GROUP BY status
    `).all();
    
    const stats: Record<string, number> = {};
    for (const row of (statsResult.results || []) as any[]) {
      stats[row.status] = row.count;
    }
    
    return {
      proposals: pendingResult.results || [],
      stats
    };
  } catch (error) {
    console.error('Failed to load proposals:', error);
    return { proposals: [], stats: null };
  }
};
