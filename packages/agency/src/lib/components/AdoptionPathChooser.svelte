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
      eyebrow: 'For a client',
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
    <div class="adoption-paths__heading">
      <span>Choose an operating path</span>
      <h2 id="adoption-paths-title">Start with your team or a client.</h2>
      <p>Choose who owns the workflow. The method stays consistent.</p>
    </div>
    <dl aria-label="What stays consistent and what changes between paths">
      <div>
        <dt>Same method</dt>
        <dd>Map, Build, and Control</dd>
      </div>
      <div>
        <dt>What changes</dt>
        <dd>Owner, accounts, and handoff</dd>
      </div>
    </dl>
  </header>

  <div class="adoption-paths__grid">
    {#each paths as path, index}
      <a href={path.href} onclick={() => trackPath(path)} data-path={path.id}>
        <div class="adoption-paths__index" aria-hidden="true">0{index + 1}</div>
        <div class="adoption-paths__copy">
          <span>{path.eyebrow}</span>
          <h3>{path.title}</h3>
          <p>{path.detail}</p>
          <small>This path includes</small>
          <ul>
            {#each path.points as point}<li>{point}</li>{/each}
          </ul>
          <strong><span>{path.action}</span><span aria-hidden="true">→</span></strong>
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
    margin: clamp(1.5rem, 4vw, 3rem) auto var(--space-performance-page-gutter, 1.25rem);
    padding: 0;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-panel, #fff);
    color: var(--color-performance-ink, #090909);
  }

  header {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(20rem, 0.65fr);
    align-items: end;
    gap: clamp(1.5rem, 4vw, 4rem);
    padding: clamp(1.15rem, 2.5vw, 1.75rem);
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .adoption-paths__heading {
    display: grid;
    gap: 0.65rem;
  }

  .adoption-paths__heading > span,
  .adoption-paths__copy > span,
  .adoption-paths__index,
  dt,
  small {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.7rem;
    font-weight: var(--font-performance-semibold, 600);
    text-transform: uppercase;
  }

  h2,
  h3,
  p,
  dl,
  dd {
    margin: 0;
  }

  h2 {
    max-width: 20ch;
    font-size: clamp(1.8rem, 3.5vw, 3rem);
    line-height: 1;
  }

  .adoption-paths__heading p,
  .adoption-paths__copy p {
    max-width: 46rem;
    color: var(--color-performance-muted, #5e6268);
    line-height: 1.5;
  }

  dl {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    border: 1px solid var(--color-performance-line, #d7d7d2);
  }

  dl > div {
    display: grid;
    gap: 0.45rem;
    padding: 0.9rem;
  }

  dl > div + div {
    border-left: 1px solid var(--color-performance-line, #d7d7d2);
  }

  dd {
    font-size: 0.92rem;
    font-weight: var(--font-performance-medium, 500);
    line-height: 1.3;
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
    min-height: 20rem;
    padding: clamp(1.15rem, 2.5vw, 1.5rem);
    color: inherit;
    text-decoration: none;
  }

  .adoption-paths__grid > a + a {
    border-left: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .adoption-paths__grid > a[data-path='team'] {
    background: var(--color-performance-paper, #f3f3f0);
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

  small {
    display: block;
    margin-top: 0.15rem;
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
    display: inline-flex;
    align-self: end;
    justify-content: space-between;
    gap: 1rem;
    width: fit-content;
    min-height: var(--height-performance-control-min, 2.75rem);
    align-items: center;
    margin-top: auto;
    padding: 0.7rem 0.85rem;
    background: var(--color-performance-ink, #090909);
    color: var(--color-performance-paper, #f3f3f0);
    font-size: 0.9rem;
  }

  @media (max-width: 64rem) {
    header {
      grid-template-columns: 1fr;
    }

    dl {
      max-width: 36rem;
    }
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

    strong {
      width: 100%;
    }

    .adoption-paths__grid > a + a {
      border-top: 1px solid var(--color-performance-line, #d7d7d2);
      border-left: 0;
    }
  }
</style>
