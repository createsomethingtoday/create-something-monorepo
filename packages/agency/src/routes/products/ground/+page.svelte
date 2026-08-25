<script lang="ts">
  import {
    Button,
    PerformanceCampaignOpening,
    PerformanceConversionHandoff,
    PerformanceNarrativeStage,
    SEO,
    type PerformanceNarrativeScene
  } from '@create-something/canon';

  const installs = [
    {
      id: 'claude',
      label: 'Claude Code',
      command:
        'claude mcp add --scope user --transport stdio ground -- npx --yes -p @createsomething/ground-mcp ground-mcp',
      note: 'Register Ground for the current user'
    },
    {
      id: 'windsurf',
      label: 'Cursor or Windsurf',
      command:
        '{"mcpServers":{"ground":{"command":"npx","args":["--yes","-p","@createsomething/ground-mcp","ground-mcp"]}}}',
      note: 'Paste into the client MCP configuration'
    },
    {
      id: 'codex',
      label: 'Codex CLI',
      command: 'codex mcp add ground -- npx --yes -p @createsomething/ground-mcp ground-mcp',
      note: 'Register Ground as a local MCP server'
    },
    {
      id: 'npm',
      label: 'npm',
      command: 'npm install -g @createsomething/ground-mcp',
      note: 'Works with any MCP client'
    }
  ];

  const toolGroups = [
    {
      title: 'Verify',
      tools: [
        ['ground_compare', 'See how similar two files actually are'],
        ['ground_count_uses', 'Find whether a function is actually used'],
        ['ground_check_connections', 'See whether a module is connected'],
        ['ground_check_environment', 'Catch runtime APIs in the wrong environment']
      ]
    },
    {
      title: 'Find problems',
      tools: [
        ['ground_find_duplicate_functions', 'Find copy-pasted code'],
        ['ground_find_orphans', 'Find files nothing imports'],
        ['ground_find_dead_exports', 'Find exports nobody uses'],
        ['ground_find_drift', 'Find divergence from an owned pattern']
      ]
    },
    {
      title: 'Understand patterns',
      tools: [
        ['ground_adoption_ratio', 'Measure token or pattern adoption'],
        ['ground_suggest_pattern', 'Suggest from the code already present'],
        ['ground_mine_patterns', 'Discover repeated structures']
      ]
    },
    {
      title: 'Report findings',
      tools: [
        ['ground_claim_duplicate', 'Report a verified duplicate'],
        ['ground_claim_dead_code', 'Report verified dead code'],
        ['ground_claim_orphan', 'Report a verified orphan']
      ]
    }
  ];

  const scenes: PerformanceNarrativeScene[] = [
    {
      id: 'install',
      label: 'Install Ground',
      summary: 'Connect',
      title: 'Put the check beside the agent.',
      detail: 'Choose one client. Every command points to the same open-source Ground MCP package.',
      tone: 'allow',
      evidence: ['Four client-ready configurations', 'Commands remain visible without JavaScript'],
      receipts: ['Free', 'Open source', '@createsomething/ground-mcp']
    },
    {
      id: 'guardrail',
      label: 'Run the guardrail',
      summary: 'Verify',
      title: 'Check first. Then record. Ground blocks an unverified claim.',
      detail:
        'Ground turns verification from a suggestion into a required sequence before its claim tools record a code finding.',
      tone: 'review',
      evidence: ['Check first', 'Then claim', 'Blocked otherwise'],
      receipts: ['Compared inputs', 'Evidence-bound claim']
    },
    {
      id: 'proof',
      label: 'Inspect the proof',
      summary: 'Trust',
      title: 'A smaller tool surface produces stronger claims.',
      detail:
        'The tool inventory supports one operating rule across TypeScript, JavaScript, and SvelteKit codebases.',
      tone: 'neutral',
      evidence: ['21 MCP tools', 'Five native release targets', 'Public calibration policy'],
      receipts: ['Checksums + provenance', 'Adjudicated findings ledger'],
      actions: [
        {
          label: 'Read the Kickstand audit',
          href: 'https://createsomething.io/papers/kickstand-triad-audit'
        }
      ]
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
  title="Ground MCP | Grounded AI Code Analysis"
  description="Evidence-first TypeScript and JavaScript code analysis for agents, with SvelteKit-aware verification for duplicates, dead code, orphans, and environment boundaries."
  keywords="MCP, Model Context Protocol, TypeScript, JavaScript, SvelteKit, agent code analysis, duplicate detection, dead code, evidence"
  ogImage="/og-image.png"
  propertyName="agency"
/>

<PerformanceCampaignOpening
  eyebrow="Free and open source"
  expression="editorial"
  title="Give the agent evidence before it changes your codebase."
  lede="Ground computes evidence for TypeScript and JavaScript code claims. It also understands SvelteKit routes, aliases, component scripts, actions, stores, and entry points."
  density="compact"
  media={{
    src: '/images/performance-lab/ground-verification-instrument.webp',
    mobileSrc: '/images/performance-lab/ground-verification-instrument-mobile.webp',
    alt: 'Two code artifacts feed a comparison ring while an unverified claim is stopped and a proof receipt exits'
  }}
  proof={[
    { label: 'Languages', value: 'TS + JS' },
    { label: 'Framework', value: 'SvelteKit' },
    { label: 'Cost', value: 'Free' }
  ]}
>
  {#snippet actions()}
    <Button href="#ground-operating-path">Choose your install</Button>
  {/snippet}
</PerformanceCampaignOpening>

<PerformanceNarrativeStage
  id="ground-operating-path"
  eyebrow="Ground operating path"
  title="Verification belongs before the answer."
  description="One indexed surface keeps installation, enforcement, and production evidence together."
  {scenes}
  ariaLabel="Ground operating path"
>
  {#snippet artifact(_scene, index)}
    {#if index === 0}
      <div class="install-grid" aria-label="Ground MCP install commands">
        {#each installs as install}
          <article class="install-card">
            <div><span>{install.label}</span><small>{install.note}</small></div>
            <code>{install.command}</code>
            <button type="button" onclick={() => copyCommand(install.id, install.command)}>
              {copied === install.id ? 'Copied' : 'Copy command'}
            </button>
          </article>
        {/each}
      </div>
    {:else if index === 1}
      <div class="guardrail-artifact">
        <ol>
          <li>
            <span>01</span><strong>Check first</strong>
            <p>Compare the files or count the uses.</p>
          </li>
          <li>
            <span>02</span><strong>Then claim</strong>
            <p>Attach the finding to what was checked.</p>
          </li>
          <li>
            <span>03</span><strong>Blocked otherwise</strong>
            <p>Stop an unsupported conclusion before it spreads.</p>
          </li>
        </ol>
        <pre aria-label="Ground verification example"><code
            ><span># First, compare the files</span>
ground compare utils.ts helpers.ts

<span># Then make the evidence-bound claim</span>
ground claim duplicate utils.ts helpers.ts "same validation logic"

<strong>Claim blocked: compare these files first.</strong></code
          ></pre>
      </div>
    {:else}
      <div class="proof-artifact">
        <div class="tool-groups">
          {#each toolGroups as group}
            <article>
              <h3>{group.title}</h3>
              <ul>
                {#each group.tools as tool}<li>
                    <code>{tool[0]}</code><span>{tool[1]}</span>
                  </li>{/each}
              </ul>
            </article>
          {/each}
        </div>
        <aside class="case-proof">
          <span>Calibration policy</span>
          <h3>Accuracy is a release gate, not a slogan.</h3>
          <p>
            The exact-tag fixture suite and checked-in ledger block promotion when analyzer
            execution, precision, completion, or coverage evidence is missing.
          </p>
          <p>
            The release calibration combines ten controlled positive fixtures with one preserved
            real-repository false positive. It is not a population-wide accuracy estimate.
          </p>
          <dl>
            <div>
              <dt>Adjudicated findings</dt>
              <dd>10 minimum</dd>
            </div>
            <div>
              <dt>Precision gate</dt>
              <dd>90%+</dd>
            </div>
            <div>
              <dt>False-positive cap</dt>
              <dd>10%</dd>
            </div>
          </dl>
        </aside>
      </div>
    {/if}
  {/snippet}
</PerformanceNarrativeStage>

<PerformanceConversionHandoff
  expression="editorial"
  eyebrow="Ground handoff"
  title="Put evidence before the next code claim."
  description="Install Ground in one agent client, run a real verification, and preserve the checked inputs with the finding."
  density="compact"
  handoff={{
    owner: 'Codebase operator',
    authority: 'Verify-before-claiming policy',
    proof: 'Checked inputs + finding',
    state: 'ready'
  }}
>
  {#snippet actions()}
    <Button href="https://www.npmjs.com/package/@createsomething/ground-mcp"
      >Install Ground from npm</Button
    >
    <Button
      href="https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/ground"
      variant="secondary">Inspect the source</Button
    >
  {/snippet}
</PerformanceConversionHandoff>

<style>
  .install-grid,
  .tool-groups {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .install-card,
  .tool-groups article,
  .case-proof {
    min-width: 0;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-panel, #fff);
  }

  .install-card {
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: 0.8rem;
    padding: 1rem;
  }

  .install-card > div {
    display: grid;
    gap: 0.2rem;
  }
  .install-card span,
  .case-proof > span {
    font-family: var(--font-performance-mono);
    font-size: 0.7rem;
    text-transform: uppercase;
  }
  .install-card small {
    color: var(--color-performance-muted, #5e6268);
  }
  .install-card code {
    overflow-wrap: anywhere;
    font-size: 0.78rem;
    line-height: 1.5;
  }
  .install-card button {
    min-height: 2.5rem;
    border: 1px solid var(--color-performance-ink, #090909);
    background: var(--color-performance-ink, #090909);
    color: #fff;
    cursor: pointer;
  }

  .guardrail-artifact {
    display: grid;
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
    gap: 1rem;
  }
  .guardrail-artifact ol {
    display: grid;
    gap: 0;
    margin: 0;
    padding: 0;
    border-top: 1px solid var(--color-performance-line);
    list-style: none;
  }
  .guardrail-artifact li {
    display: grid;
    grid-template-columns: 2.5rem 1fr;
    gap: 0.25rem 0.75rem;
    padding: 0.85rem 0;
    border-bottom: 1px solid var(--color-performance-line);
  }
  .guardrail-artifact li span {
    grid-row: 1 / span 2;
    font-family: var(--font-performance-mono);
    font-size: 0.7rem;
  }
  .guardrail-artifact li p {
    margin: 0;
    color: var(--color-performance-muted);
    font-size: 0.85rem;
  }
  .guardrail-artifact pre {
    min-width: 0;
    margin: 0;
    padding: 1rem;
    overflow: auto;
    background: var(--color-performance-ink);
    color: #fff;
    font-size: 0.78rem;
    line-height: 1.65;
  }
  .guardrail-artifact pre span {
    color: #9ca3af;
  }
  .guardrail-artifact pre strong {
    color: #ff8c5a;
  }

  .proof-artifact {
    display: grid;
    gap: 1rem;
  }
  .tool-groups article {
    padding: 1rem;
  }
  .tool-groups h3,
  .case-proof h3 {
    margin: 0 0 0.75rem;
    font-size: 1rem;
  }
  .tool-groups ul {
    display: grid;
    gap: 0.65rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .tool-groups li {
    display: grid;
    gap: 0.15rem;
  }
  .tool-groups li code {
    overflow-wrap: anywhere;
    font-size: 0.74rem;
  }
  .tool-groups li span {
    color: var(--color-performance-muted);
    font-size: 0.8rem;
  }
  .case-proof {
    padding: 1rem;
    background: var(--color-performance-paper, #f3f3f0);
  }
  .case-proof p {
    max-width: 48rem;
    color: var(--color-performance-muted);
  }
  .case-proof dl {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    margin: 1rem 0 0;
    border-top: 1px solid var(--color-performance-line);
  }
  .case-proof dl > div {
    padding: 0.8rem 0;
  }
  .case-proof dt {
    color: var(--color-performance-muted);
    font-size: 0.72rem;
    text-transform: uppercase;
  }
  .case-proof dd {
    margin: 0.2rem 0 0;
    font-size: 1.4rem;
  }

  @media (max-width: 48rem) {
    .install-grid,
    .tool-groups,
    .guardrail-artifact {
      grid-template-columns: 1fr;
    }
    .case-proof dl {
      grid-template-columns: 1fr;
    }
    .case-proof dl > div {
      border-bottom: 1px solid var(--color-performance-line);
    }
  }
</style>
