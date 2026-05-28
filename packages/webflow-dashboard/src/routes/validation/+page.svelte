<script lang="ts">
  import { onMount } from 'svelte';
  import { Header, Button, Card, WebflowWayCard, BackNavigation } from '$lib/components';
  import { trackEvent } from '$lib/utils/analytics';
  import { ExternalLink, ListChecks, PlayCircle, Search, Send, ShieldCheck } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let isGsapModalOpen = $state(false);

  // Lazy-loaded modal component
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let GsapValidationModal = $state<any>(null);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  async function handleOpenGsapValidator(source = 'validation_recommended_path') {
    // Lazy load the GsapValidationModal component
    if (!GsapValidationModal) {
      const module = await import('$lib/components/GsapValidationModal.svelte');
      GsapValidationModal = module.default;
    }
    isGsapModalOpen = true;

    trackEvent('validation_gsap_quick_opened', { source });
    trackEvent('quick_validate_clicked', { source });
  }

  function handleOpenPlayground(source = 'validation_recommended_path') {
    trackEvent('validation_playground_entry_clicked', {
      source
    });
    trackEvent('full_playground_clicked', { source });
    window.location.href = '/validation/playground';
  }

  onMount(() => {
    trackEvent('validation_tools_opened');
    trackEvent('validation_page_viewed', {
      surface: 'asset_dashboard_validation'
    });
  });
</script>

<svelte:head>
  <title>Validation Tools | Webflow Asset Dashboard</title>
</svelte:head>

<div class="validation-page">
  <Header onLogout={handleLogout} showMarketplace={data.hasTemplateAsset} />

  <main class="main-content">
    <div class="content-wrapper">
      <BackNavigation />

      <!-- Header -->
      <div class="page-header page-intro">
        <div class="header-content">
          <span class="page-kicker">Pre-submission workflow</span>
          <h1 class="page-title page-intro__title">Validation Tools</h1>
          <p class="page-subtitle page-intro__subtitle">
            Run the fast technical crawl, complete the required Validator app pass, then return to
            the submission form with clearer evidence.
          </p>
        </div>
      </div>

      <section class="workflow-band" aria-labelledby="workflow-title">
        <div class="workflow-band__header">
          <div>
            <h2 id="workflow-title" class="section-title">Recommended path</h2>
            <p class="tool-description">
              The submission form requires the Validator app pass. The quick crawl catches obvious
              blockers before creators spend time in Designer.
            </p>
          </div>
          <div class="workflow-band__actions">
            <Button
              variant="default"
              onclick={() => handleOpenGsapValidator('validation_recommended_path')}
              class="tool-button"
              data-dd-action-name="validation quick validate opened"
            >
              <PlayCircle size={16} />
              Quick Validate
            </Button>
            <Button
              variant="secondary"
              onclick={() => handleOpenPlayground('validation_recommended_path')}
              class="tool-button"
              data-dd-action-name="validation full playground opened"
            >
              <Search size={16} />
              Full Playground
            </Button>
          </div>
        </div>

        <ol class="workflow-rail" aria-label="Recommended validation workflow">
          <li>
            <span class="workflow-rail__icon"><PlayCircle size={16} /></span>
            <div>
              <span class="workflow-rail__label">1. Quick crawl</span>
              <p>Check published pages for GSAP, IX, broken crawl, and custom-code blockers.</p>
            </div>
          </li>
          <li class="workflow-rail__required">
            <span class="workflow-rail__icon"><ShieldCheck size={16} /></span>
            <div>
              <span class="workflow-rail__label">2. Validator app</span>
              <p>Add the bridge, publish, and run the required Webflow Way pass to 100%.</p>
            </div>
          </li>
          <li>
            <span class="workflow-rail__icon"><Send size={16} /></span>
            <div>
              <span class="workflow-rail__label">3. Submit</span>
              <p>Return to the form and validate the same published URL before review.</p>
            </div>
          </li>
        </ol>
      </section>

      <div class="validation-workflow-grid">
        <section class="tool-choice-section" aria-labelledby="tool-choice-title">
          <div class="section-heading-row">
            <div>
              <h2 class="section-title section-title--secondary" id="tool-choice-title">
                Pick the right check
              </h2>
              <p class="tool-description">Each surface answers a different review question.</p>
            </div>
          </div>

          <div class="tool-choice-grid">
            <Card class="tool-choice-card">
              <div class="choice-card-header">
                <span class="choice-card-icon"><PlayCircle size={18} /></span>
                <span class="tool-kicker">Fast technical check</span>
              </div>
              <h3 class="choice-card-title">Quick Validate</h3>
              <p class="tool-description">
                Best for a first pass. This checks the published site for obvious crawl,
                interaction, and custom-code blockers.
              </p>
              <ul class="choice-list">
                <li>GSAP and legacy IX issues</li>
                <li>Custom-code risk patterns</li>
                <li>Broken crawl or linked pages</li>
              </ul>
              <Button
                variant="default"
                onclick={() => handleOpenGsapValidator('validation_tool_choice_card')}
                class="choice-action"
                data-dd-action-name="validation quick validate opened"
              >
                <PlayCircle size={16} />
                Run quick check
              </Button>
            </Card>

            <Card class="tool-choice-card">
              <div class="choice-card-header">
                <span class="choice-card-icon"><ListChecks size={18} /></span>
                <span class="tool-kicker">Page-level inspection</span>
              </div>
              <h3 class="choice-card-title">Full Playground</h3>
              <p class="tool-description">
                Best after a failed crawl or when a creator needs page-level evidence for specific
                fixes.
              </p>
              <ul class="choice-list">
                <li>Per-page pass or fail results</li>
                <li>Flagged code snippets</li>
                <li>Recommendations by issue type</li>
              </ul>
              <Button
                variant="secondary"
                onclick={() => handleOpenPlayground('validation_tool_choice_card')}
                class="choice-action"
                data-dd-action-name="validation full playground opened"
              >
                <Search size={16} />
                Open playground
              </Button>
            </Card>
          </div>
        </section>

        <section class="required-tool-section" aria-labelledby="required-validator-title">
          <div class="required-tool-heading">
            <span class="tool-kicker">Required before submission</span>
            <h2 class="section-title section-title--secondary" id="required-validator-title">
              Webflow Way Validator
            </h2>
            <p class="tool-description">
              This is the creator-facing app pass the submission form checks. Use it after the fast
              crawl, then submit only after the latest run is 100%.
            </p>
          </div>
          <WebflowWayCard userEmail={data.user?.email} compact />
        </section>
      </div>

      <section class="scope-note-section" aria-label="Validation scope">
        <div class="scope-note">
          <span class="scope-note__icon"><ExternalLink size={16} /></span>
          <div>
            <h3 class="info-title">What this does not decide</h3>
            <p>
              These tools standardize objective checks. Marketplace review still evaluates visual
              quality, originality, content completeness, category fit, and overall polish.
            </p>
          </div>
        </div>
      </section>
    </div>
  </main>
</div>

<!-- GSAP Check Modal -->
{#if isGsapModalOpen && GsapValidationModal}
  <GsapValidationModal
    isOpen={isGsapModalOpen}
    onClose={() => (isGsapModalOpen = false)}
    userEmail={data.user?.email}
  />
{/if}

<style>
  .validation-page {
    min-height: 100vh;
    background: var(--color-bg-pure);
  }

  .main-content {
    padding: var(--space-lg) var(--space-md);
  }

  .content-wrapper {
    max-width: var(--layout-content-max-width);
    margin: 0 auto;
  }

  .page-kicker {
    display: inline-flex;
    margin-bottom: var(--space-xs);
    color: var(--color-info);
    font-size: var(--text-caption);
    font-weight: var(--font-semibold);
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .workflow-band {
    display: grid;
    gap: var(--space-md);
    margin-bottom: var(--space-md);
    padding: 1rem;
    border: 1px solid color-mix(in srgb, var(--color-shell-border-default) 72%, transparent);
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--color-bg-surface) 92%, transparent);
  }

  .workflow-band__header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-md);
    align-items: end;
  }

  .workflow-band__actions {
    display: flex;
    gap: var(--space-sm);
    align-items: center;
  }

  .workflow-rail {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-sm);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .workflow-rail li {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--space-sm);
    min-width: 0;
    padding: 0.8rem;
    border: 1px solid color-mix(in srgb, var(--color-shell-border-default) 70%, transparent);
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--color-bg-pure) 72%, transparent);
  }

  .workflow-rail__required {
    border-color: color-mix(in srgb, var(--color-info-border) 82%, var(--color-shell-border-default)) !important;
    background: color-mix(in srgb, var(--color-info-muted) 16%, var(--color-bg-surface)) !important;
  }

  .workflow-rail__icon,
  .choice-card-icon,
  .scope-note__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.8rem;
    height: 1.8rem;
    border: 1px solid var(--color-info-border);
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--color-info-muted) 24%, transparent);
    color: var(--color-info);
  }

  .workflow-rail__label {
    display: block;
    color: var(--color-fg-primary);
    font-size: var(--text-body-sm);
    font-weight: var(--font-semibold);
    line-height: 1.25;
  }

  .workflow-rail p {
    margin: var(--space-xs) 0 0;
    color: var(--color-fg-secondary);
    font-size: var(--text-caption);
    line-height: 1.45;
  }

  .validation-workflow-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
    gap: var(--space-md);
    align-items: start;
    margin-bottom: var(--space-md);
  }

  .tool-choice-section,
  .required-tool-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    min-width: 0;
  }

  .section-heading-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
  }

  .section-title {
    font-family: var(--font-heading);
    font-size: var(--text-h2);
    font-weight: var(--font-semibold);
    letter-spacing: 0;
    color: var(--color-fg-primary);
    margin: 0 0 var(--space-md);
  }

  .section-title--secondary {
    margin-bottom: var(--space-sm);
    font-size: var(--text-body-lg);
  }

  :global(.tool-card) {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    padding: 0.9rem;
    border-radius: var(--radius-sm);
    border-color: color-mix(in srgb, var(--color-shell-border-default) 74%, transparent);
    box-shadow: none;
  }

  .tool-choice-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-sm);
  }

  :global(.tool-choice-card) {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    min-width: 0;
    padding: 0.9rem;
    border-radius: var(--radius-sm);
    border-color: color-mix(in srgb, var(--color-shell-border-default) 74%, transparent);
    box-shadow: none;
  }

  .choice-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
  }

  .tool-kicker {
    font-size: var(--text-caption);
    color: var(--color-info);
    text-transform: uppercase;
    letter-spacing: 0;
  }

  .tool-description {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    margin: 0;
    line-height: 1.4;
  }

  .choice-card-title {
    color: var(--color-fg-primary);
    font-family: var(--font-heading);
    font-size: var(--text-body-lg);
    font-weight: var(--font-semibold);
    letter-spacing: 0;
    margin: 0;
  }

  .choice-list {
    display: grid;
    gap: 0.35rem;
    margin: 0;
    padding-left: 1rem;
    color: var(--color-fg-secondary);
    font-size: var(--text-caption);
    line-height: 1.35;
  }

  :global(.choice-action) {
    margin-top: auto;
    justify-content: center;
    gap: var(--space-xs);
  }

  .required-tool-heading {
    display: grid;
    gap: var(--space-xs);
  }

  .required-tool-heading .section-title {
    margin-bottom: 0;
  }

  :global(.required-tool-section .webflow-way-card) {
    height: auto;
    border-color: color-mix(in srgb, var(--color-info-border) 78%, var(--color-shell-border-default));
  }

  :global(.tool-button) {
    justify-content: center;
    gap: var(--space-xs);
  }

  .info-title {
    font-family: var(--font-heading);
    font-size: var(--text-body-lg);
    font-weight: var(--font-semibold);
    letter-spacing: 0;
    color: var(--color-fg-primary);
    margin: 0 0 var(--space-sm);
  }

  .scope-note-section {
    margin-bottom: var(--space-md);
  }

  .scope-note {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--space-sm);
    padding: 0.9rem 0;
    border-top: 1px solid color-mix(in srgb, var(--color-shell-border-default) 74%, transparent);
    border-bottom: 1px solid color-mix(in srgb, var(--color-shell-border-default) 74%, transparent);
  }

  .scope-note p {
    margin: 0;
    color: var(--color-fg-secondary);
    font-size: var(--text-caption);
    line-height: 1.5;
  }

  @media (max-width: 900px) {
    .workflow-band__header,
    .validation-workflow-grid,
    .tool-choice-grid,
    .workflow-rail {
      grid-template-columns: 1fr;
    }

    .workflow-band__actions {
      width: 100%;
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
