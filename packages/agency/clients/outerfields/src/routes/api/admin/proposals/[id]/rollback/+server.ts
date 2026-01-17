/**
 * Rollback Applied Change API
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { rollbackChange, getActiveChanges } from '$lib/server/proposals';

export const POST: RequestHandler = async ({ params, request, platform, locals }) => {
  const db = platform?.env?.DB;
  
  if (!db) {
    return json({ error: 'Database not available' }, { status: 503 });
  }
  
  const { id } = params;  // This is the proposal ID
  const rolledBackBy = locals.user?.email || 'anonymous';
  
  let body: { reason: string; changeId?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Request body required with reason' }, { status: 400 });
  }
  
  if (!body.reason || body.reason.trim().length < 5) {
    return json({ error: 'Rollback reason required (min 5 chars)' }, { status: 400 });
  }
  
  // Find the active change for this proposal
  let changeId = body.changeId;
  
  if (!changeId) {
    const activeChanges = await getActiveChanges(db);
    const change = activeChanges.find(c => c.proposalId === id);
    
    if (!change) {
      return json({ error: 'No active change found for this proposal' }, { status: 404 });
    }
    
    changeId = change.id;
  }
  
  const result = await rollbackChange(db, changeId, rolledBackBy, body.reason);
  
  if (!result.success) {
    return json({ error: result.error }, { status: 400 });
  }
  
  return json({ success: true, rolledBack: true, changeId });
};
