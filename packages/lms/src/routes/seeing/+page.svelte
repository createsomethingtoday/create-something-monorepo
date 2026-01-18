<script lang="ts">
  import { Eye, Home, ArrowRight, Terminal, Code2, BookOpen, MessageCircle, CheckCircle2, Sparkles } from 'lucide-svelte';

  const SEEING_LESSONS = [
    {
      id: 'setting-up',
      title: 'Setting Up',
      description: 'Install Gemini CLI and the Seeing extension. Five minutes to your first practice.',
      duration: '5 min'
    },
    {
      id: 'what-is-creation',
      title: 'What Is Creation?',
      description: 'The meta-principle: creation as the discipline of removing what obscures.',
      duration: '10 min'
    },
    {
      id: 'dry-implementation',
      title: 'DRY: Implementation',
      description: 'Level 1 — "Have I built this before?" Learn to see duplication.',
      duration: '15 min'
    },
    {
      id: 'rams-artifact',
      title: 'Rams: Artifact',
      description: 'Level 2 — "Does this earn its existence?" Learn to see excess.',
      duration: '15 min'
    },
    {
      id: 'heidegger-system',
      title: 'Heidegger: System',
      description: 'Level 3 — "Does this serve the whole?" Learn to see disconnection.',
      duration: '20 min'
    },
    {
      id: 'triad-application',
      title: 'Applying the Triad',
      description: 'Putting the three questions together. The framework becomes perception.',
      duration: '25 min'
    }
  ];

  const GRADUATION_CRITERIA = [
    'Ask the three questions without prompting',
    'Identify duplication before building',
    'Question whether features earn existence',
    'Map how changes serve the whole'
  ];
</script>

<svelte:head>
  <title>Seeing — Learn to Perceive | CREATE SOMETHING</title>
  <meta name="description" content="Learn to see through the Subtractive Triad. The free entry point to CREATE SOMETHING methodology. Seeing teaches perception; Dwelling teaches execution." />
</svelte:head>

<div class="max-w-5xl mx-auto px-6 py-16">
  <!-- Hero -->
  <section class="hero-section">
    <div class="tier-badge">
      <Eye size={16} />
      <span>Seeing</span>
      <span class="tier-free">Free</span>
    </div>
    
    <h1 class="hero-title">Learn to See</h1>
    <p class="hero-subtitle">
      Before you can build well, you must perceive well.
    </p>
    <p class="hero-description">
      Seeing teaches the Subtractive Triad — three questions that reveal 
      duplication, excess, and disconnection in any codebase. Free. In your terminal.
    </p>

    <div class="hero-cta">
      <a href="#install" class="btn btn-primary">
        <Terminal size={18} />
        Install for Gemini CLI
      </a>
      <a href="#journey" class="btn btn-secondary">
        Learn the Journey
        <ArrowRight size={16} />
      </a>
    </div>
  </section>

  <!-- The Journey -->
  <section id="journey" class="journey-section">
    <h2 class="section-title center">The Journey: Seeing → Dwelling</h2>
    <p class="section-intro">
      CREATE SOMETHING education has two tiers. Master perception first, then tools recede into transparent use.
    </p>

    <div class="journey-cards">
      <!-- Seeing Card -->
      <div class="journey-card seeing-card">
        <div class="journey-header">
          <div class="journey-icon">
            <Eye size={32} />
          </div>
          <div>
            <h3 class="journey-title">Seeing</h3>
            <span class="journey-tier">You are here</span>
          </div>
          <span class="journey-price">Free</span>
        </div>

        <p class="journey-philosophy">
          <strong>Vorhandenheit</strong> — Present-at-hand. You notice the tools, study the patterns, learn to perceive.
        </p>

        <ul class="journey-features">
          <li><CheckCircle2 size={16} /> Philosophy lessons</li>
          <li><CheckCircle2 size={16} /> Triad commands (/dry, /rams, /heidegger)</li>
          <li><CheckCircle2 size={16} /> Self-assessed reflections</li>
          <li><CheckCircle2 size={16} /> Progress tracking</li>
          <li><CheckCircle2 size={16} /> Gemini CLI (1,000 free/day)</li>
        </ul>

        <div class="journey-tool">
          <Terminal size={20} />
          <span>Gemini CLI</span>
        </div>
      </div>

      <!-- Arrow -->
      <div class="journey-arrow">
        <ArrowRight size={32} />
        <span>Graduate</span>
      </div>

      <!-- Dwelling Card -->
      <div class="journey-card dwelling-card">
        <div class="journey-header">
          <div class="journey-icon">
            <Home size={32} />
          </div>
          <div>
            <h3 class="journey-title">Dwelling</h3>
            <span class="journey-tier">Mastery</span>
          </div>
          <span class="journey-price">Pro</span>
        </div>

        <p class="journey-philosophy">
          <strong>Zuhandenheit</strong> — Ready-to-hand. Tools recede into transparent use. You don't notice the infrastructure—only the work.
        </p>

        <ul class="journey-features">
          <li><CheckCircle2 size={16} /> Everything in Seeing, plus:</li>
          <li><CheckCircle2 size={16} /> Automated praxis with code audits</li>
          <li><CheckCircle2 size={16} /> Personal ethos layer</li>
          <li><CheckCircle2 size={16} /> Full MCP skills & tools</li>
          <li><CheckCircle2 size={16} /> Harness/Ralph/Gastown patterns</li>
        </ul>

        <div class="journey-tool">
          <Code2 size={20} />
          <span>Claude Code</span>
        </div>
      </div>
    </div>
  </section>

  <!-- The Triad -->
  <section class="triad-section">
    <h2 class="section-title center">The Subtractive Triad</h2>
    <p class="section-intro">
      Three questions, asked in order, that reveal what obscures your code.
    </p>

    <div class="triad-cards">
      <div class="triad-card">
        <div class="triad-level">Level 1</div>
        <h3 class="triad-title">DRY</h3>
        <p class="triad-question">"Have I built this before?"</p>
        <p class="triad-action">Action: <strong>Unify</strong></p>
        <p class="triad-description">
          Find duplication. Same concept, multiple expressions. Unify to reveal the underlying abstraction.
        </p>
      </div>

      <div class="triad-card">
        <div class="triad-level">Level 2</div>
        <h3 class="triad-title">Rams</h3>
        <p class="triad-question">"Does this earn its existence?"</p>
        <p class="triad-action">Action: <strong>Remove</strong></p>
        <p class="triad-description">
          Weniger, aber besser. Less, but better. Every feature must justify its place or be removed.
        </p>
      </div>

      <div class="triad-card">
        <div class="triad-level">Level 3</div>
        <h3 class="triad-title">Heidegger</h3>
        <p class="triad-question">"Does this serve the whole?"</p>
        <p class="triad-action">Action: <strong>Reconnect</strong></p>
        <p class="triad-description">
          The hermeneutic circle. Parts serve the whole, the whole gives meaning to parts. Reconnect what fragments.
        </p>
      </div>
    </div>
  </section>

  <!-- Lessons Preview -->
  <section class="lessons-section">
    <h2 class="section-title">Seeing Curriculum</h2>
    <p class="section-intro-left">
      Five lessons that develop your perception. Read here, practice in Gemini CLI.
    </p>

    <div class="lessons-list">
      {#each SEEING_LESSONS as lesson, index}
        <a href="/seeing/{lesson.id}" class="lesson-row">
          <div class="lesson-number">{String(index + 1).padStart(2, '0')}</div>
          <div class="lesson-content">
            <h3 class="lesson-title">{lesson.title}</h3>
            <p class="lesson-description">{lesson.description}</p>
          </div>
          <div class="lesson-meta">
            <BookOpen size={16} />
            <span>{lesson.duration}</span>
          </div>
        </a>
      {/each}
    </div>
  </section>

  <!-- Cost Clarity -->
  <section class="cost-section">
    <h2 class="section-title center">Cost Transparency</h2>
    <p class="section-intro">
      Seeing is free. Dwelling requires a Claude subscription.
    </p>

    <div class="cost-comparison">
      <div class="cost-card cost-free">
        <div class="cost-header">
          <Eye size={24} />
          <h3>Seeing</h3>
        </div>
        <div class="cost-price">
          <span class="price-amount">$0</span>
          <span class="price-period">/month</span>
        </div>
        <ul class="cost-features">
          <li>Gemini CLI free tier</li>
          <li>1,000 requests/day</li>
          <li>Google account only</li>
          <li>No credit card required</li>
        </ul>
        <p class="cost-note">Sufficient for all philosophy lessons and practice</p>
      </div>

      <div class="cost-card cost-pro">
        <div class="cost-header">
          <Home size={24} />
          <h3>Dwelling</h3>
        </div>
        <div class="cost-price">
          <span class="price-amount">~$100</span>
          <span class="price-period">/month</span>
        </div>
        <ul class="cost-features">
          <li>Claude Max subscription</li>
          <li>Higher usage limits for Claude Code</li>
          <li>Full MCP tool access</li>
          <li>Automated praxis & audits</li>
        </ul>
        <p class="cost-note">Recommended for production-grade execution</p>
      </div>
    </div>

    <p class="cost-philosophy">
      <em>Start free. Graduate when you're ready. The philosophy costs nothing to learn.</em>
    </p>
  </section>

  <!-- Installation -->
  <section id="install" class="install-section">
    <h2 class="section-title center">Start Seeing</h2>
    <p class="section-intro">
      Install the Gemini CLI extension and begin your journey.
    </p>

    <div class="install-card">
      <div class="install-step">
        <div class="step-number">1</div>
        <div class="step-content">
          <h3>Install Gemini CLI</h3>
          <code>npm install -g @google/gemini-cli</code>
        </div>
      </div>

      <div class="install-step">
        <div class="step-number">2</div>
        <div class="step-content">
          <h3>Add Seeing Extension</h3>
          <code>gemini extensions install @createsomething/seeing</code>
        </div>
      </div>

      <div class="install-step">
        <div class="step-number">3</div>
        <div class="step-content">
          <h3>Begin Learning</h3>
          <code>/lesson what-is-creation</code>
        </div>
      </div>
    </div>

    <div class="install-alt">
      <p>Or install via npm:</p>
      <code>npx @createsomething/seeing init</code>
    </div>
  </section>

  <!-- Graduation -->
  <section class="graduation-section">
    <h2 class="section-title center">When to Graduate</h2>
    <p class="section-intro">
      You're ready for Dwelling when the questions become automatic.
    </p>

    <div class="graduation-criteria">
      {#each GRADUATION_CRITERIA as criterion}
        <div class="criterion">
          <Sparkles size={18} />
          <span>{criterion}</span>
        </div>
      {/each}
    </div>

    <div class="graduation-quote">
      <blockquote>
        "You've learned to see. Now learn to dwell."
      </blockquote>
      <p class="graduation-instruction">
        When ready, run <code>/graduate</code> in Gemini CLI, then:
      </p>
      <code class="graduation-command">npx @createsomething/learn init</code>
    </div>
  </section>
</div>

<style>
  /* Hero */
  .hero-section {
    text-align: center;
    margin-bottom: var(--space-2xl);
  }

  .tier-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-xs) var(--space-sm);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-full);
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-md);
  }

  .tier-free {
    background: var(--color-accent-subtle);
    color: var(--color-accent-fg);
    padding: 2px 8px;
    border-radius: var(--radius-full);
    font-size: var(--text-caption);
    font-weight: var(--font-medium);
  }

  .hero-title {
    font-size: var(--text-display);
    margin-bottom: var(--space-sm);
  }

  .hero-subtitle {
    font-size: var(--text-h3);
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-sm);
  }

  .hero-description {
    color: var(--color-fg-tertiary);
    max-width: 36rem;
    margin: 0 auto var(--space-lg);
  }

  .hero-cta {
    display: flex;
    justify-content: center;
    gap: var(--space-md);
    flex-wrap: wrap;
  }

  /* Journey */
  .journey-section {
    padding: var(--space-2xl) 0;
    border-top: 1px solid var(--color-border-default);
  }

  .section-title {
    font-size: var(--text-h2);
    margin-bottom: var(--space-sm);
  }

  .section-title.center {
    text-align: center;
  }

  .section-intro {
    text-align: center;
    color: var(--color-fg-secondary);
    max-width: 36rem;
    margin: 0 auto var(--space-xl);
  }

  .section-intro-left {
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-lg);
  }

  .journey-cards {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-lg);
    flex-wrap: wrap;
  }

  .journey-card {
    flex: 1;
    min-width: 280px;
    max-width: 360px;
    padding: var(--space-lg);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-xl);
  }

  .seeing-card {
    border-color: var(--color-accent-emphasis);
  }

  .journey-header {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    margin-bottom: var(--space-md);
  }

  .journey-icon {
    color: var(--color-fg-secondary);
  }

  .journey-title {
    font-size: var(--text-h3);
    margin: 0;
  }

  .journey-tier {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .journey-price {
    margin-left: auto;
    padding: 4px 12px;
    background: var(--color-bg-subtle);
    border-radius: var(--radius-full);
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
  }

  .journey-philosophy {
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
    font-style: italic;
    margin-bottom: var(--space-md);
    padding-bottom: var(--space-md);
    border-bottom: 1px solid var(--color-border-default);
  }

  .journey-features {
    list-style: none;
    padding: 0;
    margin: 0 0 var(--space-md) 0;
  }

  .journey-features li {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-xs);
  }

  .journey-tool {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-sm);
    background: var(--color-bg-subtle);
    border-radius: var(--radius-md);
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
  }

  .journey-arrow {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-xs);
    color: var(--color-fg-muted);
    font-size: var(--text-caption);
  }

  /* Triad */
  .triad-section {
    padding: var(--space-2xl) 0;
    border-top: 1px solid var(--color-border-default);
  }

  .triad-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: var(--space-md);
  }

  .triad-card {
    padding: var(--space-lg);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-xl);
  }

  .triad-level {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: var(--space-xs);
  }

  .triad-title {
    font-size: var(--text-h3);
    margin-bottom: var(--space-xs);
  }

  .triad-question {
    font-style: italic;
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-xs);
  }

  .triad-action {
    font-size: var(--text-body-sm);
    color: var(--color-accent-fg);
    margin-bottom: var(--space-sm);
  }

  .triad-description {
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
  }

  /* Lessons */
  .lessons-section {
    padding: var(--space-2xl) 0;
    border-top: 1px solid var(--color-border-default);
  }

  .lessons-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .lesson-row {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    transition: border-color var(--duration-micro) var(--ease-standard);
  }

  .lesson-row:hover {
    border-color: var(--color-border-emphasis);
  }

  .lesson-number {
    font-size: var(--text-h2);
    font-weight: var(--font-light);
    color: var(--color-fg-muted);
    width: 3rem;
  }

  .lesson-content {
    flex: 1;
  }

  .lesson-title {
    font-size: var(--text-body-lg);
    margin-bottom: 2px;
  }

  .lesson-description {
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
  }

  .lesson-meta {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }

  /* Cost */
  .cost-section {
    padding: var(--space-2xl) 0;
    border-top: 1px solid var(--color-border-default);
  }

  .cost-comparison {
    display: flex;
    justify-content: center;
    gap: var(--space-lg);
    flex-wrap: wrap;
    margin-bottom: var(--space-lg);
  }

  .cost-card {
    flex: 1;
    min-width: 240px;
    max-width: 300px;
    padding: var(--space-lg);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-xl);
    text-align: center;
  }

  .cost-free {
    border-color: var(--color-accent-emphasis);
  }

  .cost-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    margin-bottom: var(--space-md);
    color: var(--color-fg-secondary);
  }

  .cost-header h3 {
    font-size: var(--text-h3);
    margin: 0;
  }

  .cost-price {
    margin-bottom: var(--space-md);
  }

  .price-amount {
    font-size: var(--text-display);
    font-weight: var(--font-semibold);
  }

  .price-period {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }

  .cost-features {
    list-style: none;
    padding: 0;
    margin: 0 0 var(--space-md) 0;
    text-align: left;
  }

  .cost-features li {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    padding: var(--space-xs) 0;
    border-bottom: 1px solid var(--color-border-default);
  }

  .cost-features li:last-child {
    border-bottom: none;
  }

  .cost-note {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    font-style: italic;
  }

  .cost-philosophy {
    text-align: center;
    color: var(--color-fg-tertiary);
    font-size: var(--text-body-sm);
  }

  /* Install */
  .install-section {
    padding: var(--space-2xl) 0;
    border-top: 1px solid var(--color-border-default);
  }

  .install-card {
    max-width: 32rem;
    margin: 0 auto var(--space-lg);
    padding: var(--space-lg);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-xl);
  }

  .install-step {
    display: flex;
    align-items: flex-start;
    gap: var(--space-md);
    margin-bottom: var(--space-md);
  }

  .install-step:last-child {
    margin-bottom: 0;
  }

  .step-number {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-accent-subtle);
    color: var(--color-accent-fg);
    border-radius: var(--radius-full);
    font-weight: var(--font-medium);
  }

  .step-content h3 {
    font-size: var(--text-body-lg);
    margin-bottom: var(--space-xs);
  }

  .step-content code {
    display: block;
    padding: var(--space-sm);
    background: var(--color-bg-subtle);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: var(--text-body-sm);
  }

  .install-alt {
    text-align: center;
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
  }

  .install-alt code {
    display: inline-block;
    margin-top: var(--space-xs);
    padding: var(--space-xs) var(--space-sm);
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
  }

  /* Graduation */
  .graduation-section {
    padding: var(--space-2xl) 0;
    border-top: 1px solid var(--color-border-default);
  }

  .graduation-criteria {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: var(--space-sm);
    max-width: 42rem;
    margin: 0 auto var(--space-xl);
  }

  .criterion {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
  }

  .graduation-quote {
    text-align: center;
    max-width: 28rem;
    margin: 0 auto;
  }

  .graduation-quote blockquote {
    font-size: var(--text-h3);
    font-style: italic;
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-md);
  }

  .graduation-instruction {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
    margin-bottom: var(--space-sm);
  }

  .graduation-command {
    display: inline-block;
    padding: var(--space-sm) var(--space-md);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
  }
</style>
