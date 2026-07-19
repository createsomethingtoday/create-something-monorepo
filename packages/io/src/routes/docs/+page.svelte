<script lang="ts">
  import OrientationOpening from '$lib/components/orientation/OrientationOpening.svelte';

  const tools = [
    {
      name: 'Ground',
      tagline: 'Grounded claims for code',
      description:
        'Verification-first code analysis for duplicates, dead code, orphans, environment leakage, and design drift.',
      href: '/docs/ground',
      npm: '@createsomething/ground-mcp',
      command: 'npx @createsomething/ground-mcp',
      features: [
        'Duplicate detection',
        'Dead code analysis',
        'Orphan detection',
        'Design drift analysis'
      ],
      state: 'Current analysis tool'
    },
    {
      name: 'Loom',
      tagline: 'Historical coordination proof',
      description:
        'The archived coordination system that proved the need for task ownership, routing, checkpointing, and crash recovery.',
      href: '/docs/loom',
      npm: '@createsomething/loom-mcp',
      command: 'npx @createsomething/loom-mcp',
      features: ['Task coordination', 'Crash recovery', 'Smart routing', 'Session checkpointing'],
      state: 'Legacy reference; Linear is current'
    }
  ];

  const supportedTools = [
    'Claude Code',
    'Claude Desktop',
    'Cursor',
    'Windsurf',
    'VS Code + Copilot',
    'Codex CLI',
    'Gemini'
  ];
</script>

<svelte:head>
  <title>Documentation | CREATE SOMETHING</title>
  <meta
    name="description"
    content="Documentation for Ground code analysis and the historical Loom agent-coordination system."
  />
  <meta
    name="keywords"
    content="MCP, Model Context Protocol, AI coding, Ground, Loom, code analysis, agent coordination, documentation"
  />
  <link rel="canonical" href="https://createsomething.io/docs" />
</svelte:head>

<OrientationOpening
  active="docs"
  eyebrow="Documentation index"
  title="Choose the boundary you need"
  description="Use Ground to verify code claims. Use the Loom archive to understand the coordination lessons that now live in a Linear-first operating model."
  summary={[
    { label: 'Ground', value: 'Current' },
    { label: 'Loom', value: 'Historical' },
    { label: 'Protocol', value: 'MCP' }
  ]}
/>

<section class="orientation-collection" aria-labelledby="documentation-tools-title">
  <div class="docs-inner">
    <header>
      <div>
        <p>Two documented boundaries</p>
        <h2 id="documentation-tools-title">Inspect before installing</h2>
      </div>
      <span>{supportedTools.length} supported clients</span>
    </header>

    <div class="tool-grid">
      {#each tools as tool}
        <article class="tool-card">
          <div class="tool-heading">
            <span>{tool.state}</span>
            <h3>{tool.name}</h3>
            <strong>{tool.tagline}</strong>
            <p>{tool.description}</p>
          </div>

          <code>{tool.npm}</code>

          <ul>
            {#each tool.features as feature}<li>{feature}</li>{/each}
          </ul>

          <div class="quick-install">
            <span>Quick reference</span>
            <pre><code>{tool.command}</code></pre>
          </div>

          <a href={tool.href}>Read {tool.name} documentation</a>
        </article>
      {/each}
    </div>

    <div class="supported" aria-label="Supported MCP clients">
      <span>Supported MCP clients</span>
      <ul>
        {#each supportedTools as tool}<li>{tool}</li>{/each}
      </ul>
    </div>
  </div>
</section>

<style>
  .orientation-collection {
    padding: clamp(2rem, 5vw, 4rem) 1.5rem clamp(4rem, 8vw, 6rem);
    border-top: 1px solid var(--color-performance-border-default);
  }

  .docs-inner {
    display: grid;
    width: min(72rem, 100%);
    margin-inline: auto;
    gap: var(--space-performance-lg);
  }

  header {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: var(--space-performance-md);
  }

  header > div {
    display: grid;
    gap: 0.35rem;
  }

  header p,
  header h2 {
    margin: 0;
  }

  header p,
  header > span,
  .tool-heading > span,
  .quick-install > span,
  .supported > span {
    color: var(--color-performance-fg-tertiary);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
  }

  header h2 {
    font-size: var(--text-performance-h2);
  }

  .tool-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-performance-md);
  }

  .tool-card {
    display: grid;
    gap: var(--space-performance-md);
    padding: var(--space-performance-lg);
    border: 1px solid var(--color-performance-border-default);
    background: var(--color-performance-bg-surface);
  }

  .tool-heading {
    display: grid;
    gap: var(--space-performance-xs);
  }

  .tool-heading h3,
  .tool-heading p {
    margin: 0;
  }

  .tool-heading h3 {
    font-size: var(--text-performance-h2);
  }

  .tool-heading strong {
    color: var(--color-performance-fg-secondary);
  }

  .tool-heading p {
    color: var(--color-performance-fg-tertiary);
    line-height: var(--leading-performance-relaxed);
  }

  .tool-card > code {
    width: fit-content;
    max-width: 100%;
    padding: 0.4rem 0.6rem;
    background: var(--color-performance-bg-subtle);
    overflow-wrap: anywhere;
  }

  .tool-card ul {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin: 0;
    padding: 0;
    gap: var(--space-performance-xs);
    list-style: none;
  }

  .tool-card li {
    color: var(--color-performance-fg-secondary);
    font-size: var(--text-performance-body-sm);
  }

  .quick-install {
    display: grid;
    gap: var(--space-performance-xs);
  }

  pre {
    max-width: 100%;
    margin: 0;
    padding: var(--space-performance-sm);
    background: var(--color-performance-bg-pure);
    overflow-x: auto;
  }

  .tool-card > a {
    width: fit-content;
    color: var(--color-performance-fg-primary);
    font-weight: var(--font-performance-semibold);
    text-decoration: underline;
  }

  .supported {
    display: grid;
    gap: var(--space-performance-sm);
    padding-block: var(--space-performance-md);
    border-block: 1px solid var(--color-performance-border-default);
  }

  .supported ul {
    display: flex;
    flex-wrap: wrap;
    margin: 0;
    padding: 0;
    gap: var(--space-performance-xs);
    list-style: none;
  }

  .supported li {
    padding: 0.35rem 0.55rem;
    background: var(--color-performance-bg-subtle);
    color: var(--color-performance-fg-secondary);
    font-size: var(--text-performance-body-sm);
  }

  @media (max-width: 720px) {
    .orientation-collection {
      padding-inline: 1.25rem;
    }

    header {
      align-items: flex-start;
      flex-direction: column;
    }

    .tool-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 420px) {
    .tool-card ul {
      grid-template-columns: 1fr;
    }
  }
</style>
