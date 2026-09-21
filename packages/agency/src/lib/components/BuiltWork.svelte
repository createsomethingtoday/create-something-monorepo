<script lang="ts">
  import { builtWork } from '$lib/data/builtWork';
</script>

<section id="built-work" class="built-work" aria-labelledby="built-work-title">
  <header>
    <p class="eyebrow">What we’ve built</p>
    <h2 id="built-work-title">From the agent’s tools to the customer’s screen.</h2>
    <p class="intro">
      We build the software around the workflow: the tools an agent calls, the checks that protect a
      decision, and the interface a person uses. Here are seven examples you can inspect.
    </p>
  </header>
  <ol class="work-index" aria-label="CREATE SOMETHING engineering work">
    {#each builtWork as work, index}
      <li id={`work-${work.id}`} class:featured={index === 0}>
        <div class="work-kind">
          <span class="number">{String(index + 1).padStart(2, '0')}</span><span
            >{work.category}</span
          >
        </div>
        <div class="work-detail">
          <h3>{work.title}</h3>
          <p>{work.description}</p>
          <div class="work-links">
            {#each work.links as link}
              <a href={link.href}>{link.label}<span aria-hidden="true"> ↗</span></a>
            {/each}
          </div>
        </div>
        <p class="artifact">{work.artifact}</p>
      </li>
    {/each}
  </ol>
  <footer>
    <p>
      These examples show our engineering range. Public source and evaluation reports are linked
      where available; private accounts and client data stay private.
    </p>
    <p>Membership provides guidance and support. A custom system gets its own scope and price.</p>
    <a href="/products">Explore the full tool catalog <span aria-hidden="true">→</span></a>
  </footer>
</section>

<style>
  .built-work {
    scroll-margin-top: 6rem;
    padding: clamp(2.5rem, 6vw, 6rem) max(1.25rem, calc((100% - 80rem) / 2));
    background: var(--color-performance-paper);
    color: var(--color-performance-ink);
    border-bottom: 1px solid var(--color-performance-line-strong);
  }
  .built-work .eyebrow,
  .number,
  .artifact {
    font-family: var(--font-performance-mono);
    font-size: 0.75rem;
    line-height: 1.5;
    color: var(--color-performance-ink-soft);
  }
  .built-work .eyebrow {
    text-transform: uppercase;
  }
  h2 {
    max-width: 23ch;
    font-family: var(--font-performance-editorial);
    font-weight: 400;
    font-size: clamp(2.2rem, 4.5vw, 4.5rem);
    line-height: 1.08;
    margin-block: var(--space-performance-md);
  }
  .intro {
    max-width: 65ch;
    margin-bottom: var(--space-performance-xl);
  }
  p {
    line-height: 1.65;
  }
  .work-index {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  li {
    display: grid;
    grid-template-columns: 1fr 2fr 1fr;
    gap: var(--space-performance-lg);
    border-top: 1px solid var(--color-performance-line-strong);
    padding-block: var(--space-performance-lg);
  }
  li > * {
    min-width: 0;
  }
  .work-kind {
    display: flex;
    gap: var(--space-performance-md);
    align-items: baseline;
    font-size: 0.875rem;
  }
  h3 {
    margin: 0 0 var(--space-performance-sm);
    font-size: clamp(1.25rem, 2vw, 1.75rem);
    line-height: 1.25;
    font-weight: 500;
  }
  .featured h3 {
    font-family: var(--font-performance-editorial);
    font-weight: 400;
    font-size: clamp(2rem, 3vw, 3rem);
  }
  .work-detail p {
    max-width: 62ch;
    margin: 0;
  }
  .artifact {
    margin: 0;
    text-align: right;
  }
  .work-links {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-performance-sm) var(--space-performance-lg);
    margin-top: var(--space-performance-sm);
  }
  a {
    display: inline-flex;
    align-items: center;
    min-height: 2.75rem;
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 0.25em;
    font-weight: 550;
  }
  a:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 4px;
  }
  footer {
    border-top: 1px solid var(--color-performance-line-strong);
    padding-top: var(--space-performance-lg);
  }
  footer p {
    max-width: 75ch;
    margin-block: 0 var(--space-performance-sm);
    font-size: 0.9rem;
  }
  @media (max-width: 760px) {
    li {
      grid-template-columns: 1fr;
      gap: var(--space-performance-sm);
    }
    .artifact {
      text-align: left;
    }
    .intro {
      margin-bottom: var(--space-performance-lg);
    }
  }
</style>
