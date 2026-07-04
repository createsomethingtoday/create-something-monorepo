<script lang="ts">
  import { ArrowRight } from 'lucide-svelte';
  import { PATHS } from '$content/paths';
  import {
    ClearCtaBand,
    ClearPlatformHero,
    ClearProofStrip,
    ClearStateRows
  } from '$canon/components/clear';

  const featuredCourse = PATHS[0] ?? null;
  const featuredLessons = featuredCourse?.lessons ?? [];
  const firstLessonHref = featuredLessons[0]
    ? `/paths/${featuredCourse?.id}/${featuredLessons[0].id}`
    : '/paths';
  const totalLessons = PATHS.reduce((count, path) => count + path.lessons.length, 0);

  const proofItems = [
    { value: `${PATHS.length} paths`, label: `${totalLessons} lessons from workflow creation to visible proof` },
    { value: 'RapidAPI', label: 'Use live business data without building a data source first' },
    { value: 'Canon images', label: 'Turn workflow boundaries, gates, and receipts into learning artifacts' },
    { value: 'MCP skill', label: 'Use Codex MCP-building guidance as the planning and review loop' },
    { value: 'Operator loop', label: 'Search, normalize, inspect, prove, decide, then hand off' }
  ];

  const workflowStates = [
    {
      tone: 'run' as const,
      state: 'Prompt',
      label: 'Start in the Codex app',
      detail: 'Use the Codex app and its MCP-building skill to turn a concrete operator question into a narrow tool contract.'
    },
    {
      tone: 'wait' as const,
      state: 'Create',
      label: 'Wrap the data source',
      detail: 'Create the MCP server, connect one RapidAPI endpoint, and keep the schema inspectable.'
    },
    {
      tone: 'stop' as const,
      state: 'Prove',
      label: 'Make the work visible',
      detail: 'Use Canon image rules to show the object, boundary, policy gate, receipt, owner, and next action.'
    }
  ];

  const outcomes = [
    {
      label: 'Path 01',
      title: 'Learn Codex through MCP creation',
      detail: 'Codex is the working environment, and the MCP-building skill is the guide for creating a capability Codex can call.'
    },
    {
      label: 'Path 02',
      title: 'Learn Canon through workflow images',
      detail: 'Turn the workflow into maps, MCP boundaries, policy gates, receipts, and handoff images that operators can inspect.'
    },
    {
      label: 'Outcome',
      title: 'Ship with proof',
      detail: 'Leave with a working capability and the visual evidence needed to explain, govern, and extend it.'
    }
  ];
</script>

<svelte:head>
  <title>Operator Workflow Learning Paths | CREATE SOMETHING Learn</title>
  <meta
    name="description"
    content="Practical learning paths for business owners using the Codex app, MCP creation, RapidAPI, and Canon workflow images."
  />
</svelte:head>

<div class="learn-home">
  <ClearPlatformHero
    eyebrow="CREATE SOMETHING Learn"
    title="Build workflows operators can run and explain"
    description="Practical paths for business owners becoming operators. Start in the OpenAI ecosystem with the Codex app, create a RapidAPI-backed MCP, then use Canon image rules to make boundaries, policy, proof, and handoff visible."
    proofItems={proofItems}
    metaItems={[
      { label: 'Paths', value: `${PATHS.length} operator tracks` },
      { label: 'Pace', value: 'About 175 minutes' },
      { label: 'Surface', value: 'Codex app + Canon' }
    ]}
    ariaLabel="CREATE SOMETHING Learn course overview"
  >
    {#snippet actions()}
      <a class="btn btn-primary" href={firstLessonHref}>
        Start lesson 1
        <ArrowRight size={17} strokeWidth={1.8} />
      </a>
      <a class="btn btn-secondary" href="/paths">Review paths</a>
    {/snippet}

    {#snippet aside()}
      <ClearStateRows
        eyebrow="Learning loop"
        title="Prompt, create, prove"
        states={workflowStates}
        receiptLabel="Final receipt"
        receipts={['MCP-building skill prompt', 'server scaffold', 'RapidAPI tool schema', 'Canon workflow image']}
        ariaLabel="Course workflow states"
      />
    {/snippet}
  </ClearPlatformHero>

  <section class="learn-section" aria-labelledby="course-outline-title">
    <div class="learn-section__header">
      <span>Course outline</span>
      <h2 id="course-outline-title">Two operator paths: create the workflow, then make it visible.</h2>
    </div>

    {#if PATHS.length}
      <div class="course-grid">
        {#each PATHS as path}
          <a class="course-panel" href={`/paths/${path.id}`}>
            <div class="course-panel__summary">
              <span>{path.subtitle}</span>
              <h3>{path.title}</h3>
              <p>{path.description}</p>
            </div>

            <ol class="lesson-list">
              {#each path.lessons as lesson, index}
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
        {/each}
      </div>
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
        { value: 'Tool contract', label: 'Input schema, output shape, API limits, and failure behavior are explicit.' },
        { value: 'Local config', label: 'Codex can find and run the server from your environment.' },
        { value: 'Workflow image', label: 'The object, MCP boundary, policy gate, owner, and receipt are visible.' },
        { value: 'Next workflow', label: 'You leave with a scoped extension instead of a vague automation roadmap.' }
      ]}
      ariaLabel="Course proof artifacts"
    />
  </section>

  <ClearCtaBand
    eyebrow="Get started"
    title="Build the smallest useful workflow first."
    description="Start with one Codex prompt, one endpoint, one schema, and one MCP call. Then use Canon to make the operating boundary visible enough to govern."
    items={outcomes}
  >
    {#snippet actions()}
      <a class="btn btn-primary" href={firstLessonHref}>Start lesson 1</a>
      <a class="btn btn-secondary" href="/paths">View paths</a>
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

  .course-grid {
    display: grid;
    gap: 1rem;
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
