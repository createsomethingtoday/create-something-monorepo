<script lang="ts">
  import { browser } from '$app/environment';
  import { SEO } from '@create-something/canon';
  import { getAnalytics } from '@create-something/canon/analytics';
  import { SavvyCalButton } from '@create-something/canon/domains/agency';
  import { AnimatedGridPattern, BlurFade } from '@create-something/canon/magicui';
  import FunnelLadder from '$lib/components/FunnelLadder.svelte';

  type ContactIntent = 'governance-checklist' | 'workflow-teardown' | 'workflow-mapping';
  type ServiceLane =
    | 'workflow_infrastructure'
    | 'reliability_and_control'
    | 'enterprise_extension'
    | 'system_development_referral'
    | 'not_sure';

  const contactPathOptions: Array<{
    value: ContactIntent;
    label: string;
    description: string;
    funnelStage: 'awareness' | 'consideration' | 'decision';
    serviceInterest: string;
    submitLabel: string;
    successMessage: string;
  }> = [
    {
      value: 'governance-checklist',
      label: 'Send the trust checklist',
      description: 'Best for cold readers who want the approval, logging, and recovery questions first.',
      funnelStage: 'awareness',
      serviceInterest: 'AI workflow trust checklist',
      submitLabel: 'Request checklist',
      successMessage: "Sent. I'll send the checklist and the next-step notes."
    },
    {
      value: 'workflow-teardown',
      label: 'Request a workflow map',
      description: 'Best when you can name the stack, bottleneck, and risk boundary.',
      funnelStage: 'consideration',
      serviceInterest: 'Workflow trust map',
      submitLabel: 'Request map',
      successMessage: "Sent. I'll review the workflow and reply with the likely operating path."
    },
    {
      value: 'workflow-mapping',
      label: 'I am ready to map the workflow',
      description: 'Best when there is a real workflow, owner, approval authority, and decision timeline.',
      funnelStage: 'decision',
      serviceInterest: 'Workflow mapping session',
      submitLabel: 'Send mapping details',
      successMessage: "Sent. I'll review the details before the mapping path."
    }
  ];

  const laneOptions: Array<{ value: ServiceLane; label: string }> = [
    { value: 'not_sure', label: 'Not sure yet' },
    { value: 'workflow_infrastructure', label: 'Workflow Pilot' },
    { value: 'reliability_and_control', label: 'Trust Layer' },
    { value: 'enterprise_extension', label: 'Enterprise Extension' },
    { value: 'system_development_referral', label: 'System Development Referral' }
  ];

  const contactUrlParams = browser ? new URLSearchParams(window.location.search) : new URLSearchParams();

  function normalizeQueryToken(value: string | null, fallback: string) {
    const normalized = (value ?? fallback)
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64);

    return normalized || fallback;
  }

  function normalizeIntent(value: string | null): ContactIntent {
    return contactPathOptions.some((option) => option.value === value)
      ? (value as ContactIntent)
      : 'workflow-teardown';
  }

  function normalizeLane(value: string | null): ServiceLane {
    return laneOptions.some((option) => option.value === value)
      ? (value as ServiceLane)
      : 'not_sure';
  }

  const contactSource = normalizeQueryToken(contactUrlParams.get('source'), 'contact');
  const contactCampaign = normalizeQueryToken(contactUrlParams.get('campaign'), '');
  const initialIntent = normalizeIntent(contactUrlParams.get('intent'));
  const initialLane = normalizeLane(contactUrlParams.get('lane'));

  let selectedIntent = $state<ContactIntent>(initialIntent);
  let selectedLane = $state<ServiceLane>(initialLane);
  let submitting = $state(false);
  let submitMessage = $state('');
  let submitSuccess = $state(false);
  const selectedPath = $derived(
    contactPathOptions.find((option) => option.value === selectedIntent) ?? contactPathOptions[1]
  );

  async function handleSubmit(event: Event) {
    event.preventDefault();
    submitting = true;
    submitMessage = '';

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      const analytics = getAnalytics();
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.get('name'),
          email: formData.get('email'),
          company: formData.get('company') || undefined,
          message: formData.get('message'),
          service: selectedPath.serviceInterest,
          source: contactSource,
          intent: selectedIntent,
          lane: selectedLane,
          campaign: contactCampaign || undefined,
          session_id: analytics?.getSessionId(),
          source_property: analytics?.getSourceProperty() ?? undefined,
          landing_url: typeof window !== 'undefined' ? window.location.href : undefined,
          referrer: typeof document !== 'undefined' ? document.referrer : undefined
        })
      });

      const result = (await response.json()) as { success?: boolean; message?: string };

      if (response.ok && result.success) {
        submitSuccess = true;
        submitMessage = selectedPath.successMessage;
        analytics?.conversion('contact_submitted', {
          source: contactSource,
          intent: selectedIntent,
          lane: selectedLane,
          funnelStage: selectedPath.funnelStage,
          serviceInterest: selectedPath.serviceInterest,
          surface: 'contact_form'
        });
        form.reset();
      } else {
        submitSuccess = false;
        submitMessage = result.message || 'Something went wrong. Try again.';
      }
    } catch (error) {
      submitSuccess = false;
      submitMessage = 'Something went wrong. Try again.';
    } finally {
      submitting = false;
    }
  }
</script>

<SEO
  title="Start With the Right Workflow | CREATE SOMETHING .agency"
  description="Choose the right next step: get the trust checklist, request a workflow map, or book a mapping session when the workflow is ready."
  keywords="workflow mapping, production automation, reliability controls, enterprise workflows, custom mcp, automation risk"
  ogImage="/og-image.svg"
  propertyName="agency"
/>

<!-- Hero -->
<section class="hero">
  <div class="hero-grid-container">
    <AnimatedGridPattern
      numSquares={25}
      maxOpacity={0.08}
      duration={4}
      repeatDelay={2}
      width={60}
      height={60}
      class="hero-animated-grid"
    />
  </div>
  <div class="hero-content">
    <BlurFade delay={0}>
      <p class="hero-eyebrow">Contact</p>
    </BlurFade>
    <BlurFade delay={0.1}>
      <h1 class="hero-title">Start with the right amount of commitment.</h1>
    </BlurFade>
    <BlurFade delay={0.2}>
      <p class="hero-detail">
        Cold readers can take the trust checklist. Warm buyers can request a workflow map.
        High-intent teams can book the mapping session when the workflow and owner are already clear.
      </p>
    </BlurFade>
  </div>
</section>

<FunnelLadder />

<!-- Contact Options -->
<section class="contact-section">
  <div class="contact-container">
    <BlurFade delay={0.1}>
      <div class="contact-option">
        <h2>Choose the next step</h2>
        <p>
          The form routes cold, warm, and decision-stage requests into the same analytics and lead
          pipeline without forcing everyone into a calendar.
        </p>

        <form class="contact-form" onsubmit={handleSubmit}>
          <fieldset class="form-field path-field">
            <legend class="form-label">What should happen next?</legend>
            <div class="path-options">
              {#each contactPathOptions as option}
                <label class="path-option" class:selected={selectedIntent === option.value}>
                  <input type="radio" name="intent" value={option.value} bind:group={selectedIntent} />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                </label>
              {/each}
            </div>
          </fieldset>

          <div class="form-field">
            <label for="name" class="form-label">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              required
              class="form-input"
              autocomplete="name"
            />
          </div>

          <div class="form-field">
            <label for="email" class="form-label">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              class="form-input"
              autocomplete="email"
            />
          </div>

          <div class="form-field">
            <label for="company" class="form-label">Company <span>(optional)</span></label>
            <input
              type="text"
              id="company"
              name="company"
              class="form-input"
              autocomplete="organization"
            />
          </div>

          <div class="form-field">
            <label for="lane" class="form-label">Operating lane</label>
            <select id="lane" name="lane" class="form-input" bind:value={selectedLane}>
              {#each laneOptions as lane}
                <option value={lane.value}>{lane.label}</option>
              {/each}
            </select>
          </div>

          <div class="form-field">
            <label for="message" class="form-label"
              >Which workflow needs attention first?</label
            >
            <p class="form-helper">
              Name the stack, bottleneck, owner, and what should require approval before AI takes
              action. Do not include credentials or client secrets.
            </p>
            <textarea
              id="message"
              name="message"
              required
              rows="4"
              class="form-input form-textarea"
              placeholder="e.g., HubSpot + Notion + Slack. Leads move cleanly until handoff, then the team rebuilds context by hand. We need the first safe wedge before adding more automation."
            ></textarea>
          </div>

          <button type="submit" disabled={submitting} class="form-submit">
            {submitting ? 'Sending...' : selectedPath.submitLabel}
          </button>

          {#if submitMessage}
            <p
              class="form-message"
              class:success={submitSuccess}
              class:error={!submitSuccess}
              role="alert"
            >
              {submitMessage}
            </p>
          {/if}
        </form>
      </div>
    </BlurFade>

    <BlurFade delay={0.2}>
      <div class="contact-option">
        <h2>Already high-intent?</h2>
        <p>
          Use the calendar when you can bring one real workflow, the tools involved, the approval
          owner, and the decision you need to make.
        </p>
        <div class="cal-button">
          <SavvyCalButton variant="primary" size="lg" />
        </div>
      </div>
    </BlurFade>
  </div>
</section>

<!-- Direct Email -->
<section class="email-section">
  <div class="section-container">
    <BlurFade delay={0.3}>
      <p class="email-text">
        Or email directly: <a href="mailto:micah@createsomething.agency" class="email-link"
          >micah@createsomething.agency</a
        >
      </p>
    </BlurFade>
  </div>
</section>

<style>
  /* Section containers */
  .section-container {
    max-width: var(--content-width-xl);
    margin: 0 auto;
    padding: 0 var(--container-padding, 1.5rem);
  }

  /* Hero with grid background */
  .hero {
    position: relative;
    padding: var(--section-padding-lg, 8rem) var(--container-padding, 1.5rem)
      var(--section-padding, 6rem);
    overflow: hidden;
  }

  .hero-grid-container {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  :global(.hero-animated-grid) {
    mask-image: radial-gradient(600px circle at 50% 35%, white, transparent);
    -webkit-mask-image: radial-gradient(600px circle at 50% 35%, white, transparent);
  }

  .hero-content {
    position: relative;
    text-align: center;
    max-width: var(--content-width-xl);
    margin: 0 auto;
  }

  .hero-eyebrow {
    font-size: var(--text-body-sm);
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--color-fg-muted);
    margin-bottom: var(--space-5, 1.5rem);
  }

  .hero-title {
    font-size: var(--text-display);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    margin-bottom: var(--space-5, 1.5rem);
    line-height: 1.1;
    letter-spacing: var(--tracking-tighter, -0.025em);
  }

  .hero-detail {
    font-size: var(--text-body-lg);
    color: var(--color-fg-secondary);
    line-height: var(--leading-relaxed);
  }

  /* Contact Section */
  .contact-section {
    padding: clamp(3rem, 6vw, 5rem) var(--container-padding, 1.5rem)
      var(--section-padding, 6rem);
  }

  .contact-container {
    max-width: var(--content-width-xl);
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-8, 3rem);
  }

  .contact-option {
    padding: var(--space-6, 2rem);
    border-radius: var(--radius-lg, 12px);
    border: 1px solid var(--color-shell-border-default);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.018)),
      color-mix(in srgb, var(--color-shell-surface-secondary) 82%, transparent);
  }

  .contact-option h2 {
    font-size: var(--text-h3);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    margin-bottom: var(--space-3, 0.75rem);
  }

  .contact-option > p {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    line-height: var(--leading-relaxed);
    margin-bottom: var(--space-5, 1.5rem);
  }

  .cal-button {
    display: flex;
  }

  /* Contact Form */
  .contact-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4, 1rem);
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    border: 0;
    margin: 0;
    padding: 0;
  }

  .form-label {
    font-size: var(--text-body-sm);
    font-weight: var(--font-medium);
    color: var(--color-fg-muted);
  }

  .form-label span {
    color: var(--color-fg-tertiary);
    font-weight: 400;
  }

  .form-helper {
    font-size: var(--text-caption);
    color: var(--color-fg-tertiary);
    margin-top: var(--space-1, 0.25rem);
  }

  .path-field {
    gap: 0.75rem;
  }

  .path-options {
    display: grid;
    gap: 0.65rem;
  }

  .path-option {
    display: grid;
    grid-template-columns: 1rem minmax(0, 1fr);
    gap: 0.75rem;
    align-items: start;
    padding: 0.85rem;
    border: 1px solid var(--color-shell-border-default);
    border-radius: var(--radius-md, 8px);
    background: rgba(255, 255, 255, 0.025);
    cursor: pointer;
    transition:
      border-color 160ms ease,
      background 160ms ease;
  }

  .path-option:hover,
  .path-option.selected {
    border-color: var(--color-shell-border-strong);
    background: var(--color-shell-surface-hover);
  }

  .path-option input {
    margin-top: 0.22rem;
    accent-color: var(--color-fg-primary);
  }

  .path-option span {
    display: grid;
    gap: 0.28rem;
  }

  .path-option strong {
    color: var(--color-fg-primary);
    font-size: var(--text-body-sm);
    line-height: 1.25;
  }

  .path-option small {
    color: var(--color-fg-tertiary);
    font-size: var(--text-caption);
    line-height: 1.45;
  }

  .form-input {
    padding: 0.75rem 1rem;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-shell-border-default);
    border-radius: var(--radius-md, 8px);
    color: var(--color-fg-primary);
    font-size: var(--text-body);
    transition: border-color var(--duration-micro, 200ms) var(--ease-standard);
  }

  .form-input::placeholder {
    color: var(--color-fg-muted);
  }

  .form-input:focus {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
    border-color: var(--color-fg-primary);
  }

  .form-textarea {
    resize: none;
    min-height: 100px;
  }

  .form-submit {
    padding: 0.75rem 1.5rem;
    background: var(--color-fg-primary);
    color: var(--color-bg-pure);
    font-size: var(--text-body);
    font-weight: var(--font-semibold);
    border-radius: var(--radius-lg, 12px);
    border: none;
    cursor: pointer;
    transition: opacity var(--duration-micro, 200ms) var(--ease-standard);
  }

  .form-submit:hover:not(:disabled) {
    opacity: 0.9;
  }

  .form-submit:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .form-message {
    padding: 0.75rem;
    border-radius: var(--radius-md, 8px);
    font-size: var(--text-body-sm);
    text-align: center;
  }

  .form-message.success {
    background: var(--color-success-muted);
    color: var(--color-success);
    border: 1px solid var(--color-success-border);
  }

  .form-message.error {
    background: var(--color-error-muted);
    color: var(--color-error);
    border: 1px solid var(--color-error-border);
  }

  /* Email Section */
  .email-section {
    padding: var(--space-8, 3rem) 0;
    text-align: center;
  }

  .email-text {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }

  .email-link {
    color: var(--color-fg-primary);
    transition: opacity var(--duration-micro, 200ms) var(--ease-standard);
  }

  .email-link:hover {
    opacity: 0.7;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .hero {
      padding: var(--layout-3, 4rem) var(--container-padding, 1.5rem);
    }

    .hero-title {
      font-size: var(--text-h1);
    }

    .contact-container {
      grid-template-columns: 1fr;
    }

    .contact-section {
      padding: var(--layout-3, 4rem) var(--container-padding, 1.5rem);
    }
  }
</style>
