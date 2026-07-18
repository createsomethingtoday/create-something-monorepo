<script lang="ts">
  import { ArrowRight } from 'lucide-svelte';
  import { PATHS } from '$content/paths';
  import {
    PerformanceCampaignOpening,
    PerformanceProofStrip,
    type PerformanceCampaignProof,
    type PerformanceCondition
  } from '$canon/components/performance';
  import { traceControlPlaneMedia } from '$canon/components/performance/media/trace-control-plane';
  import PropertyFunnel from '$canon/components/PropertyFunnel.svelte';

  const featuredCourse = PATHS[0] ?? null;
  const featuredLessons = featuredCourse?.lessons ?? [];
  const firstLessonHref = featuredLessons[0]
    ? `/paths/${featuredCourse?.id}/${featuredLessons[0].id}`
    : '/paths';
  const totalLessons = PATHS.reduce((count, path) => count + path.lessons.length, 0);

  const proofItems: PerformanceCampaignProof[] = [
    {
      label: 'Learning paths',
      value: `${PATHS.length} / ${totalLessons} lessons`
    },
    { label: 'Working surface', value: 'Codex app + MCP' },
    { label: 'Evidence', value: 'Canon workflow images' },
    { label: 'Outcome', value: 'Operator-ready proof' }
  ];

  const workflowConditions: PerformanceCondition[] = [
    {
      tone: 'signal',
      label: 'Prompt',
      title: 'Start in the Codex app',
      detail:
        'Use the Codex app and its MCP-building skill to turn a concrete operator question into a narrow tool contract.'
    },
    {
      tone: 'pressure',
      label: 'Create',
      title: 'Wrap the data source',
      detail:
        'Create the MCP server, connect one RapidAPI endpoint, and keep the schema inspectable.'
    },
    {
      tone: 'growth',
      label: 'Prove',
      title: 'Make the work visible',
      detail:
        'Use Canon image rules to show the object, boundary, policy gate, receipt, owner, and next action.'
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

<div class="learn-home property-performance">
  <PerformanceCampaignOpening
    eyebrow="CREATE SOMETHING Learn"
    title="Build workflows operators can run and explain"
    lede="Practical paths for business owners becoming operators. Start in the OpenAI ecosystem with the Codex app, create a RapidAPI-backed MCP, then use Canon image rules to make boundaries, policy, proof, and handoff visible."
    media={traceControlPlaneMedia}
    proof={proofItems}
    density="compact"
  >
    {#snippet actions()}
      <a class="btn btn-primary" href={firstLessonHref}>
        Start lesson 1
        <ArrowRight size={17} strokeWidth={1.8} />
      </a>
      <a class="btn btn-secondary" href="/paths">Review paths</a>
    {/snippet}
  </PerformanceCampaignOpening>

  <section class="learn-section" aria-labelledby="course-outline-title">
    <div class="learn-section__header">
      <span>Course outline</span>
      <h2 id="course-outline-title">Prompt. Create. Prove.</h2>
      <p>
        Two operator paths create the workflow, make it visible, and finish only when the operator
        can run it, inspect its boundary, and explain the evidence it leaves behind.
      </p>
    </div>

    <ol class="learning-loop" aria-label="Course workflow conditions">
      {#each workflowConditions as condition, index}
        <li data-tone={condition.tone}>
          <span>{String(index + 1).padStart(2, '0')} · {condition.label}</span>
          <strong>{condition.title}</strong>
          <p>{condition.detail}</p>
        </li>
      {/each}
    </ol>

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
    <div class="learn-section__header learn-section__header--proof">
      <span>How it lands</span>
      <h2 id="proof-title">The course is judged by artifacts, not vibes.</h2>
    </div>
    <PerformanceProofStrip
      items={[
        {
          value: 'Tool contract',
          label: 'Input schema, output shape, API limits, and failure behavior are explicit.'
        },
        {
          value: 'Local config',
          label: 'Codex can find and run the server from your environment.'
        },
        {
          value: 'Workflow image',
          label: 'The object, MCP boundary, policy gate, owner, and receipt are visible.'
        },
        {
          value: 'Next workflow',
          label: 'You leave with a scoped extension instead of a vague automation roadmap.'
        }
      ]}
      ariaLabel="Course proof artifacts"
    />
  </section>

  <PropertyFunnel
    current="lms"
    eyebrow="Learning handoff"
    heading="Build the smallest useful workflow first."
    description="Start with one Codex prompt, one endpoint, one schema, and one MCP call. Make the boundary visible with Canon, use .space to test it, return to .ltd for the governing principle, or carry the named workflow into .agency practice."
    density="compact"
    handoff={{
      owner: 'Learner / operator',
      authority: 'Artifact review',
      proof: 'Working MCP + workflow image',
      state: 'ready'
    }}
  />
</div>

<style>
  .learn-home {
    background: var(--color-performance-paper, #f3f3f0);
  }

  .learn-section {
    display: grid;
    gap: 1.25rem;
    width: min(var(--content-width-performance, 85rem), calc(100% - 2.5rem));
    margin-inline: auto;
    padding-block: 3.5rem;
  }

  .learn-section__header {
    display: grid;
    gap: 0.55rem;
    max-width: 42rem;
  }

  .learn-section__header span,
  .course-panel__summary span {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-mono);
    font-size: 0.76rem;
    font-weight: var(--font-semibold);
    letter-spacing: 0;
    line-height: 1.15;
    text-transform: uppercase;
  }

  .learn-section__header h2 {
    margin: 0;
    color: var(--color-performance-ink, #090909);
    font-size: clamp(2rem, 4vw, 3.15rem);
    font-weight: var(--font-medium);
    letter-spacing: 0;
    line-height: 1.04;
    text-wrap: balance;
  }

  .learn-section__header p {
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: 1rem;
    line-height: 1.52;
  }

  .learn-section__header--proof {
    margin-top: 1.5rem;
  }

  .learning-loop {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0;
    margin: 0;
    padding: 0;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    list-style: none;
  }

  .learning-loop li {
    display: grid;
    align-content: start;
    gap: 0.55rem;
    padding: 1rem;
    background: var(--color-performance-panel, #ffffff);
  }

  .learning-loop li + li {
    border-left: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .learning-loop span {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    text-transform: uppercase;
  }

  .learning-loop strong {
    font-size: 1.12rem;
    font-weight: var(--font-medium);
  }

  .learning-loop p {
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.92rem;
    line-height: 1.45;
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
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-md, 4px);
    background: var(--color-performance-panel, #ffffff);
    color: inherit;
    text-decoration: none;
  }

  .course-panel:hover {
    border-color: var(--color-performance-line-strong, #9c9c96);
  }

  .course-panel__summary {
    display: grid;
    align-content: start;
    gap: 0.75rem;
    padding: 0.85rem;
    border-radius: var(--radius-performance-sm, 4px);
    background:
      linear-gradient(90deg, rgba(10, 14, 25, 0.035) 1px, transparent 1px) 0 0 / 2.8rem 2.8rem,
      var(--color-performance-court, #e6e6e0);
  }

  .course-panel__summary h3 {
    margin: 0;
    color: var(--color-performance-ink, #090909);
    font-size: clamp(1.65rem, 3vw, 2.5rem);
    font-weight: var(--font-medium);
    letter-spacing: 0;
    line-height: 1.05;
  }

  .course-panel__summary p {
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
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
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
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
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-ink, #090909);
    color: #ffffff;
  }

  .lesson-list strong {
    display: block;
    color: var(--color-performance-ink, #090909);
    font-size: 1rem;
    font-weight: var(--font-medium);
    line-height: 1.25;
  }

  .lesson-list p {
    margin: 0.26rem 0 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.92rem;
    line-height: 1.42;
  }

  .lesson-list__duration {
    color: var(--color-performance-muted, #5e6268);
    white-space: nowrap;
  }

  @media (max-width: 860px) {
    .course-panel {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 640px) {
    .learn-section {
      width: min(100% - 1.5rem, var(--content-width-performance, 85rem));
      padding-block: 2.5rem;
    }

    .course-panel {
      padding: 0.75rem;
    }

    .learning-loop {
      grid-template-columns: 1fr;
    }

    .learning-loop li + li {
      border-top: 1px solid var(--color-performance-line, #d7d7d2);
      border-left: 0;
    }

    .lesson-list li {
      grid-template-columns: auto minmax(0, 1fr);
    }

    .lesson-list__duration {
      grid-column: 2;
    }
  }
</style>
