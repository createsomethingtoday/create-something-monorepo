<script lang="ts">
  import { onMount, tick } from 'svelte';
  import Button from '../components/Button.svelte';
  import TextArea from '../components/form/TextArea.svelte';
  import Checkbox from '../components/form/Checkbox.svelte';
  import Alert from '../components/feedback/Alert.svelte';
  import CanonCompanion from '../character/CanonCompanion.svelte';
  import { initialState, transition, tasks, type Event, type Task, type Step } from './workflow';

  let { onstep }: { onstep?: (step: Step) => void } = $props();
  const uid = $props.id();
  let workflow = $state(initialState());
  let heading: HTMLHeadingElement;
  let fail = $state(false);
  let draft = $state('');
  let editing = $state(false);
  let ready = $state(false);
  onMount(() => {
    ready = true;
  });

  async function send(event: Event) {
    const before = workflow.step;
    workflow = transition(workflow, event);
    if (event.type === 'reset') {
      fail = false;
      draft = '';
      editing = false;
    }
    if (workflow.step === 'review' && before !== 'review') {
      draft = workflow.draft;
      editing = false;
    }
    if (before !== workflow.step) {
      onstep?.(workflow.step);
      await tick();
      heading?.focus();
    }
  }
  async function edit() {
    editing = true;
    await tick();
    document.getElementById(`${uid}-draft`)?.focus();
  }
  async function finish() {
    await send(fail ? { type: 'fail' } : { type: 'finish' });
  }
  const titles: Record<Step, string> = {
    welcome: 'A useful first step, together.',
    task: 'What could use a hand?',
    scope: 'Here is what Canon can use.',
    plan: 'A small plan to get started.',
    working: 'Making room for the next step.',
    failed: 'Let’s pick up where we left off.',
    review: 'A draft for your eyes.',
    receipt: 'Reviewed and ready to keep.'
  };
  const phase = $derived(
    ['task', 'scope'].includes(workflow.step)
      ? 0
      : ['plan', 'working', 'failed'].includes(workflow.step)
        ? 1
        : 2
  );
</script>

<section
  class="cn-workbench"
  class:cn-workbench--welcome={workflow.step === 'welcome'}
  aria-label="Sample journey"
>
  <div class="cn-journey-meta">
    <span>A fictional task, from start to handback</span><span>Try it together</span>
  </div>
  {#if workflow.step !== 'welcome'}
    <ol class="cn-progress" aria-label="Journey progress">
      {#each ['Choose', 'Prepare', 'Review'] as label, index}
        <li aria-current={index === phase ? 'step' : undefined} class:complete={index < phase}>
          {label}
        </li>
      {/each}
    </ol>
  {/if}
  <div class="cn-introduction" class:cn-introduction--welcome={workflow.step === 'welcome'}>
    <div class="cn-intro-copy">
      <h2 id={`${uid}-heading`} bind:this={heading} tabindex="-1">{titles[workflow.step]}</h2>
      {#if workflow.step === 'welcome'}
        <p class="cn-lede">
          Try turning a meeting into clear next steps. Canon prepares a draft; you decide what
          happens next.
        </p>
        <div class="actions">
          <Button variant="primary" disabled={!ready} onclick={() => send({ type: 'begin' })}
            >Try a meeting task <span aria-hidden="true">→</span></Button
          >
        </div>
        <p class="muted cn-small">A sample to explore. No accounts to connect.</p>
      {/if}
    </div>
    {#if workflow.step === 'welcome'}
      <div class="cn-welcome-character"><CanonCompanion size={96} /></div>
    {/if}
  </div>

  {#if workflow.step === 'task'}
    <fieldset>
      <legend>Start with one useful thing.</legend>
      {#each Object.entries(tasks) as [key, task]}
        <label class="cn-task"
          ><input
            type="radio"
            name={`${uid}-task`}
            checked={workflow.task === key}
            onchange={() => send({ type: 'select', task: key as Task })}
          /><span><strong>{task.label}</strong><span class="muted">{task.description}</span></span
          ></label
        >
      {/each}
    </fieldset>
    <div class="actions">
      <Button variant="primary" onclick={() => send({ type: 'next' })}>Continue</Button>
    </div>
  {:else if workflow.step === 'scope'}
    <p>
      This example uses fictional notes. Canon can prepare a draft here; it cannot read your
      accounts or send messages.
    </p>
    <dl class="cn-facts">
      <div>
        <dt>Source</dt>
        <dd>A fictional pilot meeting</dd>
      </div>
      <div>
        <dt>Allowed</dt>
        <dd>Prepare one draft</dd>
      </div>
      <div>
        <dt>Stops at</dt>
        <dd>Your review</dd>
      </div>
    </dl>
    <Checkbox
      label="Use the fictional notes for this sample"
      checked={workflow.allowed}
      onchange={(e) => send({ type: 'scope', allowed: e.currentTarget.checked })}
    />
    <div class="actions">
      <Button variant="primary" disabled={!workflow.allowed} onclick={() => send({ type: 'next' })}
        >See the plan</Button
      >
    </div>
  {:else if workflow.step === 'plan'}
    <p>{tasks[workflow.task].label}, with a clear place to pause.</p>
    <ol class="cn-plan">
      <li>Read the sample meeting notes.</li>
      <li>Prepare a useful draft.</li>
      <li>Bring it back for your review.</li>
    </ol>
    <Checkbox label="Explore what happens if a step fails" bind:checked={fail} />
    <div class="actions">
      <Button variant="primary" onclick={() => send({ type: 'start' })}>Start simulation</Button>
    </div>
  {:else if workflow.step === 'working'}
    <Alert title="A pause to look around"
      >This example stays on each step until you continue. No background work is running.</Alert
    >
    <div class="actions">
      <Button variant="primary" onclick={finish}>Continue simulation</Button>
    </div>
  {:else if workflow.step === 'failed'}
    <Alert variant="error" title="The simulated connection stopped"
      >Your draft is still here. Retry using the saved sample.</Alert
    >
    <div class="actions">
      <Button
        variant="primary"
        onclick={() => {
          fail = false;
          send({ type: 'retry' });
        }}>Retry saved sample</Button
      >
    </div>
  {:else if workflow.step === 'review'}
    <p>Read it through, edit anything you need, then record your approval. Nothing will be sent.</p>
    {#if editing}
      <TextArea
        id={`${uid}-draft`}
        label="Proposed draft"
        rows={7}
        bind:value={draft}
        error={!draft.trim() ? 'Add some text before approving.' : ''}
        description="Edits stay in this sample until you discard it or leave the page."
      />
    {:else}
      <div class="cn-draft">
        <p class="cn-draft-label">{tasks[workflow.task].label}</p>
        <blockquote>{draft}</blockquote>
      </div>
    {/if}
    <div class="actions">
      <Button
        variant="primary"
        disabled={!draft.trim()}
        onclick={() => {
          workflow = transition(workflow, { type: 'edit', draft });
          send({ type: 'approve' });
        }}>Record approval</Button
      >{#if !editing}<Button variant="secondary" onclick={edit}>Edit draft</Button>{/if}
    </div>
    <p class="muted cn-small">Creates a sample receipt here. No message or account changes.</p>
  {:else if workflow.step === 'receipt'}
    <Alert variant="success" title="Sample approval recorded"
      >You reviewed this draft. The receipt stays on this page until you start again or leave.</Alert
    >
    <blockquote>{workflow.draft}</blockquote>
    <Button variant="primary" onclick={() => send({ type: 'reset' })}>Try another task</Button>
  {/if}
  {#if workflow.step !== 'welcome' && workflow.step !== 'receipt'}
    <div class="cn-leave">
      <Button variant="ghost" onclick={() => send({ type: 'reset' })}
        >{workflow.draft ? 'Discard sample' : 'Back to start'}</Button
      ><span class="muted cn-small"
        >{workflow.draft ? 'Clears this sample and any edits.' : 'No work has been approved.'}</span
      >
    </div>
  {/if}
  <noscript
    ><div class="cn-notice">
      <strong>This sample needs JavaScript to run.</strong>
      <p>
        You can still explore the design system below. The example prepares fictional notes, asks
        for review, and makes a sample receipt. It never connects to an account.
      </p>
    </div></noscript
  >
</section>
