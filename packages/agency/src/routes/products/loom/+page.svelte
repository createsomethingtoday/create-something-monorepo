<script lang="ts">
  import {
    Button,
    PerformanceCampaignOpening,
    PerformanceConversionHandoff,
    PerformanceNarrativeStage,
    SEO,
    type PerformanceNarrativeScene
  } from '@create-something/canon';
  import { traceDyeInjectionMedia } from '$lib/data/performanceMedia';

  const cursorDeepLink =
    'cursor://anysphere.cursor-deeplink/mcp/install?name=loom&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyJAY3JlYXRlc29tZXRoaW5nL2xvb20tbWNwIl19';
  const installs = [
    {
      id: 'cursor',
      label: 'Cursor',
      command: 'Install with the retained Cursor deep link',
      note: 'Historical one-click reference',
      href: cursorDeepLink
    },
    {
      id: 'claude',
      label: 'Claude Desktop',
      command: 'npx --yes @createsomething/loom-mcp',
      note: 'Add to claude_desktop_config.json'
    },
    {
      id: 'windsurf',
      label: 'Windsurf',
      command: '{"mcpServers":{"loom":{"command":"npx","args":["@createsomething/loom-mcp"]}}}',
      note: 'Settings -> MCP -> View raw config'
    },
    {
      id: 'codex',
      label: 'Codex CLI',
      command: 'codex mcp add loom --command "npx @createsomething/loom-mcp"',
      note: 'Legacy local server command'
    },
    {
      id: 'npm',
      label: 'npm',
      command: 'npm install -g @createsomething/loom-mcp',
      note: 'Retained package reference'
    }
  ];

  const toolGroups = [
    {
      title: 'Manage tasks',
      tools: ['loom_work', 'loom_create', 'loom_spawn', 'loom_ready', 'loom_complete']
    },
    {
      title: 'Route work',
      tools: ['loom_route', 'loom_agents', 'loom_analytics', 'loom_record_execution']
    },
    {
      title: 'Remember context',
      tools: ['loom_checkpoint', 'loom_resume', 'loom_get_resume_brief', 'loom_update_context']
    },
    {
      title: 'Plan ahead',
      tools: ['loom_formulas', 'loom_discuss', 'loom_verify_plan']
    }
  ];

  const scenes: PerformanceNarrativeScene[] = [
    {
      id: 'boundary',
      label: 'Read the boundary',
      summary: 'Current state',
      title: 'The lesson remains. The source of truth changed.',
      detail:
        'Loom is historical proof of the coordination problem. Linear is the source of truth for current tracked ownership, status, and evidence.',
      tone: 'review',
      evidence: ['Loom: historical proof', 'Linear: current tracked work'],
      receipts: ['Archive', 'Noindex', 'Explicit route forward']
    },
    {
      id: 'lessons',
      label: 'Inspect the lessons',
      summary: 'Why it mattered',
      title: 'Continuity, routing, and receipts survive the tool.',
      detail:
        'The archive is valuable because it makes three durable coordination requirements inspectable.',
      tone: 'neutral',
      evidence: ['Continuity matters', 'Routing needs evidence', 'Progress needs receipts'],
      receipts: ['Checkpoints', 'Routing record', 'Completion evidence']
    },
    {
      id: 'archive',
      label: 'Open the archive',
      summary: 'Legacy reference',
      title: 'Keep the old surface available without presenting it as the current workflow.',
      detail:
        'Install commands, tool names, and the original comparison remain here for historical MCP users and design evidence.',
      tone: 'block',
      evidence: ['5 install references', '30+ historical tools', 'Original comparison matrix'],
      receipts: ['@createsomething/loom-mcp', 'GitHub archive']
    }
  ];

  let copied = $state<string | null>(null);

  async function copyCommand(id: string, command: string) {
    await navigator.clipboard.writeText(command);
    copied = id;
    setTimeout(() => {
      if (copied === id) copied = null;
    }, 2000);
  }
</script>

<SEO
  title="Loom MCP Archive | Agent Coordination Lessons"
  description="Historical CREATE SOMETHING proof for agent continuity, checkpoints, routing, and recovery. Current tracked work in this repo now lives in Linear."
  keywords="MCP, multi-agent coordination archive, Linear coordination, task ownership, checkpoints, evidence, receipts"
  ogImage="/og-image.png"
  propertyName="agency"
  noindex={true}
/>

<PerformanceCampaignOpening
  eyebrow="Historical proof"
  title="The continuity problem that led to Linear-first coordination."
  lede="Loom proved that agents need task ownership, checkpoints, routing, and recovery. Current CREATE SOMETHING repo work now uses Linear as the source of truth for tracked ownership, status, and evidence."
  density="compact"
  media={traceDyeInjectionMedia}
  proof={[
    { label: 'Loom', value: 'Archive' },
    { label: 'Linear', value: 'Current' },
    { label: 'Lesson', value: 'Receipts' }
  ]}
>
  {#snippet actions()}
    <Button href="#loom-archive-story">Inspect the archive boundary</Button>
  {/snippet}
</PerformanceCampaignOpening>

<PerformanceNarrativeStage
  id="loom-archive-story"
  eyebrow="Coordination archive"
  title="Keep the lesson. Name the current owner."
  description="The archive separates current authority, durable lessons, and legacy reference in one inspectable sequence."
  {scenes}
  ariaLabel="Loom archive story"
>
  {#snippet artifact(_scene, index)}
    {#if index === 0}
      <div class="authority-map" aria-label="Current and historical coordination ownership">
        <article data-state="archived">
          <span>Historical proof</span>
          <h3>Loom</h3>
          <p>
            Demonstrated persistent context, task routing, recovery checkpoints, and evidence-bound
            completion.
          </p>
          <strong>Archive only</strong>
        </article>
        <div aria-hidden="true">-></div>
        <article data-state="current">
          <span>Current authority</span>
          <h3>Linear</h3>
          <p>
            Owns tracked work, assignment, status, and evidence for the current CREATE SOMETHING
            repository.
          </p>
          <strong>Source of truth</strong>
        </article>
      </div>
    {:else if index === 1}
      <div class="lesson-artifact">
        <ol>
          <li>
            <span>01</span><strong>Continuity matters</strong>
            <p>Context must survive when sessions end or ownership changes.</p>
          </li>
          <li>
            <span>02</span><strong>Routing needs evidence</strong>
            <p>Agent choice needs the task, cost, and proof surface.</p>
          </li>
          <li>
            <span>03</span><strong>Progress needs receipts</strong>
            <p>Done must survive outside the chat window.</p>
          </li>
        </ol>
        <pre aria-label="Historical Loom workflow"><code
            ><span># Historical MCP reference</span>
loom work "Fix authentication bug" --agent claude-code
loom checkpoint "JWT validation implemented"
loom route lm-abc --strategy cheapest
loom complete lm-abc --evidence "commit abc123"

<strong># Current repo coordination uses Linear.</strong></code
          ></pre>
      </div>
    {:else}
      <div class="archive-artifact">
        <div class="install-grid" aria-label="Legacy Loom install references">
          {#each installs as install}
            <article class="install-card">
              <div><span>{install.label}</span><small>{install.note}</small></div>
              <code>{install.command}</code>
              {#if install.href}
                <a href={install.href}>Open legacy installer</a>
              {:else}
                <button type="button" onclick={() => copyCommand(install.id, install.command)}>
                  {copied === install.id ? 'Copied' : 'Copy reference'}
                </button>
              {/if}
            </article>
          {/each}
        </div>

        <div class="tool-groups" aria-label="Legacy Loom tool surface">
          {#each toolGroups as group}
            <article>
              <h3>{group.title}</h3>
              <ul>
                {#each group.tools as tool}<li><code>{tool}</code></li>{/each}
              </ul>
            </article>
          {/each}
        </div>

        <div class="comparison-wrap">
          <table>
            <caption>Original Loom comparison, retained as historical context</caption>
            <thead><tr><th>Feature</th><th>Beads</th><th>Gas Town</th><th>Loom</th></tr></thead>
            <tbody>
              <tr><td>Multi-agent coordination</td><td>No</td><td>No</td><td>Yes</td></tr>
              <tr><td>Smart routing</td><td>No</td><td>Basic</td><td>Yes</td></tr>
              <tr><td>Session memory</td><td>No</td><td>Yes</td><td>Yes</td></tr>
              <tr><td>Crash recovery</td><td>No</td><td>Yes</td><td>Yes</td></tr>
              <tr><td>Git sync</td><td>Yes</td><td>No</td><td>Yes</td></tr>
              <tr><td>Ground integration</td><td>No</td><td>No</td><td>Yes</td></tr>
              <tr><td>Cost optimization</td><td>No</td><td>No</td><td>Yes</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  {/snippet}
</PerformanceNarrativeStage>

<PerformanceConversionHandoff
  eyebrow="Current coordination path"
  title="Route active work to its current source of truth."
  description="Use this page to understand the coordination lesson. Use Linear-backed workflows for current ownership and evidence, or inspect the archive directly when historical implementation detail matters."
  density="compact"
  handoff={{
    owner: 'Current work owner',
    authority: 'Linear issue state',
    proof: 'Durable execution evidence',
    state: 'review'
  }}
>
  {#snippet actions()}
    <Button href="/products">Continue to products</Button>
    <Button href="/products/ground" variant="secondary">Inspect Ground MCP</Button>
    <Button
      href="https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/loom"
      variant="secondary">Read the Loom archive</Button
    >
  {/snippet}
</PerformanceConversionHandoff>

<style>
  .authority-map,
  .lesson-artifact {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    gap: 1rem;
    align-items: stretch;
  }
  .authority-map article {
    display: grid;
    align-content: start;
    gap: 0.65rem;
    padding: 1rem;
    border: 1px solid var(--color-performance-line);
    background: var(--color-performance-panel);
  }
  .authority-map > div {
    align-self: center;
    font-family: var(--font-performance-mono);
  }
  .authority-map article span,
  .install-card span {
    font-family: var(--font-performance-mono);
    font-size: 0.7rem;
    text-transform: uppercase;
  }
  .authority-map article h3 {
    margin: 0;
    font-size: 1.6rem;
  }
  .authority-map article p {
    margin: 0;
    color: var(--color-performance-muted);
    line-height: 1.5;
  }
  .authority-map article strong {
    align-self: end;
    padding-top: 1rem;
    border-top: 1px solid var(--color-performance-line);
  }
  .authority-map article[data-state='current'] {
    border-top: 4px solid var(--color-performance-growth, #007a4d);
  }
  .authority-map article[data-state='archived'] {
    border-top: 4px solid var(--color-performance-muted, #6b7280);
  }

  .lesson-artifact {
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
  }
  .lesson-artifact ol {
    display: grid;
    margin: 0;
    padding: 0;
    border-top: 1px solid var(--color-performance-line);
    list-style: none;
  }
  .lesson-artifact li {
    display: grid;
    grid-template-columns: 2.5rem 1fr;
    gap: 0.25rem 0.75rem;
    padding: 0.85rem 0;
    border-bottom: 1px solid var(--color-performance-line);
  }
  .lesson-artifact li span {
    grid-row: 1 / span 2;
    font-family: var(--font-performance-mono);
    font-size: 0.7rem;
  }
  .lesson-artifact li p {
    margin: 0;
    color: var(--color-performance-muted);
    font-size: 0.85rem;
  }
  .lesson-artifact pre {
    min-width: 0;
    margin: 0;
    padding: 1rem;
    overflow: auto;
    background: var(--color-performance-ink);
    color: #fff;
    font-size: 0.78rem;
    line-height: 1.65;
  }
  .lesson-artifact pre span {
    color: #9ca3af;
  }
  .lesson-artifact pre strong {
    color: #ff8c5a;
  }

  .archive-artifact {
    display: grid;
    gap: 1rem;
  }
  .install-grid,
  .tool-groups {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }
  .install-card,
  .tool-groups article {
    min-width: 0;
    padding: 1rem;
    border: 1px solid var(--color-performance-line);
    background: var(--color-performance-panel);
  }
  .install-card {
    display: grid;
    gap: 0.7rem;
  }
  .install-card > div {
    display: grid;
    gap: 0.2rem;
  }
  .install-card small {
    color: var(--color-performance-muted);
  }
  .install-card code {
    overflow-wrap: anywhere;
    font-size: 0.76rem;
    line-height: 1.5;
  }
  .install-card :is(button, a) {
    display: inline-flex;
    min-height: 2.5rem;
    align-items: center;
    justify-content: center;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-performance-ink);
    background: var(--color-performance-ink);
    color: #fff;
    cursor: pointer;
    text-decoration: none;
  }
  .tool-groups h3 {
    margin: 0 0 0.75rem;
    font-size: 1rem;
  }
  .tool-groups ul {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.45rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .tool-groups code {
    overflow-wrap: anywhere;
    font-size: 0.72rem;
  }
  .comparison-wrap {
    max-width: 100%;
    overflow-x: auto;
    border: 1px solid var(--color-performance-line);
  }
  .comparison-wrap table {
    width: 100%;
    min-width: 38rem;
    border-collapse: collapse;
    background: var(--color-performance-panel);
    font-size: 0.82rem;
  }
  .comparison-wrap caption {
    padding: 0.8rem;
    text-align: left;
    font-family: var(--font-performance-mono);
    font-size: 0.7rem;
    text-transform: uppercase;
  }
  .comparison-wrap :is(th, td) {
    padding: 0.7rem;
    border-top: 1px solid var(--color-performance-line);
    text-align: left;
  }

  @media (max-width: 48rem) {
    .authority-map,
    .lesson-artifact,
    .install-grid,
    .tool-groups {
      grid-template-columns: 1fr;
    }
    .authority-map > div {
      justify-self: center;
      rotate: 90deg;
    }
  }
</style>
