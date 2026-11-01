<section class="hero" aria-labelledby="clearway-title">
  <div class="hero-content">
    <p class="hero-label">Court scheduling</p>
    <h1 id="clearway-title">CLEARWAY</h1>
    <p class="hero-tagline">When scheduling works, you forget it exists.</p>
    <p class="hero-subtitle">
      CLEARWAY doesn't automate court booking. It removes the need to think about it.
    </p>
    <div class="hero-cta">
      <a href="#showcase" class="btn btn-primary">See It Disappear</a>
      <a href="#request-demo" class="btn btn-secondary">Start Free</a>
    </div>
  </div>
</section>

<style>
  .hero {
    padding: clamp(1rem, 3vw, 2rem) var(--space-md);
    background: var(--color-bg-pure);
  }
  .hero-content {
    max-width: 72rem;
    margin-inline: auto;
    padding: clamp(1.5rem, 3vw, 2.5rem);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    background: var(--color-bg-surface);
  }
  .hero-label {
    margin: 0 0 var(--space-sm);
    font-family: var(--font-sans);
    font-size: var(--text-body-sm);
    font-weight: 600;
    color: var(--color-fg-tertiary);
  }
  h1 {
    font-size: var(--text-h1);
    font-weight: 700;
    letter-spacing: -0.035em;
    line-height: 1.08;
    margin: 0 0 var(--space-sm);
  }
  .hero-tagline {
    max-width: 44ch;
    font-size: clamp(1.25rem, 2.2vw, 1.625rem);
    line-height: 1.3;
    margin: 0 0 var(--space-sm);
  }
  .hero-subtitle {
    max-width: 65ch;
    font-size: var(--text-body);
    line-height: 1.55;
    color: var(--color-fg-secondary);
    margin: 0 0 var(--space-md);
  }
  .hero-cta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    padding: 0.55rem 0.9rem;
    border: 1px solid var(--color-border-emphasis);
    border-radius: var(--radius-performance-sm);
    font-weight: 600;
    text-decoration: none;
  }
  .btn-primary {
    background: var(--color-fg-primary);
    color: var(--color-bg-pure);
  }
  .btn-secondary {
    color: var(--color-fg-primary);
    background: var(--color-bg-subtle);
  }
  .btn:hover {
    border-color: var(--color-fg-primary);
    filter: brightness(1.12);
  }
</style>
