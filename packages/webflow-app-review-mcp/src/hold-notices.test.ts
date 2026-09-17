import { describe, expect, it, vi } from 'vitest';

import type { AirtableClient, AppReviewVersion } from './airtable.js';
import {
  HOLD_REMINDER_INTERVAL_DAYS,
  createD1HoldNoticeStore,
  renderHoldNoticeMarkdown,
  renderHoldReminderMarkdown,
  sendPendingHoldReminders,
  type HoldNoticeRecord,
  type HoldNoticeStore,
} from './hold-notices.js';
import type { SlackClient } from './slack.js';
import type { ZendeskClient } from './zendesk.js';

function memoryHoldNotices(seed: Record<string, HoldNoticeRecord> = {}): HoldNoticeStore & { records: Map<string, HoldNoticeRecord> } {
  const records = new Map<string, HoldNoticeRecord>(Object.entries(seed));
  return {
    records,
    async get(versionId) {
      return records.get(versionId) ?? null;
    },
    async put(versionId, record) {
      records.set(versionId, record);
    },
    async list() {
      return [...records.entries()].map(([versionId, record]) => ({ versionId, ...record }));
    },
  };
}

function heldVersion(overrides: Partial<AppReviewVersion> = {}): AppReviewVersion {
  return {
    versionId: 'recV5',
    assetId: 'recAsset',
    versionNumber: 5,
    reviewStatus: '⏸️On Hold',
    holdReason: 'Pending Exception Decision',
    zendeskTicketId: '1178490',
    daysInCurrentStage: 29,
    ...overrides,
  };
}

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-09-16T21:00:00.000Z');

function deps(options: {
  versions?: Record<string, AppReviewVersion | null>;
  store: HoldNoticeStore;
}) {
  const zendesk = { addTicketComment: vi.fn().mockResolvedValue({ ticketId: '1178490', isPublic: true }) } as unknown as ZendeskClient;
  const slack = { postMessage: vi.fn().mockResolvedValue({ ts: '1.2', channel: 'C0BN54FQU84' }) } as unknown as SlackClient;
  const airtable = {
    getVersionById: vi.fn(async (id: string) => options.versions?.[id] ?? null),
    getAssetById: vi.fn().mockResolvedValue({ assetId: 'recAsset', appName: 'Awesome Popups' }),
  } as unknown as AirtableClient;
  return {
    zendesk,
    slack,
    airtable,
    store: options.store,
    exceptionChannelId: 'C0BN54FQU84',
    versionViewUrlBase: 'https://airtable.com/appMoIgXMTTTNIc3p/tblHxZ2hgSFLZxsZu/viwM48eXQT4Mxc4Ak/',
    now: () => NOW,
  };
}

describe('hold notices', () => {
  it('reminder interval is one week', () => {
    expect(HOLD_REMINDER_INTERVAL_DAYS).toBe(7);
  });

  it('renders a plain developer-facing notice with greeting, no-action line, and sign-off', () => {
    const md = renderHoldNoticeMarkdown({ appName: 'Awesome Popups', versionNumber: 5, creatorName: 'Flowout' });
    expect(md).toMatch(/^Hi Flowout,/);
    expect(md).toContain('Awesome Popups');
    expect(md).toContain('v5');
    expect(md).toContain('nothing you need to do');
    expect(md).toContain('already fixed');
    expect(md.trim()).toMatch(/The Webflow Marketplace Team$/);
    // No internal vocabulary leaks into the developer message.
    expect(md).not.toMatch(/exception|Airtable|blocker|⚖️/i);
  });

  it('renders a reminder that states how long the hold has lasted', () => {
    const md = renderHoldReminderMarkdown({ appName: 'Awesome Popups', versionNumber: 5, creatorName: null, daysOnHold: 14 });
    expect(md).toMatch(/^Hi there,/);
    expect(md).toContain('14 days');
    expect(md).toContain('nothing you need to do');
    expect(md).not.toMatch(/exception|Airtable|blocker|⚖️/i);
  });

  it('sends a reminder only for recorded notices older than the interval, and nudges the channel', async () => {
    const store = memoryHoldNotices({
      recV5: { ticketId: '1178490', noticeAt: new Date(NOW.getTime() - 8 * DAY).toISOString(), reminders: 0 },
      recFresh: { ticketId: '2', noticeAt: new Date(NOW.getTime() - 2 * DAY).toISOString(), reminders: 0 },
    });
    const d = deps({
      store,
      versions: {
        recV5: heldVersion(),
        recFresh: heldVersion({ versionId: 'recFresh', zendeskTicketId: '2', daysInCurrentStage: 2 }),
      },
    });

    const result = await sendPendingHoldReminders(d);

    expect(result.reminded).toEqual(['recV5']);
    expect(d.zendesk.addTicketComment).toHaveBeenCalledTimes(1);
    expect(d.zendesk.addTicketComment).toHaveBeenCalledWith('1178490', expect.objectContaining({ isPublic: true }));
    const html = (d.zendesk.addTicketComment as ReturnType<typeof vi.fn>).mock.calls[0]?.[1]?.htmlBody as string;
    expect(html).toContain('8 days');
    expect(d.slack.postMessage).toHaveBeenCalledTimes(1);
    const slackText = String((d.slack.postMessage as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]?.text);
    expect(slackText).toContain('Awesome Popups');
    expect(slackText).toContain('8 days');
    expect(store.records.get('recV5')).toMatchObject({ reminders: 1 });
    expect(store.records.get('recV5')?.lastReminderAt).toBe(NOW.toISOString());
  });

  it('paces repeat reminders by the interval since the last reminder', async () => {
    const store = memoryHoldNotices({
      recV5: {
        ticketId: '1178490',
        noticeAt: new Date(NOW.getTime() - 20 * DAY).toISOString(),
        reminders: 1,
        lastReminderAt: new Date(NOW.getTime() - 3 * DAY).toISOString(),
      },
    });
    const d = deps({ store, versions: { recV5: heldVersion() } });
    const result = await sendPendingHoldReminders(d);
    expect(result.reminded).toEqual([]);
    expect(d.zendesk.addTicketComment).not.toHaveBeenCalled();
  });

  it('closes out notices whose version left the hold, without emailing', async () => {
    const store = memoryHoldNotices({
      recV5: { ticketId: '1178490', noticeAt: new Date(NOW.getTime() - 10 * DAY).toISOString(), reminders: 0 },
      recGone: { ticketId: '3', noticeAt: new Date(NOW.getTime() - 10 * DAY).toISOString(), reminders: 0 },
    });
    const d = deps({
      store,
      versions: {
        recV5: heldVersion({ reviewStatus: '🆕Ready for Review', holdReason: undefined }),
        recGone: null,
      },
    });
    const result = await sendPendingHoldReminders(d);
    expect(result.reminded).toEqual([]);
    expect(result.closed.sort()).toEqual(['recGone', 'recV5']);
    expect(d.zendesk.addTicketComment).not.toHaveBeenCalled();
    expect(store.records.get('recV5')?.closedAt).toBe(NOW.toISOString());
  });

  it('never reminds a held version that has no recorded notice (legacy holds stay manual)', async () => {
    const store = memoryHoldNotices({});
    const d = deps({ store, versions: { recV5: heldVersion() } });
    const result = await sendPendingHoldReminders(d);
    expect(result.reminded).toEqual([]);
    expect(d.zendesk.addTicketComment).not.toHaveBeenCalled();
  });

  it('round-trips records through the D1-shaped store', async () => {
    const rows = new Map<string, string>();
    const db = {
      prepare(query: string) {
        const run = async () => undefined;
        return {
          bind(...values: unknown[]) {
            return {
              async first<T>() {
                if (query.startsWith('SELECT value')) {
                  const value = rows.get(String(values[0]));
                  return (value ? { value } : null) as T | null;
                }
                return null as T | null;
              },
              async run() {
                if (query.startsWith('INSERT')) rows.set(String(values[0]), String(values[1]));
                return undefined;
              },
            };
          },
          async all<T>() {
            if (query.startsWith('SELECT key, value')) {
              return { results: [...rows.entries()].filter(([k]) => k.startsWith('hold-notice:')).map(([key, value]) => ({ key, value })) as T[] };
            }
            return { results: [] as T[] };
          },
          run,
        };
      },
    };
    const store = createD1HoldNoticeStore(db);
    await store.put('recV5', { ticketId: '1178490', noticeAt: '2026-09-16T00:00:00.000Z', reminders: 0 });
    expect(await store.get('recV5')).toMatchObject({ ticketId: '1178490', reminders: 0 });
    expect(await store.get('recNope')).toBeNull();
    const listed = await store.list();
    expect(listed).toEqual([{ versionId: 'recV5', ticketId: '1178490', noticeAt: '2026-09-16T00:00:00.000Z', reminders: 0 }]);
  });
});
