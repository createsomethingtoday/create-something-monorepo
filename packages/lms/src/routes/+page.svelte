<script lang="ts">
  import { ArrowRight, TerminalSquare, Wrench, Bug } from 'lucide-svelte';
  import { PATHS } from '$content/paths';

  const course = PATHS[0] ?? null;
  const firstLessonHref = course?.lessons[0]
    ? `/paths/${course.id}/${course.lessons[0].id}`
    : '/paths';
  const courseHref = course ? `/paths/${course.id}` : '/paths';

  const workflow = [
    {
      icon: TerminalSquare,
      title: 'Build',
      description: 'Scaffold a TypeScript MCP server and define your first tool.'
    },
    {
      icon: Wrench,
      title: 'Connect',
      description: 'Attach the server to Codex and invoke tools from real prompts.'
    },
    {
      icon: Bug,
      title: 'Debug',
      description: 'Add a tight feedback loop so your MCP is stable and reusable.'
    }
  ];
</script>

<svelte:head>
  <title>Learn Codex with MCP | CREATE SOMETHING Learn</title>
  <meta
    name="description"
    content="A practical course for learning Codex by building and shipping a real MCP server."
  />
</svelte:head>

<div class="learn-home-shell">
  <section class="hero">
    <p class="eyebrow">Simple. Practical. Build-first.</p>
    <h1 class="hero-title">Learn Codex by Building an MCP</h1>
    <p class="hero-subtitle">
      One focused course. No theory detours. You build a working MCP server from scratch and connect
      it to Codex.
    </p>
    <a href={firstLessonHref} class="btn-primary">
      {course ? 'Start Lesson 1' : 'View Course'}
      <ArrowRight size={16} />
    </a>
  </section>

  <section class="course-overview">
    <h2 class="section-title">Course Outline</h2>
    {#if course}
      <a class="course-card {course.color}" href={courseHref}>
        <div class="course-card-header">
          <h3>{course.title}</h3>
          <span>{course.lessons.length} lessons</span>
        </div>
        <p>{course.description}</p>
        <ol>
          {#each course.lessons as lesson}
            <li>
              <span>{lesson.title}</span>
              <span>{lesson.duration}</span>
            </li>
          {/each}
        </ol>
      </a>
    {:else}
      <div class="course-card">
        <div class="course-card-header">
          <h3>Course Coming Soon</h3>
        </div>
        <p>Course content is being prepared. Check back shortly.</p>
      </div>
    {/if}
  </section>

  <section>
    <h2 class="section-title">How You Learn</h2>
    <div class="workflow-grid">
      {#each workflow as item}
        <div class="workflow-card">
          <item.icon size={28} strokeWidth={1.5} />
          <h3>{item.title}</h3>
          <p>{item.description}</p>
        </div>
      {/each}
    </div>
  </section>
</div>

<style>
  .learn-home-shell {
    width: min(100%, var(--content-width-xl));
    margin: 0 auto;
    padding: var(--section-padding-sm) var(--container-padding);
  }

  .hero {
    margin-bottom: var(--section-gap);
  }

  .hero-title {
    font-size: var(--text-display);
    font-weight: var(--font-light);
    margin-bottom: var(--space-sm);
  }

  .hero-subtitle {
    max-width: 48rem;
    color: var(--color-fg-secondary);
    margin: 0 0 var(--space-lg);
    font-size: var(--text-body-lg);
  }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-md);
    background: var(--color-fg-primary);
    color: var(--color-bg-pure);
    font-weight: var(--font-medium);
  }

  .course-overview {
    margin-bottom: var(--section-gap);
  }

  .section-title {
    font-size: var(--text-h2);
    margin-bottom: var(--space-md);
  }

  .course-card {
    display: block;
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-xl);
    padding: var(--space-lg);
    background: transparent;
  }

  .course-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-sm);
  }

  .course-card-header h3 {
    font-size: var(--text-h3);
  }

  .course-card-header span {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }

  .course-card p {
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-md);
  }

  .course-card ol {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .course-card li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-xs) 0;
    border-top: 1px solid var(--color-border-default);
    font-size: var(--text-body-sm);
  }

  .course-card li span:last-child {
    color: var(--color-fg-muted);
  }

  .workflow-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-md);
  }

  @media (min-width: 768px) {
    .workflow-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .workflow-card {
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    padding: var(--space-md);
    background: transparent;
  }

  .workflow-card h3 {
    margin-top: var(--space-sm);
    margin-bottom: var(--space-xs);
    font-size: var(--text-h3);
  }

  .workflow-card p {
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
  }
</style>
