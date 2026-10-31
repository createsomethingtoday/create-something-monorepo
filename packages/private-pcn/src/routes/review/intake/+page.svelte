<script lang="ts">
  import { enhance } from '$app/forms';
  import SerifPhrase from '$lib/components/SerifPhrase.svelte';
  import StatusNotice from '$lib/components/StatusNotice.svelte';
  import { intakePaths } from '$lib/intake';
  import type { PageProps } from './$types';
  let { data, form }: PageProps = $props();
  let busy = $state(false),
    transportError = $state('');
</script>

<svelte:head
  ><title>Invitation requests | Private</title><meta name="robots" content="noindex" /></svelte:head
>
<main id="main" class="builder-workspace">
  <p class="eyebrow">PRIVATE / INVITATION REQUESTS</p>
  <h1>A few new<br /><SerifPhrase text="introductions." /></h1>
  <p class="lede">
    Review learner and creator interest before an invitation. Contact details and work links are
    self-reported; email ownership is not yet verified.
  </p>
  <p>
    Marking a request reviewed does not send an email or grant access. Use the existing <a
      href="/admin">member access</a
    >
    or <a href="/dashboard">creator invitation</a> workflow after review. Creator publishing still requires
    credentials and a teaching-video review.
  </p>
  <a href="/review">Creator review queue</a>
  <nav class="queue-tabs" aria-label="Request status">
    {#each ['new', 'reviewed', 'closed'] as status}<a
        href={`/review/intake?status=${status}`}
        aria-current={data.status === status ? 'page' : undefined}
        >{status} ({data.counts.find((row) => row.status === status)?.count || 0})</a
      >{/each}
  </nav>
  {#if form?.error || transportError}<StatusNotice
      tone="error"
      message={transportError || form?.error || ''}
    />{:else if form?.success}<StatusNotice
      tone="success"
      message="Review recorded. No access was granted or message sent."
    />{/if}
  {#each data.introductions as introduction (introduction.id)}
    <article class="builder-panel introduction">
      <p class="eyebrow">
        {intakePaths.find((path) => path.value === introduction.intent)?.title} / {introduction.created_at}
        UTC
      </p>
      <h2>{introduction.display_name}</h2>
      <p>{introduction.email} <span class="muted">(unverified)</span></p>
      <p class="preserve">{introduction.practice}</p>
      {#if introduction.work_url}<a
          href={introduction.work_url}
          target="_blank"
          rel="noopener noreferrer">Open submitted work (external, unreviewed)</a
        >{/if}
      {#if introduction.referral}<p>
          Introduced by: {introduction.referral} <span class="muted">(self-reported)</span>
        </p>{/if}
      {#if introduction.review_note}<p class="preserve">
          Last review: {introduction.review_note}
        </p>{/if}
      <form
        method="POST"
        use:enhance={({ cancel }) => {
          if (busy) {
            cancel();
            return;
          }
          busy = true;
          transportError = '';
          return async ({ result, update }) => {
            busy = false;
            if (result.type === 'error')
              transportError = 'Review could not be confirmed. Refresh before retrying.';
            else await update({ reset: false });
          };
        }}
      >
        <input type="hidden" name="id" value={introduction.id} />
        <input type="hidden" name="revision" value={introduction.revision} />
        <label
          >Review note<textarea
            name="note"
            required
            minlength="5"
            maxlength="2000"
            placeholder="Fit, follow-up, and the next step. Internal only."
          ></textarea></label
        >
        <div class="actions">
          <button class="button" name="status" value="reviewed" disabled={busy}
            >Mark reviewed</button
          >
          <button class="button secondary" name="status" value="closed" disabled={busy}
            >Close request</button
          >
          {#if data.status !== 'new'}<button
              class="button secondary"
              name="status"
              value="new"
              disabled={busy}>Return to new</button
            >{/if}
        </div>
      </form>
    </article>
  {:else}<p class="empty">No {data.status} introductions.</p>{/each}
  <p class="muted">
    Showing the oldest 200 in this status. Process these to reach later requests. Introductions and
    their review notes expire 90 days after submission.
  </p>
</main>

<style>
  .queue-tabs {
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
    margin: 32px 0;
  }
  .queue-tabs a {
    text-transform: capitalize;
    padding: 12px 0;
  }
  .queue-tabs a[aria-current] {
    color: var(--signal);
  }
  .introduction {
    margin: 24px 0;
    overflow-wrap: anywhere;
  }
  .introduction label {
    display: grid;
    gap: 12px;
    margin: 24px 0;
  }
</style>
