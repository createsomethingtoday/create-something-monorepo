<script lang="ts">
  import { page } from '$app/state';
  import { afterNavigate } from '$app/navigation';
  import { tick } from 'svelte';

  let { onContactClick }: { onContactClick: () => void } = $props();
  let menuOpen = $state(false);
  let openGroup = $state<string | null>(null);
  let scrollY = $state(0);
  let header: HTMLElement;
  let toggle: HTMLButtonElement;
  let pointerTarget: Element | null = null;
  const groups = [
    {
      id: 'solutions',
      label: 'Solutions',
      links: [
        ['Oil & Gas and Water Treatment', '/oil-gas'],
        ['Mining & Metals', '/mining']
      ]
    },
    {
      id: 'technology',
      label: 'Technology',
      links: [['How our chemistry works', '/#chemistry']]
    },
    {
      id: 'about',
      label: 'About',
      links: [
        ['Mission', '/about#mission'],
        ['Meet the Team/Leadership', '/about#leadership'],
        ['News', '/news']
      ]
    }
  ];

  function closeMenus() {
    pointerTarget = null;
    menuOpen = false;
    openGroup = null;
  }
  afterNavigate(closeMenus);

  function contact() {
    if (menuOpen) toggle?.focus();
    closeMenus();
    onContactClick();
  }

  function escapeMenu(event: KeyboardEvent) {
    pointerTarget = null;
    if (event.key !== 'Escape') return;
    if (openGroup) {
      header.querySelector<HTMLButtonElement>(`#${openGroup}-toggle`)?.focus();
      openGroup = null;
      event.preventDefault();
    } else if (menuOpen) {
      closeMenus();
      toggle?.focus();
      event.preventDefault();
    }
  }

  async function enterGroup(event: KeyboardEvent, id: string) {
    if (event.key !== 'ArrowDown') return;
    event.preventDefault();
    openGroup = id;
    await tick();
    header.querySelector<HTMLAnchorElement>(`#${id}-links a`)?.focus();
  }

  function focusChanged(event: FocusEvent) {
    if (!(event.target instanceof Node)) return;
    // Keep mobile content in place until the clicked link or button can activate.
    if (event.target === pointerTarget) {
      pointerTarget = null;
      return;
    }
    if (!header?.contains(event.target)) closeMenus();
    else if (openGroup && !header.querySelector(`#${openGroup}-group`)?.contains(event.target)) {
      openGroup = null;
    }
  }

  function clickOutside(event: PointerEvent) {
    pointerTarget = event.target instanceof Element ? event.target.closest('a, button') : null;
    if (!(event.target instanceof Node) || header?.contains(event.target)) return;
    if (header?.contains(document.activeElement)) {
      if (menuOpen) toggle?.focus();
      else if (openGroup) header.querySelector<HTMLButtonElement>(`#${openGroup}-toggle`)?.focus();
    }
    closeMenus();
  }
</script>

<svelte:window
  onkeydown={escapeMenu}
  onfocusin={focusChanged}
  onpointerdown={clickOutside}
  onpointercancel={() => {
    pointerTarget = null;
  }}
  bind:scrollY
/>
<header bind:this={header} class:expanded={menuOpen} class:scrolled={scrollY > 72}>
  <a href="/" onclick={closeMenus} aria-label="Maverick X home"
    ><img src="/images/full-logo.svg" alt="Maverick X" width="105" height="31" /></a
  >
  <button
    class="menu-toggle"
    bind:this={toggle}
    type="button"
    aria-expanded={menuOpen}
    aria-controls="primary-navigation"
    onclick={() => {
      pointerTarget = null;
      menuOpen = !menuOpen;
      openGroup = null;
    }}>{menuOpen ? 'Close' : 'Menu'}</button
  >
  <nav id="primary-navigation" aria-label="Primary navigation" class:open={menuOpen}>
    <a
      href="/"
      onclick={closeMenus}
      aria-current={page.url.pathname === '/' && !page.url.hash ? 'page' : undefined}>Home</a
    >
    {#each groups as group}
      <div class="nav-group" id={`${group.id}-group`}>
        <button
          id={`${group.id}-toggle`}
          class="group-toggle"
          type="button"
          aria-expanded={openGroup === group.id}
          aria-controls={`${group.id}-links`}
          onclick={() => {
            pointerTarget = null;
            openGroup = openGroup === group.id ? null : group.id;
          }}
          onkeydown={(event) => enterGroup(event, group.id)}
        >
          {group.label}<span class="disclosure-arrow" aria-hidden="true"></span>
        </button>
        <ul class="dropdown" id={`${group.id}-links`} hidden={openGroup !== group.id}>
          {#each group.links as [label, href]}
            <li>
              <a
                {href}
                onclick={closeMenus}
                aria-current={page.url.pathname + page.url.hash === href
                  ? href.includes('#')
                    ? 'location'
                    : 'page'
                  : undefined}>{label}</a
              >
            </li>
          {/each}
        </ul>
      </div>
    {/each}
    <a
      href="https://jobs.lever.co/maverickx"
      onclick={closeMenus}
      target="_blank"
      rel="noopener noreferrer">Careers</a
    >
    <button type="button" class="contact" onclick={contact}>Contact Us</button>
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
  header.scrolled,
  header.expanded {
    background: #18222bf5;
  }
  nav {
    display: flex;
    gap: 30px;
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
  nav > a,
  .group-toggle {
    padding: 12px 0;
    border-bottom: 1px solid transparent;
  }
  nav a[aria-current] {
    border-bottom-color: #fff;
  }
  button {
    cursor: pointer;
    background: transparent;
    border: 1px solid #ffffff80;
    padding: 12px 22px;
  }
  a:focus-visible,
  button:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 5px;
  }
  .nav-group {
    position: relative;
  }
  .group-toggle {
    display: flex;
    align-items: center;
    gap: 10px;
    border: 0;
  }
  .disclosure-arrow {
    width: 6px;
    height: 6px;
    border-right: 1px solid;
    border-bottom: 1px solid;
    transform: rotate(45deg) translateY(-2px);
  }
  .group-toggle[aria-expanded='true'] .disclosure-arrow {
    transform: rotate(225deg) translate(-2px, -2px);
  }
  .dropdown {
    position: absolute;
    top: calc(100% + 10px);
    left: -20px;
    width: 320px;
    max-width: calc(100vw - 48px);
    list-style: none;
    margin: 0;
    padding: 10px;
    background: #18222b;
    border: 1px solid #ffffff30;
    box-shadow: 0 14px 30px #0003;
  }
  .dropdown a {
    display: block;
    padding: 14px 10px;
    font-size: 13px;
    letter-spacing: 1px;
    line-height: 1.5;
    border-bottom: 1px solid transparent;
  }
  .dropdown a:hover,
  .dropdown a:focus-visible {
    background: #ffffff14;
  }
  .dropdown a:focus-visible {
    outline-offset: -2px;
  }
  .menu-toggle {
    display: none;
  }
  @media (max-width: 1100px) {
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
      background: #18222b;
      max-height: calc(100dvh - 72px);
      overflow: auto;
    }
    nav.open {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
    }
    nav > a,
    .group-toggle {
      padding: 16px 0;
    }
    .group-toggle {
      width: 100%;
      justify-content: space-between;
    }
    .dropdown {
      position: static;
      width: auto;
      max-width: none;
      padding: 0 0 0 12px;
      border: 0;
      border-left: 1px solid #ffffff40;
      box-shadow: none;
    }
  }
</style>
