<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import '../app.css';
  import { afterNavigate } from '$app/navigation';
  import { trackImpact } from '$lib/impact';
  import { onMount } from 'svelte';
  import { api } from '$lib/client';
  let { children, data } = $props();
  let accountMessage = $state('');
  async function leaveSupport() {
    try {
      await api('impersonation', { action: 'stop' });
      window.location.assign('/support-session');
    } catch (e) {
      accountMessage = (e as Error).message;
    }
  }
  afterNavigate(({ to }) => {
    if (to) trackImpact('page_view', to.url.pathname);
  });
  onMount(() => {
    const click = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest('[data-impact="primary_action"]'))
        trackImpact('primary_action', window.location.pathname);
    };
    document.addEventListener('click', click);
    // Keep active viewing sessions alive; every grant still checks current membership.
    const timer = setInterval(
      () => {
        if (data.identity && !data.impersonation) api('refresh', {}).catch(() => {});
      },
      10 * 60 * 1000
    );
    return () => {
      clearInterval(timer);
      document.removeEventListener('click', click);
    };
  });
</script>

<svelte:head><meta name="pcn-support-session" content={data.impersonation?.id || ''} /></svelte:head
>
{#if data.impersonation}
  <aside class="support-banner" aria-label="Administrator impersonation">
    <div>
      <strong
        ><Icon name="warning" /> Acting as {data.impersonation.email ||
          'an unavailable account'}</strong
      >
      <p>
        Read and write support session. Changes are real and audited. Ends {new Date(
          data.impersonation.expiresAt * 1000
        ).toLocaleTimeString()}.
      </p>
    </div>
    <button class="button secondary" onclick={leaveSupport}>Return to administrator</button>
    {#if accountMessage}<p class="error" role="alert">{accountMessage}</p>{/if}
  </aside>
{/if}
<a class="skip" href="#main">Skip to content</a>
<header class="masthead">
  <a class="wordmark" href="/" aria-label="CREATE SOMETHING Private home"
    >CREATE SOMETHING<span>PRIVATE / .AGENCY</span></a
  >
  <nav aria-label="Primary">
    <a href="/field-engineering">Field practice</a><a href="/library">Library</a>
    {#if data.identity}<a href="/collection">Your collection</a><a href="/dashboard"
        >Builder workspace</a
      >{:else}<a href="/login"
        >Sign in <span aria-hidden="true"><Icon name="arrow-right" /></span></a
      >{/if}
    {#if data.reviewer}<a href="/review">Review queue</a>{#if data.supportEnabled}<a
          href="/support-session">Act as a user</a
        >{/if}<a href="/impact">Impact</a>{/if}
  </nav>
</header>
{@render children()}
<footer>
  <a href="https://createsomething.agency">CREATE SOMETHING .agency</a><span
    >Independent knowledge. Your own network.</span
  >
  <div>
    <a href="/privacy">Privacy</a><a href="/terms">Terms</a>
  </div>
</footer>

<style>
  .support-banner {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    padding: 1rem 2rem;
    color: var(--state-warning);
    background: var(--color-performance-ink);
    border-bottom: 2px solid var(--state-warning);
  }
  .support-banner p {
    margin: 0.4rem 0 0;
    font-size: 0.85rem;
  }
</style>
