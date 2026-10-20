<script lang="ts">
  import WorkflowBench from './WorkflowBench.svelte';
  import { onMount } from 'svelte';
  import { PUBLIC_PRICING } from '$lib/data/publicPricing';

  const { focused, team } = PUBLIC_PRICING.membership;
  let root: HTMLElement;
  let active = $state<number | null>(null);

  onMount(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let observer: IntersectionObserver | undefined;
    const sync = () => {
      observer?.disconnect();
      active = null;
      if (motion.matches || !('IntersectionObserver' in window)) return;
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) active = Number((entry.target as HTMLElement).dataset.chapter);
        }
      }, { rootMargin: '-30% 0px -69% 0px', threshold: 0 });
      root.querySelectorAll('[data-chapter]').forEach((chapter) => observer?.observe(chapter));
    };
    sync();
    motion.addEventListener('change', sync);
    return () => { observer?.disconnect(); motion.removeEventListener('change', sync); };
  });
</script>

<section class="plan-journey" aria-labelledby="plan-journey-title" bind:this={root}>
  <header class="journey-heading">
    <p class="eyebrow">From agreement to handoff</p>
    <h3 id="plan-journey-title">An agreed improvement.<br />A result you can keep using.</h3>
    <p>Both plans follow the same process. The difference is the agreed capacity each billing month.</p>
  </header>
  <div class="journey-layout">
    <div class="plan-diagram" aria-hidden="true">
      <div class="diagram-label">Membership / working agreement</div>
      <WorkflowBench {active} />
      <div class:highlight={active === 0} class="diagram-stage"><span class="stage-index">01—03</span><div><strong>Intent → access → approval</strong><span>Your goal, selected connections, a human decision.</span></div></div>
      <div class:highlight={active === 1} class="diagram-stage"><span class="stage-index">04</span><div><strong>Work within the agreement</strong><span>Focused: 1 workstream / Team: up to 2.</span></div></div>
      <div class:highlight={active === 2} class="diagram-stage"><span class="stage-index">05—06</span><div><strong>Verification → receipt</strong><span>Actual results, blockers and the handoff.</span></div></div>
      <p class="diagram-note">An illustrative workbench. Scroll to inspect the parts; no task is running.</p>
    </div>
    <div class="journey-chapters">
      <section class="chapter" data-chapter="0" aria-labelledby="plan-scope-title">
        <p class="eyebrow">01 / Before work begins</p>
        <h4 id="plan-scope-title">Make the milestone specific.</h4>
        <p>A milestone is one agreed workflow map or one scoped improvement to an existing workflow. We agree on the result, selected tool access, the human approval boundary, acceptance check, session times and response times before payment.</p>
        <p class="example">For example: map a handoff between two tools, or agree on one improvement to that handoff. These illustrate the scope of a milestone; a whole new build is quoted separately.</p>
      </section>
      <section class="chapter" data-chapter="1" aria-labelledby="plan-capacity-title">
        <p class="eyebrow">02 / Each billing month</p>
        <h4 id="plan-capacity-title">Choose the capacity your work needs.</h4>
        <p><strong>Focused · {focused.label}.</strong> {focused.workstreams} workstream, {focused.milestonesPerMonth} agreed milestone and {focused.remoteSessionsPerMonth} attended {focused.remoteSessionMinutes}-minute remote work sessions.</p>
        <p><strong>Team · {team.label}.</strong> Up to {team.workstreams} workstreams, {team.milestonesPerMonth} agreed milestones and {team.remoteSessionsPerMonth} attended {team.remoteSessionMinutes}-minute remote work sessions.</p>
        <p class="example">An illustrative Focused month could map the approval handoff for your website. With Team, you might agree on that map plus one scoped improvement to an existing intake workflow. We confirm feasibility and acceptance checks before committing to either milestone.</p>
        <p>Both include {focused.checkInsPerMonth} × {focused.checkInMinutes}-minute check-ins and {focused.revisionRoundsPerMilestone} feedback and revision round per milestone. Capacity and scope are agreed; neither plan is unlimited development.</p>
      </section>
      <section class="chapter" data-chapter="2" aria-labelledby="plan-handoff-title">
        <p class="eyebrow">03 / Check, then carry it forward</p>
        <h4 id="plan-handoff-title">Keep the work understandable.</h4>
        <p>Each milestone includes verification and a handoff you keep under your agreement. The handoff records what changed, the actual check results, any blockers and the next step. We explain how to use the result. Skills, learning resources and Slack support are included; access is confirmed during onboarding.</p>
        <p>Project context carries into the next agreed improvement. Larger Builds, managed Control and production incident response need separate agreements. AI usage, hosting and third-party services are budgeted separately.</p>
      </section>
    </div>
  </div>
</section>

<style>
  .plan-journey { padding: 0 var(--membership-gutter, max(1.25rem, calc((100% - 80rem) / 2))) var(--space-performance-xl); color: var(--color-performance-ink); }
  .journey-heading { border-top: 1px solid var(--color-performance-line-strong); padding-top: 2rem; max-width: none; }
  .eyebrow, .diagram-label, .stage-index { font: .7rem/1.6 var(--font-performance-mono); text-transform: uppercase; letter-spacing: .04em; }
  .journey-heading h3 { font: 400 clamp(1.7rem, 3vw, 2.5rem)/1.15 var(--font-performance-editorial); margin: .75rem 0 1rem; }
  p { font-size: .9375rem; line-height: 1.7; max-width: 62ch; }
  .journey-layout { display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr); gap: clamp(2rem, 5vw, 5rem); margin-top: 2rem; align-items: start; }
  .plan-diagram { padding: clamp(1rem, 3vw, 2rem); border: 1px solid var(--color-performance-line-strong); background: var(--color-performance-panel); color: var(--color-performance-ink); }
  .diagram-label { margin-bottom: 1.5rem; }
  .diagram-stage { margin-top: .5rem; display: flex; align-items: center; gap: 1rem; padding: .65rem; border: 1px solid var(--color-performance-line-strong); transition: border-color 180ms ease, background-color 180ms ease; }
  .diagram-stage.highlight { border-color: currentColor; background: var(--color-performance-paper); box-shadow: inset 3px 0 currentColor; }
  .diagram-stage strong { display: block; font-size: .9375rem; font-weight: 500; line-height: 1.5; }
  .diagram-stage div > span { display: block; font-size: .75rem; line-height: 1.6; }
  .stage-index { white-space: nowrap; min-width: 3.1rem; }
  .diagram-note { font-size: .6875rem; margin: 1.5rem 0 0; color: var(--color-performance-ink-soft); }
  .chapter { padding: 0 0 2rem; margin-bottom: 2rem; border-bottom: 1px solid var(--color-performance-line); }
  .chapter:last-child { padding-bottom: 0; margin-bottom: 0; border: 0; }
  .chapter .eyebrow { margin-top: 0; }
  h4 { font-size: 1.25rem; line-height: 1.3; margin: .75rem 0; font-weight: 500; }
  .example { border-left: 1px solid var(--color-performance-line-strong); padding-left: 1rem; color: var(--color-performance-ink-soft); font-size: .8125rem; }
  @media (min-width: 1000px) and (min-height: 800px) and (prefers-reduced-motion: no-preference) { .plan-diagram { position: sticky; top: 8rem; } }
  @media (max-width: 999px) { .journey-layout { grid-template-columns: 1fr; gap: 2rem; } .plan-diagram { max-width: 36rem; width: 100%; box-sizing: border-box; } }
  @media (prefers-reduced-motion: reduce) { .diagram-stage { transition: none; } }
  @media print { .journey-layout { display: block; } .plan-diagram { display: none; } .chapter { break-inside: avoid; } }
</style>
