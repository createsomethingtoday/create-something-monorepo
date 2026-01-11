<script lang="ts">
type BeadsPattern = {
  id: string;
  name: string;
  purpose: string;
  example: string;
};

const integrationPatterns: BeadsPattern[] = [
  {
    id: 'survive-context',
    name: 'Context Survival',
    purpose: 'Preserve work across session restarts and context limits',
    example: `bd create "Refactor authentication" 
bd update cs-123 --status in-progress`
  },
  {
    id: 'work-extraction',
    name: 'Work Extraction',
    purpose: 'Convert review findings into actionable issues',
    example: `createIssueFromFinding({
  severity: 'high',
  title: 'Add input validation',
  description: 'Prevent potential security risks'
})`
  },
  {
    id: 'dependency-tracking',
    name: 'Dependency Tracking',
    purpose: 'Model complex work relationships and blockers',
    example: `bd dep add cs-auth blocks cs-dashboard`
  }
];

const discoverySources: Array<{
  source: string;
  description: string;
  example: string;
}> = [
  {
    source: 'blocker',
    description: 'Critical findings that immediately halt progress',
    example: 'Critical security vulnerability requiring immediate fix'
  },
  {
    source: 'supervisor',
    description: 'Standard review findings about architecture, quality',
    example: 'Performance optimization suggestion'
  },
  {
    source: 'related',
    description: 'Secondary work items discovered during primary task',
    example: 'Potential refactoring during feature implementation'
  }
];
</script>

<style>
  .container {
    max-width: 65ch;
    margin: 0 auto;
    padding: var(--space-lg);
    color: var(--color-fg-primary);
    line-height: 1.6;
  }

  h1 {
    font-size: var(--text-h1);
    color: var(--color-fg-primary);
    margin-bottom: var(--space-md);
    border-bottom: 1px solid var(--color-border-default);
    padding-bottom: var(--space-sm);
  }

  h2 {
    font-size: var(--text-h2);
    color: var(--color-fg-primary);
    margin-top: var(--space-lg);
    margin-bottom: var(--space-md);
  }

  .card {
    background: var(--color-bg-surface);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border-default);
    padding: var(--space-md);
    margin-bottom: var(--space-md);
  }

  .pattern-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--space-md);
  }

  .example-code {
    background: var(--color-bg-subtle);
    color: var(--color-fg-secondary);
    font-family: monospace;
    padding: var(--space-sm);
    border-radius: var(--radius-sm);
    white-space: pre-wrap;
    word-break: break-all;
  }
</style>

<div class="container">
  <h1>Beads: Integration Patterns for AI Agent Workflows</h1>

  <section>
    <h2>Research Question</h2>
    <p>
      How can issue tracking systems be designed to support 
      nondeterministic, context-limited AI agent workflows?
    </p>
  </section>

  <section>
    <h2>Methodology</h2>
    <p>
      Analyzed Beads implementation across multiple packages, including:
    </p>
    <ul>
      <li><code>/packages/harness/src/beads.ts</code></li>
      <li><code>/packages/agent-sdk/src/create_something_agents/tools/beads.py</code></li>
      <li><code>/.claude/rules/beads-patterns.md</code></li>
    </ul>
  </section>

  <section>
    <h2>Integration Patterns</h2>
    <div class="pattern-grid">
      {#each integrationPatterns as pattern}
        <div class="card">
          <h3>{pattern.name}</h3>
          <p>{pattern.purpose}</p>
          <div class="example-code">{pattern.example}</div>
        </div>
      {/each}
    </div>
  </section>

  <section>
    <h2>Work Discovery Taxonomy</h2>
    <div class="pattern-grid">
      {#each discoverySources as source}
        <div class="card">
          <h3>{source.source}</h3>
          <p>{source.description}</p>
          <div class="example-code">{source.example}</div>
        </div>
      {/each}
    </div>
  </section>

  <section>
    <h2>Limitations</h2>
    <ul>
      <li>Relies on CLI tool availability</li>
      <li>Potential race conditions in multi-agent environments</li>
      <li>Requires consistent tooling across development environments</li>
    </ul>
  </section>
</div>