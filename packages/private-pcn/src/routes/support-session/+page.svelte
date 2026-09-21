<script lang="ts">
  import { api } from '$lib/client';
  let { data } = $props();
  let email = $state(''),
    reason = $state(''),
    confirmed = $state(false),
    busy = $state(false),
    message = $state('');
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    message = '';
    try {
      await api('impersonation', { email, reason });
      window.location.assign('/dashboard');
    } catch (e) {
      message = (e as Error).message;
    } finally {
      busy = false;
    }
  }
  async function stop() {
    busy = true;
    try {
      await api('impersonation', { action: 'stop' });
      window.location.assign('/support-session');
    } catch (e) {
      message = (e as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head
  ><title>Act as a user | Private</title><meta name="robots" content="noindex" /></svelte:head
>
<main id="main" class="builder-workspace">
  <p class="eyebrow">PRIVATE / ADMINISTRATOR SUPPORT</p>
  <h1>Help from their workspace.</h1>
  <p class="lede">
    Use a 15-minute read and write session to troubleshoot onboarding, manage content, or help a
    creator set up their network. Their permissions and approval requirements still apply.
  </p>
  {#if message}<p role="alert">{message}</p>{/if}
  {#if data.active}<section class="builder-panel">
      <h2>A support session is open.</h2>
      <p>Return to your administrator account before choosing another user.</p>
      <button class="button" disabled={busy} onclick={stop}>Return to administrator</button>
    </section>
  {:else}<form class="builder-panel" onsubmit={submit}>
      <label
        >Account email<input
          type="email"
          bind:value={email}
          required
          maxlength="254"
          autocomplete="off"
        /></label
      >
      <label
        >Reason for access<textarea
          bind:value={reason}
          required
          minlength="10"
          maxlength="500"
          placeholder="Describe the support task or acceptance check."
        ></textarea></label
      >
      <p>
        Payments, seller accounts, company-support agreements, review decisions and credentials
        require the account holder or your administrator session. Every support request records both
        identities.
      </p>
      <label class="ack"
        ><input type="checkbox" bind:checked={confirmed} required /> I understand that changes affect
        this user’s real workspace.</label
      >
      <button class="button" disabled={busy || !confirmed}>Start read and write session</button>
    </form>{/if}
  <section class="builder-panel">
    <h2>Recent support sessions</h2>
    {#each data.sessions as session}<article>
        <p><strong>{String(session.target_email)}</strong> · {String(session.actor_email)}</p>
        <p>{String(session.reason)}</p>
        <p>
          {String(session.created_at)} · {session.revoked_at
            ? 'Ended'
            : Number(session.expires_at) * 1000 > Date.now()
              ? 'Active'
              : 'Expired'}
        </p>
      </article>{:else}<p>No support sessions yet.</p>{/each}
  </section>
</main>

<style>
  .ack {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .ack input {
    width: auto;
  }
  article {
    border-bottom: 1px solid var(--border);
    padding: 1rem 0;
  }
</style>
