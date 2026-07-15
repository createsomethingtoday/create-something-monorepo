<script lang="ts">
  const accent = '#2f6f68';
</script>

<svelte:head>
  <title>Northstar — Demo frontend</title>
  <meta
    name="description"
    content="A deterministic frontend fixture for the CREATE SOMETHING client workspace."
  />
</svelte:head>

<main style={`--accent: ${accent}`}>
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
    color: #1f211f;
    background: #f2efe8;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
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
    border-bottom: 1px solid rgb(31 33 31 / 18%);
  }

  nav a {
    color: inherit;
    font-size: 0.86rem;
    font-weight: 650;
    text-decoration: none;
  }

  .brand {
    letter-spacing: -0.035em;
    font-size: 1.2rem;
  }

  .hero {
    max-width: 1180px;
    margin: 0 auto;
    padding: clamp(5rem, 12vw, 10rem) 0 clamp(4rem, 9vw, 7rem);
  }

  .eyebrow,
  article span {
    color: var(--accent);
    font-size: 0.72rem;
    font-weight: 750;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  h1 {
    max-width: 900px;
    margin: 0.45rem 0 1.5rem;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: clamp(4rem, 11vw, 9.5rem);
    font-weight: 400;
    letter-spacing: -0.07em;
    line-height: 0.83;
  }

  .summary {
    max-width: 610px;
    margin: 0 0 2rem;
    color: #50534e;
    font-size: clamp(1rem, 2vw, 1.3rem);
    line-height: 1.55;
  }

  .button {
    display: inline-flex;
    padding: 0.85rem 1.1rem;
    color: white;
    background: var(--accent);
    border-radius: 999px;
    font-size: 0.86rem;
    font-weight: 700;
    text-decoration: none;
  }

  .proof {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    max-width: 1180px;
    margin: 0 auto;
    border-top: 1px solid rgb(31 33 31 / 18%);
  }

  article {
    min-height: 190px;
    padding: 1.5rem 1.5rem 1.5rem 0;
  }

  article + article {
    padding-left: 1.5rem;
    border-left: 1px solid rgb(31 33 31 / 18%);
  }

  h2 {
    margin: 2.75rem 0 0.5rem;
    font-size: 1rem;
  }

  article p {
    max-width: 28ch;
    margin: 0;
    color: #656861;
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
      border-top: 1px solid rgb(31 33 31 / 18%);
    }

    article:first-child {
      border-top: 0;
    }

    h2 {
      margin-top: 1.5rem;
    }
  }
</style>
