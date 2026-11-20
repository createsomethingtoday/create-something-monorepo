// Posts an approved draft to the thread as the admin, then records it.
// Used by the Send button in Bettermode and by the dashboard (QueueAdmin).

import { bettermodeAuth, createReply, memberAccessToken } from './bettermode';
import { enqueue } from './queue';
import {
  claimDraftForSend,
  expireOpenDrafts,
  getLatestDraftByPostId,
  markSent,
  patchSignal,
  releaseSendClaim,
} from './store';
import { draftToHtml } from './thread';

export type SendInput = {
  postId: string;
  draftText: string;
  // Bettermode member the reply posts as. Must be an admin.
  actorId: string;
  // Signed-in person who pressed Send, when that is not the actor.
  requestedBy?: string | null;
};

// Throws when nothing was posted. Once the reply is public it returns, and a
// bookkeeping failure is logged, so the caller never asks for a second send.
export async function sendApprovedDraft(env: Env, input: SendInput): Promise<{ replyId: string | null }> {
  const { postId, actorId } = input;
  const draftText = input.draftText.trim();
  if (!postId) throw new Error('Missing post ID.');
  if (!draftText) throw new Error('Drafted reply is empty.');
  if (!actorId) throw new Error('Missing admin actor ID.');

  const found = await getLatestDraftByPostId(env.DB, postId);
  if (!found) throw new Error('No drafted reply found for this post.');

  const auth = bettermodeAuth(env);
  const networkId = found.signal.metadata?.network_id || env.BETTERMODE_DEFAULT_NETWORK_ID;
  if (!networkId) throw new Error('Missing Bettermode network ID.');

  const postTypeId = env.BETTERMODE_REPLY_POST_TYPE_ID?.trim();
  if (!postTypeId) {
    throw new Error('Send is off: BETTERMODE_REPLY_POST_TYPE_ID is not set on the Worker.');
  }

  // A second submit must not post a second public reply.
  const draftId = found.draft.id;
  if (!(await claimDraftForSend(env.DB, draftId))) {
    throw new Error('This draft is not open for sending. Reload the post to see its status.');
  }

  let reply: Awaited<ReturnType<typeof createReply>>;
  try {
    const memberToken = await memberAccessToken(networkId, actorId, auth);
    reply = await createReply(postId, postTypeId, draftToHtml(draftText), memberToken, auth);
  } catch (error) {
    await releaseSendClaim(env.DB, draftId);
    throw error;
  }

  // The reply is public from here. Each follow-up step runs on its own, so
  // one failure does not skip the others.
  const signalId = found.signal.id;
  const spaceId = found.signal.metadata?.space_id ?? env.BETTERMODE_MARKETPLACE_SPACE_ID ?? null;
  const afterSend = async (step: string, run: () => Promise<void>) => {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await run();
        return;
      } catch (error) {
        console.error('reply sent but a follow-up step failed', {
          step,
          attempt,
          postId,
          replyId: reply.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  };
  // Moderation decides a few seconds after the post. Check then, and
  // release the reply if it was held.
  await afterSend('verify', () =>
    enqueue(
      env,
      { kind: 'reply.verify', replyId: reply.id, threadId: postId, draftId, actorId, spaceId },
      { delaySeconds: 15 },
    ),
  );
  // Records the reply ID and sender. If the verify message above was lost,
  // the sweep finds this row and verifies the reply again.
  await afterSend('mark-sent', () =>
    markSent(env.DB, draftId, draftText, reply.id ?? null, actorId, input.requestedBy ?? null),
  );
  await afterSend('thread-state', () =>
    patchSignal(env.DB, signalId, 'responded', {
      sent_reply_at: new Date().toISOString(),
      last_error: null,
    }),
  );
  // The thread is answered. Close any other draft so it cannot be sent too.
  await afterSend('expire-drafts', () => expireOpenDrafts(env.DB, signalId));

  return { replyId: reply.id ?? null };
}
