/**
 * Admin Proposals API
 * 
 * List and manage agent proposals.
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPendingProposals, createProposal } from '$lib/server/proposals';

/**
 * GET /api/admin/proposals
 * 
 * List proposals (with optional filters)
 */
export const GET: RequestHandler = async ({ url, platform, locals }) => {
  const db = platform?.env?.DB;
  
  if (!db) {
    return json({ proposals: [], total: 0, error: 'Database not available' });
  }
  
  // TODO: Add proper admin auth check
  // if (!locals.user?.isAdmin) {
  //   return json({ error: 'Unauthorized' }, { status: 401 });
  // }
  
  const status = url.searchParams.get('status') || 'pending';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
  
  try {
    let query = 'SELECT * FROM agent_proposals';
    const params: (string | number)[] = [];
    
    if (status !== 'all') {
      query += ' WHERE status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    
    const result = await db.prepare(query).bind(...params).all();
    
    return json({
      proposals: result.results || [],
      total: result.results?.length || 0
    });
  } catch (error) {
    console.error('Failed to fetch proposals:', error);
    return json({ proposals: [], total: 0, error: 'Failed to fetch proposals' });
  }
};

/**
 * POST /api/admin/proposals
 * 
 * Create a new proposal (for testing/manual creation)
 */
export const POST: RequestHandler = async ({ request, platform }) => {
  const db = platform?.env?.DB;
  
  if (!db) {
    return json({ error: 'Database not available' }, { status: 503 });
  }
  
  try {
    const proposal = await request.json();
    const result = await createProposal(db, proposal, 'manual');
    
    if (result.success) {
      return json({ 
        success: true, 
        proposalId: result.proposalId,
        warnings: result.warnings
      });
    } else {
      return json({ error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error('Failed to create proposal:', error);
    return json({ error: 'Failed to create proposal' }, { status: 500 });
  }
};
