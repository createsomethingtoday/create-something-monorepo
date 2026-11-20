<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { fetchAdminJson } from '$lib/admin/client';

  interface Edition {
    slug: string; title: string; subject: string; owner: string; author: string;
    source_refs: string[]; content_hash: string; editorial_status: string;
    web_status: string; web_url?: string | null; email_status: string;
    html?: string; text?: string; seed_status?: string | null;
    send_at?: string | null; audience_count?: number | null;
    audience_fingerprint?: string | null; approved_by?: string | null;
    next_action: string; blockers: string[];
    deliveries: { id?: string; kind: string; status: string; resend_email_id?: string | null }[];
  }
  interface Report {
    observed_at: string; editions: Edition[];
    audience: { eligible: number; unconfirmed: number; consent_unproved: number; audience_unreviewed: number; suppressed: number; fingerprint?: string };
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
    if (result.ok) { report = result.data; error = ''; }
    else { report = null; error = result.error.message; }
    loading = false;
  }
  async function act(action: string, slug: string, extra: Record<string, string> = {}) {
    pending = `${slug}:${action}`; error = ''; notice = '';
    try {
      const result = await fetchAdminJson('/api/admin/newsletter-editions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, slug, ...extra, ...(action === 'approve' ? {
          send_at: new Date(sendAt).toISOString(),
          expected_content_hash: report?.editions.find(edition => edition.slug === slug)?.content_hash,
          expected_audience_fingerprint: report?.audience.fingerprint
        } : {}) })
      });
      if (!result.ok) { error = result.error.message; return; }
      notice = action === 'seed' ? 'Operator test submitted. Reconcile the receipt before approval.' : 'Action recorded. Review the current state below.';
      accepted = false;
      await refresh();
    } catch (cause) { error = cause instanceof Error ? cause.message : 'Action failed'; }
    finally { pending = ''; }
  }
  onMount(() => { if (!initialReport) void refresh(); });
</script>

<section class="workbench" aria-labelledby="newsletter-title">
  <header>
    <div><p class="eyebrow">Newsletter / Editorial desk</p><h1 id="newsletter-title">Carry one lesson through.</h1>
      <p>Prepare the edition, verify the audience, and keep the receipt for each decision.</p></div>
    <button onclick={refresh} disabled={loading || !!pending}>Refresh</button>
  </header>
  <nav aria-label="Newsletter tools"><a href="/admin/newsletter-analytics">Read attribution and outcomes →</a><a href="/admin/subscribers">Review subscriber consent →</a></nav>
  {#if error}<p class="feedback" role="alert">{error}</p>{/if}
  {#if notice}<p class="feedback" role="status">{notice}</p>{/if}
  {#if loading}<p role="status">Reading editions and consent evidence…</p>
  {:else if report}
    <section class="audience" aria-labelledby="audience-title">
      <div><h2 id="audience-title">{report.audience.eligible} eligible</h2><p>Strict double opt-in audience. Active status alone does not qualify a subscriber.</p></div>
      <dl><div><dt>Consent unproved</dt><dd>{report.audience.consent_unproved}</dd></div><div><dt>Unconfirmed</dt><dd>{report.audience.unconfirmed}</dd></div><div><dt>Audience unreviewed</dt><dd>{report.audience.audience_unreviewed}</dd></div><div><dt>Suppressed</dt><dd>{report.audience.suppressed}</dd></div></dl>
    </section>
    <p class="muted">Observed {new Date(report.observed_at).toLocaleString()}. Each action rechecks its required evidence.</p>
    {#if report.editions.length === 0}<p>No editions registered. Prepare an edition from its reviewed source before sending.</p>{/if}
    {#each report.editions as edition}
      <article aria-labelledby={`edition-${edition.slug}`}>
        <p class="eyebrow">{edition.slug}</p><h2 id={`edition-${edition.slug}`}>{edition.title}</h2>
        <p class="states">Editorial: {edition.editorial_status} · Web: {edition.web_status} · Email: {edition.email_status}</p>
        <p><strong>Next:</strong> {edition.next_action}</p>
        <p class="muted">Owner: {edition.owner} · Author: {edition.author}</p>
        {#if edition.blockers.length}<ul>{#each edition.blockers as blocker}<li>{blocker}</li>{/each}</ul>{/if}
        <div class="actions">
          {#if edition.slug === candidateSlug && edition.email_status === 'not-sent'}<button disabled={!!pending} onclick={() => act('import', edition.slug)}>Import candidate</button>{/if}
          <button disabled={!!pending} onclick={() => { selected = selected === edition.slug ? '' : edition.slug; accepted = false; sendAt = ''; }}>{selected === edition.slug ? 'Close review' : 'Review edition'}</button>
          <button disabled={!!pending || !edition.deliveries.length && !edition.seed_status} onclick={() => act('reconcile', edition.slug)}>Reconcile delivery</button>
          {#if edition.email_status === 'failed'}<button disabled={!!pending} onclick={() => act('retry_failed', edition.slug)}>Prepare failed deliveries for new approval</button>{/if}
          {#if edition.web_url}<a href={edition.web_url}>Read web edition →</a>{/if}
        </div>
        {#if selected === edition.slug}
          <div class="review">
            <h3>Content and evidence</h3><p>Subject: {edition.subject}</p>
            <p class="hash">Revision: {edition.content_hash || 'Content not prepared'}</p>
            <ul>{#each edition.source_refs as source}<li class="source">{source}</li>{/each}</ul>
            {#if edition.html}<details><summary>Inspect email preview</summary><iframe title={`Email preview: ${edition.title}`} sandbox="" srcdoc={edition.html.replaceAll('{{unsubscribe_url}}', 'https://createsomething.io/unsubscribe?preview=operator-seed')}></iframe></details>{/if}
            {#if edition.text}<details><summary>Read plain text</summary><pre>{edition.text}</pre></details>{/if}
            <p>Operator test: {edition.seed_status || 'Not registered'}. A test does not approve an audience send.</p>
            <div class="actions">
              <button disabled={!!pending || !edition.content_hash || edition.email_status !== 'not-sent' || edition.editorial_status === 'reviewed'} onclick={() => act('review', edition.slug)}>{edition.editorial_status === 'approved' ? 'Reopen review and replace approval' : 'Mark editorial review complete'}</button>
              <button disabled={!!pending || !edition.content_hash || edition.editorial_status !== 'reviewed'} onclick={() => act('seed', edition.slug)}>Send test to my inbox</button>
            </div>
            {#if edition.editorial_status === 'reviewed' && edition.seed_status === 'delivered'}
              <div class="approval"><h3>Approve this audience send</h3>
                <p>This approves the revision above for the current {report.audience.eligible} eligible subscribers at the selected time. A changed revision or audience requires new approval.</p>
                <p class="hash">Audience fingerprint: {report.audience.fingerprint || 'Unavailable; refresh before approval'}</p>
                <label for={`time-${edition.slug}`}>Delivery time (your local time)</label><input id={`time-${edition.slug}`} type="datetime-local" bind:value={sendAt} />
                <label class="accept"><input type="checkbox" bind:checked={accepted} /> I reviewed the content, audience, and delivery time.</label>
                <button disabled={!!pending || !accepted || !sendAt || !report.audience.eligible || !report.audience.fingerprint} onclick={() => act('approve', edition.slug)}>Approve exact send</button>
              </div>
            {/if}
            {#if edition.editorial_status === 'approved'}
              <p>Approved by {edition.approved_by}. Audience: {edition.audience_count}. Time: {edition.send_at}.</p><p class="hash">Audience fingerprint: {edition.audience_fingerprint}</p>
              <p>Sending is a separate action. The server enforces the approved delivery window and rechecks consent.</p>
              <button disabled={!!pending || edition.email_status !== 'not-sent'} onclick={() => act('send', edition.slug)}>Send approved edition</button>
            {/if}
            {#if edition.deliveries.length}<h3>Delivery receipts</h3><ul>{#each edition.deliveries as delivery}<li>{delivery.kind}: {delivery.status} <span class="source">{delivery.resend_email_id || 'No provider ID; inspect before retrying'}</span>
              {#if delivery.id && !delivery.resend_email_id && (delivery.status === 'uncertain' || delivery.status === 'sending')}
                <label for={`receipt-${delivery.id}`}>Provider message ID found during reconciliation</label><input id={`receipt-${delivery.id}`} bind:value={providerIds[delivery.id]} autocomplete="off" />
                <button disabled={!!pending || !providerIds[delivery.id]} onclick={() => act('attach_receipt', edition.slug, { delivery_id: delivery.id!, provider_email_id: providerIds[delivery.id!] })}>Verify and attach receipt</button>
              {/if}
            </li>{/each}</ul>{/if}
          </div>
        {/if}
      </article>
    {/each}
  {/if}
</section>

<style>
  .workbench { max-width: 76rem; margin: auto; color: var(--color-performance-fg-primary); }
  header { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-performance-md); }
  h1 { font-size: var(--text-performance-h1); line-height: 1.1; max-width: 18ch; }
  h2 { font-size: var(--text-performance-h2); line-height: 1.25; }
  h3 { font-size: var(--text-performance-body-lg); margin-block: var(--space-performance-md); }
  p { line-height: 1.6; margin-block: var(--space-performance-sm); max-width: 72ch; }
  .eyebrow { font-family: var(--font-performance-mono); font-size: var(--text-performance-caption); color: var(--color-performance-fg-tertiary); }
  nav, .actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-performance-md); margin-block: var(--space-performance-md); }
  a { color: inherit; text-underline-offset: .25em; }
  button, input { font: inherit; color: inherit; background: var(--color-performance-bg-surface); border: 1px solid var(--color-performance-border-default); padding: var(--space-performance-sm) var(--space-performance-md); min-height: 44px; }
  button { cursor: pointer; } button:disabled { opacity: .5; cursor: not-allowed; }
  button:focus-visible, a:focus-visible, input:focus-visible, summary:focus-visible { outline: 2px solid var(--color-performance-fg-primary); outline-offset: 4px; }
  .audience, article { border-top: 1px solid var(--color-performance-border-default); padding-block: var(--space-performance-lg); }
  .audience { margin-top: var(--space-performance-lg); display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-performance-lg); }
  dl { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-performance-md); } dd { margin: 0; font-size: var(--text-performance-h2); } dt, .muted { color: var(--color-performance-fg-tertiary); }
  ul { padding-left: var(--space-performance-lg); line-height: 1.7; }
  .states { font-family: var(--font-performance-mono); font-size: var(--text-performance-body-sm); }
  .review { margin-top: var(--space-performance-lg); padding: var(--space-performance-md); background: var(--color-performance-bg-surface); border-left: 2px solid var(--color-performance-border-default); }
  .hash, .source { overflow-wrap: anywhere; font-family: var(--font-performance-mono); font-size: var(--text-performance-body-sm); }
  pre { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.6; font-size: var(--text-performance-body-sm); }
  iframe { width: 100%; height: 38rem; border: 0; background: var(--color-performance-bg-surface); margin-top: var(--space-performance-md); }
  summary { cursor: pointer; padding-block: var(--space-performance-sm); }
  .approval { margin-top: var(--space-performance-lg); } label { display: block; margin-block: var(--space-performance-sm); } .accept { display: flex; align-items: center; gap: var(--space-performance-sm); } .accept input { flex-shrink: 0; }
  .feedback { border-left: 2px solid var(--color-performance-fg-primary); padding: var(--space-performance-md); }
  @media (max-width: 640px) { header { flex-direction: column; } .audience { grid-template-columns: 1fr; } h1 { font-size: var(--text-performance-h1); } input[type='datetime-local'] { width: 100%; min-width: 0; } }
</style>
