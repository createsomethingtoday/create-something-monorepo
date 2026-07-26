<svelte:head>
  <title>Northstar — Demo frontend</title>
  <meta
    name="description"
    content="A deterministic frontend fixture for the CREATE SOMETHING client workspace."
  />
</svelte:head>

<main>
  <nav aria-label="Primary">
    <a class="brand" href="/">Northstar</a>
    <a href="#contact">Start a project</a>
  </nav>

  <section class="hero">
    <p class="eyebrow">Product systems for ambitious teams</p>
    <h1>Build what clients can see.</h1>
    <p class="summary">
      We turn a clear product direction into a focused interface, a working system, and evidence
      your team can trust.
    </p>
    <a class="button" href="#contact">Plan the next move</a>
  </section>

  <section class="proof" aria-label="Delivery proof">
    <article>
      <span>01</span>
      <h2>Intent</h2>
      <p>Translate the real decision into a shared product boundary.</p>
    </article>
    <article>
      <span>02</span>
      <h2>Build</h2>
      <p>Work in small visible loops with the interface always running.</p>
    </article>
    <article id="contact">
      <span>03</span>
      <h2>Proof</h2>
      <p>Leave a tested change, a readable diff, and a clear next action.</p>
    </article>
  </section>
</main>

<style>
  :global(*) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    color: var(--color-performance-ink, #090909);
    background: var(--color-performance-paper, #f3f3f0);
    font-family: var(--font-performance-interface, Arial, 'Helvetica Neue', Helvetica, system-ui, sans-serif);
  }

  main {
    min-height: 100vh;
    padding: clamp(1.25rem, 3vw, 2.5rem);
  }

  nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1180px;
    margin: 0 auto;
    padding-bottom: 1.25rem;
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
  }

  nav a {
    color: inherit;
    font-size: 0.86rem;
    font-weight: 650;
    text-decoration: none;
  }

  .brand {
    letter-spacing: var(--tracking-performance-display, -0.03em);
    font-size: 1.2rem;
  }

  .hero {
    max-width: 1180px;
    margin: 0 auto;
    padding: clamp(5rem, 12vw, 10rem) 0 clamp(4rem, 9vw, 7rem);
  }

  .eyebrow,
  article span {
    color: var(--color-performance-pressure, #e54800);
    font-family: var(--font-performance-mono, 'IBM Plex Mono', ui-monospace, monospace);
    font-size: 0.72rem;
    font-weight: 750;
    letter-spacing: var(--tracking-performance-wider, 0.05em);
    text-transform: uppercase;
  }

  h1 {
    max-width: 900px;
    margin: 0.45rem 0 1.5rem;
    font-family: var(--font-performance-display, Arial, 'Helvetica Neue', Helvetica, system-ui, sans-serif);
    font-size: var(--text-performance-display-xl, clamp(4.236rem, 6vw + 2rem, 6.854rem));
    font-weight: var(--font-performance-display-weight, 500);
    letter-spacing: var(--tracking-performance-display, -0.03em);
    line-height: var(--leading-performance-display, 0.94);
  }

  .summary {
    max-width: 610px;
    margin: 0 0 2rem;
    color: var(--color-performance-muted, #5e6268);
    font-size: var(--text-performance-body-lg, 1.095rem);
    line-height: var(--leading-performance-relaxed, 1.618);
  }

  .button {
    display: inline-flex;
    padding: 0.85rem 1.1rem;
    color: var(--color-performance-panel, #ffffff);
    background: var(--color-performance-ink, #090909);
    border: 1px solid var(--color-performance-ink, #090909);
    border-radius: var(--radius-performance-sm, 0);
    font-family: var(--font-performance-mono, 'IBM Plex Mono', ui-monospace, monospace);
    font-size: 0.86rem;
    font-weight: 700;
    text-transform: uppercase;
    text-decoration: none;
  }

  .proof {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    max-width: 1180px;
    margin: 0 auto;
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
  }

  article {
    min-height: 190px;
    padding: 1.5rem 1.5rem 1.5rem 0;
    border-top: 4px solid var(--color-performance-signal, #0057b8);
  }

  article:nth-child(2) {
    border-top-color: var(--color-performance-growth, #007a4d);
  }

  article:nth-child(3) {
    border-top-color: var(--color-performance-pressure, #e54800);
  }

  article + article {
    padding-left: 1.5rem;
    border-left: 1px solid var(--color-performance-line, #d7d7d2);
  }

  h2 {
    margin: 2.75rem 0 0.5rem;
    font-size: 1rem;
  }

  article p {
    max-width: 28ch;
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.88rem;
    line-height: 1.5;
  }

  @media (max-width: 700px) {
    h1 {
      font-size: clamp(3.6rem, 20vw, 6rem);
    }

    .proof {
      grid-template-columns: 1fr;
    }

    article,
    article + article {
      padding: 1.25rem 0;
      border-left: 0;
      border-top: 1px solid var(--color-performance-line, #d7d7d2);
    }

    article:first-child {
      border-top: 0;
    }

    h2 {
      margin-top: 1.5rem;
    }
  }
</style>
