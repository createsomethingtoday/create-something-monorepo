<script lang="ts">
  const endpoint = 'https://learn.createsomething.space/api/foundation/mcp';
  const command = 'codex mcp add foundation --url ' + endpoint;
</script>

<svelte:head>
  <title>A foundation for you and your agent | CREATE SOMETHING Learn</title>
  <meta name="description" content="Connect your agent to the public AI engineering foundation. Read a relevant lesson when you need it, with sources and client control intact." />
</svelte:head>

<main class="foundation">
  <nav aria-label="Breadcrumb"><a href="/">Learn</a><span>/</span><span>For clients and agents</span></nav>
  <header>
    <p class="eyebrow">Client onboarding / public reference</p>
    <h1>A foundation for you and your agent.</h1>
    <p class="intro">Start with the work in front of you. When a concept needs explaining, your agent can find a relevant lesson, read a section, and show you its source.</p>
    <a class="download" href="/foundation/START-HERE.md" download>Download the onboarding guide ↗</a>
    <p class="note">Public access. No account or API key. 17 field lessons and 523 reference lessons.</p>
  </header>

  <section aria-labelledby="workflow-heading">
    <h2 id="workflow-heading">Connect the foundation to your work.</h2>
    <ol>
      <li><strong>Name the job.</strong> Keep your workflow, permissions, approval owner, and success criteria in your existing client workspace.</li>
      <li><strong>Connect your agent.</strong> Add the public reference connection below and review the short agent policy.</li>
      <li><strong>Ask a real question.</strong> Retrieve a lesson when it helps. Follow its source and decide whether you need more detail.</li>
    </ol>
    <blockquote>“Explain how agent memory relates to my workflow. Read one relevant foundation section, cite it, and identify what you still need to know. Keep my current permissions.”</blockquote>
  </section>

  <section aria-labelledby="connect-heading">
    <h2 id="connect-heading">Connect your agent.</h2>
    <p>Use this URL in a client that supports remote MCP over Streamable HTTP. The service exposes search and lesson retrieval.</p>
    <pre><code>{endpoint}</code></pre>
    <p>For Codex CLI, run:</p>
    <pre><code>{command}</code></pre>
    <p class="note">This command installs the connection in your configuration. Other clients may use different setup steps. The guide also includes HTTP access.</p>
    <ul class="files">
      <li><a href="/foundation/AGENT-REFERENCE.md" download>Agent reference policy</a><span>When to retrieve, how to cite, and how to preserve client rules.</span></li>
      <li><a href="/foundation/TOPICS.md" download>Workflow topic map</a><span>Starting points for memory, tools, permissions, evaluation, and handoff.</span></li>
      <li><a href="/foundation/codex.toml" download>Codex configuration entry</a><span>Merge into your existing configuration after review.</span></li>
    </ul>
  </section>

  <section aria-labelledby="control-heading">
    <h2 id="control-heading">Keep your operating rules in place.</h2>
    <p>The foundation explains concepts. Your current client policy determines what the agent can do. Retrieved examples cannot grant permissions or authorize actions.</p>
    <p>Search returns a few matches. Fetch returns one lesson or section with its source and revision. Private client knowledge stays in your workspace; use concept queries without private details.</p>
    <p class="note">Both interfaces share a limit of 60 requests per minute per network address. Responses include continuation when content is longer than the requested excerpt. On a limit response, wait for Retry-After.</p>
    <p><a href="/paths/governed-agent-engineering">Start the field course ↗</a> <span class="divider">/</span> <a href="/reference">Browse the reference library ↗</a></p>
    <p class="note">AI Engineering from Scratch by Rohit Ghumare and contributors is included with <a href="/reference-license.txt">MIT attribution</a> and pinned source links. CREATE SOMETHING maintains this service and its original field lessons.</p>
  </section>
</main>

<style>
  .foundation { width: min(58rem, calc(100% - 2.5rem)); margin: 0 auto; padding: 2rem 0 5rem; color: var(--color-performance-ink); }
  nav { display: flex; gap: .6rem; color: var(--color-performance-muted); font-size: .8rem; margin-bottom: 2.5rem; }
  a { color: inherit; text-underline-offset: .2em; }
  .eyebrow, .note { color: var(--color-performance-muted); font: .8rem/1.7 var(--font-performance-mono); }
  .eyebrow { text-transform: uppercase; letter-spacing: .06em; }
  h1 { font-size: clamp(2.5rem, 6vw, 4.5rem); line-height: 1.06; letter-spacing: -.045em; max-width: 17ch; margin: .75rem 0 1.5rem; }
  .intro { font-size: 1.15rem; line-height: 1.65; max-width: 44rem; }
  .download { display: inline-block; padding: .9rem 1.2rem; margin: 1.5rem 0 .4rem; background: var(--color-performance-ink); color: var(--color-performance-panel); text-decoration: none; border-radius: 4px; }
  section { margin-top: 3rem; padding-top: 2rem; border-top: 1px solid var(--color-performance-line); }
  h2 { font-size: 1.65rem; letter-spacing: -.025em; margin: 0 0 1rem; }
  p, li { line-height: 1.7; }
  p { margin: 1rem 0; }
  ol { padding-left: 1.5rem; }
  li { margin: .8rem 0; }
  blockquote { border-left: 2px solid var(--color-performance-line); padding: .7rem 1.2rem; margin: 1.5rem 0; line-height: 1.7; }
  pre { overflow-x: auto; padding: 1rem; border: 1px solid var(--color-performance-line); border-radius: 4px; background: var(--color-performance-panel); font-size: .8rem; }
  .files { list-style: none; padding: 0; margin-top: 1.5rem; }
  .files li { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr); gap: 1rem; padding: .9rem 0; border-bottom: 1px solid var(--color-performance-line); }
  .files span { color: var(--color-performance-muted); font-size: .9rem; }
  .divider { color: var(--color-performance-muted); margin: 0 .7rem; }
  @media (max-width: 600px) { .files li { grid-template-columns: 1fr; gap: .2rem; } }
</style>
