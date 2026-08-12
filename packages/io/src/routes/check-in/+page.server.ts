import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
  loadNewsletterCheckIn,
  saveNewsletterCheckIn,
  validateNewsletterCheckInInput
} from '$lib/server/newsletter-check-in';

export const load: PageServerLoad = async ({ url, platform }) => {
  if (url.searchParams.get('preview') === 'operator-seed') {
    return {
      state: 'preview' as const,
      response: null,
      respondedAt: null,
      unsubscribeUrl: '/unsubscribe?preview=operator-seed'
    };
  }
  const token = url.searchParams.get('token') ?? '';
  const db = platform?.env?.DB;
  if (!db) return { state: 'unavailable' as const, response: null, unsubscribeUrl: null };

  try {
    const checkIn = await loadNewsletterCheckIn(db, token);
    return {
      state: checkIn.state,
      response: checkIn.state === 'ready' ? checkIn.response : null,
      respondedAt: checkIn.state === 'ready' ? checkIn.respondedAt : null,
      unsubscribeUrl:
        checkIn.unsubscribeToken === null
          ? null
          : `/unsubscribe?token=${encodeURIComponent(checkIn.unsubscribeToken)}`
    };
  } catch {
    return { state: 'unavailable' as const, response: null, respondedAt: null, unsubscribeUrl: null };
  }
};

export const actions: Actions = {
  default: async ({ request, url, platform }) => {
    const db = platform?.env?.DB;
    if (!db) return fail(503, { success: false, message: 'The response service is unavailable.' });

    const token = url.searchParams.get('token') ?? '';
    let checkIn: Awaited<ReturnType<typeof loadNewsletterCheckIn>>;
    try {
      checkIn = await loadNewsletterCheckIn(db, token);
    } catch {
      return fail(503, { success: false, message: 'The response service is unavailable.' });
    }
    if (checkIn.state !== 'ready') {
      return fail(400, { success: false, message: 'This check-in link is no longer available.' });
    }

    try {
      const formData = await request.formData();
      const response = validateNewsletterCheckInInput({
        originalReason: formData.get('originalReason'),
        stillInterested: formData.get('stillInterested'),
        updatesSeen: formData.get('updatesSeen'),
        wantedNext: formData.get('wantedNext')
      });

      await saveNewsletterCheckIn(
        db,
        { campaignId: checkIn.campaignId, subscriberId: checkIn.subscriberId },
        response
      );

      return {
        success: true,
        message: 'Your note is saved. Thank you for the context.',
        response
      };
    } catch (error) {
      return fail(400, {
        success: false,
        message: error instanceof Error ? error.message : 'Review the response and try again.'
      });
    }
  }
};
