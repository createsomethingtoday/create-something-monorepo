import { Data, Effect, Either } from 'effect';
import type { ContactInput } from '@create-something/canon/validation';

export const CONTACT_SAVED_MESSAGE = 'Your inquiry is saved, but email confirmation is not complete. Please do not submit it again.';
export const CONTACT_UNKNOWN_MESSAGE = 'We could not confirm receipt. Please keep this request open and do not start a new submission.';
export const CONTACT_SUCCESS_MESSAGE = 'Message sent successfully! You should receive a confirmation email shortly.';
export type EmailKind = 'confirmation' | 'notification';
export type EmailOutcome =
  | { state: 'accepted'; providerId: string }
  | { state: 'permanent_failure' | 'transient_failure' | 'unknown'; cause?: unknown };
export type EmailReceipt = { kind: EmailKind; state: 'pending' | 'sending' | EmailOutcome['state']; provider_id: string | null };
export type ContactReceipt = { payload_sha256: string; emails: EmailReceipt[] };
export class ContactDatabaseError extends Data.TaggedError('ContactDatabaseError')<{
  operation: string; cause: unknown;
}> {}
export class ContactEmailError extends Data.TaggedError('ContactEmailError')<{ cause: unknown }> {}
export interface ContactRepository {
  read(id: string): Promise<ContactReceipt | null>;
  create(id: string, hash: string, owner: string, input: ContactInput): Promise<void>;
  claim(id: string, kind: EmailKind, owner: string): Promise<boolean>;
  record(id: string, kind: EmailKind, outcome: EmailOutcome): Promise<void>;
}
export interface ContactMailer {
  send(kind: EmailKind, requestId: string, signal: AbortSignal): Promise<EmailOutcome>;
}
export type ContactResult = {
  status: number; success: boolean; message: string; requestId: string;
  receipt: 'saved' | 'unknown' | 'conflict';
  secondary: 'not_attempted' | 'completed' | 'failed';
};
const database = <A>(operation: string, run: () => Promise<A>) => Effect.tryPromise({
  try: run, catch: (cause) => new ContactDatabaseError({ operation, cause })
}).pipe(Effect.timeoutFail({
  duration: '5 seconds',
  onTimeout: () => new ContactDatabaseError({ operation, cause: new Error('Database acknowledgement timed out') })
}));

export async function contactPayloadHash(input: ContactInput): Promise<string> {
  // Stable ordering; defaults are canonicalized at the route boundary.
  const canonical = JSON.stringify(Object.fromEntries(Object.entries(input)
    .filter(([, value]) => value !== undefined).sort(([a], [b]) => a.localeCompare(b))));
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function contactIntake(input: ContactInput, requestId: string, repository: ContactRepository,
  mailer: ContactMailer, secondary: () => Promise<void> = async () => {}) {
  return Effect.gen(function* () {
    const hash = yield* Effect.promise(() => contactPayloadHash(input));
    const owner = crypto.randomUUID();
    let secondaryState: ContactResult['secondary'] = 'not_attempted';
    const result = (receipt: ContactReceipt | null): ContactResult => {
      if (!receipt) return { status: 503, success: false, message: CONTACT_UNKNOWN_MESSAGE, requestId, receipt: 'unknown', secondary: secondaryState };
      if (receipt.payload_sha256 !== hash) return { status: 409, success: false, message: 'This request ID belongs to a different inquiry. Keep the original request open for reconciliation.', requestId, receipt: 'conflict', secondary: secondaryState };
      const accepted = (['confirmation', 'notification'] as const).every(kind =>
        receipt.emails.some(email => email.kind === kind && email.state === 'accepted' && Boolean(email.provider_id)));
      return { status: accepted ? 200 : 202, success: accepted, message: accepted ? CONTACT_SUCCESS_MESSAGE : CONTACT_SAVED_MESSAGE, requestId, receipt: 'saved', secondary: secondaryState };
    };
    const read = () => database('read', () => repository.read(requestId));
    const existing = yield* Effect.either(read());
    if (Either.isLeft(existing)) return result(null); // No write when preflight is unavailable.
    if (existing.right) return result(existing.right); // Reconciliation only, never takeover.
    const created = yield* Effect.either(database('create', () => repository.create(requestId, hash, owner, input)));
    if (Either.isLeft(created)) {
      // Even a successful readback does not authorize dispatch after an uncertain write.
      const reconciled = yield* Effect.either(read());
      return result(Either.isRight(reconciled) ? reconciled.right : null);
    }
    for (const kind of ['confirmation', 'notification'] as const) {
      const claim = yield* Effect.either(database('claim', () => repository.claim(requestId, kind, owner)));
      if (Either.isLeft(claim) || !claim.right) continue;
      const sent = yield* Effect.either(Effect.tryPromise({
        try: (signal) => mailer.send(kind, requestId, signal),
        catch: cause => new ContactEmailError({ cause })
      }));
      const outcome: EmailOutcome = Either.isRight(sent) ? sent.right : { state: 'unknown', cause: sent.left };
      // Never retry sends or receipt writes. A lost acknowledgement leaves sending/unknown.
      yield* Effect.either(database('record', () => repository.record(requestId, kind, outcome)));
    }
    const followup = yield* Effect.either(database('secondary', secondary));
    secondaryState = Either.isRight(followup) ? 'completed' : 'failed';
    const receipt = yield* Effect.either(read());
    // The atomic create was acknowledged, so unavailable final readback still means saved.
    return result(Either.isRight(receipt) && receipt.right ? receipt.right : { payload_sha256: hash, emails: [] });
  });
}

export function createD1ContactRepository(db: D1Database): ContactRepository {
  const primary = () => db.withSession('first-primary');
  return {
    async read(id) {
      const session = primary();
      const receipt = await session.prepare('SELECT payload_sha256 FROM contact_request_receipts WHERE request_id = ?').bind(id).first<{ payload_sha256: string }>();
      if (!receipt) return null;
      const emails = await session.prepare('SELECT kind, state, provider_id FROM contact_email_receipts WHERE request_id = ?').bind(id).all<EmailReceipt>();
      if (!emails.success) throw new Error('Contact receipt read failed');
      return { ...receipt, emails: emails.results };
    },
    async create(id, hash, owner, input) {
      const session = primary();
      const submissionId = crypto.randomUUID();
      const results = await session.batch([
        session.prepare('INSERT INTO contact_request_receipts (request_id, payload_sha256, submission_id, owner_token) VALUES (?, ?, ?, ?)').bind(id, hash, submissionId, owner),
        session.prepare(`INSERT INTO contact_submissions (id, name, email, message, service, company, assessment_id, submitted_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`).bind(submissionId, input.name, input.email, input.message, input.service || null, input.company || null, input.assessment_id || null),
        ...(['confirmation', 'notification'] as const).map(kind => session.prepare('INSERT INTO contact_email_receipts (request_id, kind) VALUES (?, ?)').bind(id, kind))
      ]);
      if (results.some(result => !result.success)) throw new Error('Contact batch not acknowledged');
    },
    async claim(id, kind, owner) {
      const result = await primary().prepare(`UPDATE contact_email_receipts SET state = 'sending', updated_at = CURRENT_TIMESTAMP
        WHERE request_id = ? AND kind = ? AND state = 'pending'
        AND EXISTS (SELECT 1 FROM contact_request_receipts WHERE request_id = ? AND owner_token = ?)`)
        .bind(id, kind, id, owner).run();
      if (!result.success) throw new Error('Contact claim not acknowledged');
      return result.meta.changes === 1;
    },
    async record(id, kind, outcome) {
      const result = await primary().prepare(`UPDATE contact_email_receipts SET state = ?, provider_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE request_id = ? AND kind = ? AND state = 'sending'`)
        .bind(outcome.state, outcome.state === 'accepted' ? outcome.providerId : null, id, kind).run();
      if (!result.success || result.meta.changes !== 1) throw new Error('Contact receipt not acknowledged');
    }
  };
}

export function createResendContactMailer(apiKey: string, bodies: Record<EmailKind, unknown>, send: typeof fetch = fetch): ContactMailer {
  return { async send(kind, requestId, signal) {
    try {
      // This abort bounds fetch AND response-body decoding. No provider call is retried.
      const response = await send('https://api.resend.com/emails', {
        method: 'POST', signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `contact/${requestId}/${kind}` },
        body: JSON.stringify(bodies[kind])
      });
      if (response.ok) {
        const body: unknown = await response.json();
        if (body && typeof body === 'object' && 'id' in body && typeof body.id === 'string' && body.id.trim()) return { state: 'accepted', providerId: body.id };
        return { state: 'unknown' };
      }
      if (response.status === 429) return { state: 'transient_failure' };
      // Timeouts, conflicts and 5xx cannot prove non-acceptance.
      if ([400, 401, 403, 404, 422].includes(response.status)) return { state: 'permanent_failure' };
      return { state: 'unknown' };
    } catch (cause) { return { state: 'unknown', cause }; }
  } };
}
