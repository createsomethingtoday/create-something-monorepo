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
  let inviteBusy = $state(false);
  let inviteMessage = $state('');
  let inviteEmail = $state(''),
    inviteUrl = $state('');
  async function invite(e: SubmitEvent) {
    e.preventDefault();
    inviteBusy = true;
    inviteMessage = '';
    inviteUrl = '';
    try {
      const result = await api('creators/invitations', { action: 'create', email: inviteEmail });
      inviteUrl = new URL(result.url, window.location.origin).href;
    } catch (e) {
      inviteMessage = (e as Error).message;
    } finally {
      inviteBusy = false;
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
  <header class="workspace-heading">
    <div>
      <p class="eyebrow">PRIVATE / BUILDER WORKSPACE</p>
      <h1>Your networks.</h1>
      <p class="workspace-intro">
        Teach the technique. Share the tools. Build a practice people can use.
      </p>
    </div>
    <a class="collection-link" href="/collection"
      >Your acquired assets <Icon name="arrow-right" /></a
    >
  </header>
  <section aria-labelledby="networks-title">
    <div class="section-heading">
      <h2 id="networks-title">
        {data.networks.length ? 'Continue your work' : 'Start your network'}
        <span class="muted">({data.networks.length})</span>
      </h2>
      {#if data.approved && data.networks.length > 0 && data.remainingNetworks > 0}<a
          href="#network-setup">Create another network <Icon name="arrow-right" /></a
        >{/if}
    </div>
    {#if data.networks.length}
      <div class="network-grid">
        {#each data.networks as network}
          <article class="network-card">
            <div class="network-heading">
              <Icon name="network" size={24} />
              <p class="eyebrow">{network.format}</p>
              <span class="network-status"
                >{network.status === 'active'
                  ? 'Active'
                  : network.status === 'draft'
                    ? 'Draft'
                    : 'Suspended'}</span
              >
            </div>
            <h3>{network.name}</h3>
            <p class="muted address">/n/{network.slug}</p>
            <p class="network-description">
              {network.description ||
                'Teach an agentic engineering technique and share the tools behind it.'}
            </p>
            {#if network.status !== 'active'}<p class="state-note">
                <Icon name="lock" />
                {network.status === 'draft'
                  ? 'Draft network. Open settings to review activation and access.'
                  : 'Member access is paused. Check your network settings.'}
              </p>{/if}
            <div class="network-primary">
              <a
                class="button"
                href={`/n/${network.slug}/${network.status === 'active' ? 'assets' : 'settings'}`}
                >{network.status === 'active' ? 'Manage assets' : 'Review settings'}
                <Icon name="arrow-right" /></a
              >
              <a href={`/n/${network.slug}`}>View library <Icon name="arrow-right" /></a>
            </div>
            <dl class="network-tools">
              {#if network.status !== 'active'}<div>
                  <dt><Icon name="package" /> Package</dt>
                  <dd>
                    <a href={`/n/${network.slug}/assets`}>Assets</a><span
                      >MCPs, plugins and skills</span
                    >
                  </dd>
                </div>{/if}
              <div>
                <dt><Icon name="terminal" /> Teach</dt>
                <dd>
                  <a href={`/n/${network.slug}/studio`}>Sessions</a><span
                    >Technical walkthroughs</span
                  >
                </dd>
              </div>
              <div>
                <dt><Icon name="skill" /> Document</dt>
                <dd>
                  <a href={`/n/${network.slug}/field-notes`}>Field notes</a><span
                    >Decisions and lessons</span
                  >
                </dd>
              </div>
              <div>
                <dt><Icon name="workflow" /> Understand</dt>
                <dd>
                  <a href={`/n/${network.slug}/impact`}>Impact</a><span>Audience activity</span>
                </dd>
              </div>
              <div>
                <dt><Icon name="lock" /> Manage</dt>
                <dd>
                  <a href={`/n/${network.slug}/settings`}>Settings</a><span
                    >Access and activation</span
                  >
                </dd>
              </div>
            </dl>
          </article>
        {/each}
      </div>
    {:else}
      <div class="empty">
        <Icon name="network" size={32} />
        <div>
          <h3>A home for your engineering practice.</h3>
          <p>
            {data.approved
              ? 'Create a private draft, then add a walkthrough, an MCP server, an agent plugin or a skill.'
              : 'Creator review unlocks your workspace. You can explore the library and collect assets while you apply.'}
          </p>
        </div>
      </div>
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
  {#if data.approved && data.remainingNetworks === 0}<p class="capacity-note">
      Your account has reached its three-network limit, including company-support workspaces.
      Continue with an existing network.
    </p>{/if}
  {#if data.approved && data.remainingNetworks > 0}
    <section class="setup" id="network-setup" aria-labelledby="create-title">
      <div>
        <p class="eyebrow">CREATE A PRIVATE DRAFT</p>
        <h2 id="create-title">Name your network.</h2>
        <p>Start with a draft. Creating a network does not charge you or publish any content.</p>
      </div>
      <form onsubmit={create}>
        <label
          >Network name<input
            bind:value={name}
            maxlength="80"
            required
            placeholder="Agent Engineering Lab"
            autocomplete="off"
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
  {#if data.approved}<details class="invite-panel">
      <summary>Invite a creator · one free month after approval</summary>
      <p>
        Invite someone whose engineering practice you trust. They submit credentials and a teaching
        video for review. Share the link with the exact email address below.
      </p>
      <form class="builder-form" onsubmit={invite}>
        <label
          >Creator email<input
            type="email"
            disabled={inviteBusy}
            bind:value={inviteEmail}
            oninput={() => {
              inviteUrl = '';
              inviteMessage = '';
            }}
            required
          /></label
        ><button class="button secondary" disabled={inviteBusy}
          >{inviteBusy ? 'Creating invitation…' : 'Create invitation'}</button
        >
      </form>
      {#if inviteMessage}<p class="error" role="alert">{inviteMessage}</p>{/if}
      {#if inviteUrl}<p role="status">Invitation ready. Share this link with {inviteEmail}.</p>
        <label
          >Invitation link<input
            readonly
            value={inviteUrl}
            onclick={(e) => e.currentTarget.select()}
          /></label
        >
        <p class="field-hint">Valid for 30 days. Only the invited email can redeem it.</p>{/if}
    </details>{/if}
</main>

<style>
  .workspace {
    padding: var(--space-performance-lg) 4.5vw var(--space-performance-xl);
    max-width: 1280px;
    margin: auto;
  }
  .workspace-heading {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--space-performance-md);
    padding-bottom: var(--space-performance-lg);
    border-bottom: 1px solid var(--line);
  }
  .workspace-heading .eyebrow {
    margin-bottom: var(--space-performance-sm);
  }
  .workspace h1 {
    font-size: clamp(36px, 4vw, 56px);
    letter-spacing: -0.04em;
    margin-bottom: var(--space-performance-sm);
  }
  .workspace-intro {
    color: var(--muted);
    max-width: 48ch;
    margin: 0;
  }
  .collection-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-performance-xs);
    min-height: 44px;
    font-size: 14px;
    flex-shrink: 0;
  }
  section {
    margin-top: var(--space-performance-lg);
  }
  .section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-performance-sm);
    margin-bottom: var(--space-performance-md);
  }
  h2 {
    font-size: 24px;
    letter-spacing: -0.025em;
    margin: 0;
  }
  .section-heading h2 span {
    font: 12px var(--font-performance-mono);
    margin-left: var(--space-performance-xs);
  }
  .section-heading > a {
    font-size: 14px;
  }
  .network-grid {
    display: grid;
    gap: var(--space-performance-md);
  }
  .network-card {
    border: 1px solid var(--line);
    padding: var(--space-performance-md);
    min-width: 0;
  }
  .network-heading {
    display: flex;
    align-items: center;
    gap: var(--space-performance-xs);
    margin-bottom: var(--space-performance-md);
  }
  .network-heading .eyebrow {
    margin: 0;
  }
  .network-status {
    margin-left: auto;
    border: 1px solid var(--line);
    padding: 4px 10px;
    font: 12px var(--font-performance-mono);
  }
  .network-card h3 {
    font-size: 28px;
    letter-spacing: -0.03em;
    margin-bottom: var(--space-performance-xs);
    overflow-wrap: anywhere;
  }
  .address {
    font: 12px/1.7 var(--font-performance-mono);
    overflow-wrap: anywhere;
  }
  .network-description {
    max-width: 70ch;
    color: var(--muted);
  }
  .state-note {
    display: flex;
    align-items: center;
    gap: var(--space-performance-xs);
    font-size: 14px;
  }
  .network-primary {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-performance-md);
    margin-block: var(--space-performance-md);
    font-size: 14px;
  }
  .network-tools {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: var(--space-performance-sm);
    border-top: 1px solid var(--line);
    padding-top: var(--space-performance-md);
    margin-bottom: 0;
  }
  .network-tools dt {
    display: flex;
    align-items: center;
    gap: var(--space-performance-xs);
    font: 11px var(--font-performance-mono);
    text-transform: uppercase;
    color: var(--muted);
  }
  .network-tools dd {
    margin: 0;
  }
  .network-tools a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    font-size: 16px;
  }
  .network-tools span {
    display: block;
    color: var(--muted);
    font-size: 12px;
  }
  .empty {
    display: flex;
    align-items: flex-start;
    gap: var(--space-performance-md);
    border: 1px solid var(--line);
    padding: var(--space-performance-md);
  }
  .empty h3 {
    font-size: 20px;
    margin-bottom: var(--space-performance-xs);
  }
  .empty p {
    color: var(--muted);
    max-width: 65ch;
    margin-bottom: 0;
  }
  .setup {
    display: grid;
    grid-template-columns: 1fr 1.2fr;
    gap: var(--space-performance-xl);
    border-top: 1px solid var(--line);
    padding-top: var(--space-performance-lg);
    scroll-margin-top: var(--space-performance-lg);
  }
  .setup .eyebrow {
    margin-bottom: var(--space-performance-sm);
  }
  .setup h2 {
    margin-bottom: var(--space-performance-sm);
  }
  .setup > div p {
    max-width: 34ch;
    color: var(--muted);
  }
  .setup form {
    margin: 0;
    gap: var(--space-performance-sm);
  }
  .setup form p {
    margin-bottom: 0;
    font-size: 13px;
  }
  .invite-panel {
    margin-top: var(--space-performance-lg);
    border-top: 1px solid var(--line);
    padding-top: var(--space-performance-md);
  }
  .invite-panel summary {
    cursor: pointer;
    padding-block: var(--space-performance-xs);
  }
  .invite-panel summary:focus-visible {
    outline: 3px solid var(--signal);
    outline-offset: 5px;
  }
  .invite-panel > p {
    max-width: 65ch;
    margin-top: var(--space-performance-sm);
    color: var(--muted);
  }
  .invite-panel form {
    max-width: 560px;
  }
  .invite-panel .error {
    color: var(--color-performance-risk-soft);
  }
  .capacity-note {
    color: var(--muted);
    margin-top: var(--space-performance-md);
  }
  .notice {
    margin-top: var(--space-performance-md);
  }
  .notice h2 {
    margin-bottom: var(--space-performance-sm);
  }
  @media (max-width: 760px) {
    .workspace-heading {
      align-items: flex-start;
      flex-direction: column;
    }
    .section-heading {
      align-items: flex-start;
      flex-direction: column;
    }
    .network-tools {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      row-gap: var(--space-performance-md);
    }
    .setup {
      grid-template-columns: 1fr;
      gap: var(--space-performance-md);
    }
    .workspace {
      padding-top: var(--space-performance-md);
    }
    .network-primary .button {
      width: 100%;
    }
    .empty {
      flex-direction: column;
    }
  }
</style>
