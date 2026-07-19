<script lang="ts">
  import { PerformanceNarrativeStage } from '@create-something/canon';
  import OrientationOpening from '$lib/components/orientation/OrientationOpening.svelte';

  const taskTools = [
    { name: 'loom_work', description: 'Create and claim a task atomically' },
    { name: 'loom_create', description: 'Create a coordination task' },
    { name: 'loom_claim', description: 'Claim a task for an agent' },
    { name: 'loom_complete', description: 'Mark a task complete' },
    { name: 'loom_cancel', description: 'Cancel a task' },
    { name: 'loom_spawn', description: 'Create subtasks' },
    { name: 'loom_ready', description: 'List tasks ready for work' },
    { name: 'loom_mine', description: 'List tasks claimed by an agent' },
    { name: 'loom_blocked', description: 'List blocked tasks' }
  ];

  const routingTools = [
    { name: 'loom_route', description: 'Recommend the best, cheapest, or fastest agent' },
    { name: 'loom_agents', description: 'List configured agents' },
    { name: 'loom_analytics', description: 'Inspect execution analytics' }
  ];

  const sessionTools = [
    { name: 'loom_session_start', description: 'Start a work session' },
    { name: 'loom_session_end', description: 'End the current session' },
    { name: 'loom_checkpoint', description: 'Save progress for crash recovery' },
    { name: 'loom_recover', description: 'List recoverable sessions' },
    { name: 'loom_resume', description: 'Resume from a checkpoint' },
    { name: 'loom_get_resume_brief', description: 'Generate continuity context' }
  ];

  const formulaTools = [
    { name: 'loom_formulas', description: 'List workflow templates' },
    { name: 'loom_formula', description: 'Inspect one formula' }
  ];

  const toolGroups = [
    { title: 'Task management', tools: taskTools },
    { title: 'Smart routing', tools: routingTools },
    { title: 'Sessions and memory', tools: sessionTools },
    { title: 'Formulas', tools: formulaTools }
  ];

  const comparisons = [
    ['Multi-agent', 'No', 'No', 'Yes'],
    ['Smart routing', 'No', 'Basic', 'Yes'],
    ['Session memory', 'No', 'Yes', 'Yes'],
    ['Crash recovery', 'No', 'Yes', 'Yes'],
    ['Git sync', 'Yes', 'No', 'Yes'],
    ['Ground integration', 'No', 'No', 'Yes'],
    ['Cost optimization', 'No', 'No', 'Yes']
  ];

  const scenes = [
    {
      id: 'current',
      label: 'Current',
      summary: 'Name the authority',
      title: 'Loom is historical proof; Linear owns current tracked work.',
      detail:
        'The archive remains useful because it proved the need for ownership, routing, recovery, and receipts. It is not the current repository task system.',
      tone: 'block' as const,
      evidence: [
        'Loom: historical coordination evidence',
        'Linear: current ownership, status, and delivery evidence'
      ]
    },
    {
      id: 'reference',
      label: 'Reference',
      summary: 'Inspect the legacy workflow',
      title: 'Installation and quick-start commands are retained for migration history.',
      detail:
        'These commands describe the archived Loom operating model. Do not use them to create new CREATE SOMETHING repository work.',
      tone: 'review' as const
    },
    {
      id: 'surface',
      label: 'Surface',
      summary: 'Keep the learned capabilities',
      title: 'The complete legacy surface shows what the migration had to preserve.',
      detail:
        'Task state, routing, sessions, formulas, comparison evidence, and interactive task views remain inspectable as product and migration history.',
      tone: 'neutral' as const,
      evidence: ['20 legacy MCP tools', '7 comparison dimensions', 'MCP Apps task board']
    }
  ];
</script>

<svelte:head>
  <title>Loom Documentation | CREATE SOMETHING</title>
  <meta
    name="description"
    content="Historical Loom MCP documentation and the current Linear-first coordination boundary for CREATE SOMETHING repository work."
  />
  <meta
    name="keywords"
    content="Loom, Linear, MCP server, agent coordination, task routing, crash recovery, checkpointing, migration history"
  />
  <link rel="canonical" href="https://createsomething.io/docs/loom" />
</svelte:head>

<OrientationOpening
  active="docs"
  eyebrow="Documentation / Loom archive"
  title="The coordination proof before Linear"
  description="Loom demonstrated that agents need durable ownership, checkpoints, routing, and recovery. Linear is the source of truth for current CREATE SOMETHING repository work."
  summary={[
    { label: 'Loom', value: 'Historical' },
    { label: 'Linear', value: 'Current' },
    { label: 'Lesson', value: 'Durable receipts' }
  ]}
/>

<div class="orientation-stage">
  <PerformanceNarrativeStage
    id="loom-documentation"
    eyebrow="Coordination archive"
    title="Keep the lesson, preserve the reference, and name the current owner."
    description="The archive separates current authority from legacy commands and the capabilities they proved."
    {scenes}
    ariaLabel="Loom historical documentation"
  >
    {#snippet artifact(_scene, index)}
      {#if index === 0}
        <div class="authority-map" aria-label="Current and historical coordination ownership">
          <article data-state="historical">
            <span>Historical proof</span>
            <h3>Loom</h3>
            <p>
              External memory for agents: task ownership, session checkpointing, crash recovery,
              smart routing, and multi-agent coordination.
            </p>
            <strong>Archive and migration evidence</strong>
          </article>
          <div aria-hidden="true">→</div>
          <article data-state="current">
            <span>Current authority</span>
            <h3>Linear</h3>
            <p>
              Owns tracked work, assignment, status, and delivery evidence for the current CREATE
              SOMETHING repository.
            </p>
            <strong>Source of truth</strong>
          </article>
        </div>
      {:else if index === 1}
        <div class="reference-grid">
          <article>
            <span>Legacy Claude Code install</span>
            <pre><code
                >npm install @createsomething/loom-mcp
claude mcp add --scope user --transport stdio loom -- npx @createsomething/loom-mcp</code
              ></pre>
          </article>
          <article>
            <span>Legacy Cursor installer</span>
            <p>Retained for historical and migration inspection only.</p>
            <a
              href="cursor://anysphere.cursor-deeplink/mcp/install?name=loom&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyJAY3JlYXRlc29tZXRoaW5nL2xvb20tbWNwIl19"
              >Open legacy Cursor installer</a
            >
          </article>
          <article>
            <span>Legacy generic MCP config</span>
            <pre><code
                >{`{
  "mcpServers": {
    "loom": {
      "command": "npx",
      "args": ["@createsomething/loom-mcp"]
    }
  }
}`}</code
              ></pre>
          </article>
          <article class="quick-start">
            <span>Historical quick start</span>
            <pre><code
                ># Initialize Loom
lm init

# Create and claim work
lm work "Fix the authentication bug" --agent claude-code

# Checkpoint for crash recovery
lm checkpoint "JWT validation complete"

# Ask for a routing recommendation
lm route lm-abc --strategy cheapest

# Complete with evidence
lm done lm-abc --evidence "commit-abc123"</code
              ></pre>
          </article>
        </div>
      {:else}
        <div class="surface-artifact">
          <div class="tool-groups">
            {#each toolGroups as group}
              <article>
                <h3>{group.title}</h3>
                <ul>
                  {#each group.tools as tool}
                    <li><code>{tool.name}</code><span>{tool.description}</span></li>
                  {/each}
                </ul>
              </article>
            {/each}
          </div>

          <div class="comparison-wrap">
            <table>
              <caption>Original Loom comparison, retained as historical context</caption>
              <thead>
                <tr><th>Feature</th><th>Beads</th><th>Gas Town</th><th>Loom</th></tr>
              </thead>
              <tbody>
                {#each comparisons as row}
                  <tr
                    >{#each row as cell}<td>{cell}</td>{/each}</tr
                  >
                {/each}
              </tbody>
            </table>
          </div>

          <article class="mcp-apps">
            <h3>MCP Apps (Interactive UIs)</h3>
            <p>
              Loom supported an interactive Kanban-style task board in compatible clients, with
              drag-and-drop state, one-click claim or completion, real-time updates, and filtering
              by status, label, or agent.
            </p>
            <strong>Supported clients: Claude.ai, VS Code Insiders, ChatGPT, and Goose.</strong>
          </article>
        </div>
      {/if}
    {/snippet}
  </PerformanceNarrativeStage>
</div>

<section class="orientation-handoff" aria-labelledby="loom-handoff-title">
  <div>
    <p>Continue from the current boundary</p>
    <h2 id="loom-handoff-title">
      Use Linear for new work; inspect Loom only as historical evidence.
    </h2>
    <div>
      <a href="/docs/ground">Read current Ground documentation</a>
      <a href="https://www.npmjs.com/package/@createsomething/loom-mcp">Legacy npm package</a>
      <a
        href="https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/loom"
        >Legacy source repository</a
      >
    </div>
  </div>
</section>

<style>
  .authority-map {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: stretch;
    gap: var(--space-performance-sm);
  }

  .authority-map > div {
    align-self: center;
    font-size: var(--text-performance-h2);
  }

  .authority-map article,
  .reference-grid article,
  .mcp-apps {
    display: grid;
    gap: var(--space-performance-sm);
    padding: var(--space-performance-md);
    border: 1px solid var(--color-performance-border-default);
    background: var(--color-performance-bg-surface);
  }

  .authority-map article[data-state='current'] {
    border-color: var(--color-performance-border-strong);
  }

  .authority-map span,
  .reference-grid article > span {
    color: var(--color-performance-fg-tertiary);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
  }

  .authority-map h3,
  .authority-map p,
  .reference-grid p,
  .mcp-apps h3,
  .mcp-apps p {
    margin: 0;
  }

  .authority-map p,
  .reference-grid p,
  .mcp-apps p {
    color: var(--color-performance-fg-secondary);
    line-height: var(--leading-performance-relaxed);
  }

  .reference-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-performance-sm);
  }

  .reference-grid .quick-start {
    grid-column: 1 / -1;
  }

  .reference-grid a {
    width: fit-content;
    color: var(--color-performance-fg-primary);
    font-weight: var(--font-performance-semibold);
    text-decoration: underline;
  }

  pre {
    max-width: 100%;
    margin: 0;
    padding: var(--space-performance-sm);
    background: var(--color-performance-bg-pure);
    overflow-x: auto;
  }

  pre code {
    white-space: pre;
  }

  .surface-artifact {
    display: grid;
    gap: var(--space-performance-lg);
  }

  .tool-groups {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-performance-md);
  }

  .tool-groups article {
    min-width: 0;
  }

  .tool-groups h3 {
    margin: 0 0 var(--space-performance-sm);
    font-size: var(--text-performance-body-lg);
  }

  .tool-groups ul {
    display: grid;
    margin: 0;
    padding: 0;
    gap: var(--space-performance-xs);
    list-style: none;
  }

  .tool-groups li {
    display: grid;
    grid-template-columns: minmax(9rem, 0.65fr) 1fr;
    gap: var(--space-performance-sm);
    padding-block: var(--space-performance-xs);
    border-top: 1px solid var(--color-performance-border-default);
  }

  .tool-groups code {
    overflow-wrap: anywhere;
  }

  .tool-groups span {
    color: var(--color-performance-fg-tertiary);
    font-size: var(--text-performance-body-sm);
  }

  .comparison-wrap {
    max-width: 100%;
    overflow-x: auto;
  }

  table {
    width: 100%;
    min-width: 38rem;
    border-collapse: collapse;
  }

  caption {
    padding-bottom: var(--space-performance-sm);
    color: var(--color-performance-fg-tertiary);
    text-align: left;
  }

  th,
  td {
    padding: var(--space-performance-sm);
    border-bottom: 1px solid var(--color-performance-border-default);
    text-align: left;
  }

  .orientation-handoff {
    padding: clamp(3rem, 7vw, 5rem) 1.5rem;
  }

  .orientation-handoff > div {
    display: grid;
    width: min(72rem, 100%);
    margin-inline: auto;
    gap: var(--space-performance-md);
  }

  .orientation-handoff p,
  .orientation-handoff h2 {
    margin: 0;
  }

  .orientation-handoff p {
    color: var(--color-performance-fg-tertiary);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
  }

  .orientation-handoff h2 {
    max-width: 26ch;
    font-size: var(--text-performance-h2);
  }

  .orientation-handoff > div > div {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-performance-sm);
  }

  .orientation-handoff a {
    padding: 0.65rem 0.85rem;
    border: 1px solid var(--color-performance-border-default);
    color: var(--color-performance-fg-primary);
    font-weight: var(--font-performance-semibold);
  }

  @media (max-width: 800px) {
    .authority-map,
    .reference-grid,
    .tool-groups {
      grid-template-columns: 1fr;
    }

    .authority-map > div {
      justify-self: start;
      transform: rotate(90deg);
    }

    .reference-grid .quick-start {
      grid-column: auto;
    }
  }

  @media (max-width: 640px) {
    .tool-groups li {
      grid-template-columns: 1fr;
    }

    .orientation-handoff {
      padding-inline: 1.25rem;
    }
  }
</style>
