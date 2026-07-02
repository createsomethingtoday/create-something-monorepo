<script lang="ts">
  import { ArrowRight } from 'lucide-svelte';
  import { PATHS } from '$content/paths';
  import {
    ClearCtaBand,
    ClearPlatformHero,
    ClearProofStrip,
    ClearStateRows
  } from '$canon/components/clear';

  const course = PATHS[0] ?? null;
  const lessons = course?.lessons ?? [];
  const firstLessonHref = lessons[0] ? `/paths/${course?.id}/${lessons[0].id}` : '/paths';
  const courseHref = course ? `/paths/${course.id}` : '/paths';

  const proofItems = [
    { value: '6 lessons', label: 'One path from MCP concept to shipped server' },
    { value: 'Codex-ready', label: 'Every lesson ends in a usable local artifact' },
    { value: 'TypeScript', label: 'Build with the stack used in production MCP work' },
    { value: 'Evidence loop', label: 'Test, debug, and document before extending' }
  ];

  const workflowStates = [
    {
      tone: 'run' as const,
      state: 'Build',
      label: 'Create the server',
      detail: 'Scaffold one TypeScript MCP server with a clean entry point and tool contract.'
    },
    {
      tone: 'wait' as const,
      state: 'Attach',
      label: 'Connect it to Codex',
      detail: 'Register the server, invoke it from chat, and inspect what Codex can actually use.'
    },
    {
      tone: 'stop' as const,
      state: 'Prove',
      label: 'Debug before shipping',
      detail: 'Add validation, run the tool under real prompts, and leave a reusable handoff.'
    }
  ];

  const outcomes = [
    {
      label: 'Lesson 01',
      title: 'Understand the boundary',
      detail: 'Codex drives work. MCP exposes the tools and context it can safely call.'
    },
    {
      label: 'Lessons 02-04',
      title: 'Build and connect',
      detail: 'Create the server, add one useful tool, then wire it into your Codex setup.'
    },
    {
      label: 'Lessons 05-06',
      title: 'Stabilize and ship',
      detail: 'Test failure cases, document usage, and choose the next tool deliberately.'
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

<div class="learn-home">
  <ClearPlatformHero
    eyebrow="CREATE SOMETHING Learn"
    title="Learn Codex by building one MCP server"
    description="A focused course for operators who want working context, tools, validation, and handoff. No theory detour. You finish with a local MCP server Codex can call."
    proofItems={proofItems}
    metaItems={[
      { label: 'Course', value: course?.title ?? 'Codex MCP Course' },
      { label: 'Pace', value: 'About 105 minutes' },
      { label: 'Surface', value: 'Terminal + Codex' }
    ]}
    ariaLabel="CREATE SOMETHING Learn course overview"
  >
    {#snippet actions()}
      <a class="btn btn-primary" href={firstLessonHref}>
        Start lesson 1
        <ArrowRight size={17} strokeWidth={1.8} />
      </a>
      <a class="btn btn-secondary" href={courseHref}>Review course</a>
    {/snippet}

    {#snippet aside()}
      <ClearStateRows
        eyebrow="Learning loop"
        title="Build, attach, prove"
        states={workflowStates}
        receiptLabel="Final receipt"
        receipts={['server scaffold', 'tool schema', 'Codex config', 'debug log']}
        ariaLabel="Course workflow states"
      />
    {/snippet}
  </ClearPlatformHero>

  <section class="learn-section" aria-labelledby="course-outline-title">
    <div class="learn-section__header">
      <span>Course outline</span>
      <h2 id="course-outline-title">One path, six concrete checkpoints.</h2>
    </div>

    {#if course}
      <a class="course-panel" href={courseHref}>
        <div class="course-panel__summary">
          <span>{course.subtitle}</span>
          <h3>{course.title}</h3>
          <p>{course.description}</p>
        </div>

        <ol class="lesson-list">
          {#each lessons as lesson, index}
            <li>
              <span class="lesson-list__index">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <strong>{lesson.title}</strong>
                <p>{lesson.description}</p>
              </div>
              <span class="lesson-list__duration">{lesson.duration}</span>
            </li>
          {/each}
        </ol>
      </a>
    {:else}
      <div class="course-panel">
        <div class="course-panel__summary">
          <span>Preparing</span>
          <h3>Course coming soon</h3>
          <p>Course content is being prepared. Check back shortly.</p>
        </div>
      </div>
    {/if}
  </section>

  <section class="learn-section learn-section--proof" aria-labelledby="proof-title">
    <div class="learn-section__header">
      <span>How it lands</span>
      <h2 id="proof-title">The course is judged by artifacts, not vibes.</h2>
    </div>
    <ClearProofStrip
      items={[
        { value: 'Tool contract', label: 'Input schema, output shape, and failure behavior are explicit.' },
        { value: 'Local config', label: 'Codex can find and run the server from your environment.' },
        { value: 'Debug evidence', label: 'You keep a short record of what failed and what changed.' },
        { value: 'Next tool', label: 'You leave with a scoped extension instead of a vague roadmap.' }
      ]}
      ariaLabel="Course proof artifacts"
    />
  </section>

  <ClearCtaBand
    eyebrow="Get started"
    title="Build the smallest useful MCP first."
    description="Start with one tool, one schema, and one Codex call. The rest of the course is there to make that loop durable."
    items={outcomes}
  >
    {#snippet actions()}
      <a class="btn btn-primary" href={firstLessonHref}>Start lesson 1</a>
      <a class="btn btn-secondary" href="/progress">View progress</a>
    {/snippet}
  </ClearCtaBand>
</div>

<style>
  .learn-home {
    background: var(--color-clear-porcelain, #f7f7f7);
  }

  .learn-section {
    display: grid;
    gap: 1.25rem;
    width: min(var(--content-width-clear, 85rem), calc(100% - 2.5rem));
    margin-inline: auto;
    padding-block: 3.5rem;
  }

  .learn-section--proof {
    padding-top: 1rem;
  }

  .learn-section__header {
    display: grid;
    gap: 0.55rem;
    max-width: 42rem;
  }

  .learn-section__header span,
  .course-panel__summary span {
    color: var(--color-clear-grey, #636363);
    font-family: var(--font-mono);
    font-size: 0.76rem;
    font-weight: var(--font-semibold);
    letter-spacing: 0;
    line-height: 1.15;
    text-transform: uppercase;
  }

  .learn-section__header h2 {
    margin: 0;
    color: var(--color-clear-onyx, #0a0e19);
    font-size: clamp(2rem, 4vw, 3.15rem);
    font-weight: var(--font-medium);
    letter-spacing: 0;
    line-height: 1.04;
    text-wrap: balance;
  }

  .course-panel {
    display: grid;
    grid-template-columns: minmax(16rem, 0.72fr) minmax(0, 1.28fr);
    gap: 1.25rem;
    padding: 1rem;
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: var(--radius-clear-md, 8px);
    background: var(--color-clear-panel, #ffffff);
    color: inherit;
    text-decoration: none;
  }

  .course-panel:hover {
    border-color: var(--color-clear-border-strong, #cecece);
  }

  .course-panel__summary {
    display: grid;
    align-content: start;
    gap: 0.75rem;
    padding: 0.85rem;
    border-radius: var(--radius-clear-sm, 4px);
    background:
      linear-gradient(90deg, rgba(10, 14, 25, 0.035) 1px, transparent 1px) 0 0 / 2.8rem
        2.8rem,
      var(--color-clear-porcelain-soft, #f2f2f2);
  }

  .course-panel__summary h3 {
    margin: 0;
    color: var(--color-clear-onyx, #0a0e19);
    font-size: clamp(1.65rem, 3vw, 2.5rem);
    font-weight: var(--font-medium);
    letter-spacing: 0;
    line-height: 1.05;
  }

  .course-panel__summary p {
    margin: 0;
    color: var(--color-clear-grey, #636363);
    font-size: 1rem;
    line-height: 1.52;
  }

  .lesson-list {
    display: grid;
    gap: 0.58rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .lesson-list li {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 0.85rem;
    align-items: start;
    min-height: 4.6rem;
    padding: 0.85rem;
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: var(--radius-clear-sm, 4px);
    background: rgba(255, 255, 255, 0.9);
  }

  .lesson-list__index,
  .lesson-list__duration {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    font-weight: var(--font-medium);
    letter-spacing: 0;
  }

  .lesson-list__index {
    display: grid;
    place-items: center;
    min-width: 2.1rem;
    min-height: 2.1rem;
    border-radius: var(--radius-clear-sm, 4px);
    background: var(--color-clear-onyx, #0a0e19);
    color: #ffffff;
  }

  .lesson-list strong {
    display: block;
    color: var(--color-clear-onyx, #0a0e19);
    font-size: 1rem;
    font-weight: var(--font-medium);
    line-height: 1.25;
  }

  .lesson-list p {
    margin: 0.26rem 0 0;
    color: var(--color-clear-grey, #636363);
    font-size: 0.92rem;
    line-height: 1.42;
  }

  .lesson-list__duration {
    color: var(--color-clear-grey, #636363);
    white-space: nowrap;
  }

  @media (max-width: 860px) {
    .course-panel {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 640px) {
    .learn-section {
      width: min(100% - 1.5rem, var(--content-width-clear, 85rem));
      padding-block: 2.5rem;
    }

    .course-panel {
      padding: 0.75rem;
    }

    .lesson-list li {
      grid-template-columns: auto minmax(0, 1fr);
    }

    .lesson-list__duration {
      grid-column: 2;
    }
  }
</style>
