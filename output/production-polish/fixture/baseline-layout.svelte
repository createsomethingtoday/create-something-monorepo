<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import './baseline.css';
  import { page } from '$app/state';
  let adminOpen = $state(false);
  let menuOpen = $state(false);
  let enhanced = $state(false);
  let menuButton: HTMLButtonElement;
  let adminDetails = $state<HTMLDetailsElement>();
  function dismissMenu(event: KeyboardEvent) {
    if (event.key !== 'Escape') return;
    if (adminOpen) {
      adminOpen = false;
      adminDetails?.querySelector('summary')?.focus();
    } else if (menuOpen) {
      menuOpen = false;
      menuButton?.focus();
    }
  }
  function current(path: string) {
    return page.url.pathname === path || page.url.pathname.startsWith(path + '/');
  }
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
    adminOpen = false;
    menuOpen = false;
    if (to) trackImpact('page_view', to.url.pathname);
  });
  onMount(() => {
    enhanced = true;
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
<svelte:window onkeydown={dismissMenu} />
<header class="masthead" class:enhanced>
  <a class="wordmark" href="/" aria-label="CREATE SOMETHING Private home"
    >CREATE SOMETHING<span>PRIVATE / .AGENCY</span></a
  >
  <button
    class="menu-toggle"
    bind:this={menuButton}
    aria-expanded={menuOpen}
    aria-controls="primary-navigation"
    onclick={() => {
      menuOpen = !menuOpen;
      adminOpen = false;
    }}
    >{menuOpen ? 'Close menu' : 'Menu'}
    <span aria-hidden="true">{menuOpen ? '−' : '+'}</span></button
  >
  <nav id="primary-navigation" aria-label="Primary" class:menu-open={menuOpen}>
    <a href="/field-engineering" aria-current={current('/field-engineering') ? 'page' : undefined}
      >Field practice</a
    ><a href="/library" aria-current={current('/library') ? 'page' : undefined}>Library</a>
    {#if data.identity}<a
        href="/collection"
        aria-current={current('/collection') ? 'page' : undefined}>Your collection</a
      ><a href="/remote-sessions" aria-current={current('/remote-sessions') ? 'page' : undefined}
        >Remote support</a
      ><a href="/dashboard" aria-current={current('/dashboard') ? 'page' : undefined}
        >Builder workspace</a
      >{:else}<a href="/login"
        >Sign in <span aria-hidden="true"><Icon name="arrow-right" /></span></a
      >{/if}
    {#if data.reviewer}
      <details class="admin-nav" bind:this={adminDetails} bind:open={adminOpen}>
        <summary
          class:active={current('/review') || current('/support-session') || current('/impact')}
          >Administration</summary
        >
        <div class="admin-links">
          <a href="/review" aria-current={current('/review') ? 'page' : undefined}>Review queue</a>
          {#if data.supportEnabled}<a
              href="/support-session"
              aria-current={current('/support-session') ? 'page' : undefined}>Act as a user</a
            >{/if}
          <a href="/impact" aria-current={current('/impact') ? 'page' : undefined}>Impact</a>
        </div>
      </details>
    {/if}
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
  .admin-nav {
    position: relative;
  }
  .admin-nav summary {
    cursor: pointer;
    min-height: 32px;
  }
  .admin-links {
    position: absolute;
    right: 0;
    top: 100%;
    z-index: 20;
    min-width: 180px;
    display: grid;
    padding: 12px;
    gap: 4px;
    background: var(--color-performance-ink);
    border: 1px solid var(--line);
  }
  .admin-links a {
    padding: 12px;
  }
  .masthead nav {
    align-items: center;
  }
  .masthead nav a[aria-current='page'],
  .admin-nav summary.active {
    color: var(--signal);
    text-decoration: underline;
    text-underline-offset: 6px;
  }
  .menu-toggle {
    display: none;
  }
  .masthead .wordmark {
    flex-shrink: 0;
  }
  .masthead nav {
    gap: 20px;
  }
  .masthead nav a,
  .admin-nav summary {
    min-height: var(--pcn-control-height);
    display: flex;
    align-items: center;
  }
  .admin-nav summary {
    gap: 8px;
  }
  @media (max-width: 1100px) {
    .masthead {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 0;
      padding: 20px var(--pcn-page-gutter);
    }
    .enhanced .menu-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      min-height: var(--pcn-control-height);
      padding: 10px 14px;
      color: var(--paper);
      background: transparent;
      border: 1px solid var(--line);
      font-size: 14px;
    }
    .masthead nav {
      grid-column: 1 / -1;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 0;
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px solid var(--line);
      font-size: 15px;
    }
    .enhanced nav:not(.menu-open) {
      display: none;
    }
    .masthead nav > a {
      padding: 12px 0;
      min-height: 48px;
    }
    .admin-nav {
      border-top: 1px solid var(--line);
      margin-top: 12px;
      padding-top: 12px;
    }
    .admin-nav summary {
      min-height: 48px;
    }
    .admin-links {
      position: static;
      border: 0;
      border-left: 1px solid var(--line);
      margin: 4px 0 8px;
      padding: 0 0 0 16px;
    }
    .admin-links a {
      padding: 12px 0;
    }
  }

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
