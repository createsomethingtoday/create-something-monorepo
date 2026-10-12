<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { afterNavigate, goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { InspectableJourney, IsometricIllustration, journeyFragment, readJourneyLocation, type JourneyLocation } from '@create-something/canon';
  import { reducedFilmMotion } from '$lib/motion/filmPlayback';
  import { journeyId, steps, destinations, emptyDraft, parseDraft, completeSample, storageKey, type Destination } from '$lib/interaction-pilot/model';

  let enhanced = $state(false);
  let draft = $state(emptyDraft());
  let error = $state('');
  let storageMessage = $state('');
  let announcement = $state('');
  let root: HTMLElement;
  let destinationInput = $state<HTMLSelectElement>();
  let reviewInput = $state<HTMLInputElement>();
  let receiptHeading = $state<HTMLHeadingElement>();
  let focusRevision = 0;
  let restoreOwnedFocus = false;
  function locationFromHash(hash: string) {
    return readJourneyLocation(journeyId, steps.map((step) => step.id), hash === '#sample-handoff' ? '#handoff-example-handoff' : hash);
  }
  let location = $state<JourneyLocation>({ stepId: 'problem', detail: false });
  // Use router-owned fragment navigation so route return restores the same URL.
  // The actual URL owns scene selection, including native history/hash changes.
  afterNavigate(({ type }) => {
    location = locationFromHash(window.location.hash);
    if (type === 'popstate' && (window.location.hash.startsWith(`#${journeyId}-`) || window.location.hash === '#sample-handoff' || restoreOwnedFocus)) {
      const revision = ++focusRevision;
      void tick().then(() => {
        if (revision === focusRevision) document.getElementById(window.location.hash === '#sample-handoff' ? 'sample-handoff' : `${journeyId}-${location.stepId}-${location.detail ? 'detail' : 'control'}`)?.focus();
      });
    }
  });

  async function move(next: JourneyLocation, focusTarget?: string) {
    const revision = ++focusRevision;
    const url = new URL(window.location.href);
    url.hash = journeyFragment(journeyId, next);
    location = next;
    error = '';
    if (url.hash !== window.location.hash) {
      try { await goto(url, { noScroll: true, keepFocus: true, state: { ...$page.state } }); }
      catch { return; } // A newer navigation owns selection and focus.
    }
    await tick();
    if (revision !== focusRevision) return;
    if (focusTarget) document.getElementById(focusTarget)?.focus();
  }
  function inspect(event: MouseEvent, stepId: string) {
    if (!enhanced || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    void move({ stepId, detail: true }, `${journeyId}-${stepId}-detail`);
  }
  function closeDetail(stepId: string) {
    void move({ stepId, detail: false }, `${journeyId}-${stepId}-inspect`);
  }
  function escapeDetail(event: KeyboardEvent) {
    if (event.key === 'Escape' && location.detail && root.contains(event.target as Node)) {
      event.preventDefault();
      closeDetail(location.stepId);
    }
  }
  function saveDraft() {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(draft));
      storageMessage = 'Sample kept in this tab. Closing the tab or clearing site data may remove it.';
    } catch {
      storageMessage = 'Browser storage is unavailable. This sample works now, but may be lost on reload.';
    }
  }
  function changeDestination(value: string) {
    draft = { ...draft, destination: value as Destination | '', completed: false, reviewed: false };
    error = ''; announcement = ''; saveDraft();
  }
  function changeReview(checked: boolean) {
    draft = { ...draft, reviewed: checked, completed: false };
    error = ''; announcement = ''; saveDraft();
  }
  async function createSample() {
    const result = completeSample(draft);
    error = result.error;
    if (error) {
      if (!draft.destination) destinationInput?.focus(); else reviewInput?.focus();
      return;
    }
    draft = result.draft;
    saveDraft();
    announcement = 'Sample handoff ready. Nothing was sent, changed or booked.';
    await tick(); receiptHeading?.focus();
  }
  async function editSample() {
    draft = { ...draft, completed: false }; announcement = ''; saveDraft();
    await tick(); destinationInput?.focus();
  }
  onMount(() => {
    location = locationFromHash(window.location.hash);
    enhanced = true;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        draft = parseDraft(JSON.parse(raw));
        if (draft.destination) storageMessage = 'Restored the synthetic sample kept in this tab.';
      }
    } catch { storageMessage = 'Saved sample could not be read. You can prepare a new local example.'; }
    const restoreFocus = async () => {
      const revision = ++focusRevision;
      const ownedFocus = root.contains(document.activeElement);
      restoreOwnedFocus = ownedFocus;
      location = locationFromHash(window.location.hash);
      await tick();
      if (revision !== focusRevision || (!window.location.hash.startsWith(`#${journeyId}-`) && !ownedFocus)) return;
      const restored = locationFromHash(window.location.hash);
      document.getElementById(window.location.hash === '#sample-handoff' ? 'sample-handoff' : `${journeyId}-${restored.stepId}-${restored.detail ? 'detail' : 'control'}`)?.focus();
    };
    const syncHash = () => { location = locationFromHash(window.location.hash); };
    window.addEventListener('popstate', restoreFocus);
    window.addEventListener('hashchange', syncHash);
    return () => { ++focusRevision; window.removeEventListener('popstate', restoreFocus); window.removeEventListener('hashchange', syncHash); };
  });
</script>

<svelte:window onkeydown={escapeDetail} />
<section class="service-journey" aria-labelledby="service-journey-title" bind:this={root} data-analytics-ignore>
  <header>
    <p class="eyebrow">How support works</p>
    <h2 id="service-journey-title">From problem to checked handoff.</h2>
    <p class="introduction">Follow one form that stops reaching a team. Inspect the decision, the checks and the instructions that stay with them.</p>
    <p class="example-label">Synthetic example · no connected systems, messages or bookings</p>
  </header>
  <InspectableJourney id={journeyId} label="Inspect the service journey" {steps} {location} {enhanced} reducedMotion={$reducedFilmMotion} onselect={(next) => void move(next)}>
    {#snippet overview(selectedId)}
      <figure class="workflow-map">
        <figcaption>One request. A visible owner. A checked handoff.</figcaption>
        <ol class="map-nodes" aria-label="The complete workflow">
          {#each steps as step, index}
            <li class:current={selectedId === step.id && enhanced}>
              <IsometricIllustration kind={step.kind} size={88} />
              <span><span class="map-number">0{index + 1}</span><strong>{step.label}</strong><small>{step.id === 'problem' ? 'Trace the break' : step.id === 'approval' ? 'Team owner decides' : step.id === 'check' ? 'Success + failure' : 'Instructions + recovery'}</small></span>
              {#if selectedId === step.id && enhanced}<span class="map-selected">Inspecting</span>{/if}
            </li>
          {/each}
        </ol>
        <p class="map-note">The same request stays in view as you inspect each part. These illustrations explain the method; they do not show a live result.</p>
      </figure>
    {/snippet}
    {#snippet content(step, detailOpen)}
      {@const record = steps.find((entry) => entry.id === step.id)!}
      <p class="boundary">{record.boundary}</p>
      {#if enhanced}<a id={`${journeyId}-${step.id}-inspect`} class="inspect-link" href={journeyFragment(journeyId, { stepId: step.id, detail: true })} aria-expanded={detailOpen} aria-controls={`${journeyId}-${step.id}-record`} onclick={(event) => inspect(event, step.id)}>Inspect {step.label.toLowerCase()} record <span aria-hidden="true">↓</span></a>{/if}
      <div id={`${journeyId}-${step.id}-record`} class="record" hidden={enhanced && !detailOpen}>
        <h4 id={`${journeyId}-${step.id}-detail`} tabindex="-1">{record.recordTitle}</h4>
        <dl>{#each record.facts as [label, value]}<div><dt>{label}</dt><dd>{value}</dd></div>{/each}</dl>
        {#if enhanced}<button class="quiet" onclick={() => closeDetail(step.id)}>Close record <span aria-hidden="true">↑</span></button>{/if}
      </div>
      {#if enhanced}
        {@const index = steps.findIndex((entry) => entry.id === step.id)}
        <div class="progression">
          {#if index > 0}<button class="quiet" onclick={() => void move({ stepId: steps[index - 1].id, detail: false }, `${journeyId}-${steps[index - 1].id}-title`)}>← {steps[index - 1].label}</button>{/if}
          {#if index < steps.length - 1}<button class="quiet" onclick={() => void move({ stepId: steps[index + 1].id, detail: false }, `${journeyId}-${steps[index + 1].id}-title`)}>{steps[index + 1].label} →</button>
          {:else}<a href="#sample-handoff" onclick={() => void tick().then(() => document.getElementById('sample-handoff')?.focus())}>Prepare the sample handoff ↓</a>{/if}
        </div>
      {/if}
    {/snippet}
  </InspectableJourney>

  <section class="sample" aria-labelledby="sample-handoff" data-sample-complete={draft.completed}>
    <div class="sample-intro">
      <p class="eyebrow">Try the handoff</p>
      <h3 id="sample-handoff" tabindex="-1">A small, complete example.</h3>
      <p>Choose a fictional destination, review the scope and keep a sample receipt here. This does not request support or approve real work.</p>
    </div>
    <div class="sample-workspace">
      {#if !enhanced}
        <p>Interactive sample preparation needs JavaScript. All four records above remain readable without it.</p>
        <p>Example handoff: form → team inbox; owner reviews one repair; check valid and invalid requests; retain instructions and recovery.</p>
      {:else if draft.completed}
        <div class="receipt">
          <p class="eyebrow">Local sample / ready</p>
          <h4 tabindex="-1" bind:this={receiptHeading}>Sample handoff ready.</h4>
          <p>Nothing was sent, changed or booked.</p>
          <dl><div><dt>Workflow</dt><dd>Form → {destinations[draft.destination as Destination]}</dd></div><div><dt>Agreed example</dt><dd>One handoff repair, subject to the team owner’s review.</dd></div><div><dt>Checks to run</dt><dd>One valid request reaches the destination; an invalid request names what is missing and creates no record.</dd></div><div><dt>What stays with the team</dt><dd>Configuration notes, acceptance checks and recovery instructions.</dd></div></dl>
          <p class="next-decision"><strong>Next decision:</strong> in a real engagement, agree the scope and costs with the team before work begins. This pilot ends here.</p>
          <button class="primary" onclick={editSample}>Edit sample</button>
        </div>
      {:else}
        <label for="sample-destination">Destination for the synthetic request</label>
        <select id="sample-destination" bind:this={destinationInput} value={draft.destination} onchange={(event) => changeDestination(event.currentTarget.value)} aria-invalid={!!error && !draft.destination} aria-describedby={error && !draft.destination ? 'sample-error' : undefined}>
          <option value="">Choose a destination</option>
          {#each Object.entries(destinations) as [value, label]}<option {value}>{label}</option>{/each}
        </select>
        <p class="scope-summary">Sample scope: repair one form-to-{draft.destination ? destinations[draft.destination].toLowerCase() : 'destination'} handoff. Check valid and invalid requests. Keep instructions and recovery steps. No new CRM, live deployment or ongoing incident response.</p>
        <label class="review"><input type="checkbox" bind:this={reviewInput} checked={draft.reviewed} onchange={(event) => changeReview(event.currentTarget.checked)} aria-invalid={!!error && !!draft.destination && !draft.reviewed} aria-describedby={error && draft.destination ? 'sample-error' : undefined} /><span>I have reviewed this fictional scope. This is not an approval of real work.</span></label>
        {#if error}<p id="sample-error" role="alert">{error}</p>{/if}
        <button class="primary" onclick={createSample}>Create sample handoff</button>
      {/if}
      <p class="storage-message">{storageMessage || 'Only fixed synthetic choices are kept in this tab. No personal information is requested.'}</p>
      <p class="sr-only" role="status">{announcement}</p>
    </div>
  </section>
  <footer><p>Project context carries into the next agreed improvement.</p><a href="/services">See the process and support scope ↗</a></footer>
</section>

<style>
  .service-journey { --isometric-surface: var(--color-performance-mode-campaign-surface); padding: var(--space-performance-xl) 7vw var(--space-performance-lg); background: var(--color-performance-mode-campaign-surface); color: var(--color-performance-mode-campaign-ink); border-block: 1px solid var(--color-performance-shell-border-default); }
  header { max-width: 68ch; margin-bottom: var(--space-performance-lg); }
  .eyebrow, .example-label, figcaption, .map-number, .map-selected { font: var(--text-performance-operator-label)/1.5 var(--font-performance-mono); }
  .eyebrow { text-transform: uppercase; margin: 0 0 var(--space-performance-sm); }
  h2 { margin: 0; font: var(--font-performance-medium) clamp(1.8rem, 3vw, 2.8rem)/1.15 var(--font-performance-interface); }
  p { font-size: var(--text-performance-caption); line-height: 1.65; }
  .introduction { font-size: var(--text-performance-body-sm); }
  .example-label { padding-top: var(--space-performance-sm); }
  .workflow-map { margin: 0; }
  figcaption { margin-bottom: var(--space-performance-md); }
  .map-nodes { padding: 0; margin: 0; list-style: none; }
  .map-nodes li { display: flex; align-items: center; gap: var(--space-performance-sm); padding: var(--space-performance-xs) var(--space-performance-sm); border: 1px solid transparent; border-left: 2px solid var(--color-performance-shell-border-strong); }
  .map-nodes li.current { border-color: currentColor; background: color-mix(in srgb, currentColor 5%, transparent); }
  .map-nodes li > span:first-of-type { flex: 1; min-width: 0; }
  .map-nodes strong, .map-nodes small { display: block; line-height: 1.5; font-size: var(--text-performance-caption); }
  .map-selected { writing-mode: vertical-rl; }
  .map-note, .storage-message { font-size: var(--text-performance-operator-label); }
  .boundary { padding-left: var(--space-performance-sm); border-left: 2px solid var(--color-performance-shell-border-strong); }
  button, a, select { min-height: 44px; }
  a { color: inherit; text-underline-offset: .3em; display: inline-flex; align-items: center; }
  .inspect-link { gap: var(--space-performance-sm); }
  button, select { font: inherit; color: inherit; cursor: pointer; }
  .quiet { background: transparent; border: 0; padding: var(--space-performance-xs) 0; text-decoration: underline; text-underline-offset: .3em; }
  .record { padding: var(--space-performance-md); border: 1px solid var(--color-performance-shell-border-strong); margin-top: var(--space-performance-sm); }
  h4 { margin: 0; font: var(--font-performance-medium) var(--text-performance-body-sm)/1.4 var(--font-performance-interface); }
  dl { margin: var(--space-performance-sm) 0; }
  dl > div { padding-block: var(--space-performance-sm); border-top: 1px solid var(--color-performance-shell-border-default); }
  dt { font: var(--text-performance-operator-label)/1.5 var(--font-performance-mono); }
  dd { margin: var(--space-performance-xs) 0 0; font-size: var(--text-performance-caption); line-height: 1.65; }
  .progression { display: flex; justify-content: space-between; gap: var(--space-performance-sm); flex-wrap: wrap; margin-top: var(--space-performance-md); }
  .sample { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--space-performance-lg); border-top: 1px solid var(--color-performance-shell-border-strong); padding-block: var(--space-performance-lg); }
  .sample-intro, .sample-workspace { min-width: 0; }
  :global(.service-journey [tabindex="-1"]) { scroll-margin-block: 8rem; }
  h3 { font: var(--font-performance-medium) clamp(1.5rem, 2.6vw, 2rem)/1.2 var(--font-performance-interface); margin: 0; scroll-margin-top: 8rem; }
  label { display: block; line-height: 1.6; font-size: var(--text-performance-caption); }
  select { width: 100%; max-width: 100%; margin-top: var(--space-performance-xs); background: var(--color-performance-mode-campaign-surface); border: 1px solid currentColor; border-radius: var(--radius-performance-sm); padding: var(--space-performance-xs); }
  .review { display: flex; gap: var(--space-performance-sm); align-items: start; min-height: 44px; padding-block: var(--space-performance-sm); cursor: pointer; }
  input { flex-shrink: 0; width: 20px; height: 20px; margin-top: 3px; accent-color: var(--color-performance-signal); }
  .primary { display: inline-flex; align-items: center; padding: var(--space-performance-xs) var(--space-performance-md); background: var(--color-performance-mode-campaign-ink); color: var(--color-performance-mode-campaign-surface); border: 1px solid var(--color-performance-mode-campaign-ink); border-radius: var(--radius-performance-sm); margin-top: var(--space-performance-sm); }
  .primary:hover { background: var(--color-performance-mode-campaign-surface); color: var(--color-performance-mode-campaign-ink); }
  #sample-error { border-left: 2px solid currentColor; padding-left: var(--space-performance-sm); }
  .next-decision { border-top: 1px solid var(--color-performance-shell-border-strong); padding-top: var(--space-performance-md); }
  :is(button, a, select, input):focus-visible, :is(h3, h4):focus { outline: 2px solid var(--color-performance-focus); outline-offset: 4px; }
  footer { border-top: 1px solid var(--color-performance-shell-border-default); padding-top: var(--space-performance-md); display: flex; align-items: center; justify-content: space-between; gap: var(--space-performance-md); flex-wrap: wrap; }
  footer p { margin: 0; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
  @media (max-width: 720px) { .sample { grid-template-columns: 1fr; gap: var(--space-performance-md); } .service-journey { padding-inline: 6vw; } .map-nodes li { padding-inline: var(--space-performance-xs); } }
</style>
