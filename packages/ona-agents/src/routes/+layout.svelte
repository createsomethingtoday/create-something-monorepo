<script lang="ts">
  import type { LayoutData } from './$types';
  import '../app.css';

  export let data: LayoutData;

  $: accessTone =
    data.authAccess.status === 'allowed'
      ? 'ready'
      : data.authAccess.status === 'anonymous'
        ? 'review'
        : 'stop';
  $: accessLabel =
    data.authAccess.status === 'allowed'
      ? 'Identity active'
      : data.authAccess.status === 'anonymous'
        ? 'Sign in'
        : 'Access blocked';
</script>

<div class="app-shell property-performance">
  <header class="app-nav">
    <div class="app-nav__inner">
      <a class="brand-lockup" href="/agents" aria-label="CREATE SOMETHING Agents">
        <span class="cube-mark" aria-hidden="true"><span></span></span>
        <span>
          <strong>CREATE SOMETHING Agents</strong>
          <small>Performance Lab operator surface</small>
        </span>
      </a>

      <nav aria-label="Primary">
        <a href="/agents">Agents</a>
      </nav>

      <a
        class={`session-link ${data.authAccess.status === 'allowed' ? '' : 'public'}`}
        href={data.authAccess.source === 'identity' ? '/api/auth/logout' : data.authAccess.signInUrl}
        rel="noreferrer"
      >
        <span class={`status-pill ${accessTone}`}>{accessLabel}</span>
        {#if data.authAccess.status === 'allowed'}
          <span class="session-meta">
            {data.authAccess.email ?? data.authAccess.roles[0] ?? data.authAccess.subject}
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
    border-bottom: 1px solid var(--color-performance-line);
    background: color-mix(in srgb, var(--color-performance-paper) 94%, transparent);
    backdrop-filter: blur(12px);
  }

  .app-nav__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    width: min(var(--content-width-performance), calc(100% - 2.5rem));
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
    color: var(--color-performance-muted);
    font-size: 0.78rem;
    line-height: 1.2;
  }

  .cube-mark {
    display: grid;
    width: 1.4rem;
    height: 1.4rem;
    place-items: center;
    transform: rotate(45deg);
    border: 1px solid var(--color-performance-ink);
    background: var(--color-performance-ink);
  }

  .cube-mark span {
    width: 0.46rem;
    height: 0.46rem;
    border: 1px solid var(--color-performance-panel);
    background: var(--color-performance-signal);
  }

  nav {
    display: flex;
    gap: 0.35rem;
    flex-wrap: wrap;
    align-items: center;
    padding: 0.28rem;
    border: 1px solid var(--color-performance-line);
    border-radius: var(--radius-performance-sm);
    background: var(--color-performance-panel);
  }

  nav a {
    padding: 0.52rem 0.85rem;
    border-radius: var(--radius-performance-sm);
    text-decoration: none;
    color: var(--color-performance-muted);
    font-size: 0.95rem;
    line-height: 1;
  }

  nav a:hover {
    background: var(--color-performance-paper);
    color: var(--color-performance-ink);
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
    color: var(--color-performance-muted);
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
      width: min(100% - 1.5rem, var(--content-width-performance));
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
