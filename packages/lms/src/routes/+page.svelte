<script lang="ts">
  import { PATHS } from '$content/paths';

  const featuredCourse = PATHS[0] ?? null;
  const firstLessonHref = featuredCourse?.lessons[0]
    ? `/paths/${featuredCourse.id}/${featuredCourse.lessons[0].id}`
    : '/paths';
  const totalLessons = PATHS.reduce((count, path) => count + path.lessons.length, 0);
</script>

<svelte:head>
  <title>Operator Workflow Learning Paths | CREATE SOMETHING Learn</title>
  <meta name="description" content="Practical learning paths for business owners using the Codex app, MCP creation, RapidAPI, and Canon workflow images." />
</svelte:head>

<div class="learn-home">
  <header class="learn-opening">
    <p class="eyebrow">CREATE SOMETHING / Learn</p>
    <h1>Build workflows operators can run and explain.</h1>
    <p class="intro">Start in the Codex app, create a RapidAPI-backed MCP, then use Canon image rules to make boundaries, policy, proof, and handoff visible.</p>
    <div class="actions">
      <a class="primary" href={firstLessonHref}>Start lesson 1 ↗</a>
      <a class="secondary" href="/paths">Review all paths</a>
    </div>
    <div class="summary" aria-label="Course summary">
      <span><strong>{PATHS.length}</strong> learning paths</span>
      <span><strong>{totalLessons}</strong> lessons</span>
      <span><strong>4</strong> practical artifacts</span>
    </div>
  </header>

  <main class="learn-content">
    <section aria-labelledby="paths-title">
      <div class="section-heading">
        <div><p class="eyebrow">Course outline</p><h2 id="paths-title">Choose a path</h2></div>
        <a href="/paths">View the course ↗</a>
      </div>
      <div class="path-list">
        {#each PATHS as path, index}
          <a class="path-item" href={`/paths/${path.id}`}>
            <span class="index">{String(index + 1).padStart(2, '0')}</span>
            <span><strong>{path.title}</strong><small>{path.description}</small></span>
            <span class="count">{path.lessons.length} lessons ↗</span>
          </a>
        {/each}
      </div>
    </section>

    <section class="method" aria-labelledby="method-title">
      <div><p class="eyebrow">The learning loop</p><h2 id="method-title">Prompt. Create. Prove.</h2></div>
      <ol>
        <li><span>01 / Prompt</span><strong>Start in the Codex app</strong><p>Turn one operator question into a narrow tool contract.</p></li>
        <li><span>02 / Create</span><strong>Wrap the data source</strong><p>Connect one RapidAPI endpoint and keep its schema inspectable.</p></li>
        <li><span>03 / Prove</span><strong>Make the work visible</strong><p>Show the boundary, policy gate, receipt, owner, and next action.</p></li>
      </ol>
    </section>

    <section class="artifacts" aria-labelledby="artifacts-title">
      <p class="eyebrow">What you leave with</p>
      <h2 id="artifacts-title">Proof another operator can use.</h2>
      <p>A tool contract, local configuration, workflow image, and a scoped next workflow.</p>
      <a href={firstLessonHref}>Begin the first lesson ↗</a>
    </section>
  </main>
</div>

<style>
  .learn-home { background: var(--color-performance-paper); color: var(--color-performance-ink); }
  .learn-opening, .learn-content { width: min(70rem, calc(100% - 2.5rem)); margin-inline: auto; }
  .learn-opening { padding: clamp(1.75rem, 4vw, 3rem) 0 1.5rem; border-bottom: 1px solid var(--color-performance-line); }
  .eyebrow, .index, .count, .method li span { font: 0.75rem var(--font-performance-mono); color: var(--color-performance-muted); text-transform: uppercase; letter-spacing: 0.06em; }
  h1, h2, strong { font-family: var(--font-performance-sans); }
  h1 { max-width: 18ch; margin: 0.65rem 0; font-size: clamp(2.25rem, 4vw, 3.25rem); line-height: 1.08; letter-spacing: -0.045em; font-weight: 600; }
  h2 { margin: 0.35rem 0; font-size: clamp(1.5rem, 2.5vw, 2rem); line-height: 1.15; letter-spacing: -0.035em; }
  .intro { max-width: 44rem; color: var(--color-performance-muted); font-size: 1rem; line-height: 1.6; }
  .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; margin-top: 1.25rem; }
  .actions a { display: inline-flex; align-items: center; min-height: 44px; padding: 0.65rem 1rem; border-radius: 8px; text-decoration: none; font-size: 0.9rem; }
  .primary { background: var(--color-performance-ink); color: var(--color-performance-paper); }
  .secondary { border: 1px solid var(--color-performance-line-strong); color: var(--color-performance-ink); }
  .summary { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 1.5rem; }
  .summary span { padding: 0.55rem 0.75rem; border: 1px solid var(--color-performance-line); border-radius: 8px; background: var(--color-performance-panel); color: var(--color-performance-muted); font-size: 0.8rem; }
  .summary strong { color: var(--color-performance-ink); }
  .learn-content section { padding: 2rem 0; border-bottom: 1px solid var(--color-performance-line); }
  .section-heading { display: flex; justify-content: space-between; align-items: end; gap: 1rem; margin-bottom: 1rem; }
  a { color: inherit; }
  .section-heading a, .artifacts a { font-size: 0.9rem; }
  .path-list { border: 1px solid var(--color-performance-line); border-radius: 8px; overflow: hidden; }
  .path-item { display: grid; grid-template-columns: 2rem minmax(0, 1fr) auto; align-items: start; gap: 1rem; padding: 1rem; background: var(--color-performance-panel); text-decoration: none; }
  .path-item + .path-item { border-top: 1px solid var(--color-performance-line); }
  .path-item:hover, .path-item:focus-visible { background: var(--color-performance-court); }
  .path-item strong, .path-item small { display: block; }
  .path-item strong { font-size: 1rem; }
  .path-item small { max-width: 45rem; margin-top: 0.25rem; color: var(--color-performance-muted); line-height: 1.5; font-size: 0.9rem; }
  .count { white-space: nowrap; }
  .method ol { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; padding: 0; list-style: none; }
  .method li { padding: 1rem; border: 1px solid var(--color-performance-line); border-radius: 8px; background: var(--color-performance-panel); }
  .method li strong { display: block; margin-top: 0.5rem; }
  .method li p, .artifacts p { color: var(--color-performance-muted); font-size: 0.9rem; line-height: 1.55; }
  a:focus-visible { outline: 2px solid var(--color-performance-signal); outline-offset: 3px; }
  @media (max-width: 650px) {
    .learn-opening, .learn-content { width: calc(100% - 2rem); }
    .path-item { grid-template-columns: 1.5rem minmax(0, 1fr); }
    .count { grid-column: 2; }
    .method ol { grid-template-columns: 1fr; }
  }
</style>
