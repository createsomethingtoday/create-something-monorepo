<script lang="ts">
  import { onMount } from 'svelte';
  import { Header, Button, Card, WebflowWayCard, BackNavigation } from '$lib/components';
  import { trackEvent } from '$lib/utils/analytics';
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

  async function handleOpenGsapValidator() {
    // Lazy load the GsapValidationModal component
    if (!GsapValidationModal) {
      const module = await import('$lib/components/GsapValidationModal.svelte');
      GsapValidationModal = module.default;
    }
    isGsapModalOpen = true;

    trackEvent('validation_gsap_quick_opened');
  }

  function handleOpenPlayground() {
    trackEvent('validation_playground_entry_clicked', {
      source: 'validation_primary_action'
    });
    window.location.href = '/validation/playground';
  }

  onMount(() => {
    trackEvent('validation_tools_opened');
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
          <h1 class="page-title page-intro__title">Validation Tools</h1>
          <p class="page-subtitle page-intro__subtitle">
            Test and validate your templates before submission to ensure marketplace compliance
          </p>
          <div class="validation-evidence" aria-label="Validation outcomes">
            <span><strong>Quick Validate</strong> for fast submission checks</span>
            <span><strong>Full Playground</strong> for page-level inspection</span>
            <span><strong>Earlier checks</strong> reduce review delays</span>
          </div>
        </div>
      </div>

      <div class="validation-workflow-grid">
        <div class="workflow-stack">
          <Card class="primary-tool-card">
            <div class="tool-header">
              <div>
                <h2 class="section-title">Start with the fastest check</h2>
                <p class="tool-description">Quick read first, full inspection second.</p>
              </div>
              <span class="tool-kicker">Primary workflow</span>
            </div>
            <div class="primary-tool-actions">
              <Button variant="default" onclick={handleOpenGsapValidator} class="tool-button"
                >Quick Validate</Button
              >
              <Button variant="outline" onclick={handleOpenPlayground} class="tool-button"
                >Open Full Playground</Button
              >
            </div>
          </Card>

          <Card class="workflow-checklist-card">
            <div>
              <h2 class="section-title section-title--secondary">Recommended order</h2>
              <p class="tool-description">
                Use the quick checks to catch obvious blockers, then run the Validator app for the
                submission-ready pass.
              </p>
            </div>
            <ol class="workflow-steps" aria-label="Recommended validation workflow">
              <li>
                <span>Quick Validate</span>
                <p>Catch legacy interactions and high-cost crawl issues.</p>
              </li>
              <li>
                <span>Install Validator</span>
                <p>Add the app to the workspace and open it inside Designer.</p>
              </li>
              <li>
                <span>Run Validator</span>
                <p>Fix checklist items until the project reaches a confirmed 100% pass.</p>
              </li>
              <li>
                <span>Submit</span>
                <p>Return to the submission form and validate the published URL again.</p>
              </li>
            </ol>
          </Card>
        </div>

        <section class="required-tool-section" aria-labelledby="required-validator-title">
          <div class="required-tool-heading">
            <span class="tool-kicker">Required before submission</span>
            <h2 class="section-title section-title--secondary" id="required-validator-title">
              Webflow Way Validator
            </h2>
            <p class="tool-description">
              Install this app to produce the Validator pass that the submission form checks.
            </p>
          </div>
          <WebflowWayCard userEmail={data.user?.email} />
        </section>
      </div>

      <Card class="info-card">
        <h3 class="info-title">Validation Heuristics</h3>
        <div class="info-content">
          <p>Use validation to catch high-cost issues before review.</p>
          <ul>
            <li>Catch potential issues early in development</li>
            <li>Reduce submission review time</li>
            <li>Ensure compliance with marketplace guidelines</li>
            <li>Improve template quality and user experience</li>
          </ul>
          <div class="tip-box">
            <p class="tip-title">Best Practice</p>
            <p class="tip-text">
              Run all available validation tools before submitting your template to the marketplace.
              This keeps review cycles shorter and reduces avoidable rejections.
            </p>
          </div>
        </div>
      </Card>
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

  .validation-workflow-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.85fr);
    gap: var(--space-md);
    align-items: start;
    margin-bottom: var(--space-md);
  }

  .workflow-stack,
  .required-tool-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    min-width: 0;
  }

  :global(.primary-tool-card) {
    display: grid;
    gap: 0.8rem;
    padding: 0.9rem;
    border-radius: var(--radius-sm);
    border-color: color-mix(in srgb, var(--color-shell-border-default) 74%, transparent);
  }

  .validation-evidence {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.45rem 0.9rem;
    margin-top: 0.7rem;
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
  }

  .validation-evidence strong {
    color: var(--color-fg-primary);
    font-weight: var(--font-semibold);
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

  .tool-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-xs);
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

  .primary-tool-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-sm);
  }

  :global(.workflow-checklist-card) {
    display: grid;
    gap: var(--space-sm);
    padding: 0.9rem;
    border-radius: var(--radius-sm);
    border-color: color-mix(in srgb, var(--color-shell-border-default) 74%, transparent);
    box-shadow: none;
  }

  .workflow-steps {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--space-sm);
    margin: 0;
    padding: 0;
    list-style: none;
    counter-reset: workflow-step;
  }

  .workflow-steps li {
    counter-increment: workflow-step;
    position: relative;
    min-width: 0;
    padding: var(--space-sm);
    padding-top: 2.25rem;
    border: 1px solid color-mix(in srgb, var(--color-shell-border-default) 72%, transparent);
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--color-bg-surface) 94%, var(--color-info-muted));
  }

  .workflow-steps li::before {
    content: counter(workflow-step);
    position: absolute;
    top: var(--space-sm);
    left: var(--space-sm);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-info-muted) 48%, transparent);
    color: var(--color-info);
    font-size: var(--text-caption);
    font-weight: var(--font-semibold);
  }

  .workflow-steps span {
    display: block;
    color: var(--color-fg-primary);
    font-size: var(--text-body-sm);
    font-weight: var(--font-semibold);
    line-height: 1.25;
  }

  .workflow-steps p {
    margin: var(--space-xs) 0 0;
    color: var(--color-fg-secondary);
    font-size: var(--text-caption);
    line-height: 1.45;
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

  :global(.info-card) {
    padding: 0.9rem;
    border-radius: var(--radius-sm);
    border-color: color-mix(in srgb, var(--color-shell-border-default) 74%, transparent);
    box-shadow: none;
  }

  .info-title {
    font-family: var(--font-heading);
    font-size: var(--text-body-lg);
    font-weight: var(--font-semibold);
    letter-spacing: 0;
    color: var(--color-fg-primary);
    margin: 0 0 var(--space-sm);
  }

  .info-content {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
  }

  .info-content p {
    margin: 0 0 0.75rem;
  }

  .info-content ul {
    margin: 0 0 0.9rem;
    padding-left: 1rem;
  }

  .info-content li {
    margin-bottom: 0.35rem;
  }

  .tip-box {
    display: grid;
    gap: var(--space-xs);
    padding: var(--space-sm) var(--space-md);
    border-top: 1px solid color-mix(in srgb, var(--color-info-border) 72%, transparent);
    border-bottom: 1px solid color-mix(in srgb, var(--color-info-border) 72%, transparent);
    background: transparent;
  }

  .tip-title {
    font-weight: var(--font-medium);
    color: var(--color-fg-primary);
    margin: 0;
    font-size: var(--text-body-sm);
  }

  .tip-text {
    font-size: var(--text-caption);
    color: var(--color-fg-secondary);
    margin: 0;
  }

  @media (max-width: 640px) {
    .validation-workflow-grid,
    .workflow-steps,
    .primary-tool-actions {
      grid-template-columns: 1fr;
    }
  }
</style>
