<script lang="ts">
  import { onMount } from 'svelte';
  import { Header, Card, WebflowWayCard, BackNavigation } from '$lib/components';
  import { trackEvent } from '$lib/utils/analytics';
  import { ArrowRight, CheckCircle2, FlaskConical, Route } from 'lucide-svelte';
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

      <section class="validation-hero" aria-labelledby="validation-title">
        <div class="hero-copy">
          <span class="page-kicker">Validation</span>
          <h1 class="page-title" id="validation-title">Prepare a template for marketplace review</h1>
          <p class="page-subtitle">
            Install the Webflow Way Validator, run it in Designer, and submit only after the
            published site has a confirmed 100% pass.
          </p>
        </div>

        <div class="hero-status" aria-label="Submission gate">
          <div>
            <span>Required gate</span>
            <strong>100% Validator pass</strong>
          </div>
        </div>
      </section>

      <div class="validation-strip" aria-label="Validation workflow">
        <div>
          <span>1</span>
          <strong>Install app</strong>
        </div>
        <ArrowRight size={15} aria-hidden="true" />
        <div>
          <span>2</span>
          <strong>Run in Designer</strong>
        </div>
        <ArrowRight size={15} aria-hidden="true" />
        <div>
          <span>3</span>
          <strong>Submit with pass</strong>
        </div>
      </div>

      <div class="validator-focus-grid">
        <section class="validator-primary" aria-labelledby="required-validator-title">
          <div class="required-tool-heading">
            <span class="tool-kicker">Required before submission</span>
            <h2 class="section-title" id="required-validator-title">Required install access</h2>
            <p class="tool-description">
              Start here. This install gives the workspace access to the Designer app that creates
              the pass checked by the submission flow.
            </p>
          </div>
          <WebflowWayCard userEmail={data.user?.email} featured />
        </section>

        <div class="support-stack">
          <Card class="workflow-checklist-card">
            <div>
              <h2 class="section-title section-title--secondary">Required path</h2>
              <p class="tool-description">
                Keep this order so the submission form can verify the published pass.
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
                Fast checks for technical issues before the full Designer pass.
              </p>
            </div>
            <div class="secondary-tool-actions">
              <button class="preflight-action" type="button" onclick={handleOpenGsapValidator}>
                <span><FlaskConical size={16} /></span>
                <div>
                  <strong>Quick check</strong>
                  <small>Run a focused GSAP scan</small>
                </div>
              </button>
              <button class="preflight-action" type="button" onclick={handleOpenPlayground}>
                <span><Route size={16} /></span>
                <div>
                  <strong>Playground</strong>
                  <small>Inspect a published URL</small>
                </div>
              </button>
            </div>
          </Card>

          <Card class="submission-gate-card">
            <CheckCircle2 size={18} />
            <div>
              <h2 class="section-title section-title--secondary">Submission gate</h2>
              <p class="tool-description">
                The published site must carry the confirmed Validator pass. Publish after adding the
                script, then re-check before submitting.
              </p>
            </div>
          </Card>
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

  .validation-hero {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--space-lg);
    padding: var(--space-lg) 0 var(--space-md);
    border-bottom: 1px solid var(--color-shell-border-default);
  }

  .hero-copy {
    display: grid;
    gap: var(--space-xs);
    max-width: 52rem;
  }

  .page-kicker,
  .tool-kicker {
    color: var(--color-fg-muted);
    font-size: var(--text-caption);
    font-weight: var(--font-semibold);
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .page-title {
    margin: 0;
    color: var(--color-fg-primary);
    font-family: var(--font-heading);
    font-size: 4rem;
    font-weight: var(--font-semibold);
    letter-spacing: 0;
    line-height: 0.98;
  }

  .page-subtitle {
    max-width: 48rem;
    margin: var(--space-xs) 0 0;
    color: var(--color-fg-secondary);
    font-size: var(--text-body-lg);
    line-height: 1.45;
  }

  .hero-status {
    display: flex;
    align-items: flex-start;
    min-width: 15.25rem;
    padding: var(--space-sm);
    border: 1px solid var(--color-shell-border-default);
    border-radius: var(--radius-sm);
    background: var(--color-bg-surface);
  }

  .hero-status span {
    display: block;
    color: var(--color-fg-muted);
    font-size: var(--text-caption);
    line-height: 1.2;
  }

  .hero-status strong {
    display: block;
    margin-top: 0.15rem;
    color: var(--color-fg-primary);
    font-size: var(--text-body-sm);
    font-weight: var(--font-semibold);
    line-height: 1.25;
  }

  .validation-strip {
    display: grid;
    grid-template-columns: 1fr auto 1fr auto 1fr;
    align-items: center;
    gap: var(--space-sm);
    margin: var(--space-md) 0 var(--space-lg);
    padding: var(--space-sm);
    border: 1px solid var(--color-shell-border-default);
    border-radius: var(--radius-sm);
    background: var(--color-bg-surface);
  }

  .validation-strip > div {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    min-width: 0;
  }

  .validation-strip span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.4rem;
    height: 1.4rem;
    flex: 0 0 auto;
    border-radius: 999px;
    border: 1px solid var(--color-shell-border-default);
    color: var(--color-fg-secondary);
    background: var(--color-bg-subtle);
    font-size: var(--text-caption);
    font-weight: var(--font-semibold);
  }

  .validation-strip strong {
    min-width: 0;
    overflow: hidden;
    color: var(--color-fg-primary);
    font-size: var(--text-body-sm);
    font-weight: var(--font-semibold);
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .validation-strip :global(svg) {
    color: var(--color-fg-muted);
  }

  .validator-focus-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(19rem, 0.38fr);
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

  .section-title {
    font-family: var(--font-heading);
    font-size: var(--text-h2);
    font-weight: var(--font-semibold);
    letter-spacing: 0;
    color: var(--color-fg-primary);
    margin: 0 0 var(--space-md);
  }

  .section-title--secondary {
    margin-bottom: var(--space-xs);
    font-size: var(--text-body-lg);
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
    padding: var(--space-md);
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
    padding-left: 3rem;
    border: 1px solid color-mix(in srgb, var(--color-shell-border-default) 72%, transparent);
    border-radius: var(--radius-sm);
    background: var(--color-bg-subtle);
  }

  .workflow-steps li::before {
    content: counter(workflow-step);
    position: absolute;
    top: 0.9rem;
    left: var(--space-sm);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 999px;
    border: 1px solid var(--color-shell-border-default);
    background: var(--color-bg-surface);
    color: var(--color-fg-secondary);
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

  .preflight-action {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-sm);
    align-items: center;
    width: 100%;
    min-height: 4.25rem;
    padding: var(--space-sm);
    border: 1px solid var(--color-shell-border-default);
    border-radius: var(--radius-sm);
    color: inherit;
    background: transparent;
    cursor: pointer;
    text-align: left;
    transition:
      background-color var(--duration-micro) var(--ease-standard),
      border-color var(--duration-micro) var(--ease-standard);
  }

  .preflight-action:hover {
    border-color: color-mix(in srgb, var(--color-fg-muted) 36%, var(--color-shell-border-default));
    background: var(--color-bg-subtle);
  }

  .preflight-action:focus-visible {
    outline: none;
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-focus) 22%, transparent);
  }

  .preflight-action > span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.2rem;
    height: 2.2rem;
    border: 1px solid var(--color-shell-border-default);
    border-radius: var(--radius-sm);
    color: var(--color-fg-muted);
    background: var(--color-bg-subtle);
  }

  .preflight-action strong,
  .preflight-action small {
    display: block;
  }

  .preflight-action strong {
    color: var(--color-fg-primary);
    font-size: var(--text-body-sm);
    font-weight: var(--font-semibold);
    line-height: 1.2;
  }

  .preflight-action small {
    margin-top: 0.15rem;
    color: var(--color-fg-muted);
    font-size: var(--text-caption);
    line-height: 1.25;
  }

  :global(.submission-gate-card) {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-sm);
    padding: var(--space-md);
    border-radius: var(--radius-sm);
    border-color: var(--color-shell-border-default);
    background: var(--color-bg-surface);
  }

  :global(.submission-gate-card > svg) {
    margin-top: 0.1rem;
    color: var(--color-success);
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
    border-color: var(--color-shell-border-default);
  }

  :global(.tool-button) {
    justify-content: center;
    gap: var(--space-xs);
  }

  @media (max-width: 900px) {
    .validation-hero {
      align-items: stretch;
      flex-direction: column;
    }

    .hero-status {
      min-width: 0;
    }

    .validator-focus-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 640px) {
    .main-content {
      padding: var(--space-md) var(--space-sm);
    }

    .page-title {
      font-size: 2.25rem;
      line-height: 1.04;
    }

    .page-subtitle {
      font-size: var(--text-body);
    }

    .validation-strip {
      grid-template-columns: 1fr;
    }

    .validation-strip :global(svg) {
      display: none;
    }

    .validation-strip strong {
      white-space: normal;
    }
  }
</style>
