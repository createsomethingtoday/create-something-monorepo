<script lang="ts">
  import { api } from '$lib/client';
  import { invalidateAll } from '$app/navigation';
  import Icon from '$lib/components/Icon.svelte';
  let { data } = $props();
  let method = $state('rustdesk'),
    scope = $state(''),
    budget = $state(0),
    consent = $state(false),
    busy = $state(false),
    message = $state('');
  const openRequest = $derived(
    data.sessions.some(
      (s: any) =>
        s.network_id === data.network &&
        ['requested', 'accepted'].includes(s.status) &&
        s.expires_at * 1000 > Date.now()
    )
  );
  let meeting = $state<Record<string, string>>({}),
    outcome = $state<Record<string, string>>({});
  async function act(body: Record<string, unknown>) {
    busy = true;
    message = '';
    try {
      await api('remote-sessions', body);
      await invalidateAll();
      message = 'Session updated.';
    } catch (e) {
      message = (e as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head
  ><title>Remote support | PRIVATE</title><meta name="robots" content="noindex" /></svelte:head
>
<main id="main" class="builder-workspace">
  <p class="eyebrow">PRIVATE / WORK TOGETHER</p>
  <h1>Your environment.<br /><em>A builder beside you.</em></h1>
  <p class="lede">
    Get hands-on help with the assets you own or your company’s agreed workflow. RustDesk provides
    attended screen control without a video call. Your creator can offer their own Zoom meeting
    instead.
  </p>
  <p>
    No support hours are included with an asset unless its creator promises them. Agree on scope and
    any service charge before connecting.
  </p>
  {#if !data.enabled}<p class="availability">
      Remote-session setup is awaiting verification. Existing records remain available.
    </p>{/if}
  {#if data.network && data.enabled && !openRequest}
    <section class="builder-panel">
      <h2>Request a working session</h2>
      <form
        class="builder-form"
        onsubmit={(e) => {
          e.preventDefault();
          void act({
            action: 'request',
            network: data.network,
            method,
            scope,
            budget: Math.round(budget * 100),
            consent
          });
        }}
      >
        <label
          >Connection method<select bind:value={method}
            ><option value="rustdesk">RustDesk · attended screen control</option><option
              value="zoom">Creator’s Zoom · screen sharing and optional control</option
            ></select
          ></label
        >
        <label
          >What may the creator work on?<textarea
            bind:value={scope}
            required
            minlength="20"
            maxlength="2000"
            placeholder="Name the project, the task and what success looks like. Do not include passwords or confidential files."
          ></textarea></label
        >
        <label
          >Maximum additional AI/provider usage (USD)<input
            type="number"
            bind:value={budget}
            min="0"
            max="1000"
            step="0.01"
            required
          /></label
        >
        <p class="field-hint">
          This records your agreement; PRIVATE does not meter or enforce provider spending. Set
          limits with your AI provider. Zero means no additional spend is authorized.
        </p>
        <label class="consent"
          ><input type="checkbox" bind:checked={consent} required /> I will attend and approve device
          access. This task does not authorize production deployment, deletion, purchases or sharing credentials.
          I will approve any expanded scope separately.</label
        >
        <button class="button" disabled={busy || !consent}
          >{busy ? 'Saving…' : 'Request session'}</button
        >
      </form>
    </section>
  {:else if openRequest}<p class="availability">
      Your request is open. Continue in the session below.
    </p>
  {:else if !data.network}<p>
      Open an owned asset or active company workspace to request a session with its creator.
    </p>{/if}
  <p role="status">{message}</p>
  <h2>Your sessions</h2>
  {#if !data.sessions.length}<section class="builder-panel">
      <p>No sessions yet. Requests and follow-through will appear here.</p>
    </section>{/if}
  {#each data.sessions as s}
    {@const expired = s.expires_at * 1000 < Date.now()}
    {@const creator = data.subject === s.creator_id}
    <section class="builder-panel">
      <p class="eyebrow">
        {s.method === 'rustdesk' ? 'RUSTDESK' : 'ZOOM'} / {expired &&
        ['requested', 'accepted'].includes(s.status)
          ? 'EXPIRED'
          : s.status.toUpperCase()}
      </p>
      <h3>{s.name}</h3>
      {#if creator}<p>Requested by {s.buyer_email || 'a verified buyer'}.</p>{/if}
      <p class="preserve">{s.scope}</p>
      <p>
        Buyer’s additional provider budget: ${(s.budget_cents / 100).toFixed(2)}. {s.status ===
        'accepted'
          ? 'Session window'
          : 'Request'} expires {new Date(s.expires_at * 1000).toLocaleString()}.
      </p>
      {#if s.status === 'requested' && creator && !expired && data.enabled}
        {#if s.method === 'zoom'}<label
            >Your Zoom meeting link<input
              type="url"
              bind:value={meeting[s.id]}
              placeholder="https://your-company.zoom.us/j/…"
            /></label
          >{/if}
        <div class="actions">
          <button
            class="button"
            disabled={busy}
            onclick={() => act({ action: 'accept', id: s.id, meeting: meeting[s.id] })}
            >Accept task and budget</button
          ><button
            class="button secondary"
            disabled={busy}
            onclick={() =>
              act({ action: 'decline', id: s.id, outcome: 'Creator declined this request.' })}
            >Decline</button
          >
        </div>
      {/if}
      {#if s.status === 'accepted' && !expired}
        {#if s.method === 'rustdesk'}
          <div class="connection-guide">
            <h4>Connect with RustDesk</h4>
            <ol>
              <li>
                Both people install the <a
                  href="https://rustdesk.com/download"
                  target="_blank"
                  rel="noreferrer">official RustDesk app <Icon name="arrow-right" /></a
                >. Each person grants their own operating-system permissions.
              </li>
              <li>
                In Network settings, use ID server <code>support.createsomething.io</code>, relay
                <code>support.createsomething.io:21117</code>, leave API server empty, and enter
                public key <code class="key">7SYSc0h6a+0ibKDmAwDXwZo9dkvNOMMSvGtZbU2BT+Q=</code>.
              </li>
              <li>
                The buyer privately shares their current RustDesk ID and one-time password with this
                creator. Keep passwords out of PRIVATE notes. Close unrelated windows and approve
                the connection in RustDesk.
              </li>
              <li>
                Check screen display and control together before working. Keep the buyer present; do
                not enable a permanent password or unattended service.
              </li>
            </ol>
            <p class="field-hint">
              PRIVATE records the agreement; RustDesk controls the connection. The shared relay does
              not enforce PRIVATE membership or session expiry.
            </p>
          </div>
        {:else}<a class="button" href={s.meeting_url} target="_blank" rel="noreferrer"
            >Open creator’s Zoom meeting <Icon name="arrow-right" /></a
          >
          <p>
            The buyer starts screen sharing and approves remote control only when needed. Camera
            sharing is optional.
          </p>{/if}
      {/if}
      {#if ['requested', 'accepted'].includes(s.status) && data.enabled}
        <label
          >Outcome, verification and next steps<textarea
            bind:value={outcome[s.id]}
            maxlength="4000"
            placeholder="Record what changed and how it was checked. No credentials or private device details."
          ></textarea></label
        >
        <p class="field-hint">
          First disconnect in RustDesk or Zoom. Ending this record or reaching its expiry does not
          disconnect a native remote session. Quit RustDesk; remove its permissions when access is
          no longer needed.
        </p>
        <button
          class="button secondary"
          disabled={busy}
          onclick={() => act({ action: 'end', id: s.id, outcome: outcome[s.id] || '' })}
          >End session record</button
        >
      {:else if s.outcome}<h4>Follow-through</h4>
        <p class="preserve">{s.outcome}</p>{/if}
    </section>
  {/each}
</main>

<style>
  .builder-panel {
    margin-block: 1.5rem;
  }
  .consent {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }
  .consent input {
    width: auto;
    flex: none;
    margin-top: 0.3rem;
  }
  .connection-guide {
    border-top: 1px solid var(--color-border);
    margin-block: 1.5rem;
    padding-top: 1rem;
  }
  .connection-guide li {
    margin-block: 1rem;
  }
  .key {
    overflow-wrap: anywhere;
  }
  .preserve {
    white-space: pre-wrap;
  }
  label {
    display: grid;
    gap: 0.5rem;
  }
  h3 {
    font-size: 1.5rem;
  }
</style>
