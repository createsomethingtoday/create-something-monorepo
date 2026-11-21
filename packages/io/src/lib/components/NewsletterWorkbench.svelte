<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { fetchAdminJson } from '$lib/admin/client';

  interface Edition {
    slug: string;
    title: string;
    subject: string;
    owner: string;
    author: string;
    source_refs: string[];
    content_hash: string;
    editorial_status: string;
    web_status: string;
    web_url?: string | null;
    email_status: string;
    html?: string;
    text?: string;
    seed_status?: string | null;
    send_at?: string | null;
    audience_count?: number | null;
    audience_fingerprint?: string | null;
    approved_by?: string | null;
    next_action: string;
    blockers: string[];
    deliveries: { id?: string; kind: string; status: string; resend_email_id?: string | null }[];
  }
  interface Report {
    observed_at: string;
    editions: Edition[];
    audience: {
      eligible: number;
      unconfirmed: number;
      consent_unproved: number;
      audience_unreviewed: number;
      suppressed: number;
      fingerprint?: string;
    };
  }
  let { initialReport = null }: { initialReport?: Report | null } = $props();
  let report = $state<Report | null>(untrack(() => initialReport));
  let loading = $state(untrack(() => !initialReport));
  let pending = $state('');
  let error = $state('');
  let notice = $state('');
  let selected = $state('');
  let sendAt = $state('');
  let accepted = $state(false);
  let providerIds = $state<Record<string, string>>({});
  const candidateSlug = '2026-09-08-test-the-checker';

  async function refresh() {
    loading = true;
    const result = await fetchAdminJson<Report>('/api/admin/newsletter-editions');
    if (result.ok) {
      report = result.data;
      error = '';
    } else {
      report = null;
      error = result.error.message;
    }
    loading = false;
  }
  async function act(action: string, slug: string, extra: Record<string, string> = {}) {
    pending = `${slug}:${action}`;
    error = '';
    notice = '';
    try {
      const result = await fetchAdminJson('/api/admin/newsletter-editions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          slug,
          ...extra,
          ...(action === 'approve'
            ? {
                send_at: new Date(sendAt).toISOString(),
                expected_content_hash: report?.editions.find((edition) => edition.slug === slug)
                  ?.content_hash,
                expected_audience_fingerprint: report?.audience.fingerprint
              }
            : {})
        })
      });
      if (!result.ok) {
        error = result.error.message;
        return;
      }
      notice =
        action === 'seed'
          ? 'Operator test submitted. Reconcile the receipt before approval.'
          : 'Action recorded. Review the current state below.';
      accepted = false;
      await refresh();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Action failed';
    } finally {
      pending = '';
    }
  }
  onMount(() => {
    if (!initialReport) void refresh();
  });
</script>

<section class="workbench" aria-labelledby="newsletter-title">
  <header class="desk-heading">
    <div>
      <p class="eyebrow">CREATE SOMETHING / Newsletter</p>
      <h1 id="newsletter-title">The editorial desk.</h1>
      <p>
        Carry one lesson through. Review the edition, check consent, and keep a receipt for every
        send.
      </p>
    </div>
    <button onclick={refresh} disabled={loading || !!pending}>Refresh</button>
  </header>
  <nav class="desk-tools" aria-label="Newsletter tools">
    <a href="/admin/newsletter-analytics">Read attribution and outcomes →</a><a
      href="/admin/subscribers">Review subscriber consent →</a
    >
  </nav>
  {#if error}<p class="feedback" role="alert">{error}</p>{/if}
  {#if notice}<p class="feedback" role="status">{notice}</p>{/if}
  {#if loading}<p role="status">Reading editions and consent evidence…</p>
  {:else if report}
    <section class="audience" aria-labelledby="audience-title">
      <div class="audience-total">
        <p class="eyebrow">Current audience</p>
        <h2 id="audience-title">{report.audience.eligible} eligible</h2>
        <p>Strict double opt-in audience. Active status alone does not qualify a subscriber.</p>
      </div>
      <dl>
        <div>
          <dt>Consent unproved</dt>
          <dd>{report.audience.consent_unproved}</dd>
        </div>
        <div>
          <dt>Unconfirmed</dt>
          <dd>{report.audience.unconfirmed}</dd>
        </div>
        <div>
          <dt>Audience unreviewed</dt>
          <dd>{report.audience.audience_unreviewed}</dd>
        </div>
        <div>
          <dt>Suppressed</dt>
          <dd>{report.audience.suppressed}</dd>
        </div>
      </dl>
    </section>
    <p class="muted">
      Observed {new Date(report.observed_at).toLocaleString()}. Each action rechecks its required
      evidence.
    </p>
    {#if report.editions.length === 0}<p>
        No editions registered. Prepare an edition from its reviewed source before sending.
      </p>{/if}
    {#each report.editions as edition}
      <article aria-labelledby={`edition-${edition.slug}`}>
        <p class="eyebrow">{edition.slug}</p>
        <h2 id={`edition-${edition.slug}`}>{edition.title}</h2>
        <div class="states" aria-label="Edition status">
          <span>Editorial: {edition.editorial_status}</span><span>Web: {edition.web_status}</span
          ><span>Email: {edition.email_status}</span>
        </div>
        <p class="next-action"><strong>Next:</strong> {edition.next_action}</p>
        <p class="muted">Owner: {edition.owner} · Author: {edition.author}</p>
        {#if edition.blockers.length}<ul>
            {#each edition.blockers as blocker}<li>{blocker}</li>{/each}
          </ul>{/if}
        <div class="actions">
          {#if edition.slug === candidateSlug && edition.email_status === 'not-sent'}<button
              disabled={!!pending}
              onclick={() => act('import', edition.slug)}>Import candidate</button
            >{/if}
          <button
            class="primary"
            aria-expanded={selected === edition.slug}
            aria-controls={`review-${edition.slug}`}
            disabled={!!pending}
            onclick={() => {
              selected = selected === edition.slug ? '' : edition.slug;
              accepted = false;
              sendAt = '';
            }}>{selected === edition.slug ? 'Close review' : 'Review edition'}</button
          >
          <button
            disabled={!!pending || (!edition.deliveries.length && !edition.seed_status)}
            onclick={() => act('reconcile', edition.slug)}>Reconcile delivery</button
          >
          {#if edition.email_status === 'failed'}<button
              disabled={!!pending}
              onclick={() => act('retry_failed', edition.slug)}
              >Prepare failed deliveries for new approval</button
            >{/if}
          {#if edition.web_url}<a href={edition.web_url}>Read web edition →</a>{/if}
        </div>
        {#if selected === edition.slug}
          <div class="review" id={`review-${edition.slug}`}>
            <div class="review-heading">
              <p class="eyebrow">Edition review</p>
              <p>Review content → Send an operator test → Approve → Send → Reconcile</p>
            </div>
            <h3>Content and evidence</h3>
            <p>Subject: {edition.subject}</p>
            <p class="hash">Revision: {edition.content_hash || 'Content not prepared'}</p>
            <ul>
              {#each edition.source_refs as source}<li class="source">{source}</li>{/each}
            </ul>
            {#if edition.html}<details>
                <summary>Inspect email preview</summary><iframe
                  title={`Email preview: ${edition.title}`}
                  sandbox=""
                  srcdoc={edition.html.replaceAll(
                    '{{unsubscribe_url}}',
                    'https://createsomething.io/unsubscribe?preview=operator-seed'
                  )}
                ></iframe>
              </details>{/if}
            {#if edition.text}<details>
                <summary>Read plain text</summary>
                <pre>{edition.text}</pre>
              </details>{/if}
            <p>
              Operator test: {edition.seed_status || 'Not registered'}. A test does not approve an
              audience send.
            </p>
            <div class="actions">
              <button
                disabled={!!pending ||
                  !edition.content_hash ||
                  edition.email_status !== 'not-sent' ||
                  edition.editorial_status === 'reviewed'}
                onclick={() => act('review', edition.slug)}
                >{edition.editorial_status === 'approved'
                  ? 'Reopen review and replace approval'
                  : 'Mark editorial review complete'}</button
              >
              <button
                disabled={!!pending ||
                  !edition.content_hash ||
                  edition.editorial_status !== 'reviewed'}
                onclick={() => act('seed', edition.slug)}>Send test to my inbox</button
              >
            </div>
            {#if edition.editorial_status === 'reviewed' && edition.seed_status === 'delivered'}
              <div class="approval">
                <h3>Approve this audience send</h3>
                <p>
                  This approves the revision above for the current {report.audience.eligible} eligible
                  subscribers at the selected time. A changed revision or audience requires new approval.
                </p>
                <p class="hash">
                  Audience fingerprint: {report.audience.fingerprint ||
                    'Unavailable; refresh before approval'}
                </p>
                <label for={`time-${edition.slug}`}>Delivery time (your local time)</label><input
                  id={`time-${edition.slug}`}
                  type="datetime-local"
                  bind:value={sendAt}
                />
                <label class="accept"
                  ><input type="checkbox" bind:checked={accepted} /> I reviewed the content, audience,
                  and delivery time.</label
                >
                <button
                  disabled={!!pending ||
                    !accepted ||
                    !sendAt ||
                    !report.audience.eligible ||
                    !report.audience.fingerprint}
                  onclick={() => act('approve', edition.slug)}>Approve exact send</button
                >
              </div>
            {/if}
            {#if edition.editorial_status === 'approved'}
              <p>
                Approved by {edition.approved_by}. Audience: {edition.audience_count}. Time: {edition.send_at}.
              </p>
              <p class="hash">Audience fingerprint: {edition.audience_fingerprint}</p>
              <p>
                Sending is a separate action. The server enforces the approved delivery window and
                rechecks consent.
              </p>
              <button
                disabled={!!pending || edition.email_status !== 'not-sent'}
                onclick={() => act('send', edition.slug)}>Send approved edition</button
              >
            {/if}
            {#if edition.deliveries.length}<h3>Delivery receipts</h3>
              <ul>
                {#each edition.deliveries as delivery}<li>
                    {delivery.kind}: {delivery.status}
                    <span class="source"
                      >{delivery.resend_email_id || 'No provider ID; inspect before retrying'}</span
                    >
                    {#if delivery.id && !delivery.resend_email_id && (delivery.status === 'uncertain' || delivery.status === 'sending')}
                      <label for={`receipt-${delivery.id}`}
                        >Provider message ID found during reconciliation</label
                      ><input
                        id={`receipt-${delivery.id}`}
                        bind:value={providerIds[delivery.id]}
                        autocomplete="off"
                      />
                      <button
                        disabled={!!pending || !providerIds[delivery.id]}
                        onclick={() =>
                          act('attach_receipt', edition.slug, {
                            delivery_id: delivery.id!,
                            provider_email_id: providerIds[delivery.id!]
                          })}>Verify and attach receipt</button
                      >
                    {/if}
                  </li>{/each}
              </ul>{/if}
          </div>
        {/if}
      </article>
    {/each}
  {/if}
</section>

<style>
  @font-face {
    font-family: DeskGeist;
    src: url('/fonts/desk-geist.woff2') format('woff2');
    font-weight: 100 900;
    font-display: swap;
  }
  @font-face {
    font-family: DeskNewsreader;
    src: url('/fonts/desk-newsreader.woff2') format('woff2');
    font-weight: 200 800;
    font-display: swap;
  }
  .workbench {
    --ink: #0a0a0a;
    --muted: #545450;
    --line: #d1d1cb;
    --panel: #f1f1ee;
    color-scheme: light;
    max-width: 76rem;
    margin: auto;
    padding: clamp(20px, 4vw, 56px);
    background: white;
    color: var(--ink);
    font-family: DeskGeist, Arial, sans-serif;
  }
  .desk-heading {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
    padding-block: 8px 40px;
  }
  h1,
  h2,
  h3 {
    font-family: DeskNewsreader, Georgia, serif;
    font-weight: 400;
    letter-spacing: -0.035em;
  }
  h1 {
    font-size: clamp(48px, 6vw, 84px);
    line-height: 1;
    margin-block: 24px;
  }
  h2 {
    font-size: clamp(32px, 3.5vw, 44px);
    line-height: 1.12;
    margin-block: 12px;
  }
  h3 {
    font-size: 30px;
    line-height: 1.15;
    margin-block: 28px 12px;
  }
  p {
    line-height: 1.6;
    margin-block: 10px;
    max-width: 70ch;
  }
  .eyebrow {
    font-size: 13px;
    font-weight: 500;
    overflow-wrap: anywhere;
  }
  .desk-tools {
    display: grid;
    grid-template-columns: 1fr 1fr;
    margin: 0;
  }
  .desk-tools a {
    padding: 24px;
    background: #4a78ff;
    color: #000;
    font-weight: 500;
  }
  .desk-tools a + a {
    background: #ff8ad8;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    margin-block: 24px 4px;
  }
  a {
    color: inherit;
    text-underline-offset: 0.25em;
  }
  button,
  input {
    font: inherit;
    color: var(--ink);
    background: white;
    border: 1px solid var(--ink);
    border-radius: 0;
    padding: 11px 16px;
    min-height: 44px;
    max-width: 100%;
  }
  button {
    cursor: pointer;
    line-height: 1.4;
    text-align: left;
  }
  button:hover:not(:disabled) {
    background: #86e0a9;
  }
  button:disabled {
    color: #62625c;
    border-color: #aaa;
    background: #ecece8;
    cursor: not-allowed;
  }
  button.primary {
    background: var(--ink);
    color: white;
  }
  button.primary:hover:not(:disabled) {
    background: #2349ac;
  }
  button:focus-visible,
  a:focus-visible,
  input:focus-visible,
  summary:focus-visible {
    outline: 3px solid #2349ac;
    outline-offset: 4px;
  }
  .audience {
    display: grid;
    grid-template-columns: 1fr 1fr;
    background: var(--panel);
  }
  .audience-total {
    padding: 28px;
    background: #86e0a9;
  }
  .audience h2 {
    font-size: clamp(36px, 4vw, 56px);
  }
  dl {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    padding: 28px;
    margin: 0;
  }
  dd {
    margin: 6px 0 0;
    font-family: DeskNewsreader, Georgia, serif;
    font-size: 36px;
    line-height: 1;
  }
  dt {
    font-size: 13px;
  }
  .muted {
    color: var(--muted);
    font-size: 13px;
  }
  .workbench > .muted {
    margin-block: 20px 36px;
  }
  article {
    border-top: 1px solid var(--ink);
    padding-block: 28px 36px;
  }
  article > .eyebrow {
    color: var(--muted);
  }
  .states {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-block: 20px;
    font-size: 12px;
  }
  .states span {
    padding: 6px 10px;
    background: var(--panel);
    border: 1px solid var(--line);
  }
  .next-action {
    border-left: 3px solid #4a78ff;
    padding-left: 12px;
  }
  ul {
    padding-left: 24px;
    line-height: 1.7;
  }
  .review {
    margin-top: 28px;
    padding: clamp(20px, 3vw, 36px);
    background: var(--panel);
  }
  .review-heading {
    padding-bottom: 16px;
    border-bottom: 1px solid var(--line);
  }
  .review-heading p:last-child {
    font-size: 13px;
  }
  .hash,
  .source {
    overflow-wrap: anywhere;
    font-size: 12px;
    color: var(--muted);
  }
  pre {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    line-height: 1.6;
    font-size: 14px;
    padding: 20px;
    background: white;
  }
  details {
    border-block-end: 1px solid var(--line);
  }
  iframe {
    width: 100%;
    height: 38rem;
    border: 1px solid var(--line);
    background: white;
    margin-block: 16px;
  }
  summary {
    cursor: pointer;
    padding-block: 18px;
    font-weight: 500;
  }
  .approval {
    margin-top: 32px;
    padding: 24px;
    background: #86e0a9;
  }
  .approval h3 {
    margin-top: 0;
  }
  label {
    display: block;
    margin-block: 12px;
    font-size: 14px;
  }
  .accept {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-block: 20px;
  }
  .accept input {
    flex-shrink: 0;
    min-height: 20px;
    width: 20px;
    height: 20px;
    margin-top: 2px;
    accent-color: var(--ink);
  }
  .feedback {
    border-left: 4px solid #4a78ff;
    padding: 20px;
    background: var(--panel);
  }
  .feedback[role='alert'] {
    border-color: #a72e26;
  }
  @media (max-width: 640px) {
    .workbench {
      padding: 20px;
    }
    .desk-heading {
      flex-direction: column;
      gap: 12px;
      padding-bottom: 28px;
    }
    .desk-heading button {
      align-self: flex-start;
    }
    .desk-tools,
    .audience {
      grid-template-columns: 1fr;
    }
    .desk-tools a,
    .audience-total,
    dl {
      padding: 20px;
    }
    .actions {
      align-items: stretch;
    }
    .actions button {
      flex: 1 1 100%;
    }
    .states {
      gap: 6px;
    }
    input[type='datetime-local'] {
      width: 100%;
      min-width: 0;
    }
    .approval {
      padding: 20px;
    }
  }
</style>
