<section class="contract-lesson" aria-labelledby="contract-lesson-title">
  <header>
    <p class="eyebrow">Inside an AI-enabled workflow</p>
    <h3 id="contract-lesson-title">Write down what good work requires.</h3>
    <p>Our thesis: a readable contract is a missing piece between an agent harness and dependable client work. We use OpenProse where it fits to make the goal, boundaries and required evidence inspectable before a task runs.</p>
  </header>
  <div class="lesson-layout">
    <figure>
      <div class="figure-label"><span>Fig. 01</span><span>A contract reader</span></div>
      <img src="/diagrams/contract-reader.svg" width="360" height="558" loading="lazy" alt="Illustrative contract reader: contract enters, orchestration and host controls handle the work, and a receipt records what was observed." />
      <figcaption>Our four-part teaching model. No task is running; this is not a receipt from client work.</figcaption>
    </figure>
    <div class="lesson-parts">
      <ol>
        <li><h4>The contract declares the requirements.</h4><p>An OpenProse <code>*.prose.md</code> file can describe the goal, scope, inputs and evidence needed to assess the result. It is a technical work specification, not a legal agreement.</p></li>
        <li><h4>Orchestration makes the handoffs explicit.</h4><p>Compose responsibilities and one-time functions. Use ProseScript when steps or their order matter: prepare, review, then hand off. A compatible agent harness supplies the tools and execution.</p></li>
        <li><h4>The host controls what can actually run.</h4><p>Permissions, approval gates and checks must exist in the host and connected tools. Markdown alone cannot grant access or enforce a security boundary. We verify host support before relying on it.</p></li>
        <li><h4>The receipt records what was observed.</h4><p>Keep results, check evidence, blockers and the next action. An agent’s own claim is not an independent check; a receipt is not automatically signed or proof that every requirement passed.</p></li>
      </ol>
      <details>
        <summary>Inspect an illustrative launch brief <span aria-hidden="true">+</span></summary>
        <div class="example">
          <p><strong>Contract:</strong> prepare a launch brief from approved inputs, cite its claims, and require separate approval to publish.</p>
          <ul><li>Missing approval: keep the brief as a draft.</li><li>Missing evidence: mark it not ready and name the gap.</li><li>Evidence and approval present: perform only the authorized step, then verify its result.</li></ul>
          <p>These are intended rules. A real implementation needs host-enforced controls and recorded checks. Opening this example runs nothing.</p>
        </div>
      </details>
    </div>
  </div>
  <footer>
    <p>We are piloting this approach in our own work. It does not mean every client project uses OpenProse or that every host can run it.</p>
    <nav aria-label="OpenProse lesson sources"><a href="https://github.com/openprose/prose">OpenProse language ↗</a><a href="https://docs.prose.md/harness-agnostic">Harness requirements ↗</a><a href="https://github.com/createsomethingtoday/create-something-monorepo/blob/main/docs/openprose/VENDOR.md">Our pinned version and limits ↗</a></nav>
  </footer>
</section>
<style>
  .contract-lesson { border-top: 1px solid var(--color-performance-shell-border-strong); padding-top: var(--space-performance-lg); margin-top: var(--space-performance-lg); }
  header { max-width: 68ch; }
  .eyebrow, .figure-label { font: .7rem/1.6 var(--font-performance-mono); text-transform: uppercase; letter-spacing: .04em; }
  h3 { font: 500 clamp(1.7rem,3vw,2.6rem)/1.15 var(--font-performance-interface); letter-spacing: -.025em; margin: .75rem 0 1.25rem; }
  p, li { font-size: .9375rem; line-height: 1.7; }
  .lesson-layout { display: grid; grid-template-columns: minmax(0,.75fr) minmax(0,1.25fr); gap: clamp(2rem,5vw,5rem); margin-top: 2rem; align-items: start; }
  figure { margin: 0; padding: 1rem; background: var(--color-performance-shell-surface-secondary); border: 1px solid var(--color-performance-shell-border-strong); }
  .figure-label { display: flex; justify-content: space-between; gap: 1rem; }
  img { display: block; width: min(100%,360px); height: auto; margin: 1.25rem auto; }
  figcaption { font-size: .75rem; line-height: 1.6; color: var(--color-performance-fg-secondary); }
  ol { margin: 0; padding-left: 1.5rem; }
  ol > li { padding-left: .5rem; margin-bottom: 1.5rem; }
  li::marker { font-family: var(--font-performance-mono); }
  h4 { font-size: 1.125rem; line-height: 1.4; margin: 0 0 .5rem; font-weight: 500; }
  li p { margin: 0; }
  code { font-size: .85em; }
  details { border-block: 1px solid var(--color-performance-shell-border-strong); }
  summary { display: flex; justify-content: space-between; gap: 1rem; align-items: center; cursor: pointer; min-height: 56px; list-style: none; font-size: .9375rem; }
  summary::-webkit-details-marker { display: none; }
  details[open] summary span { transform: rotate(45deg); }
  .example { padding-bottom: 1rem; }
  .example ul { padding-left: 1.25rem; }
  .example li { margin-block: .5rem; }
  footer { margin-top: 2rem; }
  footer p { max-width: 75ch; font-size: .8125rem; color: var(--color-performance-fg-secondary); }
  nav { display: flex; flex-wrap: wrap; gap: .5rem 1.5rem; }
  a { display: inline-flex; min-height: 44px; align-items: center; color: inherit; font-size: .8125rem; text-underline-offset: .25em; }
  summary:focus-visible, a:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: 4px; }
  @media(max-width:800px) { .lesson-layout { grid-template-columns: 1fr; } figure { max-width: 30rem; } }
  @media print { .lesson-layout { display: block; } figure { max-width: 20rem; } }
</style>
