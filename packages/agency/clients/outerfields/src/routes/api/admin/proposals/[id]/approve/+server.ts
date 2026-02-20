/**
 * Approve Proposal API
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { approveProposal, applyProposal } from '$lib/server/proposals';
import { isAdminUser } from '$lib/server/auth';

export const POST: RequestHandler = async ({ params, request, platform, locals }) => {
  if (!isAdminUser(locals.user)) {
    return json({ error: 'Not authorized' }, { status: 403 });
  }

  const db = platform?.env?.DB;
  
  if (!db) {
    return json({ error: 'Database not available' }, { status: 503 });
  }
  
  const { id } = params;
  const reviewerId = locals.user?.email || 'anonymous';
  
  let body: { notes?: string; autoApply?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    // Body is optional
  }
  
  // Approve the proposal
  const approvalResult = await approveProposal(db, id, reviewerId, body.notes);
  
  if (!approvalResult.success) {
    return json({ error: approvalResult.error }, { status: 400 });
  }
  
  // Optionally auto-apply after approval
  if (body.autoApply) {
    const applyResult = await applyProposal(db, id, reviewerId);
    
    if (!applyResult.success) {
      return json({ 
        success: true, 
        approved: true, 
        applied: false, 
        applyError: applyResult.error 
      });
    }
    
    return json({ 
      success: true, 
      approved: true, 
      applied: true, 
      changeId: applyResult.changeId 
    });
  }
  
  return json({ success: true, approved: true, applied: false });
};
