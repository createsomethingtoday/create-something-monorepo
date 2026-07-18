<script lang="ts">
  import { ArrowRight } from 'lucide-svelte';
  import { PATHS } from '$content/paths';
  import {
    PerformanceCampaignOpening,
    PerformanceNarrativeStage,
    PerformanceProofStrip,
    type PerformanceCampaignProof,
    type PerformanceCondition,
    type PerformanceNarrativeScene,
    type PerformanceProofItem
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

  const courseProofItems: PerformanceProofItem[] = [
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
  ];

  const learnScenes: PerformanceNarrativeScene[] = [
    ...PATHS.map((path, index) => ({
      id: path.id,
      label: index === 0 ? 'Build MCP' : 'Show workflow',
      summary: `${path.lessons.length} lessons · ${path.subtitle}`,
      title: path.title,
      detail: path.description,
      tone: index === 0 ? ('allow' as const) : ('review' as const),
      receipts: index === 0 ? ['tool contract', 'local config'] : ['workflow image', 'policy gate'],
      actions: [{ label: `Open ${path.title}`, href: `/paths/${path.id}` }]
    })),
    {
      id: 'prove',
      label: 'Prove',
      summary: '4 artifacts · operator-ready',
      title: 'The course is judged by artifacts, not vibes.',
      detail:
        'The learning loop closes only when another operator can inspect the contract, run the server, read the workflow boundary, and name the next scoped extension.',
      tone: 'neutral',
      evidence: courseProofItems.map((item) => item.value),
      receipts: ['working MCP', 'workflow image', 'handoff note'],
      actions: [{ label: 'Review all paths', href: '/paths' }]
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

  <PerformanceNarrativeStage
    id="learn-operating-story"
    eyebrow="Course outline"
    title="Prompt. Create. Prove."
    description="Two operator paths create the workflow and make it visible; the third scene shows the artifacts that prove another operator can run and explain it."
    scenes={learnScenes}
    ariaLabel="Learning path story"
  >
    {#snippet artifact(scene: PerformanceNarrativeScene)}
      {@const path = PATHS.find((candidate) => candidate.id === scene.id)}
      {#if path}
        {#if path.id === PATHS[0]?.id}
          <ol class="learning-loop" aria-label="Course workflow conditions">
            {#each workflowConditions as condition, index}
              <li data-tone={condition.tone}>
                <span>{String(index + 1).padStart(2, '0')} · {condition.label}</span>
                <strong>{condition.title}</strong>
                <p>{condition.detail}</p>
              </li>
            {/each}
          </ol>
        {/if}

        <a class="course-panel" href={`/paths/${path.id}`}>
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
      {:else}
        <PerformanceProofStrip items={courseProofItems} ariaLabel="Course proof artifacts" />
      {/if}
    {/snippet}
  </PerformanceNarrativeStage>

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

  .course-panel {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
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

  @media (max-width: 640px) {
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
