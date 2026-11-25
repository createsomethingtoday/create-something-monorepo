// Reads the event out of a Bettermode webhook.
//
// Bettermode wraps a content event in a `SUBSCRIPTION` envelope. The event
// (for example `post.published`) is in `data.name`, with `data.noun` and
// `data.verb` beside it. The top-level `type` is `SUBSCRIPTION` for every
// content event, so it does not tell post events apart from the rest.

export type WebhookEvent = {
  type?: string;
  entityId?: string;
  data?: {
    name?: string | null;
    noun?: string | null;
    verb?: string | null;
    object?: { id?: string; spaceId?: string } | null;
    target?: { id?: string; postId?: string; spaceId?: string } | null;
  };
};

// Lowercase event name, or null when the webhook carries none.
export function webhookEventName(webhook: WebhookEvent): string | null {
  if (webhook.type !== 'SUBSCRIPTION') {
    // A direct call (the guide's test request) puts the event in `type`.
    return webhook.type ? webhook.type.toLowerCase() : null;
  }
  const name = webhook.data?.name?.trim();
  if (name) return name.toLowerCase();
  const noun = webhook.data?.noun?.trim();
  const verb = webhook.data?.verb?.trim();
  return noun && verb ? `${noun}.${verb}`.toLowerCase() : null;
}

// True when the event means "a thread may have changed". The queue is
// level-triggered: the consumer reads the live thread, so every post or
// reply event is safe to enqueue, and a delete or hide closes the item.
export function isThreadEvent(webhook: WebhookEvent, marketplaceSpaceId?: string | null): boolean {
  const name = webhookEventName(webhook);
  if (name) return name.startsWith('post.') || name.startsWith('reply.');
  // A SUBSCRIPTION event with no readable name: accept it only when its
  // object is in the marketplace space. A wrong guess costs one thread read.
  const space = marketplaceSpaceId?.trim();
  return (
    webhook.type === 'SUBSCRIPTION' &&
    !!space &&
    !!webhook.data?.object?.id &&
    webhook.data.object.spaceId === space
  );
}

// The post or reply the event is about. `entityId` is the network for a
// SUBSCRIPTION event, so it counts only for a direct call.
export function webhookPostId(webhook: WebhookEvent): string | undefined {
  return (
    webhook.data?.object?.id ||
    webhook.data?.target?.postId ||
    (webhook.type === 'SUBSCRIPTION' ? undefined : webhook.entityId) ||
    undefined
  );
}
