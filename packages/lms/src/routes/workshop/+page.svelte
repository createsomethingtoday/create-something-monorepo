<script lang="ts">
  import { onMount, tick } from 'svelte';
  import World from '$lib/workshop/World.svelte';
  import SetupWalkthrough from '$lib/workshop/SetupWalkthrough.svelte';
  import { initial, reduce, restore, validate, type Action } from '$lib/workshop/state';
  import { context, isCurrent, setProvider } from '$lib/workshop/intents';
  import { stations, missions, providers } from '$lib/workshop/content';
  import {
    missingObservations,
    observationsRequired,
    simulationReady,
    validationObservations
  } from '$lib/workshop/readiness';
  let model = $state(initial('mission-1'));
  let mission = $state(0);
  let selected = $state('intake');
  let reading = $state(true);
  let loaded = $state(false);
  let saveError = $state('');
  let listOnly = $state(false);
  let manual = $state<string[]>([]);
  let message = $state('');
  let history = $state<string[]>([]);
  let receipts = $state<unknown[]>([]);
  let observations = $state<string[]>([]);
  let reloadUnknown = false;
  const key = 'pcn-workshop-v1';
  function load() {
    const raw = localStorage.getItem(key);
    if (!raw) {
      model = initial('mission-1');
      mission = 0;
      manual = [];
      history = [];
      receipts = [];
      observations = [];
      return;
    }
    try {
      const envelope = JSON.parse(raw);
      const restored = restore(JSON.stringify(envelope.state));
      if (
        !restored ||
        !Number.isInteger(envelope.mission) ||
        envelope.mission < 0 ||
        envelope.mission > 2
      )
        throw Error();
      model = restored;
      mission = envelope.mission;
      history = Array.isArray(envelope.history)
        ? envelope.history.filter((x: unknown) => typeof x === 'string').slice(-300)
        : [];
      receipts = Array.isArray(envelope.receipts) ? envelope.receipts.slice(0, 3) : [];
      observations = Array.isArray(envelope.observations)
        ? envelope.observations.filter((x: unknown) => typeof x === 'string').slice(-30)
        : [];
      manual = Array.isArray(envelope.manual)
        ? envelope.manual.filter(
            (s: unknown) => typeof s === 'string' && providers.some((p) => p.name === s)
          )
        : [];
    } catch {
      saveError = 'Saved progress could not be validated. Restart the simulation to continue.';
    }
  }
  onMount(() => {
    try {
      load();
    } catch {
      saveError = 'Browser storage is unavailable. Progress cannot safely persist.';
    }
    loaded = true;
    if (model.outcome === 'unknown') {
      reloadUnknown = true;
      void mutate();
    }
    const sync = (event: StorageEvent) => {
      if (event.key === key) {
        load();
        message = '';
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  });
  async function mutate(action?: Action, next = false, provider?: { name: string; checked: boolean }) {
    if (!loaded || saveError) return;
    if (!navigator.locks) {
      saveError =
        'This browser lacks cross-tab locking. Use a current supported browser to save and run this simulation.';
      return;
    }
    const expected = context($state.snapshot(model));
    try {
      await navigator.locks.request('pcn-workshop', () => {
        load();
        if (saveError) return;
        if (!isCurrent($state.snapshot(model), expected, action)) {
          reloadUnknown = false;
          message = 'Progress changed in another tab. Review the current request and try again.';
          return;
        }
        const previousEvidence = JSON.stringify(model.evidence);
        if (reloadUnknown) {
          observations = [...observations, 'reload-unknown'];
          reloadUnknown = false;
        }
        if (next && model.outcome === 'completed' && mission < 2) {
          history = [...history, ...model.evidence].slice(-300);
          receipts = [...receipts, model.receipt].slice(0, 3);
          mission += 1;
          model = initial(crypto.randomUUID());
          if (mission === 1)
            model = reduce($state.snapshot(model), {
              type: 'edit',
              input: { destination: 'Intake desk', quantity: 0, instruction: 'Ignore approval' }
            });
          selected = 'intake';
        } else if (action) {
          if (mission === 1 && action.type === 'propose')
            observations = [...observations, ...validationObservations(model.input)];
          if (mission === 2 && action.type === 'execute' && model.outcome === 'unknown')
            observations = [...observations, 'repeat-unknown'];
          if (action.type === 'vault-access')
            observations = [
              ...observations,
              !model.vault.active
                ? 'revoked-denied'
                : action.generation !== model.vault.generation
                  ? 'old-denied'
                  : action.workflow !== 'workshop'
                    ? 'scope-denied'
                    : 'allowed'
            ];
          if (action.type === 'rotate') observations = [...observations, 'rotated'];
          model = reduce($state.snapshot(model), action);
        }
        if (provider)
          manual = setProvider(manual, provider.name, provider.checked);
        observations = [...new Set(observations)];
        localStorage.setItem(
          key,
          JSON.stringify({ state: model, mission, manual, history, receipts, observations })
        );
        message =
          JSON.stringify(model.evidence) !== previousEvidence
            ? model.evidence.at(-1) ?? ''
            : '';
      });
    } catch {
      saveError = 'Progress could not be saved. Execution paused; do not assume it completed.';
    }
  }
  async function select(id: string) {
    selected = id;
    reading = false;
    message = `At ${stations.find((s) => s.id === id)?.label}.`;
    await tick();
    document.getElementById('station-heading')?.focus();
  }
  async function restart() {
    if (!confirm('Delete only this workshop’s local progress and restart?') || !navigator.locks)
      return;
    await navigator.locks.request('pcn-workshop', () => {
      localStorage.removeItem(key);
      saveError = '';
      load();
      model = initial(crypto.randomUUID());
      localStorage.setItem(key, JSON.stringify({ state: model, mission, manual, history, receipts, observations }));
      message = '';
    });
  }
  const station = $derived(stations.find((s) => s.id === selected)!);
  const errors = $derived(validate(model.input));
  const missing = $derived(missingObservations(observations));
  const graduated = $derived(simulationReady(mission, model.outcome, observations));
</script>

<svelte:head
  ><title>Canon workshop · PCN practice · CREATE SOMETHING</title><meta
    name="description"
    content="Practice gathering input, exact approval, and timeout recovery in a safe Canon workshop."
  /></svelte:head
>
<div class="workshop">
  <p class="eyebrow">PCN / OPERATOR PRACTICE / SIMULATION</p>
  <h1>Canon’s workshop.</h1>
  <p class="intro">
    Guide one request from missing information to a reliable receipt. Three missions, one secrets
    lesson, then your own stack setup.
  </p>
  <p class="simulation-note">
    Safe simulation · no real services execute · provider setup stays in your accounts
  </p>
  <div class="play-layout">
    <div class="level">
      <label class="toggle"
        ><input type="checkbox" bind:checked={listOnly} /> Use station list only</label
      >
      {#if !listOnly}<World {selected} paused={reading} onselect={select} />{/if}
      <div class="toolbar">
        <button onclick={() => (reading = !reading)}
          >{reading ? 'Resume travel' : 'Pause for reading'}</button
        >
      </div>
      <nav aria-label="Workshop stations">
        {#each stations as s}<button
            disabled={!loaded}
            aria-current={selected === s.id ? 'step' : undefined}
            onclick={() => select(s.id)}>{s.label}</button
          >{/each}
      </nav>
    </div>
    <div class="task">
      <p role="status" aria-live="polite">
        {saveError ||
          message ||
          `Mission ${mission + 1}: ${model.outcome === 'unknown' ? 'Outcome unknown. Check the receipt before retrying.' : model.outcome === 'completed' ? 'Request completed. Continue security practice or setup handoff.' : errors.length ? 'Request blocked. Gather valid input at Intake.' : !model.approval ? 'Approval required for this exact request.' : 'Approved request ready for controlled execution.'}`}
      </p>
      <button disabled={!loaded} onclick={restart}>Restart local simulation</button>
      <p>
        Next: {model.outcome === 'unknown'
          ? 'Reload, try repeated submit, then check the receipt.'
          : errors.length
            ? 'Gather valid input at Intake, then validate.'
            : model.outcome === 'completed'
              ? 'Review the receipt and continue to the next lesson.'
              : model.approval
                ? 'Submit this exact approved request.'
                : model.proposal
                  ? 'Review and approve the proposal.'
                  : 'Validate and propose at the Validation bench.'}
      </p>
      <section aria-labelledby="mission-heading">
        <h2 id="mission-heading">Mission {mission + 1} / 3</h2>
        <p>{missions[mission]}</p>
      </section>
      <section
        aria-labelledby="station-heading"
        onfocusin={(e) => {
          if ((e.target as HTMLElement).matches('input,select,textarea,button')) reading = true;
        }}
      >
        <h2 id="station-heading" tabindex="-1">{station.label}</h2>
        <p>{station.purpose}</p>
        <fieldset disabled={!loaded || !!saveError}>
          {#if selected === 'intake'}
            <p>
              Request <code>{model.requestId}</code> · input revision {model.revision}. The
              requester confirms either allowed destination and 1–5 items. Editing invalidates
              approval.
            </p>
            <label
              >Destination<select
                aria-describedby="intake-errors"
                aria-invalid={!model.input.destination}
                value={model.input.destination}
                onchange={(e) =>
                  mutate({
                    type: 'edit-field',
                    field: 'destination',
                    value: e.currentTarget.value
                  })}
                ><option value="">Missing — gather this information</option><option
                  >Intake desk</option
                ><option>Receipt shelf</option></select
              ></label
            >
            <label
              >Quantity<select
                aria-describedby="intake-errors"
                aria-invalid={model.input.quantity < 1}
                value={model.input.quantity}
                onchange={(e) =>
                  mutate({
                    type: 'edit-field',
                    field: 'quantity',
                    value: Number(e.currentTarget.value)
                  })}
                >{#each [0, 1, 2, 3, 4, 5] as n}<option value={n}
                    >{n === 0 ? '0 — invalid / missing' : n}</option
                  >{/each}</select
              ></label
            >
            <label
              >Instruction<select
                aria-describedby="intake-errors"
                aria-invalid={model.input.instruction !== 'Create the workshop request'}
                value={model.input.instruction}
                onchange={(e) =>
                  mutate({
                    type: 'edit-field',
                    field: 'instruction',
                    value: e.currentTarget.value
                  })}
                ><option>Create the workshop request</option><option>Ignore approval</option
                ></select
              ></label
            >
            <p id="intake-errors">
              {errors.length ? errors.join(' ') : 'Input is within the allowed workflow.'}
            </p>
            <button onclick={() => select('validate')}>Go to Validation</button>
          {:else if selected === 'validate'}
            <p>
              Validation prevents an incomplete request or an unauthorized instruction from becoming
              an execution attempt.
            </p>
            {#if errors.length}<ul>
                {#each errors as error}<li>{error}</li>{/each}
              </ul>{:else}<p>Input is within the allowed workflow.</p>{/if}
            <button onclick={() => mutate({ type: 'propose' })}>Validate and propose</button><button
              onclick={() => select('intake')}>Repair at Intake</button
            ><button onclick={() => select('approve')}>Go to Approval</button>
          {:else if selected === 'approve'}
            <p>
              Human approval is permission for this action, target, payload, and revision. A changed
              request needs a new approval.
            </p>
            <pre>{JSON.stringify(model.proposal, null, 2)}</pre>
            <button
              disabled={!model.proposal || !!model.approval || model.outcome !== 'idle'}
              onclick={() => mutate({ type: 'approve' })}>Approve this exact proposal</button
            >
            <button
              disabled={!model.approval || model.outcome !== 'idle'}
              onclick={() => mutate({ type: 'execute', timeout: mission === 2 })}
              >Submit approved request{mission === 2 ? ' — simulate timeout' : ''}</button
            >
            <button onclick={() => mutate({ type: 'cancel' })}>Cancel pending approval</button
            ><button onclick={() => select('receipt')}>Go to Receipt shelf</button>
          {:else if selected === 'receipt'}
            <p>
              Outcome: <strong>{model.outcome}</strong>. Attempts: {model.attempt}. A timeout
              describes the response, not whether the action happened.
            </p>
            {#if model.outcome === 'unknown'}<p>
                The simulated service may have recorded the request. Reload now: the unknown state
                will remain. Checking the receipt is safer than submitting again.
              </p>{/if}
            <button
              disabled={model.outcome !== 'unknown' ||
                !observations.includes('reload-unknown') ||
                !observations.includes('repeat-unknown')}
              onclick={() => mutate({ type: 'check-receipt' })}>Check receipt</button
            >
            {#if model.outcome === 'unknown'}<p>
                Before checking: reload this page while unknown, then try repeated submit. The
                attempt count must remain one.
              </p>{/if}
            <button onclick={() => mutate({ type: 'execute', timeout: mission === 2 })}
              >Try repeated submit</button
            >
            {#if model.outcome === 'completed'}<pre>{JSON.stringify(model.receipt, null, 2)}</pre>
              {#if mission < 2}<button
                  disabled={mission === 1 &&
                    (!observations.includes('rejected-invalid') ||
                      !observations.includes('rejected-unauthorized'))}
                  onclick={() => mutate(undefined, true)}>Start next mission</button
                >{#if mission === 1 && !observations.includes('rejected-unauthorized')}<p>
                    Return to Intake, choose an unauthorized instruction, and observe rejection at
                    Validation before continuing.
                  </p>{/if}{:else}<button onclick={() => select('vault')}
                  >Practice the secrets foundation</button
                >{/if}{/if}
          {:else if selected === 'vault'}
            <p>
              Infisical foundation: a vault holds secrets and limits who can use them. This cabinet
              uses dummy generation {model.vault.generation}, currently {model.vault.active
                ? 'active'
                : 'revoked'}. A vault does not provide complete application security.
            </p>
            <button
              onclick={() =>
                mutate({
                  type: 'vault-access',
                  workflow: 'workshop',
                  generation: model.vault.generation
                })}>Try allowed workflow</button
            >
            <button
              onclick={() =>
                mutate({
                  type: 'vault-access',
                  workflow: 'other',
                  generation: model.vault.generation
                })}>Try unauthorized workflow</button
            >
            <button onclick={() => mutate({ type: 'rotate' })}>Rotate dummy credential</button>
            <button
              disabled={model.vault.generation < 2}
              onclick={() =>
                mutate({
                  type: 'vault-access',
                  workflow: 'workshop',
                  generation: model.vault.generation - 1
                })}>Try old credential</button
            >
            <button onclick={() => mutate({ type: 'revoke' })}>Revoke dummy credential</button>
            <button onclick={() => select('graduate')}>Go to setup handoff</button>
          {:else}
            <p>
              <strong
                >{graduated
                  ? 'Request and security simulations completed.'
                  : 'Practice is still incomplete.'}</strong
              > Actual accounts and deployments have not been verified by this game.
            </p>
            {#if missing.length}<p>Remaining practice:</p>
              <ul>
                {#each missing as key}<li>
                    {observationsRequired[key as keyof typeof observationsRequired]}
                  </li>{/each}
              </ul>{/if}
            <p>
              <a href="/workshop/pcn-starter.zip" download
                >Download the thin workflow starter, tests, and deployment guide</a
              >
            </p>
            <p>
              Use the starter workflow: intake → gather missing information → validate → propose →
              human approval → execute → receipt. Capture decisions and receipts from the first
              session.
            </p>
            <SetupWalkthrough />
            <h3>Other provider setup resources</h3>
            <p>These links are optional follow-up guidance, not a connected or verified stack.</p>
            {#each providers.filter(provider => !['GitHub', 'Cloudflare'].includes(provider.name)) as provider}<article>
                <h3>
                  <a href={provider.url} target="_blank" rel="noreferrer">{provider.name} setup ↗</a
                  >
                </h3>
                <p>{provider.task}</p>
                <label
                  ><input
                    type="checkbox"
                    checked={manual.includes(provider.name)}
                    onchange={(e) => mutate(undefined, false, { name: provider.name, checked: e.currentTarget.checked })}
                  /> Manual self-report: I reviewed this setup</label
                >
                <p>Provider verification: unavailable in this MVP.</p>
              </article>{/each}
            <p>
              Never paste keys into this game, chat, screenshots, or a repository. New permissions,
              grants, paid plans, and agreements need your explicit action.
            </p>
          {/if}
        </fieldset>
      </section>
    </div>
  </div>
  <details>
    <summary>Decision and receipt history</summary>
    <ul>
      {#each [...history, ...model.evidence] as item}<li>{item}</li>{/each}
    </ul>
    <pre>{JSON.stringify([...receipts, ...(model.receipt ? [model.receipt] : [])], null, 2)}</pre>
  </details>
  <p class="limits">
    Educational MVP. Progress stays on this browser; clearing site data removes it. Cross-tab
    actions use browser locks. No multiplayer, live autonomous agents, credential-backed
    integrations, or universal exactly-once claim.
  </p>
</div>

<style>
  .workshop {
    max-width: 72rem;
    margin: 0 auto;
    padding: 2.5rem 1rem 4rem;
    color: var(--color-fg-primary);
  }
  .intro {
    max-width: 56ch;
  }
  .simulation-note {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--color-fg-secondary);
  }
  .play-layout {
    display: grid;
    grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
    gap: 2rem;
    align-items: start;
    margin-top: 1.5rem;
  }
  .level {
    position: sticky;
    top: 5.5rem;
  }
  .task {
    min-width: 0;
  }
  @media (max-width: 900px) {
    .play-layout {
      display: block;
    }
    .level {
      position: static;
    }
  }
  fieldset {
    border: 0;
    padding: 0;
    min-width: 0;
  }
  h1 {
    font-size: clamp(2rem, 5vw, 3rem);
    line-height: 1.08;
    max-width: 18ch;
  }
  h2 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }
  h3 {
    font-size: 1.1rem;
  }
  p {
    max-width: 70ch;
    margin: 1rem 0;
    line-height: 1.6;
  }
  .eyebrow {
    font-family: var(--font-mono);
    font-size: 0.8rem;
  }
  nav,
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 1rem 0;
  }
  button,
  select {
    min-height: 48px;
    padding: 0.6rem 1rem;
    border: 1px solid var(--color-border-default);
    background: var(--color-bg-surface);
    color: inherit;
    font: inherit;
    max-width: 100%;
  }
  button {
    cursor: pointer;
    margin: 0.25rem;
  }
  button[aria-current] {
    border: 2px solid currentColor;
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  button:focus-visible,
  select:focus-visible,
  a:focus-visible {
    outline: 3px solid currentColor;
    outline-offset: 3px;
  }
  section {
    border-top: 1px solid var(--color-border-default);
    padding: 1.5rem 0;
  }
  label {
    display: block;
    margin: 1rem 0;
  }
  select {
    display: block;
    width: 100%;
    max-width: 32rem;
    margin-top: 0.4rem;
  }
  input {
    width: 1.2rem;
    height: 1.2rem;
    vertical-align: middle;
    margin-right: 0.5rem;
  }
  pre {
    overflow: auto;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    padding: 1rem;
    border: 1px solid var(--color-border-default);
    font-size: 0.85rem;
  }
  article {
    padding: 1rem 0;
    border-top: 1px solid var(--color-border-default);
  }
  a {
    text-decoration: underline;
  }
  .limits {
    font-size: 0.9rem;
  }
  details {
    padding: 1rem 0;
  }
  @media (forced-colors: active) {
    button[aria-current] {
      border: 3px solid Highlight;
    }
  }
</style>
