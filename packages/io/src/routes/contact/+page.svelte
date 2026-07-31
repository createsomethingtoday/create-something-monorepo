<script lang="ts">
  import OrientationOpening from '$lib/components/orientation/OrientationOpening.svelte';
</script>

<svelte:head>
  <title>Contact | CREATE SOMETHING</title>
  <meta
    name="description"
    content="Contact CREATE SOMETHING about tracked experiments, research methodology, or AI-native development collaboration."
  />
  <meta
    name="keywords"
    content="contact, AI-native development, experiment collaboration, development research, technical inquiry"
  />
  <meta property="og:title" content="Contact | AI-Native Development Research" />
  <meta
    property="og:description"
    content="Questions about tracked experiments, methodology, or AI-native development collaboration."
  />
  <meta property="og:url" content="https://createsomething.io/contact" />
  <meta name="twitter:title" content="Contact CREATE SOMETHING" />
  <meta
    name="twitter:description"
    content="Ask about tracked experiments, methodology, or research collaboration."
  />
  <link rel="canonical" href="https://createsomething.io/contact" />
</svelte:head>

<OrientationOpening
  active="contact"
  eyebrow="One direct contact path"
  title="Start with the question"
  description="Email for a concrete experiment, methodology, or collaboration question. Use the public profiles when you only need ongoing research updates."
  summary={[
    { label: 'Best for', value: 'Specific questions' },
    { label: 'Topic', value: 'AI-native systems' },
    { label: 'Location', value: 'Texas' }
  ]}
/>

<section class="orientation-collection" aria-labelledby="contact-options-title">
  <div class="contact-inner">
    <header>
      <p>Choose one route</p>
      <h2 id="contact-options-title">Contact or follow</h2>
    </header>

    <div class="contact-grid">
      <article class="contact-card primary-card">
        <span>Direct</span>
        <h3>Email Micah</h3>
        <p>
          Use email for experiment methodology, development metrics, systems work, or a specific
          research collaboration.
        </p>
        <a href="mailto:micah@createsomething.io">micah@createsomething.io</a>
      </article>

      <article class="contact-card">
        <span>Public updates</span>
        <h3>Follow the work</h3>
        <p>
          LinkedIn carries professional context and new research. GitHub exposes the implementation
          history behind the published claims.
        </p>
        <div class="profile-links">
          <a
            href="https://www.linkedin.com/in/micahryanjohnson/"
            target="_blank"
            rel="noopener noreferrer">LinkedIn</a
          >
          <a
            href="https://github.com/createsomethingtoday"
            target="_blank"
            rel="noopener noreferrer">GitHub</a
          >
        </div>
      </article>
    </div>
  </div>
</section>

<style>
  .orientation-collection {
    padding: clamp(2rem, 5vw, 4rem) 1.5rem clamp(4rem, 8vw, 6rem);
    border-top: 1px solid var(--color-performance-border-default);
  }

  .contact-inner {
    display: grid;
    width: min(72rem, 100%);
    margin-inline: auto;
    gap: var(--space-performance-lg);
  }

  header {
    display: grid;
    gap: 0.35rem;
  }

  header p,
  header h2 {
    margin: 0;
  }

  header p {
    color: var(--color-performance-fg-tertiary);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
  }

  header h2 {
    font-size: var(--text-performance-h2);
  }

  .contact-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-performance-md);
  }

  .contact-card {
    display: flex;
    min-height: 18rem;
    flex-direction: column;
    gap: var(--space-performance-sm);
    padding: var(--space-performance-lg);
    border: 1px solid var(--color-performance-border-default);
    background: var(--color-performance-bg-surface);
  }

  .contact-card.primary-card {
    border-color: var(--color-performance-border-strong);
  }

  .contact-card span {
    color: var(--color-performance-fg-tertiary);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
  }

  .contact-card h3,
  .contact-card p {
    margin: 0;
  }

  .contact-card h3 {
    font-size: var(--text-performance-h3);
  }

  .contact-card p {
    color: var(--color-performance-fg-secondary);
    line-height: var(--leading-performance-relaxed);
  }

  .contact-card > a,
  .profile-links {
    margin-top: auto;
  }

  .contact-card a {
    width: fit-content;
    color: var(--color-performance-fg-primary);
    font-weight: var(--font-performance-semibold);
    text-decoration: underline;
  }

  .profile-links {
    display: flex;
    gap: var(--space-performance-md);
  }

  @media (max-width: 640px) {
    .orientation-collection {
      padding-inline: 1.25rem;
    }

    .contact-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
