<script lang="ts">
  import AgencyPerformanceReadback from '$lib/components/AgencyPerformanceReadback.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import { agencyInvitationScene } from '$lib/data/canonAgencyScenes';
</script>

<section
  id="shared-performance-handoff"
  class="performance-handoff"
  data-performance-handoff
  aria-labelledby="performance-handoff-title"
>
  <div class="performance-handoff__intro" style:--handoff-scene={`url(${JSON.stringify(agencyInvitationScene.src)})`} style:--handoff-scene-mobile={`url(${JSON.stringify(agencyInvitationScene.mobileSrc)})`} style:--handoff-scene-ratio={agencyInvitationScene.aspectRatio} style:--handoff-scene-mobile-ratio={agencyInvitationScene.mobileAspectRatio}>
    <div class="performance-handoff__scene" role="img" aria-label={agencyInvitationScene.description}></div>
    <div class="performance-handoff__copy">
    <span class="performance-handoff__eyebrow">AI workflow system</span>
    <h2 id="performance-handoff-title">Find the task where AI could help.</h2>
    <p>
      Start with one repeated task. Agree on what AI can do, who checks its work, and how to measure the result.
    </p>
    <div class="performance-handoff__actions">
      <a class="performance-handoff__primary" href={agencyCoreMessaging.selfMapHref}
        >{agencyCoreMessaging.selfMapLabel}</a
      >
      <a href="/field-reports/template-review">Read the 49/50 field report</a>
    </div>
    </div>
    <div class="performance-handoff__reserved" aria-hidden="true"></div>
  </div>

  <AgencyPerformanceReadback compact={true} />

  <ol class="performance-handoff__steps" aria-label="How a controlled workflow improves">
    <li>
      <strong>Map the friction</strong><span>List the tools, steps, and person responsible.</span>
    </li>
    <li>
      <strong>Test one path</strong><span
        >Test the routine work and check that approvals still work.</span
      >
    </li>
    <li>
      <strong>Keep the proof</strong><span
        >Review what ran, what stopped, and what needs recovery.</span
      >
    </li>
  </ol>
</section>

<style>
  .performance-handoff {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
    padding-block: clamp(2rem, 5vw, 4.5rem);
    padding-inline: max(
      var(--space-performance-page-gutter, 1.25rem),
      calc((100% - var(--content-width-performance, 85rem)) / 2)
    );
    background: var(--color-performance-paper);
    color: var(--color-performance-ink);
  }

  .performance-handoff__intro {
    container-type: inline-size;
    position: relative;
    isolation: isolate;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto auto;
    justify-items: start;
    min-width: 0;
    width: 100%;
    border: 1px solid var(--color-performance-line);
  }

  .performance-handoff__copy { grid-area:1 / 1; box-sizing:border-box; min-width:0; width:44%; padding:clamp(1.5rem,3cqw,2.5rem); }
  .performance-handoff__scene { position:relative; grid-area:1 / 1 / 3 / 2; align-self:end; width:100%; height:calc(100cqw / var(--handoff-scene-ratio)); z-index:-1; pointer-events:none; background:var(--handoff-scene) center bottom / 100% auto no-repeat; }
  .performance-handoff__scene::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,var(--color-performance-paper),color-mix(in srgb,var(--color-performance-paper) 92%,transparent) 40%,transparent 54%); mask-image:linear-gradient(#000 0 55%,transparent 78%); }
  .performance-handoff__reserved { grid-area:2 / 1; height:calc(25cqw / var(--handoff-scene-ratio)); }

  .performance-handoff__eyebrow {
    display: block;
    margin-bottom: 0.9rem;
    color: var(--color-performance-muted);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  h2 {
    max-width: 20ch;
    margin: 0;
    font-size: clamp(1.75rem, 4.4cqw, 4rem);
    line-height: 0.96;
    letter-spacing: -0.045em;
  }

  p {
    max-width: 40rem;
    margin: 1.2rem 0 0;
    color: var(--color-performance-muted);
    font-size: clamp(1rem, 1.4vw, 1.2rem);
    line-height: 1.55;
  }

  .performance-handoff__steps {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin: 0;
    padding: 0;
    border-block: 1px solid var(--color-performance-line);
    list-style: none;
  }

  li {
    display: grid;
    gap: 0.6rem;
    min-height: 9rem;
    padding: 1.15rem;
  }

  li + li {
    border-left: 1px solid var(--color-performance-line);
  }

  li strong {
    font-size: 1rem;
  }

  li span {
    color: var(--color-performance-muted);
    line-height: 1.45;
  }

  .performance-handoff__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem 1.5rem;
    margin-top: 1.5rem;
  }

  .performance-handoff__actions a {
    display: inline-flex;
    min-height: var(--height-performance-control-min, 2.75rem);
    align-items: center;
    color: inherit;
    font-weight: 650;
    text-underline-offset: 0.22em;
  }

  .performance-handoff__primary {
    padding: 0.75rem 1.1rem;
    background: var(--color-performance-ink);
    color: var(--color-performance-paper) !important;
    text-decoration: none;
  }

  @media (max-width: 70rem) {
    .performance-handoff {
      grid-template-columns: 1fr;
    }

    .performance-handoff__intro {
      border-right: 1px solid var(--color-performance-line);
    }
  }

  @media(max-width:47.99rem) {
    .performance-handoff__copy { width:100%; }
    .performance-handoff__scene { position:relative; grid-area:2 / 1; height:calc(100cqw / var(--handoff-scene-mobile-ratio)); background-image:var(--handoff-scene-mobile); }
    .performance-handoff__scene::after { display:none; }
    .performance-handoff__reserved { height:calc(100cqw / var(--handoff-scene-mobile-ratio)); }
  }

  @media (max-width: 42rem) {
    .performance-handoff__steps {
      grid-template-columns: 1fr;
    }

    li + li {
      border-top: 1px solid var(--color-performance-line);
      border-left: 0;
    }

    li {
      min-height: auto;
    }
  }
</style>
