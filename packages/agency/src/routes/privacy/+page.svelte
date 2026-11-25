<script lang="ts">
  import { PrivacyPolicyContent, SEO } from '@create-something/canon';

  const sections = [
    'What We Collect',
    'Why We Collect It',
    'How Long We Keep It',
    'Third Parties',
    'Your Rights',
    'Contact for Privacy Requests',
    'Legal Compliance',
    'Changes to This Policy'
  ].map((title, index) => ({ id: `legal-section-${index + 1}`, title: `${index + 1}. ${title}` }));
</script>

<SEO
  title="Privacy Policy"
  description="How CREATE SOMETHING Agency uses first-party analytics and optional Meta marketing. Choose each separately and change your preferences at any time."
  propertyName="agency"
  noindex={true}
/>

{#snippet contents()}
  <nav aria-label="On this page">
    <ol>
      {#each sections as section}
        <li><a href={`#${section.id}`}>{section.title}</a></li>
      {/each}
    </ol>
  </nav>
{/snippet}

<div class="privacy-page">
  <header class="privacy-heading">
    <h1>Privacy Policy</h1>
    <p class="privacy-introduction">First-party analytics and Meta marketing are separate choices. Meta marketing stays off unless you allow it. You can change either choice at any time.</p>
    <p class="privacy-date">Last updated November 5, 2026. <a href="#policy-content">Read the policy below.</a></p>
  </header>

  <div class="privacy-layout">
    <aside class="privacy-contents">
      <div class="privacy-contents-desktop">{@render contents()}</div>
      <details class="privacy-contents-mobile">
        <summary>On this page</summary>
        {@render contents()}
      </details>
    </aside>
    <div id="policy-content" class="privacy-article">
      <PrivacyPolicyContent
        property="agency"
        domain="createsomething.agency"
        lastUpdated="November 5, 2026"
        sectionIds={sections.map((section) => section.id)}
      />
    </div>
  </div>
</div>

<style>
  .privacy-page {
    max-width: 1152px;
    margin-inline: auto;
    padding: 7rem 16px 6rem;
    color: var(--color-performance-ink);
    font-family: var(--font-performance-sans);
  }
  .privacy-heading h1 {
    max-width: 42rem;
    margin: 0;
    font-size: clamp(2.5rem, 5vw, 3.75rem);
    line-height: 1.1;
  }
  .privacy-introduction {
    max-width: 34rem;
    margin: 1rem 0 0;
    color: var(--color-performance-muted);
    font-size: clamp(1.125rem, 2vw, 1.25rem);
    line-height: 1.6;
  }
  .privacy-date {
    margin-top: 1rem;
    color: var(--color-performance-muted);
    font-size: .875rem;
    line-height: 1.6;
  }
  .privacy-date a, .privacy-article :global(a) {
    text-decoration: underline;
    text-underline-offset: .2em;
  }
  .privacy-layout {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: start;
    gap: 3rem;
    margin-top: 6rem;
  }
  .privacy-contents-mobile { display: none; }
  .privacy-contents-mobile summary { cursor: pointer; min-height: 44px; align-content: center; font-size: .875rem; }
  .privacy-contents { position: sticky; top: 6rem; }
  .privacy-contents ol { display: grid; gap: .25rem; margin: 0; padding: 0; list-style: none; }
  .privacy-contents a {
    display: flex;
    align-items: center;
    min-height: 44px;
    width: fit-content;
    color: var(--color-performance-muted);
    font-size: .875rem;
    line-height: 1.5;
    text-decoration: none;
  }
  .privacy-contents a:hover { color: var(--color-performance-ink); text-decoration: underline; text-underline-offset: .2em; }
  .privacy-page :global(a:focus-visible) { outline: 2px solid var(--color-performance-ink); outline-offset: 4px; }
  .privacy-article { grid-column: span 2; min-width: 0; overflow-wrap: anywhere; scroll-margin-top: 7rem; }
  .privacy-article :global(h2) { scroll-margin-top: 7rem; font-size: 1.5rem; line-height: 1.25; margin-bottom: 1rem; }
  :global(.agency-surface[data-agency-design="editorial"][data-theme="light"] #main-content#main-content) .privacy-article :global(:is(h2, h3)) {
    font-family: var(--font-performance-sans) !important;
    font-weight: 600 !important;
    letter-spacing: -.025em;
  }
  .privacy-article :global(h3) { font-size: 1.25rem; line-height: 1.4; }
  .privacy-article :global(.policy-section) { padding: 0; margin: 0 0 3rem; }
  .privacy-article :global(.policy-section:first-child) { padding-top: 2.75rem; }
  .privacy-article :global(.body-text) { margin: 1rem 0; line-height: 1.75; }
  .privacy-article :global(.subsection-title) { margin: 1.5rem 0 .75rem; }
  .privacy-article :global(.acknowledgment) { padding-block: 1.5rem 0; }
  .privacy-article :global(.policy-list) { list-style-position: outside; margin-left: 0; padding-left: 1.5rem; }
  .privacy-article :global(.provider-card), .privacy-article :global(.contact-info) { border-radius: .4rem; }
  .privacy-article :global(.retention-row) { padding-inline: 0; border-bottom: 1px solid var(--color-performance-line); }
  @media (max-width: 1023px) {
    .privacy-layout { grid-template-columns: minmax(0, 1fr); gap: 3rem; margin-top: 4rem; }
    .privacy-contents-desktop { display: none; }
    .privacy-contents-mobile { display: block; border-block: 1px solid var(--color-performance-line); }
    .privacy-contents { position: static; }
    .privacy-article { grid-column: auto; max-width: 72ch; }
    .privacy-article :global(.policy-section:first-child) { padding-top: 0; }
  }
  @media (max-width: 639px) {
    .privacy-page { padding-top: 3.5rem; padding-bottom: 4rem; }
    .privacy-layout { margin-top: 3rem; }
    .privacy-article :global(h2) { font-size: 1.5rem; }
  }
</style>
