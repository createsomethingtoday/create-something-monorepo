import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireAgencyOperator } from '$lib/server/operator-auth';
import {
  REENGAGEMENT_CAMPAIGN_ID,
  approvalPhraseFor,
  approveReengagementCampaign,
  createD1ReengagementStore,
  getReengagementAudienceReceipt,
  prepareReengagementCampaign,
  sendApprovedReengagementCampaign,
  sendReengagementSeed,
  stopReengagementCampaign,
  syncReengagementDeliveryReceipts
} from '$lib/server/subscriber-reengagement';

export const load: PageServerLoad = async ({ cookies, platform, url }) => {
  await requireAgencyOperator({ cookies, platform });
  const db = platform?.env?.DB;
  if (!db) {
    return {
      error: 'Database is unavailable.',
      campaign: null,
      audience: null,
      deliveries: [],
      responses: [],
      result: null
    };
  }
  const campaign = await createD1ReengagementStore(db).getCampaign(REENGAGEMENT_CAMPAIGN_ID);
  const deliveries = await db
    .prepare(
      `SELECT status, COUNT(*) AS count
     FROM newsletter_reengagement_deliveries
     WHERE campaign_id = ? GROUP BY status ORDER BY status`
    )
    .bind(REENGAGEMENT_CAMPAIGN_ID)
    .all<{ status: string; count: number }>();
  const responses = await db
    .prepare(
      `SELECT original_reason, still_interested, updates_seen, wanted_next, responded_at
       FROM newsletter_reengagement_responses
       WHERE campaign_id = ? AND retention_expires_at > datetime('now')
       ORDER BY responded_at DESC`
    )
    .bind(REENGAGEMENT_CAMPAIGN_ID)
    .all<{
      original_reason: string | null;
      still_interested: string;
      updates_seen: string;
      wanted_next: string | null;
      responded_at: string;
    }>();
  return {
    error: null,
    audience: await getReengagementAudienceReceipt(db),
    campaign: campaign
      ? {
          ...campaign,
          approvedBy: campaign.approvedBy ? 'operator receipt recorded' : null,
          approvalPhrase: approvalPhraseFor(campaign)
        }
      : null,
    deliveries: deliveries.results,
    responses: responses.results,
    result: url.searchParams.get('result')
  };
};

export const actions: Actions = {
  prepare: async ({ cookies, platform }) => {
    await requireAgencyOperator({ cookies, platform });
    const db = platform?.env?.DB;
    if (!db) return fail(503, { error: 'Database is unavailable.' });
    try {
      await prepareReengagementCampaign(db);
    } catch (error) {
      return fail(400, { error: message(error) });
    }
    throw redirect(303, '?result=prepared');
  },
  seed: async ({ cookies, platform }) => {
    const operator = await requireAgencyOperator({ cookies, platform });
    const db = platform?.env?.DB;
    if (!db || !platform?.env?.RESEND_API_KEY) {
      return fail(503, { error: 'Database or email delivery is unavailable.' });
    }
    try {
      await sendReengagementSeed(db, {
        recipient: operator.email,
        apiKey: platform.env.RESEND_API_KEY,
        fetch
      });
    } catch (error) {
      return fail(400, { error: message(error) });
    }
    throw redirect(303, '?result=seed-sent');
  },
  approve: async ({ cookies, platform, request }) => {
    const operator = await requireAgencyOperator({ cookies, platform });
    const db = platform?.env?.DB;
    if (!db) return fail(503, { error: 'Database is unavailable.' });
    const data = await request.formData();
    try {
      await approveReengagementCampaign(db, {
        phrase: String(data.get('approval_phrase') ?? ''),
        operatorEmail: operator.email
      });
    } catch (error) {
      return fail(400, { error: message(error) });
    }
    throw redirect(303, '?result=approved');
  },
  stop: async ({ cookies, platform }) => {
    await requireAgencyOperator({ cookies, platform });
    const db = platform?.env?.DB;
    if (!db) return fail(503, { error: 'Database is unavailable.' });
    await stopReengagementCampaign(db);
    throw redirect(303, '?result=stopped');
  },
  sync: async ({ cookies, platform }) => {
    await requireAgencyOperator({ cookies, platform });
    const db = platform?.env?.DB;
    if (!db || !platform?.env?.RESEND_API_KEY) {
      return fail(503, { error: 'Database or email delivery is unavailable.' });
    }
    let receipt: { checked: number; delivered: number; failed: number };
    try {
      receipt = await syncReengagementDeliveryReceipts(db, {
        apiKey: platform.env.RESEND_API_KEY,
        fetch
      });
    } catch (error) {
      return fail(400, { error: message(error) });
    }
    throw redirect(
      303,
      `?result=synced-${receipt.checked}-delivered-${receipt.delivered}-failed-${receipt.failed}`
    );
  },
  send: async ({ cookies, platform }) => {
    await requireAgencyOperator({ cookies, platform });
    const db = platform?.env?.DB;
    if (!db || !platform?.env?.RESEND_API_KEY) {
      return fail(503, { error: 'Database or email delivery is unavailable.' });
    }
    let receipt: { sent: number; skipped: number };
    try {
      receipt = await sendApprovedReengagementCampaign(createD1ReengagementStore(db), {
        apiKey: platform.env.RESEND_API_KEY,
        fetch
      });
    } catch (error) {
      return fail(400, { error: message(error) });
    }
    throw redirect(303, `?result=sent-${receipt.sent}-skipped-${receipt.skipped}`);
  }
};

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'The campaign action failed.';
}
