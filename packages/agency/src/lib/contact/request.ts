// Browser-only Promise boundary. Effect stays in lib/server.
export const CONTACT_TRANSPORT_MESSAGE = 'We could not confirm receipt. Please keep this request open and do not start a new submission.';
type ContactReply = { success: boolean; message: string; requestId?: string };
export function createContactRequest(storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>) {
  const key = 'agency.contact.pending-request';
  let id: string | undefined;
  let body: string | undefined;
  try { id = storage?.getItem(key) || undefined; } catch { /* Storage can be disabled. */ }
  return async (payload: object, send: typeof fetch = fetch): Promise<ContactReply> => {
    id ??= crypto.randomUUID();
    body ??= JSON.stringify(payload); // Freeze attribution and fields across transport retries.
    try { storage?.setItem(key, id); } catch { /* In-memory ID remains stable. */ }
    try {
      const response = await send('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': id }, body
      });
      const result: unknown = await response.json();
      if (!result || typeof result !== 'object' || !('success' in result) || !('message' in result) ||
        typeof result.success !== 'boolean' || typeof result.message !== 'string') throw new Error('Invalid contact response');
      const success = response.ok && result.success;
      const requestId = id;
      // Only confirmed success permits a fresh logical submission. A validation
      // rejection may follow a lost response and reload of an already saved ID.
      if (success) {
        id = undefined; body = undefined;
        try { storage?.removeItem(key); } catch { /* No sensitive payload is persisted. */ }
      }
      if (response.status === 400) body = undefined; // Allow corrections under the same ID.
      return { success, message: result.message, requestId };
    } catch { return { success: false, message: CONTACT_TRANSPORT_MESSAGE, requestId: id }; }
  };
}
