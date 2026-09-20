<script lang="ts">
  import { api } from '$lib/client';
  import { invalidateAll } from '$app/navigation';
  import Icon from '$lib/components/Icon.svelte';
  let { data } = $props();
  let busy = $state(false),
    message = $state(''),
    body = $state('');
  async function action(value: string) {
    busy = true;
    message = '';
    try {
      if (value === 'update') {
        await api(`support/${data.workspace.network_id}`, { body });
        body = '';
      } else if (value === 'accept' || value === 'decline') {
        await api('support', { action: value, network: data.workspace.network_id });
      } else {
        const result = await api('billing', { action: value }, data.workspace.slug);
        if (result.url) {
          window.location.assign(result.url);
          return;
        }
      }
      await invalidateAll();
      message = 'Workspace updated.';
    } catch (e) {
      message = (e as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head
  ><title>{data.workspace.company} | Private support</title><meta
    name="robots"
    content="noindex"
  /></svelte:head
>
<main id="main" class="builder-workspace">
  <a href="/support"><Icon name="arrow-left" /> Company support</a>
  <p class="eyebrow">PRIVATE / {data.workspace.status}</p>
  <h1>{data.workspace.company}</h1>
  <div class="builder-split">
    <section>
      <h2>The agreed workflow</h2>
      <p class="preserve">{data.workspace.workflow}</p>
      <p>
        $900 USD/month. Guidance and scheduled check-ins for this workflow; custom builds, provider
        usage and managed operations are separate.
      </p>
      {#if data.workspace.status === 'requested' && data.identity?.subject === data.workspace.partner_id}<div
          class="actions"
        >
          <button class="button" disabled={busy} onclick={() => action('accept')}
            >Accept this scope</button
          ><button class="button secondary" disabled={busy} onclick={() => action('decline')}
            >Decline request</button
          >
        </div>{:else if data.workspace.status === 'requested'}<p class="availability">
          Waiting for your partner to review the scope. No subscription has started.
        </p>{/if}{#if data.workspace.owner_id === data.identity?.subject}<div class="actions">
          <button
            class="button"
            disabled={busy || data.workspace.status !== 'agreed' || !data.supportEnabled}
            onclick={() => action('checkout')}>Subscribe · $900/month</button
          ><button class="button secondary" disabled={busy} onclick={() => action('portal')}
            >Manage billing</button
          ><button class="button secondary" disabled={busy} onclick={() => action('refresh')}
            >Refresh subscription</button
          >
        </div>
        {#if !data.supportEnabled}<p class="field-hint">
            Paid activation is awaiting service verification. Your request is saved.
          </p>{/if}{/if}
    </section>
    <section class="builder-panel">
      <h2>Project updates</h2>
      <p>
        Visible only to the company account and its currently approved delivery partner. Never paste
        passwords, API keys or confidential data you are not authorized to share.
      </p>
      <form
        class="builder-form"
        onsubmit={(e) => {
          e.preventDefault();
          void action('update');
        }}
      >
        <label
          >Update or question<textarea bind:value={body} required minlength="5" maxlength="6000"
          ></textarea></label
        ><button class="button secondary" disabled={busy || data.workspace.status !== 'agreed'}
          >Post to workspace</button
        >
      </form>
      <p class="field-hint">Posting requires an active subscription.</p>
      {#each data.updates as update}<article class="manifest-section">
          <p class="eyebrow">
            {update.author === data.workspace.owner_id ? 'COMPANY' : 'PARTNER'} / {update.created_at}
          </p>
          <p class="preserve">{update.body}</p>
        </article>{:else}<p>No project updates yet.</p>{/each}
    </section>
  </div>
  {#if message}<p role="status">{message}</p>{/if}
</main>
