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
  <p class="eyebrow">Partner status and qualifications</p>
  <h2 id="openai-qualifications-title">OpenAI Select Partner</h2>
  <p>CREATE SOMETHING is an OpenAI Select Partner in the OpenAI Partner Network.</p>
  <p>Micah Johnson, the operator behind CREATE SOMETHING, holds the nine OpenAI-issued credentials listed below. We bring that learning to the work: connecting tools, defining when AI needs a person, and testing what happens.</p>
  <details>
    <summary>View Micah’s nine credentials</summary>
    <ul>
      {#each qualifications as qualification}
        <li>{qualification}</li>
      {/each}
    </ul>
    <p class="note">Issued July–September 2026, with stated expiry dates in July–September 2027. Supporting certificates are available on request.</p>
  </details>
  <p class="note">Partner status recognizes the organization. These credentials belong to Micah. Each client project has its own scope, tests, and launch decision.</p>
</aside>

<style>
  aside {
    padding: clamp(2rem, 5vw, 4rem) max(1.25rem, calc((100% - 80rem) / 2));
    background: var(--color-performance-paper, #f3f3f0);
    color: var(--color-performance-ink, #090909);
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
    scroll-margin-top: 6rem;
  }
  .eyebrow { color: var(--color-performance-ink, #090909); font-size: 0.8rem; font-weight: 650; }
  h2 { font-family: var(--font-performance-editorial); font-size: clamp(2rem, 4vw, 3rem); font-weight: 400; line-height: 1.15; margin: 0.75rem 0 1.25rem; }
  p { max-width: 68ch; line-height: 1.65; margin: 0 0 1.25rem; }
  details { max-width: 68ch; border-top: 1px solid var(--color-performance-line-strong, #a9aaa5); border-bottom: 1px solid var(--color-performance-line-strong, #a9aaa5); margin: 1.5rem 0; }
  summary { cursor: pointer; padding: 1rem 0; font-weight: 600; }
  summary:focus-visible { outline: 2px solid currentColor; outline-offset: 4px; }
  ul { padding-left: 1.25rem; margin: 0 0 1.25rem; }
  li { margin: 0.5rem 0; line-height: 1.5; }
  .note { font-size: 0.9rem; }
</style>
