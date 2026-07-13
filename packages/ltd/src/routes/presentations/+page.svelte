<script lang="ts">
  /**
   * Presentations Index
   *
   * A collection of presentations following CREATE SOMETHING principles.
   * "The presentation itself demonstrates the philosophy."
   */
  import { SEO } from '@create-something/canon';

  const presentations = [
    {
      slug: 'heidegger-canon',
      title: 'HEIDEGGER: CANON',
      subtitle: 'Philosophy as Foundation',
      description:
        'Install the CREATE SOMETHING methodology. Apply the Subtractive Triad. Build systems that disappear.',
      slides: 18,
      duration: '25 min',
      tags: ['Philosophy', 'Methodology']
    },
    {
      slug: 'claude-code-partner',
      title: 'CLAUDE CODE: PARTNER',
      subtitle: 'AI-Native Development',
      description:
        'Set up Claude Code as your development partner. Configure CLAUDE.md, rules, MCP servers, and hooks.',
      slides: 16,
      duration: '25 min',
      tags: ['Claude Code', 'AI', 'Setup']
    },
    {
      slug: 'beads-continuity',
      title: 'BEADS: CONTINUITY',
      subtitle: 'Cross-Session Memory',
      description:
        'Agent-native task tracking for cross-session memory. Dependencies, robot mode, and hermeneutic continuity.',
      slides: 14,
      duration: '20 min',
      tags: ['Beads', 'Task Management']
    },
    {
      slug: 'cloudflare-edge',
      title: 'CLOUDFLARE: EDGE',
      subtitle: 'Global Infrastructure',
      description:
        'Deploy to the edge with D1, KV, R2, and Workers. Infrastructure that disappears.',
      slides: 18,
      duration: '25 min',
      tags: ['Cloudflare', 'Infrastructure']
    },
    {
      slug: 'canon-design',
      title: 'CANON: DESIGN',
      subtitle: 'Design Tokens from Philosophy',
      description:
        'Tailwind for structure, Canon for aesthetics. Design tokens derived from first principles.',
      slides: 15,
      duration: '20 min',
      tags: ['Design', 'CSS', 'Canon']
    },
    {
      slug: 'deployment-dwelling',
      title: 'DEPLOYMENT: DWELLING',
      subtitle: 'Shipping to Production',
      description: 'Deploy to production and dwell. The hermeneutic spiral of ongoing practice.',
      slides: 14,
      duration: '20 min',
      tags: ['Deployment', 'Practice']
    },
    {
      slug: 'workway',
      title: 'WORKWAY',
      subtitle: 'Workflow Automation for Developers',
      description:
        'Build workflows with TypeScript. Deploy to the edge. Monetize in the marketplace.',
      slides: 17,
      duration: '20 min',
      tags: ['Philosophy', 'Product', 'Heidegger', 'Claude Code', 'Cloudflare']
    },
    {
      slug: 'hub',
      title: 'HUB',
      subtitle: 'The Governed MCP Surface',
      description:
        'Explain how CREATE SOMETHING Hub governs discovery, execution, and tenant-aware tool exposure between the user, Codex, and downstream MCPs.',
      slides: 12,
      duration: '10 min',
      tags: ['Hub', 'MCP', 'Codex', 'Policy']
    },
    {
      slug: 'abundance-system',
      title: 'ABUNDANCE',
      subtitle: 'Nurse Staffing, Explained Simply',
      description:
        'A client-facing walkthrough of how Abundance captures profile data, ranks matches, uses policy controls, and frames directional go-to-market budgets for nurse staffing.',
      slides: 14,
      duration: '18 min',
      tags: ['Healthcare', 'Matching', 'Concierge', 'Policy']
    }
  ];
</script>

<SEO
  title="Presentations"
  description="Philosophy-driven presentations from CREATE SOMETHING."
  propertyName="ltd"
  breadcrumbs={[
    { name: 'Home', url: 'https://createsomething.ltd' },
    { name: 'Presentations', url: 'https://createsomething.ltd/presentations' }
  ]}
/>

<article class="presentations-page">
  <header class="header">
    <a href="/" class="back-link">← Home</a>
    <p class="meta">Presentations</p>
    <h1 class="title">Slide Decks</h1>
    <p class="description">
      Philosophy-driven presentations following Heideggerian principles. The presentation itself
      demonstrates "less, but better."
    </p>
  </header>

  <section class="presentations-list">
    {#each presentations as presentation}
      <a href="/presentations/{presentation.slug}" class="presentation-card">
        <div class="card-header">
          <span class="card-slides">{presentation.slides} slides</span>
          <span class="card-duration">{presentation.duration}</span>
        </div>

        <h2 class="card-title">{presentation.title}</h2>
        <p class="card-subtitle">{presentation.subtitle}</p>
        <p class="card-description">{presentation.description}</p>

        <div class="card-tags">
          {#each presentation.tags as tag}
            <span class="tag">{tag}</span>
          {/each}
        </div>

        <span class="card-cta">View presentation →</span>
      </a>
    {/each}
  </section>

  <footer class="footer">
    <p class="footer-text">
      Part of <a href="/ethos">The Canon</a> at CREATE SOMETHING.
    </p>
  </footer>
</article>

<style>
  .presentations-page {
    max-width: 720px;
    margin: 0 auto;
    padding: 2rem;
  }

  /* Header */
  .header {
    margin-bottom: 4rem;
  }

  .back-link {
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-muted);
    display: inline-block;
    margin-bottom: 2rem;
    transition: color var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .back-link:hover {
    color: var(--color-performance-fg-secondary);
  }

  .meta {
    font-size: var(--text-performance-body-sm);
    letter-spacing: var(--tracking-performance-widest);
    text-transform: uppercase;
    color: var(--color-performance-fg-tertiary);
    margin-bottom: 1rem;
  }

  .title {
    font-size: var(--text-performance-h1);
    font-weight: var(--font-performance-semibold);
    margin-bottom: 1.5rem;
  }

  .description {
    font-size: var(--text-performance-body-lg);
    color: var(--color-performance-fg-secondary);
    line-height: var(--leading-performance-relaxed);
  }

  /* Presentations List */
  .presentations-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin-bottom: 4rem;
  }

  .presentation-card {
    display: block;
    padding: 1.5rem;
    border-radius: var(--radius-performance-scale-md);
    text-decoration: none;
    transition: all var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .presentation-card:hover {
    border-color: var(--color-performance-border-emphasis);
    transform: translateX(2px);
  }

  .card-header {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .card-slides,
  .card-duration {
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    color: var(--color-performance-fg-muted);
  }

  .card-title {
    font-size: var(--text-performance-h3);
    font-weight: var(--font-performance-semibold);
    margin-bottom: 0.5rem;
  }

  .card-subtitle {
    font-size: var(--text-performance-body);
    color: var(--color-performance-fg-secondary);
    margin-bottom: 0.75rem;
  }

  .card-description {
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-tertiary);
    line-height: var(--leading-performance-relaxed);
    margin-bottom: 1rem;
  }

  .card-tags {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }

  .tag {
    font-size: var(--text-performance-caption);
    color: var(--color-performance-fg-muted);
    padding: 0.25rem 0.5rem;
    background: var(--color-performance-bg-surface);
    border-radius: var(--radius-performance-scale-sm);
  }

  .card-cta {
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-secondary);
  }

  /* Footer */
  .footer {
    padding-top: 2rem;
    /* border-top: 1px solid var(--color-performance-border-default); */
    text-align: center;
  }

  .footer-text {
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-muted);
  }

  .footer-text a {
    color: var(--color-performance-fg-secondary);
    text-decoration: underline;
  }

  .footer-text a:hover {
    color: var(--color-performance-fg-primary);
  }
</style>
