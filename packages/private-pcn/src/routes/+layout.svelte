<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import '../app.css';
  import { afterNavigate } from '$app/navigation';
  import { trackImpact } from '$lib/impact';
  import { onMount } from 'svelte';
  import { api } from '$lib/client';
  let { children, data } = $props();
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
        if (data.identity) api('refresh', {}).catch(() => {});
      },
      10 * 60 * 1000
    );
    return () => {
      clearInterval(timer);
      document.removeEventListener('click', click);
    };
  });
</script>

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
    {#if data.reviewer}<a href="/review">Review queue</a><a href="/impact">Impact</a>{/if}
  </nav>
</header>
{@render children()}
<footer>
  <a href="https://createsomething.agency">CREATE SOMETHING .agency</a><span
    >Independent knowledge. Your own network.</span
  >
  <div>
    <a href="https://createsomething.agency/privacy">Privacy</a><a
      href="https://createsomething.agency/terms">Terms</a
    >
  </div>
</footer>
