import {
  APP_REVIEW_GOVERNANCE_COMPOSITION,
  decideArcAction,
  executeArcAction,
  proposeArcAction,
  toAtlasStoryAdapter,
  type AtlasActionProposal
} from '@create-something/atlas-composition';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function isProposal(value: unknown): value is AtlasActionProposal {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.actionId === 'string' &&
    typeof candidate.arcId === 'string' &&
    typeof candidate.proposedBy === 'string' &&
    typeof candidate.status === 'string'
  );
}

export const GET: RequestHandler = () => {
  return json({
    composition: APP_REVIEW_GOVERNANCE_COMPOSITION,
    story: toAtlasStoryAdapter(APP_REVIEW_GOVERNANCE_COMPOSITION, 'app-review-governance-arc')
  });
};

/**
 * A deliberately fixture-only operator loop. It validates the exact same
 * composition object available to the MCP but persists nothing and cannot
 * target Airtable, Slack, Zendesk, D1, or production.
 */
export const POST: RequestHandler = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'Request body must be JSON.' }, { status: 400 });
  }

  try {
    if (body.type === 'propose') {
      return json({ proposal: proposeArcAction(APP_REVIEW_GOVERNANCE_COMPOSITION, { proposedBy: 'atlas-agent' }) });
    }

    if (body.type === 'decide') {
      if (!isProposal(body.proposal) || (body.decision !== 'approved' && body.decision !== 'rejected')) {
        return json({ error: 'A proposed action and explicit decision are required.' }, { status: 400 });
      }
      return json({
        proposal: decideArcAction(body.proposal, { decidedBy: 'operator', decision: body.decision })
      });
    }

    if (body.type === 'execute') {
      if (!isProposal(body.proposal)) {
        return json({ error: 'An approved action is required.' }, { status: 400 });
      }
      return json(executeArcAction(body.proposal, { executor: 'local-prototype-runtime' }));
    }
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Unable to process the local Arc action.' },
      { status: 409 }
    );
  }

  return json({ error: 'Unsupported local Arc action.' }, { status: 400 });
};
