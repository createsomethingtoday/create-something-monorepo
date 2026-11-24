/**
 * Review-ticket CC for the creator's Webflow account email (CRE-2567).
 *
 * All review email goes to the requester of the Zendesk review ticket: the
 * "Review contact email" from the submission form. A developer who entered an
 * inbox there that they do not read gets no review feedback. This module adds
 * the creator's Webflow account email to the ticket as a CC when it is a
 * different address, so the later public comments (changes requested,
 * rejection, approval) reach both.
 *
 * It runs when the Zap writes 🧘ZD ID to an app version. The Zap posts the
 * first "thank you" comment before it writes the ID, so the CC address does
 * not get that first email.
 *
 * The ticket update has no comment. Zendesk sends no email for it.
 */

import type { AirtableClient } from './airtable.js';
import type { ZendeskClient } from './zendesk.js';

/** One review ticket seldom needs more; a higher count points at bad creator data. */
const MAX_ACCOUNT_CCS = 3;

const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * The Webflow account emails to add as CC: valid, different from the requester,
 * not already on the ticket, and with no duplicates. Order is kept.
 */
export function resolveAccountCcEmails(input: {
  requesterEmail: string;
  existingCcEmails: readonly string[];
  wfAccountEmails: readonly string[];
}): string[] {
  const taken = new Set([input.requesterEmail, ...input.existingCcEmails].map(normalizeEmail));
  const result: string[] = [];
  for (const raw of input.wfAccountEmails) {
    const email = normalizeEmail(raw);
    if (!EMAIL_PATTERN.test(email) || taken.has(email)) continue;
    taken.add(email);
    result.push(email);
  }
  return result.slice(0, MAX_ACCOUNT_CCS);
}

export type TicketAccountCcSkipReason =
  | 'version-not-found'
  | 'not-an-app'
  | 'no-ticket'
  | 'no-account-email'
  | 'ticket-out-of-scope'
  | 'ticket-closed'
  | 'no-requester'
  | 'nothing-to-add';

export type TicketAccountCcOutcome =
  | { status: 'added'; ticketId: string; emails: string[]; auditId?: number }
  | { status: 'skipped'; reason: TicketAccountCcSkipReason; ticketId?: string };

export interface TicketAccountCcDeps {
  airtable: Pick<AirtableClient, 'getVersionTicketCcContext'>;
  zendesk: Pick<ZendeskClient, 'getTicketSummary' | 'addTicketEmailCcs' | 'marketplaceGroupId'>;
}

/** Wraps the one write; the webhook processor passes its retry checkpoint here. */
export type WriteRunner = <T>(operation: () => Promise<T>) => Promise<T>;

const runDirect: WriteRunner = (operation) => operation();

/**
 * Make sure the version's review ticket has the creator's Webflow account email
 * as a CC. The reads run again on every call, so a second call for the same
 * ticket finds the CC and adds nothing.
 */
export async function ensureTicketAccountCc(
  deps: TicketAccountCcDeps,
  versionId: string,
  runWrite: WriteRunner = runDirect,
): Promise<TicketAccountCcOutcome> {
  const ctx = await deps.airtable.getVersionTicketCcContext(versionId);
  if (!ctx) return { status: 'skipped', reason: 'version-not-found' };
  if (!ctx.isApp) return { status: 'skipped', reason: 'not-an-app' };

  const ticketId = ctx.zendeskTicketId?.trim();
  if (!ticketId || !/^\d+$/.test(ticketId)) return { status: 'skipped', reason: 'no-ticket' };
  if (ctx.wfAccountEmails.length === 0) return { status: 'skipped', reason: 'no-account-email', ticketId };

  const ticket = await deps.zendesk.getTicketSummary(ticketId);
  if (ticket.groupId !== deps.zendesk.marketplaceGroupId) {
    return { status: 'skipped', reason: 'ticket-out-of-scope', ticketId };
  }
  if (ticket.status === 'closed') return { status: 'skipped', reason: 'ticket-closed', ticketId };
  if (!ticket.requesterEmail) return { status: 'skipped', reason: 'no-requester', ticketId };

  const emails = resolveAccountCcEmails({
    requesterEmail: ticket.requesterEmail,
    existingCcEmails: ticket.emailCcEmails,
    wfAccountEmails: ctx.wfAccountEmails,
  });
  if (emails.length === 0) return { status: 'skipped', reason: 'nothing-to-add', ticketId };

  // The runner may persist the step result for a retry: return the audit id only, not the addresses.
  const auditId = await runWrite(async () => (await deps.zendesk.addTicketEmailCcs(ticketId, emails)).auditId ?? null);
  return { status: 'added', ticketId, emails, ...(auditId === null ? {} : { auditId }) };
}
