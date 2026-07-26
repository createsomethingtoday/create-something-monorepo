<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  type WarmupOption = {
    value: string;
    label: string;
    benefit: string;
  };

  type SelectionKey = 'human' | 'ai' | 'system' | 'data' | 'constraints' | 'touchpoint';

  type WarmupDimension = {
    key: SelectionKey;
    eyebrow: string;
    title: string;
    prompt: string;
    options: WarmupOption[];
  };

  type ReadinessResult = {
    level: 'Needs shape' | 'Ready to map' | 'Pilot candidate' | 'Control layer candidate';
    slug: string;
    score: number;
    intent: 'governance-checklist' | 'workflow-teardown' | 'workflow-mapping';
    lane: 'workflow_infrastructure' | 'reliability_and_control' | 'not_sure';
    reason: string;
    nextStep: string;
  };

  export let bookingHref = agencyCoreMessaging.workflowMappingSessionHref;

  const storageKey = 'create-something:workflow-mapping-warmup';
  const draftStorageKey = 'create-something:workflow-mapping-warmup-draft';

  let workflowName = '';
  let owner = '';
  let nextDecision = '';
  let copyState = '';
  let saveState = 'Not saved yet';
  let draftRestored = false;
  let summary = '';
  let readiness: ReadinessResult = {
    level: 'Needs shape',
    slug: 'needs-shape',
    score: 0,
    intent: 'governance-checklist',
    lane: 'not_sure',
    reason: 'Name the workflow, owner, and first decision before implementation pressure.',
    nextStep: 'Use the control checklist to shape the first map.'
  };
  let selections = {
    human: [] as string[],
    ai: [] as string[],
    system: [] as string[],
    data: [] as string[],
    constraints: [] as string[],
    touchpoint: [] as string[]
  };

  const dimensions: WarmupDimension[] = [
    {
      key: 'human',
      eyebrow: 'Human tasks',
      title: 'Who stays in the loop?',
      prompt: 'Choose where human judgment still matters.',
      options: [
        { value: 'review', label: 'Review and approve', benefit: 'clear approval authority' },
        { value: 'edit', label: 'Edit or refine', benefit: 'better final output' },
        { value: 'validate', label: 'Validate data', benefit: 'fewer bad records' },
        { value: 'stop', label: 'Stop or escalate', benefit: 'visible risk handoff' }
      ]
    },
    {
      key: 'ai',
      eyebrow: 'AI tasks',
      title: 'What can AI safely help with?',
      prompt: 'Pick the first bounded capability to test.',
      options: [
        { value: 'classify', label: 'Classify', benefit: 'faster triage' },
        { value: 'draft', label: 'Draft', benefit: 'less blank-page work' },
        { value: 'verify', label: 'Verify', benefit: 'more defensible decisions' },
        { value: 'summarize', label: 'Summarize', benefit: 'shorter review loops' }
      ]
    },
    {
      key: 'system',
      eyebrow: 'System operations',
      title: 'What should the system handle?',
      prompt: 'Name the operations that keep the workflow reliable.',
      options: [
        { value: 'route', label: 'Route work', benefit: 'less manual dispatch' },
        { value: 'log', label: 'Log evidence', benefit: 'cleaner receipts' },
        { value: 'store', label: 'Store state', benefit: 'recoverable progress' },
        { value: 'notify', label: 'Notify owner', benefit: 'fewer silent misses' }
      ]
    },
    {
      key: 'data',
      eyebrow: 'Data artifacts',
      title: 'What records move through the path?',
      prompt: 'Choose the artifacts that need to stay visible.',
      options: [
        { value: 'source-record', label: 'Source record', benefit: 'shared context' },
        { value: 'draft', label: 'Generated draft', benefit: 'reviewable work' },
        { value: 'approval', label: 'Approval receipt', benefit: 'accountable decisions' },
        { value: 'private-evidence', label: 'Private evidence', benefit: 'safe proof' }
      ]
    },
    {
      key: 'constraints',
      eyebrow: 'Constraints',
      title: 'What can make the workflow unsafe?',
      prompt: 'Pick the limits that should shape the first build.',
      options: [
        { value: 'privacy', label: 'Privacy', benefit: 'less data exposure' },
        { value: 'accuracy', label: 'Accuracy', benefit: 'higher trust threshold' },
        { value: 'credentials', label: 'Credentials', benefit: 'clean access boundary' },
        { value: 'cost', label: 'Cost or latency', benefit: 'better operating fit' }
      ]
    },
    {
      key: 'touchpoint',
      eyebrow: 'Touchpoints',
      title: 'Where should people inspect it?',
      prompt: 'Choose where the decision should show up.',
      options: [
        { value: 'substrate', label: 'Substrate', benefit: 'owned operator surface' },
        { value: 'client-app', label: 'Client app', benefit: 'existing team surface' },
        { value: 'linear', label: 'Linear', benefit: 'issue evidence' },
        { value: 'custom', label: 'Custom page', benefit: 'client-safe proof' }
      ]
    }
  ];

  function toggleSelection(key: SelectionKey, value: string) {
    const current = selections[key];
    selections = {
      ...selections,
      [key]: current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    };
  }

  function labelsFor(key: SelectionKey) {
    const dimension = dimensions.find((item) => item.key === key);
    if (!dimension) return [];

    return selections[key]
      .map((value) => dimension.options.find((option) => option.value === value)?.label)
      .filter(Boolean) as string[];
  }

  function lineFor(label: string, values: string[], fallback: string) {
    return `${label}: ${values.length ? values.join(', ') : fallback}`;
  }

  function countMatches(values: string[], targets: string[]) {
    return values.filter((value) => targets.includes(value)).length;
  }

  function getReadinessResult(): ReadinessResult {
    const namedFields = [workflowName.trim(), owner.trim(), nextDecision.trim()].filter(Boolean);
    const selectedValues = Object.values(selections).flat();
    const selectedDimensionCount = dimensions.filter(
      (dimension) => selections[dimension.key].length > 0
    ).length;
    const selectedOptionCount = selectedValues.length;
    const fieldScore = namedFields.length * 14;
    const dimensionScore = selectedDimensionCount * 6;
    const optionScore = Math.min(28, selectedOptionCount * 3);
    const ownerBonus = owner.trim() ? 8 : 0;
    const decisionBonus = nextDecision.trim() ? 8 : 0;
    const score = Math.min(
      100,
      fieldScore + dimensionScore + optionScore + ownerBonus + decisionBonus
    );
    const riskSignals =
      selections.constraints.length +
      countMatches(selections.human, ['review', 'stop']) +
      countMatches(selections.data, ['approval', 'private-evidence']) +
      countMatches(selections.system, ['log', 'store']);

    if (score < 35) {
      return {
        level: 'Needs shape',
        slug: 'needs-shape',
        score,
        intent: 'governance-checklist',
        lane: 'not_sure',
        reason:
          'The workflow is still missing enough owner, state, or risk context to scope safely.',
        nextStep: 'Use the control checklist before asking for implementation.'
      };
    }

    if (riskSignals >= 5 && selectedDimensionCount >= 4) {
      return {
        level: 'Control layer candidate',
        slug: 'control-layer-candidate',
        score,
        intent: 'workflow-mapping',
        lane: 'reliability_and_control',
        reason:
          'The map already includes approvals, private evidence, constraints, or recovery needs.',
        nextStep: 'Map the control layer around the first live workflow.'
      };
    }

    if (score >= 72 && owner.trim() && nextDecision.trim() && selectedDimensionCount >= 5) {
      return {
        level: 'Pilot candidate',
        slug: 'pilot-candidate',
        score,
        intent: 'workflow-mapping',
        lane: 'workflow_infrastructure',
        reason:
          'The workflow has a named owner, decision point, and enough signals for a first safe run.',
        nextStep: 'Use the map as booking context for a workflow pilot.'
      };
    }

    return {
      level: 'Ready to map',
      slug: 'ready-to-map',
      score,
      intent: 'workflow-teardown',
      lane: 'not_sure',
      reason:
        'There is enough shape to discuss the workflow, but the implementation path should be chosen after mapping.',
      nextStep: 'Request a workflow map before choosing the build path.'
    };
  }

  function buildSummary() {
    const readinessResult = getReadinessResult();
    const lines = [
      'Atlas warmup summary',
      `Workflow: ${workflowName.trim() || 'Not named yet'}`,
      `Owner / approver: ${owner.trim() || 'Not named yet'}`,
      `Readiness: ${readinessResult.level} (${readinessResult.score}/100)`,
      `Recommended next step: ${readinessResult.nextStep}`,
      lineFor('Human task', labelsFor('human'), 'Not selected yet'),
      lineFor('AI task', labelsFor('ai'), 'Not selected yet'),
      lineFor('System operation', labelsFor('system'), 'Not selected yet'),
      lineFor('Data artifact', labelsFor('data'), 'Not selected yet'),
      lineFor('Constraint', labelsFor('constraints'), 'Not selected yet'),
      lineFor('Touchpoint', labelsFor('touchpoint'), 'Not selected yet'),
      `Next decision: ${nextDecision.trim() || 'Not named yet'}`
    ];

    return lines.join('\n');
  }

  function buildDraft() {
    return {
      workflowName,
      owner,
      nextDecision,
      selections
    };
  }

  function saveWarmup() {
    if (!browser) return;
    window.localStorage.setItem(storageKey, buildSummary());
    window.localStorage.setItem(draftStorageKey, JSON.stringify(buildDraft()));
    saveState = 'Autosaved';
  }

  async function copySummary() {
    const summary = buildSummary();
    saveWarmup();

    if (!browser || !navigator.clipboard) {
      copyState = 'Saved for booking';
      return;
    }

    try {
      await navigator.clipboard.writeText(summary);
      copyState = 'Copied and saved';
    } catch {
      copyState = 'Saved for booking';
    }
  }

  function resetWarmup() {
    workflowName = '';
    owner = '';
    nextDecision = '';
    copyState = '';
    selections = {
      human: [],
      ai: [],
      system: [],
      data: [],
      constraints: [],
      touchpoint: []
    };

    if (browser) {
      window.localStorage.removeItem(storageKey);
      window.localStorage.removeItem(draftStorageKey);
    }

    saveState = 'Cleared';
  }

  onMount(() => {
    const rawDraft = window.localStorage.getItem(draftStorageKey);
    if (!rawDraft) {
      draftRestored = true;
      saveState = window.localStorage.getItem(storageKey) ? 'Saved for booking' : 'Not saved yet';
      return;
    }

    try {
      const draft = JSON.parse(rawDraft) as Partial<ReturnType<typeof buildDraft>>;
      workflowName = draft.workflowName ?? '';
      owner = draft.owner ?? '';
      nextDecision = draft.nextDecision ?? '';
      selections = {
        human: Array.isArray(draft.selections?.human) ? draft.selections.human : [],
        ai: Array.isArray(draft.selections?.ai) ? draft.selections.ai : [],
        system: Array.isArray(draft.selections?.system) ? draft.selections.system : [],
        data: Array.isArray(draft.selections?.data) ? draft.selections.data : [],
        constraints: Array.isArray(draft.selections?.constraints)
          ? draft.selections.constraints
          : [],
        touchpoint: Array.isArray(draft.selections?.touchpoint) ? draft.selections.touchpoint : []
      };
      saveState = 'Draft restored';
    } catch {
      saveState = 'Not saved yet';
    } finally {
      draftRestored = true;
    }
  });

  $: {
    workflowName;
    owner;
    nextDecision;
    selections;
    summary = buildSummary();
    readiness = getReadinessResult();
  }
  $: selectedDimensionCount = dimensions.filter(
    (dimension) => selections[dimension.key].length > 0
  ).length;
  $: selectedOptionCount = Object.values(selections).reduce(
    (count, values) => count + values.length,
    0
  );
  $: hasWarmupInput = Boolean(
    workflowName.trim() || owner.trim() || nextDecision.trim() || selectedOptionCount
  );
  $: if (browser && draftRestored && hasWarmupInput && summary) {
    workflowName;
    owner;
    nextDecision;
    selections;
    saveWarmup();
  }
  $: bookingPath = bookingHref.split('?')[0] || '/book';
  $: warmupBookingHref = `${bookingPath}?source=atlas-warmup&intent=${readiness.intent}&lane=${readiness.lane}&warmup=atlas&readiness=${readiness.slug}&score=${readiness.score}`;
</script>

<div class="workflow-warmup" aria-label="Workflow mapping warmup">
  <div class="warmup-intake">
    <label>
      <span>Workflow</span>
      <input
        bind:value={workflowName}
        type="text"
        placeholder="Support recovery, recruiter review, release handoff..."
      />
    </label>
    <label>
      <span>Owner or approver</span>
      <input
        bind:value={owner}
        type="text"
        placeholder="Account owner, recruiter, PM, operator..."
      />
    </label>
    <label>
      <span>Next decision</span>
      <input
        bind:value={nextDecision}
        type="text"
        placeholder="Pilot, approve access, stop, hand off, or escalate..."
      />
    </label>
  </div>

  <div class="warmup-grid">
    {#each dimensions as dimension}
      <section class="dimension" aria-labelledby={`warmup-${dimension.key}`}>
        <span>{dimension.eyebrow}</span>
        <h3 id={`warmup-${dimension.key}`}>{dimension.title}</h3>
        <p>{dimension.prompt}</p>
        <div class="option-list" role="list">
          {#each dimension.options as option}
            <button
              type="button"
              class:selected={selections[dimension.key].includes(option.value)}
              aria-pressed={selections[dimension.key].includes(option.value)}
              onclick={() => toggleSelection(dimension.key, option.value)}
            >
              <strong>{option.label}</strong>
              <small>{option.benefit}</small>
            </button>
          {/each}
        </div>
      </section>
    {/each}
  </div>

  <section class="warmup-summary" aria-label="Workflow warmup summary">
    <div>
      <span>Onboarding artifact</span>
      <h3>Your first map becomes booking context.</h3>
      <p>
        Your progress autosaves in this browser and attaches to the booking notes when you continue
        into the mapping session.
      </p>
      <div class="warmup-progress" aria-label="Workflow warmup progress">
        <strong>{selectedDimensionCount}/6 dimensions mapped</strong>
        <small>{selectedOptionCount} selected signals · {saveState}</small>
      </div>
      <div class="warmup-result" aria-live="polite">
        <span>Readiness result</span>
        <strong>{readiness.level}</strong>
        <p>{readiness.reason}</p>
        <small>Recommended: {readiness.nextStep}</small>
      </div>
    </div>
    <pre>{summary}</pre>
    <div class="warmup-actions">
      <button type="button" onclick={copySummary}>{copyState || 'Copy summary'}</button>
      <a href={warmupBookingHref} onclick={saveWarmup}>Use this in booking</a>
      <button type="button" class="warmup-reset" onclick={resetWarmup}>Reset map</button>
    </div>
  </section>
</div>

<style>
  .workflow-warmup {
    display: grid;
    gap: 1rem;
  }

  .warmup-intake {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .warmup-intake label,
  .dimension,
  .warmup-summary {
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: 8px;
    background: var(--color-performance-panel, #ffffff);
    box-shadow: 0 12px 30px rgba(10, 14, 25, 0.04);
  }

  .warmup-intake label {
    display: grid;
    gap: 0.45rem;
    padding: 0.9rem;
  }

  .warmup-intake span,
  .dimension > span,
  .warmup-summary span {
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .warmup-intake input {
    min-width: 0;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: 6px;
    background: var(--color-performance-paper, #f3f3f0);
    color: var(--color-performance-ink, #090909);
    font: inherit;
    padding: 0.75rem;
  }

  .warmup-intake input:focus {
    border-color: var(--color-performance-signal-soft, #dce8f5);
    outline: 2px solid color-mix(in srgb, var(--color-performance-signal-soft, #dce8f5) 38%, transparent);
    outline-offset: 2px;
  }

  .warmup-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .dimension {
    display: grid;
    gap: 0.75rem;
    padding: 1rem;
  }

  .dimension h3,
  .warmup-summary h3 {
    margin: 0;
    color: var(--color-performance-ink, #090909);
    font-size: clamp(1rem, 1.4vw, 1.2rem);
    letter-spacing: 0;
    line-height: 1.2;
  }

  .dimension p,
  .warmup-summary p {
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.92rem;
    line-height: 1.5;
  }

  .warmup-progress {
    display: grid;
    gap: 0.2rem;
    margin-top: 0.85rem;
    padding: 0.75rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: 6px;
    background: var(--color-performance-paper, #f3f3f0);
  }

  .warmup-result {
    display: grid;
    gap: 0.35rem;
    margin-top: 0.75rem;
    padding: 0.75rem;
    border: 1px solid color-mix(in srgb, var(--color-performance-growth-soft, #dcece5) 68%, #9c9c96);
    border-radius: 6px;
    background: color-mix(in srgb, var(--color-performance-growth-soft, #dcece5) 22%, #ffffff);
  }

  .warmup-result strong {
    color: var(--color-performance-ink, #090909);
    font-size: 1rem;
    line-height: 1.25;
  }

  .warmup-result small {
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.78rem;
    line-height: 1.4;
  }

  .warmup-progress strong {
    color: var(--color-performance-ink, #090909);
    font-size: 0.9rem;
  }

  .warmup-progress small {
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.78rem;
    line-height: 1.4;
  }

  .option-list {
    display: grid;
    gap: 0.45rem;
  }

  .option-list button {
    display: grid;
    gap: 0.2rem;
    width: 100%;
    min-height: 4rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: 6px;
    background: var(--color-performance-paper, #f3f3f0);
    color: var(--color-performance-ink, #090909);
    cursor: pointer;
    font: inherit;
    padding: 0.7rem;
    text-align: left;
    transition:
      border-color 160ms ease,
      background 160ms ease,
      transform 160ms ease;
  }

  .option-list button:hover,
  .option-list button:focus-visible,
  .option-list button.selected {
    border-color: color-mix(in srgb, var(--color-performance-signal-soft, #dce8f5) 72%, #090909);
    background: color-mix(in srgb, var(--color-performance-signal-soft, #dce8f5) 18%, #ffffff);
    outline: none;
    transform: translateY(-1px);
  }

  .option-list strong {
    font-size: 0.92rem;
    line-height: 1.2;
  }

  .option-list small {
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.78rem;
    line-height: 1.3;
  }

  .warmup-summary {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.3fr);
    gap: 1rem;
    align-items: start;
    padding: 1rem;
  }

  .warmup-summary pre {
    max-height: 16rem;
    overflow: auto;
    margin: 0;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: 6px;
    background: var(--color-performance-paper, #f3f3f0);
    color: var(--color-performance-ink, #090909);
    font:
      0.78rem/1.55 ui-monospace,
      SFMono-Regular,
      Menlo,
      Monaco,
      Consolas,
      monospace;
    padding: 0.85rem;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .warmup-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    grid-column: 1 / -1;
  }

  .warmup-actions button,
  .warmup-actions a {
    display: inline-flex;
    min-height: 2.75rem;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    border: 1px solid var(--color-performance-ink, #090909);
    font: inherit;
    font-weight: 700;
    padding: 0.7rem 1rem;
    text-decoration: none;
  }

  .warmup-actions button {
    background: transparent;
    color: var(--color-performance-ink, #090909);
    cursor: pointer;
  }

  .warmup-actions .warmup-reset {
    border-color: var(--color-performance-line-strong, #9c9c96);
  }

  .warmup-actions a {
    background: var(--color-performance-ink, #090909);
    color: #ffffff;
  }

  @media (max-width: 980px) {
    .warmup-intake,
    .warmup-grid,
    .warmup-summary {
      grid-template-columns: 1fr;
    }
  }
</style>
