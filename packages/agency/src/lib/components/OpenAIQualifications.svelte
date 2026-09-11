<script lang="ts">
  const qualifications = [
    'API Deployment Practitioner',
    'Codex Solutions Practitioner',
    'OpenAI Consultative Solutions Practitioner',
    'OpenAI Foundational Knowledge',
    'ChatGPT Deployment Practitioner',
    'OpenAI Technical Practitioner',
    'OpenAI Cyber Deployment Practitioner',
    'ChatGPT Solutions Practitioner',
    'Codex Deployment Practitioner'
  ];
</script>

<aside id="openai-qualifications" aria-labelledby="openai-qualifications-title">
  <div class="qualifications-layout">
    <header>
      <p class="record-label">Partner status / OpenAI Partner Network</p>
      <h2 id="openai-qualifications-title">OpenAI<br />Select Partner</h2>
      <p class="introduction">CREATE SOMETHING is an OpenAI Select Partner in the OpenAI Partner Network.</p>
      <p class="context">We bring that learning to the work: connecting tools, defining when AI needs a person, and testing what happens.</p>
    </header>

    <div class="credentials">
      <div class="credentials-heading">
        <span class="credential-count" aria-hidden="true">09</span>
        <div>
          <p class="record-label">Individual qualifications</p>
          <h3>Micah Johnson</h3>
          <p class="owner">The operator behind CREATE SOMETHING</p>
        </div>
      </div>
      <details open>
        <summary>
          <span>Nine earned OpenAI-issued credentials</span>
          <span class="disclosure-icon" aria-hidden="true"></span>
        </summary>
        <ul role="list">
          {#each qualifications as qualification, index}
            <li><span class="credential-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span>{qualification}</span></li>
          {/each}
        </ul>
        <p class="certificate-note">Issued July–September 2026, with stated expiry dates in July–September 2027. Supporting certificates are available on request.</p>
      </details>
    </div>
    <p class="scope-note">Partner status recognizes the organization. These credentials belong to Micah. Each client project has its own scope, tests, and launch decision.</p>
  </div>
</aside>

<style>
  aside {
    background: var(--color-performance-paper);
    color: var(--color-performance-ink);
    border-bottom: 1px solid var(--color-performance-line);
    scroll-margin-top: 6rem;
  }
  .qualifications-layout {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
    width: min(var(--content-width-performance), calc(100% - 2 * var(--space-performance-page-gutter)));
    margin-inline: auto;
    padding-block: var(--space-performance-xl) var(--space-performance-md);
  }
  header { padding: 0 var(--space-performance-xl) var(--space-performance-lg) 0; }
  p { margin: 0; line-height: var(--leading-performance-relaxed); }
  .record-label {
    color: var(--color-performance-ink-soft);
    font-family: var(--font-performance-mono);
    font-size: 0.7rem;
    font-weight: var(--font-performance-semibold);
    line-height: var(--leading-performance-normal);
    text-transform: uppercase;
  }
  h2 {
    margin: var(--space-performance-md) 0 var(--space-performance-lg);
    font-family: var(--font-performance-editorial);
    font-size: clamp(2.8rem, 5.3vw, 5rem);
    font-weight: var(--font-performance-editorial-weight);
    letter-spacing: -0.045em;
    line-height: var(--leading-performance-editorial);
  }
  .introduction { max-width: 37ch; font-size: 1.1rem; }
  .context { max-width: 43ch; margin-top: var(--space-performance-md); color: var(--color-performance-ink-soft); }
  .credentials { min-width: 0; border-left: 1px solid var(--color-performance-line); padding-left: var(--space-performance-lg); }
  .credentials-heading { display: flex; align-items: center; gap: var(--space-performance-md); padding-bottom: var(--space-performance-md); }
  .credential-count { font-family: var(--font-performance-editorial); font-size: 4.5rem; letter-spacing: -0.055em; line-height: 1; }
  h3 { margin: var(--space-performance-xs) 0 0; font-size: 1.35rem; font-weight: var(--font-performance-semibold); line-height: var(--leading-performance-tight); }
  .owner { margin-top: 0.35rem; color: var(--color-performance-ink-soft); font-size: 0.85rem; }
  details { border-top: 1px solid var(--color-performance-line-strong); }
  summary { display: flex; align-items: center; justify-content: space-between; gap: var(--space-performance-sm); min-height: 3.5rem; padding-block: var(--space-performance-sm); cursor: pointer; list-style: none; font-size: 0.9rem; font-weight: var(--font-performance-semibold); }
  summary::-webkit-details-marker { display: none; }
  summary:hover { color: var(--color-performance-ink-soft); }
  summary:focus-visible { outline: 2px solid currentColor; outline-offset: 4px; }
  .disclosure-icon { position: relative; flex: 0 0 1rem; height: 1rem; }
  .disclosure-icon::before, .disclosure-icon::after { content: ''; position: absolute; background: currentColor; }
  .disclosure-icon::before { width: 1rem; height: 1px; top: 50%; }
  .disclosure-icon::after { width: 1px; height: 1rem; left: 50%; }
  details[open] .disclosure-icon::after { display: none; }
  ul { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: var(--space-performance-md); padding: 0; margin: 0; list-style: none; }
  li { display: flex; align-items: baseline; gap: var(--space-performance-xs); padding-block: var(--space-performance-sm); border-top: 1px solid var(--color-performance-line); font-size: 0.9rem; line-height: var(--leading-performance-normal); }
  li > span:last-child { min-width: 0; overflow-wrap: anywhere; }
  .credential-index { flex-shrink: 0; color: var(--color-performance-ink-soft); font-family: var(--font-performance-mono); font-size: 0.65rem; }
  .certificate-note { margin-top: var(--space-performance-sm); color: var(--color-performance-ink-soft); font-size: 0.8rem; }
  .scope-note { grid-column: 1 / -1; border-top: 1px solid var(--color-performance-line); margin-top: var(--space-performance-lg); padding-top: var(--space-performance-md); color: var(--color-performance-ink-soft); font-size: 0.8rem; }
  @media (max-width: 900px) {
    .qualifications-layout { grid-template-columns: 1fr; padding-top: var(--space-performance-lg); }
    header { padding: 0 0 var(--space-performance-lg); }
    h2 { margin-block: var(--space-performance-md); }
    .introduction, .context { max-width: 60ch; }
    .credentials { padding: var(--space-performance-md) 0 0; border-left: 0; border-top: 1px solid var(--color-performance-line); }
  }
  @media (max-width: 480px) {
    ul { grid-template-columns: 1fr; }
    .credentials-heading { gap: var(--space-performance-sm); }
    .credential-count { font-size: 3.5rem; }
  }
</style>
