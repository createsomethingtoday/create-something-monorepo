import { describe, expect, it, vi } from 'vitest';

import type { VersionTicketCcContext } from './airtable.js';
import {
  ensureTicketAccountCc,
  resolveAccountCcEmails,
  type TicketAccountCcDeps,
} from './ticket-account-cc.js';
import { DEFAULT_MARKETPLACE_GROUP_ID, type TicketSummary } from './zendesk.js';

const MARKETPLACE_GROUP = DEFAULT_MARKETPLACE_GROUP_ID;

function context(overrides: Partial<VersionTicketCcContext> = {}): VersionTicketCcContext {
  return {
    versionId: 'recVersion1',
    assetId: 'recAsset1',
    isApp: true,
    zendeskTicketId: '1000001',
    wfAccountEmails: ['account@acme.example'],
    ...overrides,
  };
}

function ticket(overrides: Partial<TicketSummary> = {}): TicketSummary {
  return {
    ticketId: '1000001',
    status: 'hold',
    groupId: MARKETPLACE_GROUP,
    brandId: null,
    tags: [],
    externalId: null,
    requesterId: 1,
    requesterEmail: 'support@acme.example',
    emailCcEmails: [],
    ...overrides,
  };
}

function deps(ctx: VersionTicketCcContext | null, summary: TicketSummary = ticket()) {
  const getVersionTicketCcContext = vi.fn(async () => ctx);
  const getTicketSummary = vi.fn(async () => summary);
  const addTicketEmailCcs = vi.fn(async (ticketId: string, emails: readonly string[]) => ({
    ticketId,
    emails: [...emails],
    auditId: 9001,
  }));
  const value: TicketAccountCcDeps = {
    airtable: { getVersionTicketCcContext },
    zendesk: { getTicketSummary, addTicketEmailCcs, marketplaceGroupId: MARKETPLACE_GROUP },
  };
  return { value, getVersionTicketCcContext, getTicketSummary, addTicketEmailCcs };
}

describe('resolveAccountCcEmails', () => {
  it('returns the account email when it is not the requester', () => {
    expect(
      resolveAccountCcEmails({
        requesterEmail: 'support@acme.example',
        existingCcEmails: [],
        wfAccountEmails: ['account@acme.example'],
      }),
    ).toEqual(['account@acme.example']);
  });

  it('ignores case and spaces when it compares with the requester', () => {
    expect(
      resolveAccountCcEmails({
        requesterEmail: 'Dev@Acme.example',
        existingCcEmails: [],
        wfAccountEmails: [' dev@acme.EXAMPLE '],
      }),
    ).toEqual([]);
  });

  it('drops addresses that are already CCs, not valid, or repeated', () => {
    expect(
      resolveAccountCcEmails({
        requesterEmail: 'support@acme.example',
        existingCcEmails: ['Already@acme.example'],
        wfAccountEmails: ['already@acme.example', 'N/A', 'new@acme.example', 'NEW@acme.example'],
      }),
    ).toEqual(['new@acme.example']);
  });

  it('adds no more than three addresses', () => {
    const many = ['a@x.example', 'b@x.example', 'c@x.example', 'd@x.example'];
    expect(
      resolveAccountCcEmails({ requesterEmail: 'r@x.example', existingCcEmails: [], wfAccountEmails: many }),
    ).toEqual(many.slice(0, 3));
  });
});

describe('ensureTicketAccountCc', () => {
  it('adds the Webflow account email as a CC when it is not the requester', async () => {
    const d = deps(context());

    const outcome = await ensureTicketAccountCc(d.value, 'recVersion1');

    expect(outcome).toEqual({ status: 'added', ticketId: '1000001', emails: ['account@acme.example'], auditId: 9001 });
    expect(d.addTicketEmailCcs).toHaveBeenCalledWith('1000001', ['account@acme.example']);
  });

  it('adds nothing when the account email is the requester', async () => {
    const d = deps(context(), ticket({ requesterEmail: 'account@acme.example' }));

    const outcome = await ensureTicketAccountCc(d.value, 'recVersion1');

    expect(outcome).toEqual({ status: 'skipped', reason: 'nothing-to-add', ticketId: '1000001' });
    expect(d.addTicketEmailCcs).not.toHaveBeenCalled();
  });

  it('adds nothing on a second run, because the CC is on the ticket', async () => {
    const d = deps(context(), ticket({ emailCcEmails: ['account@acme.example'] }));

    const outcome = await ensureTicketAccountCc(d.value, 'recVersion1');

    expect(outcome).toMatchObject({ status: 'skipped', reason: 'nothing-to-add' });
    expect(d.addTicketEmailCcs).not.toHaveBeenCalled();
  });

  it('does not read Zendesk for a template or library version', async () => {
    const d = deps(context({ isApp: false }));

    const outcome = await ensureTicketAccountCc(d.value, 'recVersion1');

    expect(outcome).toEqual({ status: 'skipped', reason: 'not-an-app' });
    expect(d.getTicketSummary).not.toHaveBeenCalled();
  });

  it.each([
    ['version-not-found', null, ticket()],
    ['no-ticket', context({ zendeskTicketId: null }), ticket()],
    ['no-ticket', context({ zendeskTicketId: 'abc' }), ticket()],
    ['no-account-email', context({ wfAccountEmails: [] }), ticket()],
    ['ticket-out-of-scope', context(), ticket({ groupId: MARKETPLACE_GROUP + 1 })],
    ['ticket-closed', context(), ticket({ status: 'closed' })],
    ['no-requester', context(), ticket({ requesterEmail: null })],
  ] as const)('skips with %s', async (reason, ctx, summary) => {
    const d = deps(ctx, summary);

    const outcome = await ensureTicketAccountCc(d.value, 'recVersion1');

    expect(outcome).toMatchObject({ status: 'skipped', reason });
    expect(d.addTicketEmailCcs).not.toHaveBeenCalled();
  });

  it('passes only the write to the runner and stores no address in its result', async () => {
    const d = deps(context());
    const stored: unknown[] = [];

    await ensureTicketAccountCc(d.value, 'recVersion1', async (operation) => {
      const value = await operation();
      stored.push(value);
      return value;
    });

    expect(stored).toEqual([9001]);
  });
});
