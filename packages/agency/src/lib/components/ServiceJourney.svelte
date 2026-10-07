<section class="service-journey" aria-labelledby="service-journey-title">
  <header><p class="eyebrow">How support works</p><h2 id="service-journey-title">From problem to checked handoff.</h2></header>
  <figure>
    <figcaption>Illustrative service journey / a form stops reaching your team</figcaption>
    <ol class="journey">
      <li class="diagnose"><span class="step">01</span><h3>Diagnose</h3><p>Map the tools and the broken handoff in Draw.</p><div class="map-sketch" aria-hidden="true"><span>Form</span><i>→</i><span class="break">?</span><i>→</i><span>Team</span></div><div class="approval"><span aria-hidden="true">◇</span><div><strong>Agree the change</strong><small>You approve the scope.</small></div></div></li>
      <li class="engineer"><span class="step">02</span><h3>Engineer</h3><p>Implement the agreed change and test the result.</p><div class="check-trace"><span><i aria-hidden="true">✓</i> Change implemented</span><span><i aria-hidden="true">✓</i> Acceptance check</span></div></li>
      <li class="learn"><span class="step">03</span><h3>Learn</h3><p>Use the result with a checked handoff and instructions.</p><div class="handoff"><span aria-hidden="true">✓</span><div><strong>Checked handoff</strong><small>Instructions + recovery checks</small></div></div><a href="/agent-foundation">Inspect an engineering handoff ↗</a></li>
    </ol>
  </figure>
  <footer><p>Project context carries into the next agreed improvement.</p><a href="/services">See the process and support scope ↗</a></footer>
</section>
<style>
  .service-journey { padding: var(--space-performance-xl) 7vw var(--space-performance-lg); background: var(--color-performance-mode-campaign-surface); color: var(--color-performance-mode-campaign-ink); border-block: 1px solid var(--color-performance-shell-border-default); }
  header { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-performance-md); flex-wrap: wrap; }
  .eyebrow, figcaption, .step { font: var(--text-performance-operator-label)/1.5 var(--font-performance-mono); text-transform: uppercase; }
  .eyebrow { margin: 0; color: var(--color-performance-fg-tertiary); }
  h2 { margin: 0; font: var(--font-performance-medium) clamp(1.6rem,3vw,2.6rem)/1.2 var(--font-performance-interface); }
  figure { margin: var(--space-performance-lg) 0 0; }
  figcaption { color: var(--color-performance-fg-tertiary); padding-bottom: var(--space-performance-md); border-bottom: 1px solid var(--color-performance-shell-border-strong); }
  .journey { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: var(--space-performance-xl); list-style: none; padding: var(--space-performance-lg) 0 0; margin: 0; }
  .journey > li { position: relative; min-width: 0; }
  .step { display: inline-flex; width: 36px; height: 36px; align-items: center; justify-content: center; border: 1px solid var(--color-performance-shell-border-strong); border-radius: 50%; }
  .journey > li:not(:last-child)::after { content: '→'; position: absolute; top: 5px; right: calc(-1 * var(--space-performance-lg)); color: var(--color-performance-fg-tertiary); }
  h3 { margin-block: var(--space-performance-sm); font: var(--font-performance-medium) var(--text-performance-body)/1.3 var(--font-performance-interface); }
  p { font-size: var(--text-performance-caption); line-height: 1.6; max-width: 34ch; }
  .map-sketch { display: flex; align-items: center; gap: var(--space-performance-xs); margin-block: var(--space-performance-md); font: var(--text-performance-caption)/1.5 var(--font-performance-mono); }
  .map-sketch span { border-bottom: 1px solid var(--color-performance-shell-border-strong); padding: var(--space-performance-xs); }
  .map-sketch .break { border: 1px dashed var(--color-performance-shell-border-strong); }
  i { font-style: normal; }
  .approval, .handoff { display: flex; align-items: center; gap: var(--space-performance-sm); padding-block: var(--space-performance-sm); border-top: 1px solid var(--color-performance-shell-border-default); }
  .approval > span { font-size: 2rem; }
  strong, small { display: block; font-size: var(--text-performance-caption); line-height: 1.6; }
  small { color: var(--color-performance-fg-tertiary); }
  .check-trace { display: flex; flex-direction: column; gap: var(--space-performance-sm); margin-top: var(--space-performance-md); font: var(--text-performance-caption)/1.5 var(--font-performance-mono); }
  .check-trace i, .handoff > span { margin-right: var(--space-performance-xs); }
  .handoff { margin-top: var(--space-performance-md); }
  a { color: inherit; font-size: var(--text-performance-caption); display: inline-flex; align-items: center; min-height: 44px; text-underline-offset: .3em; }
  a:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: 4px; }
  footer { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: var(--space-performance-sm); margin-top: var(--space-performance-lg); border-top: 1px solid var(--color-performance-shell-border-default); }
  footer p { max-width: none; }
  @media(max-width:720px) { .journey { grid-template-columns: 1fr; gap: var(--space-performance-lg); } .journey > li { padding-left: 3.25rem; } .step { position: absolute; left: 0; top: 0; } .journey > li:not(:last-child)::after { content: '↓'; left: 10px; right: auto; top: auto; bottom: calc(-1 * var(--space-performance-md)); } p { max-width: none; } h3 { margin-top: 0; } .service-journey { padding-block: var(--space-performance-lg); } }
</style>
