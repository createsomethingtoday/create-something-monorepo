<script lang="ts">
  import { PATHS } from '$content/paths';
  import { REFERENCE_CATALOG } from '$lib/content/reference';

  const featuredCourse = PATHS[0] ?? null;
  const firstLessonHref = featuredCourse?.lessons[0]
    ? `/paths/${featuredCourse.id}/${featuredCourse.lessons[0].id}`
    : '/paths';
  const totalLessons = PATHS.reduce((count, path) => count + path.lessons.length, 0);
</script>

<svelte:head>
  <title>Learn to Engineer Governed Agents | CREATE SOMETHING Learn</title>
  <meta name="description" content="Build agents from first principles, govern their actions, and prove their work. Original CREATE SOMETHING field courses and a 523-lesson open reference library." />
</svelte:head>

<div class="learn-home">
  <header class="learn-opening">
    <p class="eyebrow">CREATE SOMETHING / Learn</p>
    <h1>Build agents whose work you can explain.</h1>
    <p class="intro">Learn the mechanics, build a bounded workflow, and keep evidence. Start with our governed agent field course, follow the operator MCP and Canon paths, or explore 523 open reference lessons from first principles through production.</p>
    <div class="actions">
      <a class="primary" href={firstLessonHref}>Start the field course ↗</a>
      <a class="secondary" href="/reference">Explore the reference library</a>
      <a class="secondary" href="/foundation">For clients and agents</a>
    </div>
    <div class="summary" aria-label="Course summary">
      <span><strong>{PATHS.length}</strong> learning paths</span>
      <span><strong>{totalLessons}</strong> lessons</span>
      <span><strong>{REFERENCE_CATALOG.length}</strong> reference lessons</span>
    </div>
  </header>

  <div class="learn-content">
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
      <div><p class="eyebrow">The learning loop</p><h2 id="method-title">Understand. Build. Govern. Prove.</h2></div>
      <ol>
        <li><span>01 / Understand</span><strong>Name the real job</strong><p>Trace the source, owner, outcome, and underlying mechanism.</p></li>
        <li><span>02 / Build</span><strong>Run the smallest loop</strong><p>Make a tool call, observe the result, and stop at a clear boundary.</p></li>
        <li><span>03 / Govern</span><strong>Keep humans in control</strong><p>Make permissions, approvals, and revocation explicit.</p></li>
        <li><span>04 / Prove</span><strong>Keep a receipt</strong><p>Record the command, trace, artifact, proof level, and next gate.</p></li>
      </ol>
    </section>

    <section class="artifacts" aria-labelledby="artifacts-title">
      <p class="eyebrow">What you leave with</p>
      <h2 id="artifacts-title">A system another operator can use.</h2>
      <p>Leave with a work contract, runnable loop, source ledger, policy, evaluation traces, and a handoff.</p>
      <a href={firstLessonHref}>Begin the first lesson ↗</a>
    </section>
  </div>
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
