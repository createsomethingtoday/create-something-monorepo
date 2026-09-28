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
    padding: clamp(3rem, 7vw, 6rem) var(--space-md);
    border-bottom: 1px solid var(--color-border-default);
    background: var(--color-bg-pure);
  }
  .hero-content {
    max-width: 72rem;
    margin-inline: auto;
  }
  .hero-label {
    margin: 0 0 var(--space-md);
    font-family: var(--font-mono);
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
  }
  h1 {
    font-size: clamp(2.5rem, 10vw, 7rem);
    font-weight: 700;
    letter-spacing: -0.04em;
    line-height: 1;
    margin: 0 0 var(--space-md);
  }
  .hero-tagline {
    max-width: 28ch;
    font-size: clamp(1.5rem, 3vw, 2.5rem);
    line-height: 1.2;
    margin: 0 0 var(--space-sm);
  }
  .hero-subtitle {
    max-width: 52ch;
    font-size: var(--text-body-lg);
    line-height: 1.6;
    color: var(--color-fg-secondary);
    margin: 0 0 var(--space-lg);
  }
  .hero-cta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
  }
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0.75rem 1.25rem;
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
  }
  .btn:hover {
    border-color: var(--color-fg-primary);
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }
</style>
