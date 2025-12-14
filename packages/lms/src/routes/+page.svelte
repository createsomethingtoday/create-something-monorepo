<script lang="ts">
  import { PATHS } from '$content/paths';
  import { BookOpen, Hammer, MessageCircle, ArrowRight, RotateCcw, Terminal, Cloud, Code2, Mail, Workflow, Globe, Bot, Layers } from 'lucide-svelte';

  const CAPABILITIES = [
    {
      icon: Globe,
      title: 'Web Development',
      description: 'SvelteKit applications deployed to Cloudflare edge. Templates, verticals, full-stack.'
    },
    {
      icon: Bot,
      title: 'AI Integration',
      description: 'MCP servers, Claude Code workflows, agent orchestration, intelligent automation.'
    },
    {
      icon: Workflow,
      title: 'Automation',
      description: 'CI/CD pipelines, hooks, scheduled workers, event-driven systems.'
    },
    {
      icon: Layers,
      title: 'Systems Architecture',
      description: 'D1 databases, KV caching, R2 storage, Workers composition, edge-first design.'
    }
  ];
</script>

<svelte:head>
  <title>CREATE SOMETHING LMS</title>
</svelte:head>

<div class="max-w-6xl mx-auto px-6 py-16">
  <!-- Hero -->
  <section class="text-center mb-20">
    <p class="eyebrow">Being-as-Understanding</p>
    <h1 class="hero-title">Learn the Ethos</h1>
    <p class="hero-subtitle">Creation is the discipline of removing what obscures.</p>
    <p class="hero-description">Eight paths. One philosophy. Understanding through practice.</p>
  </section>

  <!-- Thesis Section -->
  <section class="thesis-section mb-20">
    <h2 class="section-title center">The Thesis</h2>
    <p class="thesis-text">
      Build your own philosophically-powered development system from the terminal.
      Learn to architect with AI—not as automation, but as partnership.
    </p>

    <div class="stack-grid">
      <div class="stack-item">
        <div class="stack-icon"><Terminal size={28} strokeWidth={1.5} /></div>
        <div class="stack-name">WezTerm</div>
        <div class="stack-role">Terminal as dwelling</div>
      </div>
      <div class="stack-item">
        <div class="stack-icon"><Code2 size={28} strokeWidth={1.5} /></div>
        <div class="stack-name">Claude Code</div>
        <div class="stack-role">AI partnership</div>
      </div>
      <div class="stack-item">
        <div class="stack-icon"><Cloud size={28} strokeWidth={1.5} /></div>
        <div class="stack-name">Cloudflare</div>
        <div class="stack-role">Edge infrastructure</div>
      </div>
      <div class="stack-item">
        <div class="stack-icon">
          <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" stroke-width="1.5" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div class="stack-name">SvelteKit</div>
        <div class="stack-role">Minimal reactivity</div>
      </div>
      <div class="stack-item">
        <div class="stack-icon"><Mail size={28} strokeWidth={1.5} /></div>
        <div class="stack-name">Neomutt</div>
        <div class="stack-role">Email that recedes</div>
      </div>
    </div>

    <p class="thesis-note">
      Each tool was chosen because it disappears into use. The infrastructure recedes; only the work remains.
    </p>
  </section>

  <!-- Paths Grid -->
  <section class="mb-20">
    <h2 class="section-title">Learning Paths</h2>

    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each PATHS as path}
        <a href="/paths/{path.id}" class="path-card {path.color}">
          <!-- Path indicator -->
          <div class="flex items-center gap-3 mb-4">
            <div class="path-dot"></div>
            <span class="lesson-count">{path.lessons.length} lessons</span>
          </div>

          <!-- Title -->
          <h3 class="path-title">{path.title}</h3>
          <p class="path-subtitle">{path.subtitle}</p>

          <!-- Description -->
          <p class="path-description">{path.description}</p>

          <!-- Prerequisites -->
          {#if path.prerequisites && path.prerequisites.length > 0}
            <div class="prerequisites">
              <span>Requires: {path.prerequisites.join(', ')}</span>
            </div>
          {/if}
        </a>
      {/each}
    </div>
  </section>

  <!-- Philosophy -->
  <section class="philosophy-section">
    <h2 class="section-title center">The Hermeneutic Spiral</h2>
    <p class="philosophy-text">
      Learning is not linear. Each return to a concept deepens understanding.
      Read, practice, reflect—then return with new eyes.
    </p>

    <div class="spiral-steps">
      <div class="spiral-step">
        <div class="spiral-icon"><BookOpen size={32} strokeWidth={1.5} /></div>
        <div class="spiral-label">Read</div>
      </div>
      <div class="spiral-arrow"><ArrowRight size={24} /></div>
      <div class="spiral-step">
        <div class="spiral-icon"><Hammer size={32} strokeWidth={1.5} /></div>
        <div class="spiral-label">Practice</div>
      </div>
      <div class="spiral-arrow"><ArrowRight size={24} /></div>
      <div class="spiral-step">
        <div class="spiral-icon"><MessageCircle size={32} strokeWidth={1.5} /></div>
        <div class="spiral-label">Reflect</div>
      </div>
      <div class="spiral-arrow"><RotateCcw size={24} /></div>
    </div>
  </section>

  <!-- Partnership Capabilities -->
  <section class="capabilities-section">
    <h2 class="section-title center">What We Build Together</h2>
    <p class="capabilities-intro">
      CREATE SOMETHING + Claude Code: human-AI partnership that builds complete solutions.
      The same methodology that built this LMS.
    </p>

    <div class="capabilities-grid">
      {#each CAPABILITIES as cap}
        <div class="capability-card">
          <div class="capability-icon">
            <svelte:component this={cap.icon} size={32} strokeWidth={1.5} />
          </div>
          <h3 class="capability-title">{cap.title}</h3>
          <p class="capability-description">{cap.description}</p>
        </div>
      {/each}
    </div>

    <div class="partnership-cta">
      <p class="partnership-text">
        This platform was built entirely through terminal-based AI partnership.
        Learn the methodology. Build your own systems.
      </p>
      <a href="/paths/partnership" class="btn btn-primary">
        Start with Partnership Path
        <ArrowRight size={16} />
      </a>
    </div>
  </section>
</div>

<style>
  /* Hero styles now provided by Canon utilities:
     .eyebrow, .hero-title, .hero-subtitle, .hero-description */

  .section-title {
    font-size: var(--text-h2);
    margin-bottom: var(--space-lg);
  }

  .section-title.center {
    text-align: center;
    margin-bottom: var(--space-md);
  }

  .path-card {
    display: block;
    padding: var(--space-md);
    border-radius: var(--radius-xl);
    border: 1px solid var(--color-border-default);
    background: var(--color-bg-elevated);
    transition: border-color var(--duration-micro) var(--ease-standard);
  }

  .path-card:hover {
    border-color: var(--color-border-emphasis);
  }

  .path-dot {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: var(--radius-full);
    background: var(--path-color);
  }

  .lesson-count {
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .path-title {
    font-size: var(--text-h3);
    margin-bottom: 0.25rem;
    transition: color var(--duration-micro) var(--ease-standard);
  }

  .path-card:hover .path-title {
    color: var(--color-fg-primary);
  }

  .path-subtitle {
    color: var(--color-fg-tertiary);
    font-size: var(--text-body-sm);
    margin-bottom: var(--space-sm);
  }

  .path-description {
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .prerequisites {
    margin-top: var(--space-sm);
    padding-top: var(--space-sm);
    border-top: 1px solid var(--color-border-default);
    color: var(--color-fg-muted);
    font-size: var(--text-caption);
  }

  .philosophy-section {
    text-align: center;
    padding: var(--space-xl) 0;
    border-top: 1px solid var(--color-border-default);
  }

  .philosophy-text {
    color: var(--color-fg-secondary);
    max-width: 42rem;
    margin: 0 auto var(--space-lg);
  }

  .spiral-steps {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--space-lg);
    color: var(--color-fg-tertiary);
  }

  .spiral-step {
    text-align: center;
  }

  .spiral-icon {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 0.5rem;
    color: var(--color-fg-secondary);
  }

  .spiral-label {
    font-size: var(--text-body-sm);
  }

  .spiral-arrow {
    font-size: var(--text-h3);
  }

  /* Thesis Section */
  .thesis-section {
    text-align: center;
    padding: var(--space-xl) 0;
    border-top: 1px solid var(--color-border-default);
    border-bottom: 1px solid var(--color-border-default);
  }

  .thesis-text {
    font-size: var(--text-body-lg);
    color: var(--color-fg-secondary);
    max-width: 42rem;
    margin: 0 auto var(--space-lg);
    line-height: var(--leading-relaxed);
  }

  .stack-grid {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: var(--space-lg);
    margin-bottom: var(--space-lg);
  }

  .stack-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-xs);
    min-width: 100px;
  }

  .stack-icon {
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-xs);
  }

  .stack-name {
    font-size: var(--text-body-sm);
    font-weight: 500;
    color: var(--color-fg-primary);
  }

  .stack-role {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .thesis-note {
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
    font-style: italic;
    max-width: 36rem;
    margin: 0 auto;
  }

  /* Capabilities Section */
  .capabilities-section {
    text-align: center;
    padding: var(--space-xl) 0;
    border-top: 1px solid var(--color-border-default);
  }

  .capabilities-intro {
    font-size: var(--text-body-lg);
    color: var(--color-fg-secondary);
    max-width: 42rem;
    margin: 0 auto var(--space-xl);
    line-height: var(--leading-relaxed);
  }

  .capabilities-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-md);
    max-width: 48rem;
    margin: 0 auto var(--space-xl);
    text-align: left;
  }

  @media (max-width: 640px) {
    .capabilities-grid {
      grid-template-columns: 1fr;
    }
  }

  .capability-card {
    padding: var(--space-md);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
  }

  .capability-icon {
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-sm);
  }

  .capability-title {
    font-size: var(--text-body-lg);
    font-weight: var(--font-medium);
    margin-bottom: var(--space-xs);
  }

  .capability-description {
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
    line-height: var(--leading-relaxed);
  }

  .partnership-cta {
    padding-top: var(--space-lg);
    border-top: 1px solid var(--color-border-default);
    max-width: 36rem;
    margin: 0 auto;
  }

  .partnership-text {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
    margin-bottom: var(--space-md);
  }
</style>
