<script lang="ts">
  import { api } from '$lib/client';
  import Icon from '$lib/components/Icon.svelte';
  let { data } = $props();
  let company = $state(''),
    workflow = $state(''),
    partner = $state(''),
    busy = $state(false),
    message = $state('');
  async function request(e: SubmitEvent) {
    e.preventDefault();
    busy = true;
    message = '';
    try {
      const { workspace } = await api('support', { action: 'request', company, workflow, partner });
      window.location.assign(`/support/${workspace.id}`);
    } catch (e) {
      message = (e as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head
  ><title>Private company support | CREATE SOMETHING</title><meta
    name="description"
    content="Scoped agentic engineering support for your company, delivered by approved CREATE SOMETHING partners. $900 per month for one agreed workflow."
  /><link rel="canonical" href="https://private.createsomething.agency/support" /></svelte:head
>
<main id="main" class="builder-workspace">
  <p class="eyebrow">PRIVATE / COMPANY SUPPORT</p>
  <h1>Your project.<br /><em>A shared working context.</em></h1>
  <p class="lede">
    Work through one agentic engineering workflow with an approved CREATE SOMETHING partner. Keep
    the context, decisions and follow-through in a private company workspace.
  </p>
  <div class="builder-split">
    <section>
      <p class="plan-price">$900 <span>USD / month</span></p>
      <h2>One workflow.<br />A clear support boundary.</h2>
      <ul class="install-steps">
        <li>Guidance on architecture, tools, permissions and evaluation.</li>
        <li>Skills, runbooks and scheduled check-ins for the agreed workflow.</li>
        <li>A private workspace for decisions, questions and updates.</li>
      </ul>
      <p>
        Custom implementation, provider usage, production operations and incident response are
        scoped separately. This is not unlimited development or an on-call service.
      </p>
      <p>Creator invitation credits apply to network hosting, not company support.</p>
      {#if data.isPartner}<a href="/support/partner"
          >Set up partner payouts <Icon name="arrow-right" /></a
        >{/if}
    </section>
    <section class="builder-panel">
      <h2>Agree on the work first.</h2>
      <p>
        Submit a workflow for your chosen partner to review. No charge is made when you send this
        request. Subscribe only after the scope is accepted.
      </p>
      {#if !data.identity}<a class="button" href="/login?next=/support" data-impact="primary_action"
          >Sign in to request support <Icon name="arrow-right" /></a
        >{:else if data.partners.length}<form class="builder-form" onsubmit={request}>
          <label
            >Company name<input
              bind:value={company}
              required
              minlength="2"
              maxlength="100"
              autocomplete="organization"
            /></label
          ><label
            >Approved delivery partner<select bind:value={partner} required
              ><option value="" disabled>Select a partner</option>{#each data.partners as p}<option
                  value={p.subject}>{p.display_name}</option
                >{/each}</select
            ></label
          ><label
            >The workflow to support<textarea
              bind:value={workflow}
              required
              minlength="30"
              maxlength="4000"
              placeholder="Describe the workflow, current bottleneck, operator and outcome you need. Exclude credentials and sensitive client data."
            ></textarea></label
          ><button class="button" disabled={busy} data-impact="primary_action"
            >{busy ? 'Submitting…' : 'Request scoped support'} <Icon name="arrow-right" /></button
          >
        </form>{:else}<p class="availability">
          Partner availability is being prepared. Company subscriptions are not open yet.
        </p>{/if}{#if message}<p class="error" role="alert">{message}</p>{/if}
    </section>
  </div>
  {#if data.workspaces.length}<section>
      <h2>Your support workspaces</h2>
      {#each data.workspaces as w}<article class="network-card">
          <p class="eyebrow">{w.status}</p>
          <h3>{w.company}</h3>
          <p>{w.workflow}</p>
          <a href={`/support/${w.network_id}`}>Open workspace <Icon name="arrow-right" /></a>
        </article>{/each}
    </section>{/if}
</main>
