<script lang="ts">
  import { onMount } from 'svelte';
  import { getAnalytics } from '@create-something/canon/analytics';

  const paths = [
    {
      id: 'team',
      eyebrow: 'For your team',
      title: 'Improve one internal workflow',
      detail:
        'Use one real handoff to name the owner and decide what may run, wait, or stop before automation expands.',
      href: '/practice',
      action: 'Practice an internal workflow',
      points: ['Browser-local practice', 'Visible approval boundary', 'Map, Build, or Control next']
    },
    {
      id: 'clients',
      eyebrow: 'For client services',
      title: 'Deliver one client workflow',
      detail:
        'Map a client workflow, define account and approval boundaries, then hand over evidence the client can inspect.',
      href: '/for-service-providers',
      action: 'See the client delivery path',
      points: ['Reusable workflow structure', 'Client-owned accounts', 'Proof and handoff included']
    }
  ] as const;

  function trackPath(path: (typeof paths)[number]) {
    getAnalytics()?.track('interaction', 'adoption_path_click', {
      metadata: { surface: 'homepage', adoption_path: path.id, destination: path.href }
    });
  }

  onMount(() => {
    getAnalytics()?.track('interaction', 'adoption_path_view', {
      metadata: { surface: 'homepage', path_count: paths.length }
    });
  });
</script>

<section class="adoption-paths" aria-labelledby="adoption-paths-title">
  <header>
    <span>Choose a starting path</span>
    <h2 id="adoption-paths-title">Which workflow are you bringing?</h2>
    <p>The method stays the same. Ownership, accounts, and the handoff change.</p>
  </header>

  <div class="adoption-paths__grid">
    {#each paths as path, index}
      <a href={path.href} onclick={() => trackPath(path)} data-path={path.id}>
        <div class="adoption-paths__index" aria-hidden="true">0{index + 1}</div>
        <div class="adoption-paths__copy">
          <span>{path.eyebrow}</span>
          <h3>{path.title}</h3>
          <p>{path.detail}</p>
          <ul>
            {#each path.points as point}<li>{point}</li>{/each}
          </ul>
          <strong>{path.action} <span aria-hidden="true">→</span></strong>
        </div>
      </a>
    {/each}
  </div>
</section>

<style>
  .adoption-paths {
    width: min(
      var(--content-width-performance, 85rem),
      calc(
        100% - var(--space-performance-page-gutter, 1.25rem) -
          var(--space-performance-page-gutter, 1.25rem)
      )
    );
    margin: clamp(1.5rem, 4vw, 3rem) auto;
    padding: 0;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-panel, #fff);
    color: var(--color-performance-ink, #090909);
  }

  header {
    display: grid;
    gap: 0.65rem;
    padding: clamp(1.15rem, 2.5vw, 1.75rem);
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
  }

  header > span,
  .adoption-paths__copy > span,
  .adoption-paths__index {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.7rem;
    font-weight: var(--font-performance-semibold, 600);
    text-transform: uppercase;
  }

  h2,
  h3,
  p {
    margin: 0;
  }

  h2 {
    max-width: 20ch;
    font-size: clamp(1.8rem, 3.5vw, 3rem);
    line-height: 1;
  }

  header p,
  .adoption-paths__copy p {
    max-width: 46rem;
    color: var(--color-performance-muted, #5e6268);
    line-height: 1.5;
  }

  .adoption-paths__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .adoption-paths__grid > a {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 1rem;
    min-width: 0;
    min-height: 17.5rem;
    padding: clamp(1.15rem, 2.5vw, 1.5rem);
    color: inherit;
    text-decoration: none;
  }

  .adoption-paths__grid > a + a {
    border-left: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .adoption-paths__grid > a:hover,
  .adoption-paths__grid > a:focus-visible {
    background: var(--color-performance-paper, #f3f3f0);
  }

  .adoption-paths__grid > a:focus-visible {
    outline: 2px solid var(--color-performance-signal, #0057b8);
    outline-offset: -2px;
  }

  .adoption-paths__copy {
    display: grid;
    align-content: start;
    gap: 0.85rem;
    min-width: 0;
  }

  h3 {
    max-width: 14ch;
    font-size: clamp(1.55rem, 2.5vw, 2.25rem);
    line-height: 1;
  }

  ul {
    display: grid;
    gap: 0.45rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    padding-top: 0.45rem;
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
    font-size: 0.88rem;
  }

  strong {
    align-self: end;
    min-height: var(--height-performance-control-min, 2.75rem);
    display: inline-flex;
    align-items: center;
    margin-top: auto;
    font-size: 0.9rem;
  }

  @media (max-width: 47.99rem) {
    .adoption-paths {
      width: min(
        calc(
          100% - var(--space-performance-page-gutter, 0.75rem) -
            var(--space-performance-page-gutter, 0.75rem)
        ),
        var(--content-width-performance, 85rem)
      );
    }

    .adoption-paths__grid {
      grid-template-columns: 1fr;
    }

    .adoption-paths__grid > a {
      min-height: 0;
    }

    .adoption-paths__grid > a + a {
      border-top: 1px solid var(--color-performance-line, #d7d7d2);
      border-left: 0;
    }
  }
</style>
