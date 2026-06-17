<script lang="ts">
  import type { LayoutData } from './$types';
  import '../app.css';

  export let data: LayoutData;

  $: accessTone =
    data.clerkAccess.status === 'allowed'
      ? 'good'
      : data.clerkAccess.status === 'anonymous'
        ? 'warn'
        : 'danger';
  $: accessLabel =
    data.clerkAccess.status === 'allowed'
      ? 'Clerk active'
      : data.clerkAccess.status === 'anonymous'
        ? 'Sign in'
        : 'Access blocked';
</script>

<div class="app-shell">
  <header class="app-nav">
    <div class="app-nav__inner">
      <a class="brand-lockup" href="/agents" aria-label="Ona Agents">
        <span class="cube-mark" aria-hidden="true"></span>
        <span>
          <strong>Ona Agents</strong>
          <small>CREATE SOMETHING operator surface</small>
        </span>
      </a>

      <nav aria-label="Primary">
        <a href="/agents">Agents</a>
      </nav>

      <a
        class={`session-link ${data.clerkAccess.status === 'allowed' ? '' : 'public'}`}
        href={data.clerkAccess.signInUrl}
        rel="noreferrer"
      >
        <span class={`status-pill ${accessTone}`}>{accessLabel}</span>
        {#if data.clerkAccess.status === 'allowed'}
          <span class="session-meta">
            {data.clerkAccess.email ?? data.clerkAccess.organizationRole ?? data.clerkAccess.subject}
          </span>
        {/if}
      </a>
    </div>
  </header>

  <main>
    <slot />
  </main>
</div>

<style>
  .app-nav {
    position: sticky;
    top: 0;
    z-index: 10;
    border-bottom: 1px solid var(--color-clear-border);
    background: rgba(249, 249, 249, 0.92);
    backdrop-filter: blur(18px);
  }

  .app-nav__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    width: min(var(--content-width-clear), calc(100% - 2.5rem));
    min-height: 4.9rem;
    margin-inline: auto;
    padding-block: 0.8rem;
  }

  .brand-lockup {
    display: inline-flex;
    align-items: center;
    gap: 0.72rem;
    text-decoration: none;
  }

  .brand-lockup strong,
  .brand-lockup small {
    display: block;
    letter-spacing: 0;
  }

  .brand-lockup strong {
    font-size: 1rem;
    font-weight: 700;
    line-height: 1.1;
  }

  .brand-lockup small {
    margin-top: 0.18rem;
    color: var(--color-clear-grey);
    font-size: 0.78rem;
    line-height: 1.2;
  }

  .cube-mark {
    position: relative;
    width: 1.25rem;
    height: 1.25rem;
    transform: rotate(45deg);
    border-radius: 2px;
    background: var(--color-clear-onyx);
    box-shadow:
      inset 0.34rem -0.34rem 0 rgba(255, 255, 255, 0.12),
      0 0 0 1px rgba(10, 14, 25, 0.08);
  }

  .cube-mark::after {
    content: '';
    position: absolute;
    inset: 0.22rem;
    border-radius: 1px;
    background: linear-gradient(135deg, rgba(175, 193, 253, 0.5), rgba(255, 255, 255, 0));
  }

  nav {
    display: flex;
    gap: 0.35rem;
    flex-wrap: wrap;
    align-items: center;
    padding: 0.28rem;
    border: 1px solid var(--color-clear-border);
    border-radius: var(--radius-clear-sm);
    background: var(--color-clear-panel);
  }

  nav a {
    padding: 0.52rem 0.85rem;
    border-radius: var(--radius-clear-sm);
    text-decoration: none;
    color: var(--color-clear-grey);
    font-size: 0.95rem;
    line-height: 1;
  }

  nav a:hover {
    background: var(--color-clear-porcelain);
    color: var(--color-clear-onyx);
    opacity: 1;
  }

  .session-link {
    display: grid;
    gap: 0.28rem;
    justify-items: end;
    text-decoration: none;
  }

  .session-link.public {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .session-meta {
    max-width: 16rem;
    overflow: hidden;
    color: var(--color-clear-grey);
    font-size: 0.78rem;
    line-height: 1.15;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  main {
    padding-bottom: 3.5rem;
  }

  @media (max-width: 760px) {
    .app-nav__inner {
      flex-direction: column;
      align-items: stretch;
      width: min(100% - 1.5rem, var(--content-width-clear));
    }

    nav {
      justify-content: center;
    }

    .session-link {
      justify-items: center;
    }

    .session-link.public {
      justify-content: center;
    }
  }
</style>
