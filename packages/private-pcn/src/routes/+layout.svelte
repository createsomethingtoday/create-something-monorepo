<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { api } from '$lib/client';
  let { children, data } = $props();
  onMount(() => {
    // Keep active viewing sessions alive; every grant still checks current membership.
    const timer = setInterval(
      () => {
        if (data.identity) api('refresh', {}).catch(() => {});
      },
      10 * 60 * 1000
    );
    return () => clearInterval(timer);
  });
</script>

<a class="skip" href="#main">Skip to content</a>
<header class="masthead">
  <a class="wordmark" href="/" aria-label="CREATE SOMETHING Private home"
    >CREATE SOMETHING<span>PRIVATE / .AGENCY</span></a
  >
  <nav aria-label="Primary">
    <a href="/library">Explore the library</a><a href="/login"
      >Member sign in <span aria-hidden="true">↗</span></a
    >
  </nav>
</header>
{@render children()}
<footer>
  <a href="https://createsomething.agency">CREATE SOMETHING .agency</a><span
    >Your content. Your audience. Your platform.</span
  >
  <div>
    <a href="https://createsomething.agency/privacy">Privacy</a><a
      href="https://createsomething.agency/terms">Terms</a
    >
  </div>
</footer>
