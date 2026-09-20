<script lang="ts">
  import { api } from '$lib/client';
  import { invalidateAll } from '$app/navigation';
  let { data } = $props();
  let name = $state('');
  let description = $state('');
  let access = $state('members');
  $effect(() => {
    name = data.network?.name || '';
    description = data.network?.description || '';
    access = data.network?.access_model || 'members';
  });
  let usage = $state<{ delivered_minutes: number; period: string; checked_at: number } | null>(
    null
  );
  let busy = $state(false);
  let message = $state('');
  let failed = $state(false);
  async function loadUsage() {
    busy = true;
    message = '';
    failed = false;
    try {
      usage = (await api('usage', undefined, data.network!.slug)).usage;
    } catch (e) {
      failed = true;
      message = (e as Error).message;
    } finally {
      busy = false;
    }
  }
  async function billing(action: 'checkout' | 'portal' | 'refresh') {
    busy = true;
    message = '';
    failed = false;
    try {
      const result = await api('billing', { action }, data.network!.slug);
      if (result.url) window.location.assign(result.url);
      else {
        await invalidateAll();
        message = 'Subscription status refreshed.';
      }
    } catch (e) {
      failed = true;
      message = (e as Error).message;
    } finally {
      busy = false;
    }
  }
  async function save(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    message = '';
    failed = false;
    try {
      await api('settings', { name, description, access_model: access }, data.network!.slug);
      await invalidateAll();
      message = 'Network settings saved.';
    } catch (e) {
      failed = true;
      message = (e as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head
  ><title>Network settings | CREATE SOMETHING Private</title><meta
    name="robots"
    content="noindex"
  /></svelte:head
>
<main id="main" class="form-page">
  <a href="/dashboard">← Your networks</a>
  <p class="eyebrow">PRIVATE / NETWORK SETTINGS</p>
  <h1>Shape your<br /><em>network.</em></h1>
  <p class="muted">/n/{data.network?.slug} · {data.network?.status}</p>
  {#if data.network?.status === 'draft'}<aside class="notice">
      <h2>Your draft is ready.</h2>
      <p>
        Choose your network’s name and access below, then prepare your first asset. Video uploads
        require subscription activation; asset sales open after seller payment setup.
      </p>
    </aside>{/if}
  {#if data.network?.status === 'suspended'}<aside class="notice">
      <h2>Your network is suspended.</h2>
      <p>
        Publishing and playback are currently unavailable. Your settings and content records remain
        available here.
      </p>
    </aside>{/if}
  <nav class="workspace-trail" aria-label="Builder setup">
    <a href={`/n/${data.network?.slug}/assets`}>Package an asset →</a><a
      href={`/n/${data.network?.slug}/studio`}>Teach a technique →</a
    >
  </nav>
  <form onsubmit={save}>
    <label>Network name<input bind:value={name} required maxlength="80" /></label>
    <label
      >Description<textarea
        bind:value={description}
        maxlength="500"
        rows="4"
        placeholder="What will members learn and build here?"
      ></textarea></label
    >
    <label
      >Access model<select bind:value={access}
        ><option value="members">Members only</option><option value="preview"
          >Members + selected public previews</option
        ></select
      ></label
    >
    <p class="muted">
      Switching to members only makes every existing public video preview private. Switching back
      does not republish those previews.
    </p>
    {#if message}<p role={failed ? 'alert' : 'status'} class:error={failed}>{message}</p>{/if}
    <button class="button" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
  </form>
  <section class="notice" aria-labelledby="usage-title">
    <h2 id="usage-title">Delivery and export</h2>
    {#if usage}<p role="status">
        {Math.ceil(usage.delivered_minutes).toLocaleString()} / 5,000 minutes delivered in {usage.period}.
      </p>{/if}
    <p class="muted">
      Provider-reported delivery includes buffering. Updates can be delayed; new playback stops when
      reported usage reaches the monthly allowance. There are no automatic overage charges.
    </p>
    <button class="button secondary" type="button" disabled={busy} onclick={loadUsage}
      >Check delivery usage</button
    >
    <p><a href={`/api/networks/${data.network?.slug}/export`}>Download network records →</a></p>
    <p class="muted">
      The JSON export includes sessions, members, activity, asset metadata and release
      documentation. It does not include video files or ZIP packages. Download packages from their
      asset pages and keep your original files as backups.
    </p>
  </section>
  <section class="notice" aria-labelledby="billing-title">
    <p class="eyebrow">SUBSCRIPTION / PER NETWORK</p>
    <h2 id="billing-title">$24.50 <span class="muted">USD / month</span></h2>
    <p>
      One owner · 100 active members · 20 sessions of up to 30 minutes each · 5,000 delivered video
      minutes per calendar month.
    </p>
    <p class="muted">
      Monthly subscription. No automatic overage charges. Cancel through billing to stop renewal at
      the end of your paid period.
    </p>
    {#if data.billing?.status && data.billing.status !== 'none'}
      <p>
        Status: <strong>{data.billing.status}</strong>{#if data.billing.periodEnd}
          · {data.billing.cancelAtPeriodEnd ? 'Access ends' : 'Current period ends'}
          {new Date(data.billing.periodEnd * 1000).toLocaleDateString('en-US', {
            timeZone: 'UTC'
          })}{/if}
      </p>
    {/if}
    <div class="links">
      {#if data.billing?.hasCustomer}<button
          class="button secondary"
          type="button"
          disabled={busy}
          onclick={() => billing('portal')}>Manage billing →</button
        ><button
          class="button secondary"
          type="button"
          disabled={busy}
          onclick={() => billing('refresh')}>Refresh status</button
        >{/if}
      {#if data.billingEnabled && (!data.billing || ['none', 'canceled', 'incomplete_expired'].includes(data.billing.status))}<button
          class="button"
          type="button"
          disabled={busy}
          onclick={() => billing('checkout')}>Activate for $24.50/month →</button
        >{/if}
    </div>
    {#if !data.billingEnabled}<p class="muted">
        Paid activation is not available yet. Your draft is saved; no payment has been taken.
      </p>{/if}
  </section>
  <div class="links">
    <a href={`/n/${data.network?.slug}/studio`}>Open studio →</a><a
      href={`/n/${data.network?.slug}`}>View library →</a
    >
  </div>
</main>

<style>
  .eyebrow {
    margin-top: 36px;
  }
  .notice {
    padding: 24px;
    border: 1px solid var(--line);
    margin: 24px 0;
  }
  .notice h2 {
    font-size: 24px;
  }
  .notice p {
    margin-bottom: 0;
  }
  .links {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    margin-top: 32px;
  }
</style>
