<script lang="ts">
  import { PerformanceNarrativeStage } from '@create-something/canon';
  import OrientationOpening from '$lib/components/orientation/OrientationOpening.svelte';

  const coreTools = [
    { name: 'ground_compare', description: 'Compare two files for similarity (0.0-1.0 score)' },
    {
      name: 'ground_count_uses',
      description: 'Count symbol uses; distinguish runtime from type-only usage'
    },
    {
      name: 'ground_check_connections',
      description: 'Check whether a module is connected, including Cloudflare Workers'
    },
    {
      name: 'ground_find_duplicate_functions',
      description: 'Find duplicates across and within files; supports monorepos'
    }
  ];

  const claimTools = [
    {
      name: 'ground_claim_dead_code',
      description: 'Block a dead-code claim until uses have been counted'
    },
    {
      name: 'ground_claim_orphan',
      description: 'Block an orphan claim until connections have been checked'
    }
  ];

  const discoveryTools = [
    { name: 'ground_find_orphans', description: 'Find modules nothing imports' },
    { name: 'ground_find_dead_exports', description: 'Find exports never imported elsewhere' },
    { name: 'ground_check_environment', description: 'Detect Workers and Node.js API leakage' },
    { name: 'ground_suggest_fix', description: 'Suggest repairs for detected duplication' }
  ];

  const graphTools = [
    { name: 'ground_build_graph', description: 'Build a symbol graph for repository analysis' },
    {
      name: 'ground_query_dead',
      description: 'Query dead exports while filtering framework conventions'
    }
  ];

  const aiTools = [
    {
      name: 'ground_analyze',
      description: 'Batch duplicates, dead exports, orphans, and environment analysis'
    },
    { name: 'ground_diff', description: 'Analyze only issues added after a git baseline' },
    { name: 'ground_verify_fix', description: 'Verify that a proposed repair was applied' }
  ];

  const designTools = [
    { name: 'ground_find_drift', description: 'Find design-token violations' },
    {
      name: 'ground_adoption_ratio',
      description: 'Calculate token adoption with health thresholds'
    },
    { name: 'ground_suggest_pattern', description: 'Map hardcoded values to existing tokens' },
    { name: 'ground_mine_patterns', description: 'Find repeated values that should become tokens' },
    { name: 'ground_explain', description: 'Explain why a file or symbol was excluded' }
  ];

  const toolGroups = [
    { title: 'Core analysis', tools: coreTools },
    { title: 'Verified claims', tools: claimTools },
    { title: 'Discovery', tools: discoveryTools },
    { title: 'Graph analysis', tools: graphTools },
    { title: 'AI-native checks', tools: aiTools },
    { title: 'Design systems', tools: designTools }
  ];

  const scenes = [
    {
      id: 'boundary',
      label: 'Boundary',
      summary: 'Compute before claiming',
      title: 'Ground separates inspection from judgment.',
      detail:
        'An agent may form a hypothesis, but it cannot publish a duplicate, dead-code, or orphan claim until the corresponding check has produced evidence.',
      tone: 'review' as const,
      evidence: [
        'Compare before duplicate claims',
        'Count uses before dead-code claims',
        'Check connections before orphan claims'
      ]
    },
    {
      id: 'install',
      label: 'Install',
      summary: 'Choose one client path',
      title: 'Install the same server through the client you already use.',
      detail:
        'Claude Code, Cursor, and generic MCP clients all point to the same package and stdio boundary.',
      tone: 'allow' as const
    },
    {
      id: 'operate',
      label: 'Operate',
      summary: 'Inspect the complete surface',
      title: 'Start with one check; use the batch surface only when the question is broad.',
      detail:
        'The full tool inventory remains inspectable by role, with example prompts and configuration boundaries adjacent to the commands they affect.',
      tone: 'neutral' as const,
      evidence: ['20 documented tools', '4 example requests', '.ground.yml configuration']
    }
  ];
</script>

<svelte:head>
  <title>Ground Documentation | CREATE SOMETHING</title>
  <meta
    name="description"
    content="Ground MCP documentation: verification-first duplicate, dead-code, orphan, environment, and design-system analysis."
  />
  <meta
    name="keywords"
    content="Ground, MCP server, code analysis, duplicate detection, dead code, orphan detection, Claude Code, Cursor"
  />
  <link rel="canonical" href="https://createsomething.io/docs/ground" />
</svelte:head>

<OrientationOpening
  active="docs"
  eyebrow="Documentation / Ground"
  title="Grounded claims for code"
  description="Use Ground when an agent needs to verify a code claim before turning computation into judgment."
  summary={[
    { label: 'Package', value: '@createsomething/ground-mcp' },
    { label: 'Rule', value: 'Check first' },
    { label: 'Surface', value: '20 tools' }
  ]}
/>

<div class="orientation-stage">
  <PerformanceNarrativeStage
    id="ground-documentation"
    eyebrow="Verification-first operation"
    title="Understand the boundary, install once, then choose the narrowest check."
    description="Each scene answers one operator question without separating the evidence from the action it supports."
    {scenes}
    ariaLabel="Ground documentation"
  >
    {#snippet artifact(_scene, index)}
      {#if index === 0}
        <div class="boundary-artifact">
          <article>
            <span>Problem</span>
            <h3>Confidence can masquerade as analysis.</h3>
            <p>
              An agent can report “95% similar,” “dead,” or “orphaned” without comparing files,
              counting uses, or checking the module graph.
            </p>
          </article>
          <div class="claim-sequence" aria-label="Ground claim sequence">
            <div><strong>Duplicates</strong><span>ground_compare</span></div>
            <div><strong>Dead code</strong><span>ground_count_uses</span></div>
            <div><strong>Orphans</strong><span>ground_check_connections</span></div>
          </div>
          <p class="boundary-result">
            Ground requires computation before synthesis: you cannot claim something until you have
            checked it.
          </p>
        </div>
      {:else if index === 1}
        <div class="install-grid">
          <article>
            <span>Claude Code</span>
            <pre><code
                >npm install @createsomething/ground-mcp
claude mcp add --scope user --transport stdio ground -- npx @createsomething/ground-mcp</code
              ></pre>
          </article>
          <article>
            <span>Cursor</span>
            <p>Use the one-click installer when Cursor is the owning MCP client.</p>
            <a
              href="cursor://anysphere.cursor-deeplink/mcp/install?name=ground&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyJAY3JlYXRlc29tZXRoaW5nL2dyb3VuZC1tY3AiXX0%3D"
              >Install Ground in Cursor</a
            >
          </article>
          <article>
            <span>Other MCP clients</span>
            <pre><code
                >{`{
  "mcpServers": {
    "ground": {
      "command": "npx",
      "args": ["@createsomething/ground-mcp"]
    }
  }
}`}</code
              ></pre>
          </article>
        </div>
      {:else}
        <div class="operate-artifact">
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

          <div class="usage-grid">
            <article>
              <h3>Usage examples</h3>
              <pre><code
                  >Find duplicate functions in src/ with at least 10 lines
Check if the old-utils module is still connected to anything
Run ground_analyze on packages/sdk to find dead code
What's the CSS token adoption ratio in packages/components?</code
                ></pre>
            </article>
            <article>
              <h3>Configuration</h3>
              <p>Ground loads <code>.ground.yml</code> from the project root for:</p>
              <ul>
                <li>Ignore patterns for functions, files, and directories</li>
                <li>Known drift exceptions with documented reasons</li>
                <li>Context declarations for intentional exclusions</li>
                <li>Similarity thresholds</li>
              </ul>
            </article>
          </div>
        </div>
      {/if}
    {/snippet}
  </PerformanceNarrativeStage>
</div>

<section class="orientation-handoff" aria-labelledby="ground-handoff-title">
  <div>
    <p>Inspect the source or the evidence</p>
    <h2 id="ground-handoff-title">Continue from the question Ground should answer.</h2>
    <div>
      <a href="https://www.npmjs.com/package/@createsomething/ground-mcp">npm package</a>
      <a
        href="https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/ground"
        >GitHub repository</a
      >
      <a href="/papers/ground-evidence-based-claims">Read the research paper</a>
      <a href="/docs/loom">Compare the Loom archive</a>
    </div>
  </div>
</section>

<style>
  .boundary-artifact,
  .operate-artifact {
    display: grid;
    gap: var(--space-performance-md);
  }

  .boundary-artifact > article,
  .install-grid article,
  .usage-grid article {
    display: grid;
    gap: var(--space-performance-sm);
    padding: var(--space-performance-md);
    border: 1px solid var(--color-performance-border-default);
    background: var(--color-performance-bg-surface);
  }

  .boundary-artifact span,
  .install-grid article > span {
    color: var(--color-performance-fg-tertiary);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
  }

  .boundary-artifact h3,
  .boundary-artifact p,
  .install-grid p,
  .usage-grid h3,
  .usage-grid p {
    margin: 0;
  }

  .boundary-artifact p,
  .install-grid p,
  .usage-grid p,
  .usage-grid li {
    color: var(--color-performance-fg-secondary);
    line-height: var(--leading-performance-relaxed);
  }

  .claim-sequence {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-performance-sm);
  }

  .claim-sequence div {
    display: grid;
    gap: var(--space-performance-xs);
    padding: var(--space-performance-sm);
    background: var(--color-performance-bg-subtle);
  }

  .claim-sequence span {
    overflow-wrap: anywhere;
    text-transform: none;
  }

  .boundary-result {
    padding-left: var(--space-performance-md);
    border-left: 0.25rem solid var(--color-performance-fg-primary);
    font-weight: var(--font-performance-semibold);
  }

  .install-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-performance-sm);
  }

  .install-grid a {
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

  .tool-groups ul,
  .usage-grid ul {
    display: grid;
    margin: 0;
    padding: 0;
    gap: var(--space-performance-xs);
    list-style: none;
  }

  .tool-groups li {
    display: grid;
    grid-template-columns: minmax(10rem, 0.7fr) 1fr;
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

  .usage-grid {
    display: grid;
    grid-template-columns: 1.25fr 0.75fr;
    gap: var(--space-performance-md);
  }

  .usage-grid li {
    padding-left: var(--space-performance-sm);
    border-left: 1px solid var(--color-performance-border-default);
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
    max-width: 25ch;
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
    .install-grid,
    .tool-groups,
    .usage-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 640px) {
    .claim-sequence {
      grid-template-columns: 1fr;
    }

    .tool-groups li {
      grid-template-columns: 1fr;
    }

    .orientation-handoff {
      padding-inline: 1.25rem;
    }
  }
</style>
