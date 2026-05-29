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

      <div class="page-header page-intro">
        <div class="header-content">
          <h1 class="page-title page-intro__title">Install the Webflow Way Validator</h1>
          <p class="page-subtitle page-intro__subtitle">
            Install the Validator app first. It produces the required pass that the submission flow
            checks before marketplace review.
          </p>
          <div class="validation-evidence" aria-label="Validation outcomes">
            <span><strong>Required app install</strong></span>
            <span><strong>Runs inside Designer</strong></span>
            <span><strong>Submission form checks the pass</strong></span>
          </div>
        </div>
      </div>

      <div class="validator-focus-grid">
        <section class="validator-primary" aria-labelledby="required-validator-title">
          <div class="required-tool-heading">
            <span class="tool-kicker">Required before submission</span>
            <h2 class="section-title" id="required-validator-title">Required install access</h2>
            <p class="tool-description">
              Use this install link to add the app to Webflow, open it in Designer, and generate the
              confirmed 100% Validator pass.
            </p>
          </div>
          <WebflowWayCard userEmail={data.user?.email} featured />
        </section>

        <div class="support-stack">
          <Card class="workflow-checklist-card validator-steps-card">
            <div>
              <h2 class="section-title section-title--secondary">Required path</h2>
              <p class="tool-description">
                The install action is the important step. Quick checks are optional helpers after
                this.
              </p>
            </div>
            <ol class="workflow-steps" aria-label="Recommended validation workflow">
              <li>
                <span>Install Validator</span>
                <p>Add the app to the workspace from Webflow.</p>
              </li>
              <li>
                <span>Open in Designer</span>
                <p>Add the script, publish, and run the Validator.</p>
              </li>
              <li>
                <span>Submit with pass</span>
                <p>Return to the submission flow after it reaches 100%.</p>
              </li>
            </ol>
          </Card>

          <Card class="secondary-tools-card">
            <div>
              <h2 class="section-title section-title--secondary">Optional preflight checks</h2>
              <p class="tool-description">
                Use these only when you want a fast technical read before or after running the
                Validator.
              </p>
            </div>
            <div class="secondary-tool-actions">
              <Button variant="outline" onclick={handleOpenGsapValidator} class="tool-button"
                >Quick Validate</Button
              >
              <Button variant="secondary" onclick={handleOpenPlayground} class="tool-button"
                >Open Full Playground</Button
              >
            </div>
          </Card>

          <div class="validator-note">
            <span class="tool-kicker">Review note</span>
            <p class="tool-description">
              The submission form validates the published site for the confirmed Validator pass.
              Publish after adding the script before re-checking.
            </p>
          </div>
        </div>
      </div>
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

  .validator-focus-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(300px, 0.46fr);
    gap: var(--space-lg);
    align-items: start;
    margin-bottom: var(--space-md);
  }

  .validator-primary,
  .support-stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    min-width: 0;
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

  .validation-evidence span {
    position: relative;
    padding-left: 0.8rem;
  }

  .validation-evidence span::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0.58em;
    width: 0.32rem;
    height: 0.32rem;
    border-radius: 999px;
    background: var(--color-info);
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

  :global(.workflow-checklist-card),
  :global(.secondary-tools-card) {
    display: grid;
    gap: var(--space-sm);
    padding: 0.9rem;
    border-radius: var(--radius-sm);
    border-color: color-mix(in srgb, var(--color-shell-border-default) 74%, transparent);
    box-shadow: none;
  }

  .workflow-steps {
    display: grid;
    grid-template-columns: 1fr;
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

  .secondary-tool-actions {
    display: grid;
    gap: var(--space-sm);
  }

  .validator-note {
    display: grid;
    gap: var(--space-xs);
    padding: 0 var(--space-xs);
  }

  .required-tool-heading {
    display: grid;
    gap: var(--space-xs);
  }

  .required-tool-heading .section-title {
    margin-bottom: 0;
  }

  :global(.validator-primary .webflow-way-card) {
    height: auto;
    border-color: color-mix(in srgb, var(--color-info-border) 78%, var(--color-shell-border-default));
  }

  :global(.tool-button) {
    justify-content: center;
    gap: var(--space-xs);
  }

  @media (max-width: 900px) {
    .validator-focus-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
