import {
  ELIGIBLE_SUBSCRIBERS_SQL,
  classifySubscriberEligibility,
  type NewsletterAudienceRecord
} from '@create-something/canon/newsletter/audience';

// Receipt attachment and subsequent reconciliation must recognize the same provider states.
const PROVIDER_RECEIPT_STATES = [
  'sent',
  'delivered',
  'delivery_delayed',
  'bounced',
  'complained',
  'suppressed',
  'failed',
  'opened',
  'clicked',
  'canceled',
  'queued',
  'scheduled'
];

interface WorkflowStatement {
  bind(...values: unknown[]): WorkflowStatement;
  run(): Promise<{ success: boolean; meta?: { changes?: number } }>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ success: boolean; results: T[] }>;
}
export interface WorkflowDatabase {
  prepare(sql: string): WorkflowStatement;
}
function checkedDatabase(db: WorkflowDatabase): WorkflowDatabase {
  return {
    prepare(sql) {
      const wrap = (statement: WorkflowStatement): WorkflowStatement => ({
        bind(...values) {
          return wrap(statement.bind(...values));
        },
        async run() {
          const result = await statement.run();
          if (!result.success)
            throw new Error('Newsletter state write failed; reconcile before retry');
          return result;
        },
        first<T>() {
          return statement.first<T>();
        },
        async all<T>() {
          const result = await statement.all<T>();
          if (!result.success) throw new Error('Newsletter state read unavailable');
          return result;
        }
      });
      return wrap(db.prepare(sql));
    }
  };
}
export interface Edition {
  slug: string;
  title: string;
  subject: string;
  owner: string;
  author: string;
  source_refs: string;
  html: string;
  text: string;
  content_hash: string | null;
  editorial_status: string;
  web_status: string;
  web_url: string | null;
  send_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  approved_hash: string | null;
  audience_fingerprint: string | null;
  audience_count: number;
  audience_snapshot: string;
  seed_email_id: string | null;
  seed_status: string | null;
  seed_hash: string | null;
  email_status: string;
  updated_at: string;
}
interface Recipient {
  id: number;
  email: string;
  source: string;
  unsubscribe_token: string;
  consent_confirmed_at: string;
}
interface Delivery {
  id: string;
  edition_slug: string;
  content_hash: string;
  kind: string;
  status: string;
  resend_email_id: string | null;
  subject: string;
  recipient_hash: string | null;
  subscriber_key: string;
  error_code: string | null;
}
interface Actor {
  email: string;
  id: string;
}
interface DeliveryOptions {
  apiKey?: string;
  fetcher?: typeof fetch;
  now?: Date;
}
const allowedSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function requireValue(value: unknown, name: string, max = 1000): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw new Error(`Valid ${name} is required`);
  return value.trim();
}
export async function newsletterHash(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}
async function readEdition(db: WorkflowDatabase, slug: string): Promise<Edition> {
  const e = await db
    .prepare('SELECT * FROM newsletter_editions WHERE slug = ?')
    .bind(slug)
    .first<Edition>();
  if (!e) throw new Error('Edition not found');
  return e;
}
async function audience(db: WorkflowDatabase) {
  const result = await db.prepare(ELIGIBLE_SUBSCRIBERS_SQL).all<Recipient>();
  if (!result.success) throw new Error('Audience unavailable');
  return {
    recipients: result.results,
    fingerprint: await newsletterHash(
      JSON.stringify(
        result.results.map((r) => [r.id, r.email, r.unsubscribe_token, r.consent_confirmed_at])
      )
    )
  };
}
async function event(
  db: WorkflowDatabase,
  slug: string,
  action: string,
  actor: Actor,
  hash: string | null,
  details: Record<string, unknown> = {}
) {
  await db
    .prepare(
      'INSERT INTO newsletter_edition_events(edition_slug,action,actor,content_hash,details) VALUES(?,?,?,?,?)'
    )
    .bind(slug, action, actor.email, hash, JSON.stringify(details))
    .run();
}
export async function readNewsletterWorkflow(db: WorkflowDatabase) {
  db = checkedDatabase(db);
  const editions = (
    await db.prepare('SELECT * FROM newsletter_editions ORDER BY slug DESC').all<Edition>()
  ).results;
  const subscribers = (
    await db
      .prepare(
        'SELECT confirmed_at,consent_confirmed_at,consent_method,consent_evidence,audience_classification,unsubscribed_at,active,status FROM newsletter_subscribers'
      )
      .all<NewsletterAudienceRecord>()
  ).results;
  const counts = {
    eligible: 0,
    unconfirmed: 0,
    consent_unproved: 0,
    audience_unreviewed: 0,
    suppressed: 0
  };
  for (const record of subscribers) counts[classifySubscriberEligibility(record)]++;
  const deliveries = (
    await db
      .prepare(
        'SELECT id,edition_slug,content_hash,kind,status,resend_email_id,subject FROM newsletter_edition_deliveries ORDER BY created_at'
      )
      .all<Delivery>()
  ).results;
  return {
    observed_at: new Date().toISOString(),
    audience: { ...counts, fingerprint: (await audience(db)).fingerprint },
    editions: editions.map((e) => {
      const blockers: string[] = [];
      if (!e.content_hash) blockers.push('Prepare the current content');
      if (e.editorial_status === 'draft') blockers.push('Complete editorial review');
      if (e.seed_status !== 'delivered' || e.seed_hash !== e.content_hash)
        blockers.push('Verify delivery of the current operator test');
      if (!counts.eligible) blockers.push('No consent-qualified audience');
      if (e.email_status === 'uncertain')
        blockers.push('Reconcile the uncertain provider write before any retry');
      if (!e.approved_by && e.email_status !== 'historical')
        blockers.push('Approve exact content, audience and time');
      if (e.email_status === 'historical') blockers.length = 0;
      return {
        ...e,
        source_refs: JSON.parse(e.source_refs) as string[],
        deliveries: deliveries
          .filter((d) => d.edition_slug === e.slug)
          .map(({ id, kind, status, resend_email_id }) => ({ id, kind, status, resend_email_id })),
        blockers,
        next_action:
          e.email_status === 'historical'
            ? 'Review historical delivery evidence'
            : e.email_status === 'sent'
              ? 'Review delivery and reader outcomes'
              : (blockers[0] ?? 'Send at the approved time')
      };
    })
  };
}
async function recordProviderDelivery(
  db: WorkflowDatabase,
  e: Edition,
  recipient: { key: string; email: string; token?: string },
  kind: 'seed' | 'audience',
  options: DeliveryOptions
) {
  if (!options.apiKey) throw new Error('Email delivery is unavailable');
  const id = await newsletterHash(`${e.slug}:${e.content_hash}:${kind}:${recipient.key}`);
  const prior = await db
    .prepare('SELECT * FROM newsletter_edition_deliveries WHERE id = ?')
    .bind(id)
    .first<Delivery>();
  if (prior) {
    if (prior.status === 'uncertain' || prior.status === 'sending')
      throw new Error('Uncertain delivery requires provider reconciliation; do not retry');
    if (
      kind === 'seed' &&
      prior.status === 'failed' &&
      !prior.resend_email_id &&
      /^provider-\d{3}$/.test(prior.error_code ?? '')
    ) {
      const reset = await db
        .prepare(
          "UPDATE newsletter_edition_deliveries SET status='ready' WHERE id=? AND status='failed' AND resend_email_id IS NULL AND error_code=?"
        )
        .bind(prior.id, prior.error_code)
        .run();
      if (!reset.meta?.changes) throw new Error('Seed changed; reload before retry');
      prior.status = 'ready';
    }
    if (prior.status !== 'ready') return prior;
  }
  const subject = kind === 'seed' ? `[TEST] ${e.subject}` : e.subject;
  const reserved = prior
    ? await db
        .prepare(
          "UPDATE newsletter_edition_deliveries SET status='sending',error_code=NULL WHERE id=? AND status='ready'"
        )
        .bind(id)
        .run()
    : await db
        .prepare(
          "INSERT OR IGNORE INTO newsletter_edition_deliveries(id,edition_slug,content_hash,subscriber_key,kind,status,subject,recipient_hash) VALUES(?,?,?,?,?,'sending',?,?)"
        )
        .bind(
          id,
          e.slug,
          e.content_hash,
          recipient.key,
          kind,
          subject,
          await newsletterHash(recipient.email.toLowerCase())
        )
        .run();
  if (!reserved.meta?.changes)
    throw new Error('Delivery already reserved; reconcile before continuing');
  const unsubscribe =
    kind === 'seed'
      ? 'https://createsomething.io/unsubscribe?preview=operator-seed'
      : `https://createsomething.io/unsubscribe?token=${encodeURIComponent(recipient.token!)}`;
  try {
    const response = await (options.fetcher ?? fetch)('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `newsletter-${id}`
      },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        from: 'CREATE SOMETHING <hello@createsomething.io>',
        reply_to: 'micah@createsomething.io',
        to: recipient.email,
        subject,
        html: e.html.replaceAll('{{unsubscribe_url}}', unsubscribe.replaceAll('&', '&amp;')),
        text: e.text.replaceAll('{{unsubscribe_url}}', unsubscribe),
        headers: { 'List-Unsubscribe': `<${unsubscribe}>` }
      })
    });
    if (!response.ok) {
      await db
        .prepare(
          'UPDATE newsletter_edition_deliveries SET status = ?, error_code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        )
        .bind(
          response.status >= 500 || response.status === 408 || response.status === 409
            ? 'uncertain'
            : 'failed',
          `provider-${response.status}`,
          id
        )
        .run();
      return {
        id,
        status:
          response.status >= 500 || response.status === 408 || response.status === 409
            ? 'uncertain'
            : 'failed',
        resend_email_id: null
      };
    }
    const result = (await response.json()) as { id?: unknown };
    if (typeof result.id !== 'string' || !result.id) throw new Error('Missing provider receipt');
    await db
      .prepare(
        "UPDATE newsletter_edition_deliveries SET status='sent',resend_email_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?"
      )
      .bind(result.id, id)
      .run();
    return { id, status: 'sent', resend_email_id: result.id };
  } catch {
    await db
      .prepare(
        "UPDATE newsletter_edition_deliveries SET status='uncertain',error_code='unknown-provider-outcome',updated_at=CURRENT_TIMESTAMP WHERE id=?"
      )
      .bind(id)
      .run();
    return { id, status: 'uncertain', resend_email_id: null };
  }
}
export async function handleNewsletterAction(
  db: WorkflowDatabase,
  input: Record<string, unknown>,
  actor: Actor,
  options: DeliveryOptions = {}
) {
  db = checkedDatabase(db);
  const action = requireValue(input.action, 'action', 30);
  const now = options.now ?? new Date();
  let auditDetails: Record<string, unknown> = {};
  if (action === 'prepare') {
    const data = input.edition as Record<string, unknown> | undefined;
    if (!data || typeof data !== 'object') throw new Error('Edition is required');
    const slug = requireValue(data.slug, 'slug', 150);
    if (!allowedSlug.test(slug)) throw new Error('Invalid slug');
    const title = requireValue(data.title, 'title', 200),
      subject = requireValue(data.subject, 'subject', 200),
      owner = requireValue(data.owner, 'owner', 200),
      author = requireValue(data.author, 'author', 200);
    const html = requireValue(data.html, 'HTML', 200000),
      text = requireValue(data.text, 'plain text', 100000);
    if (!html.includes('{{unsubscribe_url}}') || !text.includes('{{unsubscribe_url}}'))
      throw new Error('Both email parts require {{unsubscribe_url}}');
    if (/\{\{(?!unsubscribe_url\}\})/.test(html + text))
      throw new Error('Unknown email placeholder');
    if (
      !Array.isArray(data.source_refs) ||
      !data.source_refs.length ||
      data.source_refs.length > 30 ||
      data.source_refs.some((v) => typeof v !== 'string' || v.length > 1000)
    )
      throw new Error('Evidence source references are required');
    const refs = JSON.stringify(data.source_refs);
    const hash = await newsletterHash(
      JSON.stringify({ title, subject, owner, author, refs, html, text })
    );
    const existing = await db
      .prepare('SELECT * FROM newsletter_editions WHERE slug=?')
      .bind(slug)
      .first<Edition>();
    if (
      existing?.email_status === 'historical' ||
      existing?.email_status === 'sent' ||
      existing?.email_status === 'sending' ||
      existing?.email_status === 'uncertain'
    )
      throw new Error('Preserve delivered or unresolved edition; create a new edition revision');
    if (existing?.content_hash === hash) return readNewsletterWorkflow(db);
    const priorAudience = await db
      .prepare(
        "SELECT id FROM newsletter_edition_deliveries WHERE edition_slug=? AND kind='audience' LIMIT 1"
      )
      .bind(slug)
      .first();
    if (priorAudience)
      throw new Error('Preserve an edition with audience delivery attempts; create a new edition');
    const prepared = await db
      .prepare(
        `INSERT INTO newsletter_editions(slug,title,subject,owner,author,source_refs,html,text,content_hash) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET title=excluded.title,subject=excluded.subject,owner=excluded.owner,author=excluded.author,source_refs=excluded.source_refs,html=excluded.html,text=excluded.text,content_hash=excluded.content_hash,editorial_status='draft',approved_by=NULL,approved_at=NULL,approved_hash=NULL,audience_fingerprint=NULL,audience_count=0,send_at=NULL,seed_email_id=NULL,seed_status=NULL,seed_hash=NULL,email_status='not-sent',updated_at=CURRENT_TIMESTAMP WHERE newsletter_editions.email_status='not-sent' AND newsletter_editions.content_hash IS ?`
      )
      .bind(
        slug,
        title,
        subject,
        owner,
        author,
        refs,
        html,
        text,
        hash,
        existing?.content_hash ?? null
      )
      .run();
    if (!prepared.meta?.changes)
      throw new Error('Edition changed during preparation; reload before continuing');
    await event(db, slug, action, actor, hash);
    return readNewsletterWorkflow(db);
  }
  const slug = requireValue(input.slug, 'slug', 150);
  const e = await readEdition(db, slug);
  if (action === 'review') {
    if (!e.content_hash || !e.html || !e.text)
      throw new Error('Prepare the content before editorial review');
    if (e.email_status !== 'not-sent') throw new Error('Edition delivery state is locked');
    const reviewed = await db
      .prepare(
        "UPDATE newsletter_editions SET editorial_status='reviewed',approved_by=NULL,approved_at=NULL,approved_hash=NULL,audience_fingerprint=NULL,send_at=NULL WHERE slug=? AND email_status='not-sent' AND content_hash=?"
      )
      .bind(slug, e.content_hash)
      .run();
    if (!reviewed.meta?.changes) throw new Error('Edition changed during review; reload');
  } else if (action === 'seed') {
    if (e.email_status !== 'not-sent') throw new Error('Edition delivery state is locked');
    if (!e.content_hash || e.editorial_status === 'draft')
      throw new Error('Complete editorial review before the operator seed');
    const result = await recordProviderDelivery(
      db,
      e,
      { key: actor.id, email: actor.email },
      'seed',
      options
    );
    await db
      .prepare(
        'UPDATE newsletter_editions SET seed_email_id=?,seed_status=?,seed_hash=? WHERE slug=?'
      )
      .bind(result.resend_email_id, result.status, e.content_hash, slug)
      .run();
  } else if (action === 'approve') {
    const inspectedHash = requireValue(input.expected_content_hash, 'inspected content hash', 64);
    const inspectedAudience = requireValue(
      input.expected_audience_fingerprint,
      'inspected audience fingerprint',
      64
    );
    if (inspectedHash !== e.content_hash)
      throw new Error('Content changed since inspection; reload before approval');
    if (
      e.editorial_status === 'draft' ||
      !e.content_hash ||
      e.seed_status !== 'delivered' ||
      e.seed_hash !== e.content_hash
    )
      throw new Error('Editorial review and delivered current operator seed are required');
    if (e.email_status !== 'not-sent') throw new Error('Edition delivery state is locked');
    const sendAt = requireValue(input.send_at, 'send time', 50);
    const ms = Date.parse(sendAt);
    if (!Number.isFinite(ms) || ms < now.getTime() - 60000 || ms > now.getTime() + 30 * 86400000)
      throw new Error('Send time must be now or within 30 days');
    const current = await audience(db);
    if (inspectedAudience !== current.fingerprint)
      throw new Error('Audience changed since inspection; reload before approval');
    if (!current.recipients.length) throw new Error('No eligible audience');
    if (current.recipients.length > 20)
      throw new Error(
        'Audience exceeds the bounded 20-recipient delivery limit; split into reviewed campaigns'
      );
    const audienceSnapshot = await Promise.all(
      current.recipients.map(async (recipient) => ({
        subscriber_key: String(recipient.id),
        recipient_hash: await newsletterHash(recipient.email.toLowerCase())
      }))
    );
    const approval = await db
      .prepare(
        "UPDATE newsletter_editions SET editorial_status='approved',approved_by=?,approved_at=?,approved_hash=?,send_at=?,audience_fingerprint=?,audience_count=?,audience_snapshot=? WHERE slug=? AND content_hash=? AND email_status='not-sent' AND editorial_status IN ('reviewed','approved') AND seed_hash=? AND seed_status='delivered' AND seed_email_id=?"
      )
      .bind(
        actor.email,
        now.toISOString(),
        e.content_hash,
        new Date(ms).toISOString(),
        current.fingerprint,
        current.recipients.length,
        JSON.stringify(audienceSnapshot),
        slug,
        e.content_hash,
        e.seed_hash,
        e.seed_email_id
      )
      .run();
    if (!approval.meta?.changes)
      throw new Error('Edition changed during approval; reload before continuing');
    auditDetails = {
      content_hash: e.content_hash,
      audience_fingerprint: current.fingerprint,
      audience_count: current.recipients.length,
      audience_snapshot: audienceSnapshot,
      send_at: new Date(ms).toISOString(),
      approved_by: actor.email,
      approved_at: now.toISOString()
    };
  } else if (action === 'send') {
    if (e.email_status === 'sent') return readNewsletterWorkflow(db);
    if (!options.apiKey) throw new Error('Email delivery is unavailable');
    if (e.email_status === 'uncertain' || e.email_status === 'sending')
      throw new Error('Uncertain delivery requires reconciliation');
    if (
      e.editorial_status !== 'approved' ||
      !e.approved_by ||
      e.approved_hash !== e.content_hash ||
      e.seed_status !== 'delivered' ||
      e.seed_hash !== e.content_hash
    )
      throw new Error('Exact content approval is required');
    const ms = Date.parse(e.send_at ?? '');
    if (!Number.isFinite(ms) || now.getTime() < ms || now.getTime() > ms + 15 * 60000)
      throw new Error('Send is allowed only in the approved 15-minute window');
    const current = await audience(db);
    if (
      current.fingerprint !== e.audience_fingerprint ||
      current.recipients.length !== e.audience_count
    )
      throw new Error('Audience changed; review and approve a fresh audience');
    const lock = await db
      .prepare(
        "UPDATE newsletter_editions SET email_status='sending' WHERE slug=? AND email_status='not-sent' AND editorial_status='approved' AND content_hash=? AND approved_hash=? AND approved_by=? AND approved_at=? AND send_at=? AND audience_fingerprint=? AND audience_count=? AND seed_hash=? AND seed_status='delivered' AND seed_email_id=?"
      )
      .bind(
        slug,
        e.content_hash,
        e.approved_hash,
        e.approved_by,
        e.approved_at,
        e.send_at,
        e.audience_fingerprint,
        e.audience_count,
        e.seed_hash,
        e.seed_email_id
      )
      .run();
    if (!lock.meta?.changes)
      throw new Error('Delivery already started; reconcile before continuing');
    let state = 'sent';
    try {
      let recipientIndex = 0;
      for (const recipient of current.recipients) {
        if (recipientIndex++ > 0) await new Promise((resolve) => setTimeout(resolve, 550));
        const fresh = await audience(db);
        if (fresh.fingerprint !== current.fingerprint) {
          state = 'failed';
          break;
        }
        const result = await recordProviderDelivery(
          db,
          e,
          { key: String(recipient.id), email: recipient.email, token: recipient.unsubscribe_token },
          'audience',
          options
        );
        if (result.status !== 'sent' && result.status !== 'delivered') {
          state = result.status;
          break;
        }
      }
    } catch {
      state = 'uncertain';
    }
    await db
      .prepare(
        'UPDATE newsletter_editions SET email_status=?,updated_at=CURRENT_TIMESTAMP WHERE slug=?'
      )
      .bind(state, slug)
      .run();
    await reconcileAggregate(db, slug, e.content_hash);
  } else if (action === 'retry_failed') {
    if (e.email_status !== 'failed')
      throw new Error('Only confirmed failed deliveries may be retried');
    const unresolved = await db
      .prepare(
        "SELECT id FROM newsletter_edition_deliveries WHERE edition_slug=? AND status IN ('sending','uncertain') LIMIT 1"
      )
      .bind(slug)
      .first();
    if (unresolved) throw new Error('Reconcile uncertain provider writes before retry');
    const terminal = await db
      .prepare(
        "SELECT id FROM newsletter_edition_deliveries WHERE edition_slug=? AND kind='audience' AND (status='canceled' OR (status='failed' AND (resend_email_id IS NOT NULL OR COALESCE(error_code,'') NOT GLOB 'provider-[0-9][0-9][0-9]'))) LIMIT 1"
      )
      .bind(slug)
      .first();
    if (terminal)
      throw new Error(
        'Terminal or previously accepted delivery failure cannot be reset for retry; review suppression'
      );
    await db
      .prepare(
        "UPDATE newsletter_edition_deliveries SET status='ready' WHERE edition_slug=? AND kind='audience' AND status='failed' AND resend_email_id IS NULL AND error_code GLOB 'provider-[0-9][0-9][0-9]'"
      )
      .bind(slug)
      .run();
    await db
      .prepare(
        "UPDATE newsletter_editions SET email_status='not-sent',editorial_status='reviewed',approved_by=NULL,approved_at=NULL,approved_hash=NULL,send_at=NULL,audience_fingerprint=NULL WHERE slug=? AND email_status='failed'"
      )
      .bind(slug)
      .run();
  } else if (action === 'attach_receipt') {
    if (!options.apiKey) throw new Error('Provider readback unavailable');
    const id = requireValue(input.delivery_id, 'delivery ID', 100),
      emailId = requireValue(input.provider_email_id, 'provider email ID', 100);
    const row = await db
      .prepare('SELECT * FROM newsletter_edition_deliveries WHERE id=? AND edition_slug=?')
      .bind(id, slug)
      .first<Delivery>();
    if (
      !row ||
      !['uncertain', 'sending'].includes(row.status) ||
      row.resend_email_id ||
      !row.recipient_hash
    )
      throw new Error('An unresolved exact delivery is required');
    const response = await (options.fetcher ?? fetch)(
      `https://api.resend.com/emails/${encodeURIComponent(emailId)}`,
      { headers: { Authorization: `Bearer ${options.apiKey}` }, signal: AbortSignal.timeout(8000) }
    );
    if (!response.ok) throw new Error('Provider readback unavailable');
    const receipt = (await response.json()) as {
      id?: string;
      subject?: string;
      to?: string[];
      html?: string;
      text?: string;
      last_event?: string;
    };
    if (
      receipt.id !== emailId ||
      receipt.subject !== row.subject ||
      !Array.isArray(receipt.to) ||
      receipt.to.length !== 1 ||
      (await newsletterHash(receipt.to[0].toLowerCase())) !== row.recipient_hash
    )
      throw new Error('Provider recipient or subject mismatch');
    const edition = await readEdition(db, slug);
    const tokenMatch = receipt.text?.match(/https:\/\/createsomething\.io\/unsubscribe\?[^\s]+/);
    const unsubscribe = tokenMatch?.[0];
    if (
      !unsubscribe ||
      receipt.text !== edition.text.replaceAll('{{unsubscribe_url}}', unsubscribe) ||
      receipt.html !==
        edition.html.replaceAll('{{unsubscribe_url}}', unsubscribe.replaceAll('&', '&amp;'))
    )
      throw new Error('Provider content mismatch');
    if (!PROVIDER_RECEIPT_STATES.includes(receipt.last_event ?? ''))
      throw new Error('Provider delivery state unavailable');
    const state = ['bounced', 'complained', 'suppressed'].includes(receipt.last_event!)
      ? 'failed'
      : ['opened', 'clicked'].includes(receipt.last_event!)
        ? 'delivered'
        : receipt.last_event!;
    await db
      .prepare(
        'UPDATE newsletter_edition_deliveries SET resend_email_id=?,status=?,error_code=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND resend_email_id IS NULL'
      )
      .bind(
        emailId,
        state,
        ['bounced', 'complained', 'suppressed', 'failed', 'canceled'].includes(receipt.last_event!)
          ? `provider-${receipt.last_event}`
          : null,
        id
      )
      .run();
    await applyProviderSuppression(db, row, receipt.last_event!);
    if (row.kind === 'seed' && row.content_hash === e.content_hash)
      await db
        .prepare(
          'UPDATE newsletter_editions SET seed_email_id=?,seed_status=?,seed_hash=? WHERE slug=?'
        )
        .bind(emailId, state, row.content_hash, slug)
        .run();
    await reconcileAggregate(db, slug, e.content_hash);
  } else if (action === 'reconcile') {
    if (!options.apiKey) throw new Error('Provider readback unavailable');
    const rows = (
      await db
        .prepare('SELECT * FROM newsletter_edition_deliveries WHERE edition_slug=?')
        .bind(slug)
        .all<Delivery>()
    ).results;
    let receiptIndex = 0;
    for (const row of rows) {
      if (receiptIndex++ > 0) await new Promise((resolve) => setTimeout(resolve, 550));
      if (!row.resend_email_id) continue;
      const response = await (options.fetcher ?? fetch)(
        `https://api.resend.com/emails/${row.resend_email_id}`,
        {
          headers: { Authorization: `Bearer ${options.apiKey}` },
          signal: AbortSignal.timeout(8000)
        }
      );
      if (!response.ok) throw new Error('Provider readback unavailable');
      const value = (await response.json()) as {
        id?: string;
        subject?: string;
        last_event?: string;
        to?: string[];
      };
      if (
        value.id !== row.resend_email_id ||
        value.subject !== row.subject ||
        !PROVIDER_RECEIPT_STATES.includes(value.last_event ?? '')
      )
        throw new Error('Provider receipt mismatch');
      if (
        row.recipient_hash &&
        (!Array.isArray(value.to) ||
          value.to.length !== 1 ||
          (await newsletterHash(value.to[0].toLowerCase())) !== row.recipient_hash)
      )
        throw new Error('Provider recipient mismatch');
      const state = ['failed', 'canceled'].includes(row.status)
        ? row.status
        : ['bounced', 'complained', 'suppressed'].includes(value.last_event!)
          ? 'failed'
          : ['opened', 'clicked'].includes(value.last_event!)
            ? 'delivered'
            : value.last_event!;
      await db
        .prepare(
          `UPDATE newsletter_edition_deliveries
           SET status=CASE WHEN status IN ('failed','canceled') THEN status ELSE ? END,
               error_code=CASE WHEN status IN ('failed','canceled') THEN error_code ELSE ? END,
               updated_at=CURRENT_TIMESTAMP WHERE id=?`
        )
        .bind(
          state,
          ['bounced', 'complained', 'suppressed', 'failed', 'canceled'].includes(value.last_event!)
            ? `provider-${value.last_event}`
            : row.error_code,
          row.id
        )
        .run();
      await applyProviderSuppression(db, row, value.last_event!);
      if (
        row.kind === 'seed' &&
        e.seed_email_id === row.resend_email_id &&
        e.content_hash === row.content_hash
      )
        await db
          .prepare(
            `UPDATE newsletter_editions
            SET seed_status=(SELECT status FROM newsletter_edition_deliveries WHERE id=?)
            WHERE slug=? AND seed_email_id=? AND content_hash=?`
          )
          .bind(row.id, slug, row.resend_email_id, row.content_hash)
          .run();
    }
    await reconcileAggregate(db, slug, e.content_hash);
  } else throw new Error('Unknown newsletter action');
  await event(db, slug, action, actor, e.content_hash, auditDetails);
  return readNewsletterWorkflow(db);
}

async function reconcileAggregate(db: WorkflowDatabase, slug: string, hash: string | null) {
  // Derive from the ledger inside the same statement. A webhook may arrive
  // between any two awaits; a stale read must never overwrite terminal proof.
  await db
    .prepare(
      `WITH receipts AS (
      SELECT d.status FROM newsletter_edition_deliveries d
      JOIN newsletter_editions e ON e.slug=d.edition_slug
      JOIN json_each(e.audience_snapshot) member
        ON json_extract(member.value,'$.subscriber_key')=d.subscriber_key
        AND json_extract(member.value,'$.recipient_hash')=d.recipient_hash
      WHERE d.edition_slug=? AND d.content_hash=? AND d.kind='audience'
    ) UPDATE newsletter_editions SET email_status=CASE
      WHEN EXISTS(SELECT 1 FROM receipts WHERE status IN ('uncertain','sending')) THEN 'uncertain'
      WHEN (SELECT COUNT(*) FROM receipts) != audience_count
        OR EXISTS(SELECT 1 FROM receipts WHERE status IN ('failed','ready','canceled')) THEN 'failed'
      ELSE 'sent' END
      WHERE slug=? AND content_hash=? AND EXISTS(SELECT 1 FROM receipts)
        AND email_status IN ('sending','uncertain','failed','sent')`
    )
    .bind(slug, hash, slug, hash)
    .run();
}

/** Delivery-only receipts. Open/click events never enter the edition ledger. */
export async function recordEditionDeliveryReceipt(
  db: WorkflowDatabase,
  emailId: string,
  eventType: string
) {
  db = checkedDatabase(db);
  const states: Record<string, string> = {
    'email.sent': 'sent',
    'email.delivered': 'delivered',
    'email.delivery_delayed': 'delayed',
    'email.bounced': 'failed',
    'email.complained': 'failed',
    'email.suppressed': 'failed'
  };
  const status = states[eventType];
  if (!status) return;
  await db
    .prepare(
      `UPDATE newsletter_edition_deliveries SET status=CASE WHEN status IN ('failed','canceled') THEN status WHEN ?='sent' AND status IN ('delivered','delayed') THEN status WHEN ?='delayed' AND status='delivered' THEN status ELSE ? END,error_code=CASE WHEN status IN ('failed','canceled') THEN error_code WHEN ?='failed' THEN ? ELSE error_code END,updated_at=CURRENT_TIMESTAMP WHERE resend_email_id=?`
    )
    .bind(status, status, status, status, `provider-${eventType.replace('email.', '')}`, emailId)
    .run();
  const row = await db
    .prepare('SELECT * FROM newsletter_edition_deliveries WHERE resend_email_id=?')
    .bind(emailId)
    .first<Delivery>();
  if (!row) return;
  await applyProviderSuppression(db, row, eventType.replace('email.', ''));
  if (row.kind === 'seed')
    await db
      .prepare(
        `UPDATE newsletter_editions
         SET seed_status=(SELECT status FROM newsletter_edition_deliveries WHERE id=?)
         WHERE slug=? AND seed_email_id=? AND content_hash=?`
      )
      .bind(row.id, row.edition_slug, emailId, row.content_hash)
      .run();
  await reconcileAggregate(db, row.edition_slug, row.content_hash);
}

async function applyProviderSuppression(db: WorkflowDatabase, row: Delivery, event: string) {
  if (
    row.kind !== 'audience' ||
    !['bounced', 'complained', 'suppressed'].includes(event) ||
    !/^\d+$/.test(row.subscriber_key) ||
    !row.recipient_hash
  )
    return;
  const current = await db
    .prepare('SELECT email FROM newsletter_subscribers WHERE id=?')
    .bind(Number(row.subscriber_key))
    .first<{ email: string }>();
  if (!current || (await newsletterHash(current.email.toLowerCase())) !== row.recipient_hash)
    return;
  await db
    .prepare(
      "UPDATE newsletter_subscribers SET status=?,active=0 WHERE id=? AND email=? AND status='active'"
    )
    .bind(event, Number(row.subscriber_key), current.email)
    .run();
}
