/**
 * Reject Proposal API
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { rejectProposal } from '$lib/server/proposals';

export const POST: RequestHandler = async ({ params, request, platform, locals }) => {
  const db = platform?.env?.DB;
  
  if (!db) {
    return json({ error: 'Database not available' }, { status: 503 });
  }
  
  const { id } = params;
  const reviewerId = locals.user?.email || 'anonymous';
  
  let body: { reason: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Request body required with reason' }, { status: 400 });
  }
  
  if (!body.reason || body.reason.trim().length < 5) {
    return json({ error: 'Rejection reason required (min 5 chars)' }, { status: 400 });
  }
  
  const result = await rejectProposal(db, id, reviewerId, body.reason);
  
  if (!result.success) {
    return json({ error: result.error }, { status: 400 });
  }
  
  return json({ success: true, rejected: true });
};
