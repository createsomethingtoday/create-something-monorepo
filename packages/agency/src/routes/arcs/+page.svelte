<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const groups = [
    { kind: 'prototype', label: 'Proven prototype' },
    { kind: 'operator-playbook', label: 'Operator Playbooks' },
    { kind: 'outcome-playbook', label: 'Outcome Playbooks' },
    { kind: 'host-playbook', label: 'Host Playbooks' },
    { kind: 'runbook', label: 'Runbooks' }
  ] as const;
</script>

<!-- search-policy: noindex; the Arc catalog is an inspectable product preview, not a search landing page. -->
<svelte:head>
  <title>Arc Catalog · CREATE SOMETHING</title>
  <meta
    name="description"
    content="Presentation-native views over registered CREATE SOMETHING Playbooks and Runbooks."
  />
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main class="arc-catalog property-performance">
  <header class="arc-catalog__hero">
    <div>
      <a href="/products">Products / Arcs</a>
      <p>Presentation registry · read only</p>
      <h1>Every registered route can tell its operating story.</h1>
      <p class="arc-catalog__lede">
        55 presentation routes reuse the same typed Playbooks, Runbooks, maps, boundaries, and proof
        contracts that operators and agents already read.
      </p>
    </div>
    <dl>
      <div>
        <dt>Playbooks</dt>
        <dd>
          {data.counts.hostPlaybooks + data.counts.outcomePlaybooks + data.counts.operatorPlaybooks}
        </dd>
      </div>
      <div>
        <dt>Runbooks</dt>
        <dd>{data.counts.runbooks}</dd>
      </div>
      <div>
        <dt>Prototype</dt>
        <dd>1</dd>
      </div>
      <div>
        <dt>Authority</dt>
        <dd>Read only</dd>
      </div>
    </dl>
  </header>

  <section class="arc-catalog__rule" aria-label="Arc product boundary">
    <strong>Map is the source.</strong>
    <span>Arc is the presentation route.</span>
    <span>Playbook is the reusable method.</span>
    <span>Runbook is the executable route.</span>
  </section>

  {#each groups as group}
    {@const arcs = data.arcs.filter((arc) => arc.source.kind === group.kind)}
    <section class="arc-group" aria-labelledby={`arc-group-${group.kind}`}>
      <header>
        <span>{String(arcs.length).padStart(2, '0')} routes</span>
        <h2 id={`arc-group-${group.kind}`}>{group.label}</h2>
      </header>
      <ol>
        {#each arcs as arc, index}
          <li>
            <a href={arc.href}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3>{arc.title}</h3>
                <p>{arc.description}</p>
                <small
                  >{arc.stepCount} steps · {arc.sceneCount} scenes · {arc.source.registry}</small
                >
              </div>
              <b aria-hidden="true">↗</b>
            </a>
          </li>
        {/each}
      </ol>
    </section>
  {/each}
</main>

<style>
  .arc-catalog {
    min-height: 100vh;
    background: var(--color-performance-paper, #f3f3f0);
    color: var(--color-performance-ink, #090909);
  }
  .arc-catalog__hero,
  .arc-catalog__rule,
  .arc-group {
    width: min(calc(100% - 2rem), 1120px);
    margin-inline: auto;
  }
  .arc-catalog__hero {
    display: grid;
    grid-template-columns: minmax(0, 1.25fr) minmax(17rem, 0.75fr);
    gap: clamp(2rem, 8vw, 7rem);
    padding: clamp(4rem, 10vw, 8rem) 0 3rem;
  }
  .arc-catalog__hero a,
  .arc-catalog__hero > div > p:first-of-type,
  .arc-group header span,
  .arc-catalog__hero dt {
    font: 650 0.7rem/1.3 var(--font-performance-mono, ui-monospace, monospace);
    letter-spacing: 0.09em;
    text-transform: uppercase;
  }
  .arc-catalog__hero a {
    color: inherit;
    text-underline-offset: 0.3rem;
  }
  .arc-catalog__hero > div > p:first-of-type,
  .arc-group header span,
  .arc-catalog__hero dt {
    color: var(--color-performance-muted, #5f605a);
  }
  .arc-catalog h1 {
    max-width: 12ch;
    margin: 0.75rem 0 1.25rem;
    font-size: clamp(3rem, 7vw, 6.4rem);
    letter-spacing: -0.07em;
    line-height: 0.9;
  }
  .arc-catalog__lede {
    max-width: 58ch;
    font-size: clamp(1.05rem, 2vw, 1.25rem);
    line-height: 1.55;
  }
  .arc-catalog__hero dl {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    align-self: end;
    margin: 0;
    border-top: 1px solid;
  }
  .arc-catalog__hero dl div {
    padding: 1rem;
    border-bottom: 1px solid;
  }
  .arc-catalog__hero dl div:nth-child(odd) {
    border-right: 1px solid;
  }
  .arc-catalog__hero dd {
    margin: 0.4rem 0 0;
    font-size: 1.2rem;
    font-weight: 750;
  }
  .arc-catalog__rule {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    border-block: 1px solid;
    background: #111;
    color: #f3f3f0;
  }
  .arc-catalog__rule > * {
    padding: 1rem;
    border-right: 1px solid rgb(255 255 255 / 0.22);
    font-size: 0.78rem;
    line-height: 1.4;
  }
  .arc-catalog__rule > *:last-child {
    border-right: 0;
  }
  .arc-group {
    display: grid;
    grid-template-columns: minmax(12rem, 0.35fr) minmax(0, 1fr);
    gap: 2rem;
    padding: 3rem 0;
    border-bottom: 1px solid;
  }
  .arc-group h2 {
    max-width: 9ch;
    margin: 0.5rem 0 0;
    font-size: clamp(1.8rem, 3vw, 2.8rem);
    line-height: 1;
  }
  .arc-group ol {
    margin: 0;
    padding: 0;
    border-top: 1px solid;
    list-style: none;
  }
  .arc-group a {
    display: grid;
    grid-template-columns: 2.5rem 1fr auto;
    gap: 1rem;
    padding: 1rem 0;
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
    color: inherit;
    text-decoration: none;
  }
  .arc-group a > span,
  .arc-group small {
    color: var(--color-performance-muted, #5f605a);
    font: 0.68rem/1.4 var(--font-performance-mono, ui-monospace, monospace);
    text-transform: uppercase;
  }
  .arc-group h3 {
    margin: 0;
    font-size: 1rem;
  }
  .arc-group p {
    max-width: 64ch;
    margin: 0.4rem 0 0.65rem;
    color: var(--color-performance-muted, #5f605a);
    font-size: 0.86rem;
    line-height: 1.45;
  }
  .arc-group b {
    align-self: center;
    font-size: 1.1rem;
  }
  .arc-group a:focus-visible {
    outline: 3px solid var(--color-performance-signal, #0057b8);
    outline-offset: 4px;
  }
  @media (max-width: 760px) {
    .arc-catalog__hero,
    .arc-group {
      grid-template-columns: 1fr;
    }
    .arc-catalog__rule {
      grid-template-columns: 1fr;
    }
    .arc-catalog__rule > * {
      border-right: 0;
      border-bottom: 1px solid rgb(255 255 255 / 0.22);
    }
    .arc-catalog__rule > *:last-child {
      border-bottom: 0;
    }
    .arc-group {
      gap: 1.25rem;
      padding: 2.25rem 0;
    }
  }
</style>
