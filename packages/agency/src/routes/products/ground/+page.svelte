<script lang="ts">
  import { SEO } from '@create-something/canon';

  // Installation guidance follows the package release; historical benchmarks retain their versions.
  import { groundVersion, groundInstalls as installs } from '$lib/data/ground-release.mjs';

  const toolGroups = [
    {
      title: 'Verify',
      tools: [
        ['ground_compare', 'See how similar two files actually are'],
        ['ground_count_uses', 'Count detected uses in the checked scope'],
        ['ground_check_connections', 'See whether a module is connected'],
        ['ground_check_environment', 'Catch runtime APIs in the wrong environment']
      ]
    },
    {
      title: 'Find problems',
      tools: [
        ['ground_find_duplicate_functions', 'Find copy-pasted code'],
        ['ground_find_orphans', 'Find files with no detected connection'],
        ['ground_find_dead_exports', 'Find exports with no imports in the checked scope'],
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

  let copied = $state<string | null>(null);
  let copyError = $state<string | null>(null);

  async function copyCommand(id: string, command: string) {
    copyError = null;
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      copyError = `Could not copy the ${installs.find((install) => install.id === id)?.label ?? id} command. Select and copy it below.`;
      return;
    }
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

<div class="ground-page">
  <section class="ground-hero" aria-labelledby="ground-title" data-performance-chapter="thesis">
    <picture>
      <img
        src="/images/agency-stories/ground-compare-before-claim.webp"
        alt="Concept illustration: teammates compare two graphite code-shaped pieces on an inspection table before making a claim."
        fetchpriority="high"
        width="1402"
        height="1122"
      />
    </picture>
    <div class="hero-copy">
      <p class="ground-eyebrow">Ground {groundVersion} / Free and open source</p>
      <h1 id="ground-title">Give the agent evidence.</h1>
      <p class="lede">
        Check the code before recording a finding. Ground gives your agent evidence for TypeScript,
        JavaScript, and SvelteKit code claims.
      </p>
      <a class="primary-action" href="#ground-operating-path"
        >Choose your install <span aria-hidden="true">↗</span></a
      >
      <p class="hero-note">An MCP tool for your existing agent client.</p>
    </div>
    <p class="hero-caption">Concept illustration / Compare before claiming</p>
  </section>
  <nav class="ground-rail" aria-label="On this page">
    <a href="#ground-operating-path">01 / Install Ground <span aria-hidden="true">↓</span></a>
    <a href="#ground-guardrail">02 / Inspect the guardrail <span aria-hidden="true">↓</span></a>
    <a href="#ground-proof">03 / Review the evidence <span aria-hidden="true">↓</span></a>
  </nav>

  <section
    class="ground-workbench"
    aria-labelledby="ground-operating-title"
    data-performance-chapter="evidence-body"
  >
    <header class="chapter-heading">
      <div>
        <p class="ground-eyebrow">01 / Connect</p>
        <h2 id="ground-operating-title">Put the check<br />beside the agent.</h2>
      </div>
      <p>Choose one client. Install Ground, check the source, then inspect the finding.</p>
    </header>
    <div id="ground-operating-path" class="install-section">
      <p class="release-note">Installation commands follow the current {groundVersion} release.</p>
      <p class="copy-status" role="status">{copyError ?? (copied ? 'Command copied.' : '')}</p>
      <div class="install-grid" aria-label="Ground MCP install commands">
        {#each installs as install}
          <article class="install-card">
            <div><span>{install.label}</span><small>{install.note}</small></div>
            <code>{install.command}</code>
            <button
              type="button"
              aria-label={`Copy ${install.label} install command`}
              onclick={() => copyCommand(install.id, install.command)}
            >
              {copied === install.id ? 'Copied' : 'Copy command'}
            </button>
          </article>
        {/each}
      </div>
      <p class="usage-note">
        Persistent MCP sessions reuse parsed source and dependency graphs after checking current
        files and resolution settings. Restart your MCP server after upgrading. CLI commands stay
        uncached by default; use <code>--cache</code> to opt in or <code>--no-cache</code> to disable
        reuse.
      </p>
    </div>
    <div id="ground-guardrail" class="guardrail-section">
      <header class="chapter-heading">
        <div>
          <p class="ground-eyebrow">02 / Verify</p>
          <h2>Check first.<br />Then claim.</h2>
        </div>
        <p>Ground requires a check before its claim tools can record a code finding.</p>
      </header>
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
            ><span># A claim without a prior comparison</span>
ground claim duplicate utils.ts helpers.ts "same validation logic"
<strong>Claim blocked: compare these files first.</strong>

<span># Check first, then retry the claim</span>
ground compare utils.ts helpers.ts</code
          ></pre>
      </div>
      <p class="usage-note">
        Ground gates its own claim tools; it cannot stop an agent from answering outside them. An
        unused export in the checked scope still needs review for public APIs, external consumers,
        and dynamic loading before removal.
      </p>
    </div>
    <div id="ground-proof" class="proof-section">
      <header class="chapter-heading">
        <div>
          <p class="ground-eyebrow">03 / Evidence</p>
          <h2>Inspect what<br />backs the finding.</h2>
        </div>
        <p>Code checks, measured performance, and release calibration. Each has a defined scope.</p>
      </header>
      <details class="tool-disclosure">
        <summary
          >Explore the tool reference <span>Verification, patterns, and claims +</span></summary
        >
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
        </div>
      </details>
      <div class="proof-artifact">
        <aside class="case-proof" aria-label="Ground 0.4.3 measured performance">
          <span>Measured on our Agency codebase</span>
          <h3>Faster repeat checks. Fresh source still decides.</h3>
          <p>
            Repeated dependency queries in a persistent MCP session took about 72 ms in 0.4.3, down
            from 724 ms in 0.4.2. Both published packages checked the same source corpus.
          </p>
          <dl>
            <div>
              <dt>0.4.2 repeated query</dt>
              <dd>724 ms</dd>
            </div>
            <div>
              <dt>0.4.3 repeated query</dt>
              <dd>72 ms</dd>
            </div>
            <div>
              <dt>This workload</dt>
              <dd>~10× faster</dd>
            </div>
          </dl>
          <p>
            Duplicate scans also use up to four parsing workers. The timings above measure
            dependency queries, not duplicate scans.
          </p>
          <p>
            These are two-repeat medians from one macOS ARM64 machine, not a speed promise for every
            command. The first 0.4.3 query took 722 ms with reuse enabled versus 536 ms uncached.
            Small queries can also cost more. Cached data stays in memory for the life of the
            process.
          </p>
          <p>
            <a href="/evidence/ground-0.4.3-performance.json">Inspect the measurements</a>
            ·
            <a
              href="https://github.com/createsomethingtoday/create-something-monorepo/releases/tag/ground-v0.4.3"
              >Inspect the release and five-platform receipts</a
            >
          </p>
        </aside>
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
    </div>
  </section>

  <section
    class="ground-handoff"
    aria-labelledby="ground-handoff-title"
    data-performance-chapter="continuation"
  >
    <div>
      <p class="ground-eyebrow">Your next code claim</p>
      <h2 id="ground-handoff-title">Put evidence<br />before the answer.</h2>
      <p>
        Install Ground in one agent client, run a real verification, and preserve the checked inputs
        with the finding.
      </p>
      <a class="primary-action" href="https://www.npmjs.com/package/@createsomething/ground-mcp"
        >Install Ground from npm <span aria-hidden="true">↗</span></a
      >
    </div>
    <div class="handoff-links">
      <a
        href="https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/ground"
        >Inspect the source ↗</a
      >
      <a href="https://createsomething.io/papers/kickstand-triad-audit"
        >Read the Kickstand audit ↗</a
      >
      <a href="/agent-foundation">Explore Agent Foundation ↗</a>
      <a href="/products">Explore the product family ↗</a>
      <p>
        Ground gates its own claim tools. The codebase operator reviews the finding and decides what
        to change.
      </p>
    </div>
  </section>
</div>

<style>
  .ground-page {
    --ground-bg: var(--color-performance-mode-campaign-surface);
    --ground-fg: var(--color-performance-mode-campaign-ink);
    --ground-muted: var(--color-performance-fg-secondary);
    --ground-line: var(--color-performance-shell-border-strong);
    background: var(--ground-bg);
    color: var(--ground-fg);
    font-family: var(--font-performance-interface);
  }
  .ground-page :global(*) {
    box-sizing: border-box;
  }
  a {
    color: inherit;
    text-underline-offset: 0.3em;
  }
  a:focus-visible,
  button:focus-visible,
  summary:focus-visible {
    outline: 2px solid var(--color-performance-focus);
    outline-offset: 5px;
  }
  .ground-eyebrow,
  .hero-caption,
  .ground-rail,
  .install-card span,
  .case-proof > span,
  .guardrail-artifact li > span {
    font: 11px/1.6 var(--font-performance-mono);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .ground-eyebrow,
  .hero-caption {
    color: var(--ground-muted);
  }
  .ground-hero {
    padding: 0;
    position: relative;
    isolation: isolate;
    min-height: 650px;
    display: flex;
    align-items: center;
  }
  .ground-hero picture {
    position: absolute;
    inset: 0;
    z-index: -2;
  }
  .ground-hero img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }
  .ground-hero::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background: linear-gradient(
      90deg,
      var(--ground-bg) 0%,
      color-mix(in srgb, var(--ground-bg) 94%, transparent) 30%,
      transparent 78%
    );
  }
  .hero-copy {
    width: 56%;
    padding: 110px 0 100px 6vw;
  }
  h1 {
    max-width: 10ch;
    font-size: clamp(3rem, 6.8vw, 6rem);
    line-height: 0.99;
    font-weight: 400;
    letter-spacing: -0.065em;
    margin: 28px 0 24px;
  }
  .lede {
    max-width: 36ch;
    font-size: 0.95rem;
    line-height: 1.65;
  }
  .primary-action {
    display: inline-flex;
    justify-content: space-between;
    align-items: center;
    gap: 30px;
    min-height: 48px;
    padding: 14px 19px;
    margin-top: 20px;
    border: 1px solid var(--ground-fg);
    background: var(--ground-fg);
    color: var(--ground-bg);
    font-size: 0.8rem;
    text-decoration: none;
  }
  .primary-action:hover {
    background: var(--ground-bg);
    color: var(--ground-fg);
  }
  .hero-note {
    font-size: 0.75rem;
    margin-top: 16px;
    color: var(--ground-muted);
  }
  .hero-caption {
    position: absolute;
    bottom: 16px;
    left: 6vw;
    right: 6vw;
    margin: 0;
    font-size: 10px;
  }
  .ground-rail {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 12px 24px;
    padding: 12px 6vw;
    border-block: 1px solid var(--ground-line);
  }
  .ground-rail a {
    display: inline-flex;
    align-items: center;
    gap: 20px;
    min-height: 44px;
    text-decoration: none;
  }
  .ground-rail a:hover {
    text-decoration: underline;
  }
  .ground-workbench,
  .ground-handoff {
    padding: 80px 6vw;
  }
  .chapter-heading {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 30px;
    margin-bottom: 32px;
  }
  .chapter-heading .ground-eyebrow {
    margin: 0 0 20px;
  }
  h2 {
    margin: 0;
    font-size: clamp(2rem, 4.8vw, 3.9rem);
    font-weight: 400;
    letter-spacing: -0.055em;
    line-height: 1.02;
  }
  .chapter-heading > p {
    max-width: 30ch;
    margin: 0;
    color: var(--ground-muted);
    font-size: 0.85rem;
    line-height: 1.65;
  }
  .install-section,
  .guardrail-section,
  .proof-section {
    scroll-margin-top: 96px;
  }
  .guardrail-section,
  .proof-section {
    padding-top: 90px;
  }
  .release-note,
  .copy-status {
    font-size: 0.8rem;
    color: var(--ground-muted);
  }
  .copy-status {
    min-height: 1.5em;
    margin: 0 0 10px;
  }
  .install-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    border-top: 1px solid var(--ground-line);
  }
  .install-card {
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: 20px;
    min-width: 0;
    padding: 24px 24px 24px 0;
    border-bottom: 1px solid var(--ground-line);
  }
  .install-card:nth-child(even) {
    border-left: 1px solid var(--ground-line);
    padding-left: 24px;
  }
  .install-card > div {
    display: grid;
    gap: 6px;
  }
  .install-card small {
    color: var(--ground-muted);
    font-size: 0.8rem;
  }
  code {
    font-family: var(--font-performance-mono);
  }
  .install-card code {
    overflow-wrap: anywhere;
    font-size: 0.8rem;
    line-height: 1.7;
  }
  button {
    justify-self: start;
    min-height: 44px;
    padding: 10px 16px;
    background: transparent;
    color: inherit;
    border: 1px solid var(--ground-line);
    cursor: pointer;
    font: inherit;
    font-size: 0.75rem;
  }
  button:hover {
    border-color: var(--ground-fg);
  }
  .usage-note {
    max-width: 90ch;
    font-size: 0.8rem;
    line-height: 1.7;
    color: var(--ground-muted);
    margin: 24px 0 0;
  }
  .guardrail-artifact {
    display: grid;
    grid-template-columns: 0.8fr 1.2fr;
    gap: 32px;
  }
  .guardrail-artifact ol {
    margin: 0;
    padding: 0;
    list-style: none;
    border-top: 1px solid var(--ground-line);
  }
  .guardrail-artifact li {
    display: grid;
    grid-template-columns: 32px 1fr;
    gap: 6px 12px;
    padding: 20px 0;
    border-bottom: 1px solid var(--ground-line);
  }
  .guardrail-artifact li > span {
    grid-row: span 2;
    color: var(--ground-muted);
  }
  .guardrail-artifact li p {
    margin: 0;
    font-size: 0.85rem;
    color: var(--ground-muted);
    line-height: 1.6;
  }
  .guardrail-artifact pre {
    min-width: 0;
    margin: 0;
    padding: 24px;
    border: 1px solid var(--ground-line);
    overflow: auto;
    font-size: 0.75rem;
    line-height: 1.9;
  }
  .guardrail-artifact pre span {
    color: var(--ground-muted);
  }
  .guardrail-artifact pre strong {
    color: var(--ground-fg);
  }
  .tool-disclosure {
    border-block: 1px solid var(--ground-line);
    margin-bottom: 32px;
  }
  summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 24px;
    min-height: 64px;
    cursor: pointer;
    font-size: 0.9rem;
  }
  summary span {
    font-size: 0.75rem;
    color: var(--ground-muted);
  }
  .tool-groups {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 32px;
    padding-bottom: 32px;
  }
  .tool-groups article {
    min-width: 0;
  }
  h3 {
    font-size: 1.25rem;
    font-weight: 400;
    letter-spacing: -0.025em;
    margin: 16px 0;
  }
  .tool-groups ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .tool-groups li {
    display: grid;
    gap: 6px;
    padding: 12px 0;
    border-top: 1px solid var(--ground-line);
  }
  .tool-groups code {
    overflow-wrap: anywhere;
    font-size: 0.8rem;
  }
  .tool-groups li span {
    font-size: 0.8rem;
    color: var(--ground-muted);
    line-height: 1.6;
  }
  .case-proof {
    padding: 32px 0;
    border-bottom: 1px solid var(--ground-line);
  }
  .case-proof > span {
    color: var(--ground-muted);
  }
  .case-proof p {
    max-width: 80ch;
    font-size: 0.85rem;
    line-height: 1.7;
    color: var(--ground-muted);
  }
  .case-proof dl {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    margin: 32px 0;
  }
  .case-proof dt {
    font: 0.7rem/1.6 var(--font-performance-mono);
    color: var(--ground-muted);
  }
  .case-proof dd {
    margin: 8px 0 0;
    font-size: clamp(1.5rem, 3vw, 2.5rem);
    letter-spacing: -0.04em;
  }
  .ground-handoff {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    align-items: end;
    gap: 64px;
    border-top: 1px solid var(--ground-line);
  }
  .ground-handoff p {
    max-width: 45ch;
    font-size: 0.85rem;
    line-height: 1.7;
    color: var(--ground-muted);
  }
  .handoff-links {
    display: grid;
  }
  .handoff-links a {
    display: flex;
    align-items: center;
    min-height: 48px;
    border-bottom: 1px solid var(--ground-line);
    font-size: 0.8rem;
    text-decoration: none;
  }
  .handoff-links a:hover {
    text-decoration: underline;
  }
  @media (max-width: 900px) {
    .hero-copy {
      width: 65%;
    }
    .ground-handoff {
      gap: 32px;
    }
  }
  @media (max-width: 640px) {
    .ground-hero {
      display: flex;
      flex-direction: column;
      min-height: 0;
      padding-bottom: 36px;
    }
    .ground-hero picture {
      position: relative;
      display: block;
      width: 100%;
      height: 290px;
      z-index: 0;
    }
    .ground-hero img {
      object-position: center;
    }
    .ground-hero::after {
      display: none;
    }
    .hero-copy {
      order: -1;
      width: 100%;
      padding: 40px 6vw 28px;
    }
    h1 {
      max-width: 11ch;
      font-size: clamp(2.8rem, 12vw, 4.2rem);
      margin-top: 20px;
    }
    .hero-caption {
      bottom: 12px;
      font-size: 9px;
    }
    .ground-rail {
      gap: 0;
    }
    .ground-rail a {
      width: 100%;
      justify-content: space-between;
    }
    .ground-workbench,
    .ground-handoff {
      padding: 56px 6vw;
    }
    .chapter-heading {
      display: grid;
      gap: 20px;
    }
    .chapter-heading > p {
      max-width: 40ch;
    }
    .install-grid,
    .guardrail-artifact,
    .tool-groups,
    .ground-handoff {
      grid-template-columns: 1fr;
    }
    .install-card,
    .install-card:nth-child(even) {
      padding: 24px 0;
      border-left: 0;
    }
    .guardrail-section,
    .proof-section {
      padding-top: 64px;
    }
    .case-proof dl {
      grid-template-columns: 1fr;
      gap: 20px;
    }
    summary {
      align-items: start;
      flex-direction: column;
      justify-content: center;
      gap: 8px;
      padding-block: 16px;
    }
    .primary-action {
      width: 100%;
    }
  }
</style>
