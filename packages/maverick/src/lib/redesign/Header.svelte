<script lang="ts">
  import { page } from '$app/state';
  import { afterNavigate } from '$app/navigation';
  let { onContactClick }: { onContactClick: () => void } = $props();
  let menuOpen = $state(false);
  let toggle: HTMLButtonElement;
  const links = [
    ['Oil & Gas', '/oil-gas'],
    ['Mining', '/mining'],
    ['About', '/about'],
    ['News', '/news'],
    ['Careers', 'https://jobs.lever.co/maverickx']
  ];
  afterNavigate(() => {
    menuOpen = false;
  });
  function contact() {
    if (menuOpen) toggle?.focus();
    menuOpen = false;
    onContactClick();
  }
  function escapeMenu(event: KeyboardEvent) {
    if (event.key === 'Escape' && menuOpen) {
      menuOpen = false;
      toggle?.focus();
    }
  }
</script>

<svelte:window onkeydown={escapeMenu} />
<header class:expanded={menuOpen}>
  <a href="/" aria-label="Maverick X home"
    ><img src="/images/full-logo.svg" alt="Maverick X" width="105" height="31" /></a
  >
  <button
    class="menu-toggle"
    bind:this={toggle}
    type="button"
    aria-expanded={menuOpen}
    aria-controls="primary-navigation"
    onclick={() => {
      menuOpen = !menuOpen;
    }}>{menuOpen ? 'Close' : 'Menu'}</button
  >
  <nav id="primary-navigation" aria-label="Primary navigation" class:open={menuOpen}>
    {#each links as [label, href]}
      <a
        {href}
        aria-current={page.url.pathname === href ? 'page' : undefined}
        target={href.startsWith('https:') ? '_blank' : undefined}
        rel={href.startsWith('https:') ? 'noopener noreferrer' : undefined}>{label}</a
      >
    {/each}
    <button type="button" class="contact" onclick={contact}>Contact</button>
  </nav>
</header>

<style>
  header {
    position: fixed;
    inset: 0 0 auto;
    z-index: 50;
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 72px;
    padding: 0 48px;
    background: linear-gradient(#0004, #0000);
  }
  img {
    display: block;
    object-fit: contain;
  }
  nav {
    display: flex;
    gap: 36px;
    align-items: center;
  }
  a,
  button {
    font:
      500 13px 'Barlow',
      sans-serif;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: #fff;
    text-decoration: none;
  }
  nav a {
    padding: 12px 0;
    border-bottom: 1px solid transparent;
  }
  nav a[aria-current] {
    border-color: #fff;
  }
  button {
    cursor: pointer;
    background: transparent;
    border: 1px solid #ffffff80;
    padding: 12px 22px;
  }
  .menu-toggle {
    display: none;
  }
  @media (max-width: 820px) {
    header {
      padding: 0 24px;
    }
    .menu-toggle {
      display: block;
    }
    nav {
      display: none;
      position: absolute;
      top: 72px;
      left: 0;
      right: 0;
      padding: 20px 24px 32px;
      background: #080808;
      max-height: calc(100dvh - 72px);
      overflow: auto;
    }
    nav.open {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
    }
    nav a {
      padding: 16px 0;
    }
  }
</style>
