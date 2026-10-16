<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { afterNavigate, goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { InspectableJourney, IsometricIllustration, journeyFragment, readJourneyLocation, type JourneyLocation } from '@create-something/canon';
  import { reducedFilmMotion } from '$lib/motion/filmPlayback';
  import { journeyId, steps } from '$lib/interaction-pilot/model';

  let enhanced = $state(false);
  let root: HTMLElement;
  let focusRevision = 0;
  let restoreOwnedFocus = false;
  // Keep existing saved links to the retired sample anchored to the static handoff explanation.
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
        if (revision === focusRevision && !document.querySelector('[role="dialog"][aria-modal="true"]')) document.getElementById(window.location.hash === '#sample-handoff' ? 'sample-handoff' : `${journeyId}-${location.stepId}-${location.detail ? 'detail' : 'control'}`)?.focus();
      });
    }
  });

  async function move(next: JourneyLocation, focusTarget?: string) {
    const revision = ++focusRevision;
    const url = new URL(window.location.href);
    url.hash = journeyFragment(journeyId, next);
    location = next;
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
  function openSearch() { window.dispatchEvent(new Event('agency:open-search')); }
  onMount(() => {
    location = locationFromHash(window.location.hash);
    enhanced = true;
    const restoreFocus = async () => {
      const revision = ++focusRevision;
      const ownedFocus = root.contains(document.activeElement);
      restoreOwnedFocus = ownedFocus;
      location = locationFromHash(window.location.hash);
      await tick();
      if (revision !== focusRevision || document.querySelector('[role="dialog"][aria-modal="true"]') || (!window.location.hash.startsWith(`#${journeyId}-`) && !ownedFocus)) return;
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
    {#if enhanced}<button class="quiet inline-search" onclick={openSearch}>Search public pages</button>{/if}
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
          {:else}<a href="#sample-handoff" onclick={() => void tick().then(() => document.getElementById('sample-handoff')?.focus())}>See what your team keeps ↓</a>{/if}
        </div>
      {/if}
    {/snippet}
  </InspectableJourney>

  <section class="handoff-deliverables" aria-labelledby="sample-handoff">
    <div>
      <p class="eyebrow">The handoff</p>
      <h3 id="sample-handoff" tabindex="-1">What your team keeps.</h3>
      <p>For the agreed work, we hand over the deliverable, configuration notes, acceptance checks and recovery instructions.</p>
    </div>
    <div>
      <p>The handoff records what changed, how it was checked and what still needs attention. Scope and costs are agreed before work begins.</p>
      <a href="/services#membership">Discuss support for your workflow ↗</a>
    </div>
  </section>
  <footer>{#if enhanced}<button class="quiet inline-search" onclick={openSearch}>Search public pages</button>{/if}<p>Project context carries into the next agreed improvement.</p><a href="/services">See the process and support scope ↗</a></footer>
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
  .map-note { font-size: var(--text-performance-operator-label); }
  .boundary { padding-left: var(--space-performance-sm); border-left: 2px solid var(--color-performance-shell-border-strong); }
  button, a { min-height: 44px; }
  a { color: inherit; text-underline-offset: .3em; display: inline-flex; align-items: center; }
  .inspect-link { gap: var(--space-performance-sm); }
  button { font: inherit; color: inherit; cursor: pointer; }
  .quiet { background: transparent; border: 0; padding: var(--space-performance-xs) 0; text-decoration: underline; text-underline-offset: .3em; }
  .record { padding: var(--space-performance-md); border: 1px solid var(--color-performance-shell-border-strong); margin-top: var(--space-performance-sm); }
  h4 { margin: 0; font: var(--font-performance-medium) var(--text-performance-body-sm)/1.4 var(--font-performance-interface); }
  dl { margin: var(--space-performance-sm) 0; }
  dl > div { padding-block: var(--space-performance-sm); border-top: 1px solid var(--color-performance-shell-border-default); }
  dt { font: var(--text-performance-operator-label)/1.5 var(--font-performance-mono); }
  dd { margin: var(--space-performance-xs) 0 0; font-size: var(--text-performance-caption); line-height: 1.65; }
  .progression { display: flex; justify-content: space-between; gap: var(--space-performance-sm); flex-wrap: wrap; margin-top: var(--space-performance-md); }
  .handoff-deliverables { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--space-performance-lg); border-top: 1px solid var(--color-performance-shell-border-strong); padding-block: var(--space-performance-lg); }
  .handoff-deliverables > div { min-width: 0; }
  .handoff-deliverables a { text-decoration: underline; }
  :global(.service-journey [tabindex="-1"]) { scroll-margin-block: 8rem; }
  h3 { font: var(--font-performance-medium) clamp(1.5rem, 2.6vw, 2rem)/1.2 var(--font-performance-interface); margin: 0; scroll-margin-top: 8rem; }
  :is(button, a):focus-visible, :is(h3, h4):focus { outline: 2px solid var(--color-performance-focus); outline-offset: 4px; }
  footer { border-top: 1px solid var(--color-performance-shell-border-default); padding-top: var(--space-performance-md); display: flex; align-items: center; justify-content: space-between; gap: var(--space-performance-md); flex-wrap: wrap; }
  footer p { margin: 0; }
  @media (max-width: 720px) { .handoff-deliverables { grid-template-columns: 1fr; gap: var(--space-performance-md); } .service-journey { padding-inline: 6vw; } .map-nodes li { padding-inline: var(--space-performance-xs); } }
</style>
