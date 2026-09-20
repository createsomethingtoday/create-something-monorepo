<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { api } from '$lib/client';
  let { data } = $props();
  let name = $state('');
  let slug = $state('');
  let format = $state('academy');
  let access = $state('members');
  let busy = $state(false);
  let message = $state('');
  let inviteEmail = $state(''),
    inviteUrl = $state('');
  async function invite(e: SubmitEvent) {
    e.preventDefault();
    busy = true;
    message = '';
    try {
      const result = await api('creators/invitations', { action: 'create', email: inviteEmail });
      inviteUrl = new URL(result.url, window.location.origin).href;
    } catch (e) {
      message = (e as Error).message;
    } finally {
      busy = false;
    }
  }
  async function create(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    message = '';
    try {
      const { network } = await api('networks', { name, slug, format, access_model: access });
      window.location.assign(`/n/${encodeURIComponent(network.slug)}/settings`);
    } catch (e) {
      message = (e as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head
  ><title>Your networks | CREATE SOMETHING Private</title><meta
    name="robots"
    content="noindex"
  /></svelte:head
>
<main id="main" class="workspace">
  <p class="eyebrow">PRIVATE / BUILDER WORKSPACE</p>
  <h1>Your practice.<br /><em>Made useful.</em></h1>
  <p class="lede">
    Create a home for the techniques you use and the assets behind them. Package MCP servers, agent
    plugins and skills alongside technical sessions.
  </p>
  <p>
    <a href="/collection"
      >Looking for an asset you acquired? Open your collection <Icon name="arrow-right" /></a
    >
  </p>
  {#if data.approved}<details class="builder-panel">
      <summary>Invite a creator · one free month after approval</summary>
      <p>
        Invite someone whose engineering practice you trust. They submit credentials and a teaching
        video for review. Share the link with the exact email address below.
      </p>
      <form class="builder-form" onsubmit={invite}>
        <label>Creator email<input type="email" bind:value={inviteEmail} required /></label><button
          class="button secondary"
          disabled={busy}>Create invitation</button
        >
      </form>
      {#if inviteUrl}<label
          >Invitation link<input
            readonly
            value={inviteUrl}
            onclick={(e) => e.currentTarget.select()}
          /></label
        >
        <p class="field-hint">Valid for 30 days. Only the invited email can redeem it.</p>{/if}
    </details>{/if}
  <section aria-labelledby="networks-title">
    <h2 id="networks-title">Your networks <span class="muted">({data.networks.length})</span></h2>
    {#if data.networks.length}
      <div class="network-grid">
        {#each data.networks as network}
          <article class="network-card">
            <p class="eyebrow">{network.format} / {network.status}</p>
            <h3>{network.name}</h3>
            <p class="muted address">/n/{network.slug}</p>
            <p>
              {network.description ||
                'Add a description to help members understand what belongs here.'}
            </p>
            <div class="actions">
              <a href={`/n/${network.slug}/assets`}>Manage assets <Icon name="arrow-right" /></a><a
                href={`/n/${network.slug}/studio`}>Sessions</a
              ><a href={`/n/${network.slug}/settings`}>Settings</a><a
                href={`/n/${network.slug}/impact`}>Impact</a
              ><a href={`/n/${network.slug}/field-notes`}>Field notes</a><a
                href={`/n/${network.slug}`}>View library</a
              >
            </div>
          </article>
        {/each}
      </div>
    {:else}
      <p class="empty">
        Your first network starts here. Give it a name, choose its address, and decide how people
        access it.
      </p>
    {/if}
  </section>
  {#if !data.approved}<aside class="notice">
      <h2>Creator review comes first.</h2>
      <p>
        Submit your professional credentials and a video teaching an agentic engineering technique.
        We review every creator before they can open a network.
      </p>
      <a class="button" href="/apply">Your application <Icon name="arrow-right" /></a>
    </aside>{/if}
  {#if data.approved && data.networks.length < 3}
    <section class="setup" aria-labelledby="create-title">
      <div>
        <p class="eyebrow">01 / CREATE A NETWORK</p>
        <h2 id="create-title">Make room for<br /><em>what you know.</em></h2>
        <p>Start with a draft. Creating a network does not charge you or publish any content.</p>
      </div>
      <form onsubmit={create}>
        <label
          >Network name<input
            bind:value={name}
            maxlength="80"
            required
            placeholder="Agent Engineering Lab"
          /></label
        >
        <label
          >Network address<input
            bind:value={slug}
            pattern={'[a-z0-9](?:[a-z0-9]|-){1,46}[a-z0-9]'}
            minlength="3"
            maxlength="48"
            autocapitalize="none"
            spellcheck="false"
            required
            placeholder="agent-engineering-lab"
            aria-describedby="address-help"
          /></label
        >
        <p id="address-help" class="muted address">
          private.createsomething.agency/n/{slug || 'your-network'}<br />Choose carefully: this
          address stays with your network.
        </p>
        <label
          >Network format<select bind:value={format}
            ><option value="academy">Academy — structured technical sessions</option><option
              value="collective">Collective — shared engineering practice</option
            ><option value="research">Research circle — experiments and findings</option></select
          ></label
        >
        <label
          >Access model<select bind:value={access}
            ><option value="members">Members only</option><option value="preview"
              >Members + selected public previews</option
            ></select
          ></label
        >
        <p class="muted">
          Sessions remain private until you publish them. Public previews require an explicit choice
          for each session.
        </p>
        {#if message}<p class="error" role="alert">{message}</p>{/if}
        <button class="button" disabled={busy}
          >{busy ? 'Creating…' : 'Create draft network'}
          <span aria-hidden="true"><Icon name="arrow-right" /></span></button
        >
      </form>
    </section>
  {/if}
</main>

<style>
  .workspace {
    padding: 60px 4.5vw 100px;
    max-width: 1440px;
    margin: auto;
  }
  .workspace h1 {
    font-size: clamp(48px, 6vw, 84px);
  }
  section {
    margin-top: 64px;
  }
  h2 {
    font-size: 32px;
    letter-spacing: -1px;
  }
  .network-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
    gap: 20px;
  }
  .network-card,
  .empty {
    border: 1px solid var(--line);
    padding: 28px;
  }
  .network-card h3 {
    font-size: 26px;
  }
  .network-card .eyebrow {
    margin-bottom: 16px;
  }
  .actions {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
    font-size: 14px;
  }
  .address {
    font: 12px/1.7 monospace;
    overflow-wrap: anywhere;
  }
  .setup {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8vw;
    border-top: 1px solid var(--line);
    padding-top: 48px;
  }
  .setup > div p {
    max-width: 420px;
  }
  .setup form {
    display: grid;
    gap: 20px;
  }
  .setup form p {
    margin-bottom: 0;
    font-size: 13px;
  }
  @media (max-width: 760px) {
    .setup {
      grid-template-columns: 1fr;
      gap: 24px;
    }
    .workspace {
      padding-top: 40px;
    }
    .workspace h1 {
      letter-spacing: -2px;
    }
  }
</style>
