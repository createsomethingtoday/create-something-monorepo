<script lang="ts">
  import {
    PerformanceCardGrid,
    PerformancePageSection,
    SEO,
    type PerformanceCardItem
  } from '@create-something/canon';
  import { getAnalytics } from '@create-something/canon/analytics';
  import { ScheduleButton } from '@create-something/canon/domains/agency';
  import FunnelLadder from '$lib/components/FunnelLadder.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

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
      label: 'Send the control checklist',
      description:
        'Best for cold readers who want the approval, logging, and recovery questions first.',
      funnelStage: 'awareness',
      serviceInterest: 'AI workflow control checklist',
      submitLabel: 'Request checklist',
      successMessage: "Sent. I'll send the checklist and the next-step notes."
    },
    {
      value: 'workflow-teardown',
      label: 'Request a workflow map',
      description: 'Best when you can name the stack, owner, bottleneck, and risk boundary.',
      funnelStage: 'consideration',
      serviceInterest: 'Workflow Map',
      submitLabel: 'Request map',
      successMessage: "Sent. I'll review the workflow and reply with the likely operating path."
    },
    {
      value: 'workflow-mapping',
      label: 'Book a mapping session',
      description:
        'Best when there is a real workflow, owner, approval authority, and decision timeline.',
      funnelStage: 'decision',
      serviceInterest: 'Workflow mapping session',
      submitLabel: 'Send mapping details',
      successMessage: "Received. I'll review the details before confirming the right mapping path."
    }
  ];

  const laneOptions: Array<{ value: ServiceLane; label: string }> = [
    { value: 'not_sure', label: 'Not sure yet' },
    { value: 'workflow_infrastructure', label: 'Map / Build' },
    { value: 'reliability_and_control', label: 'Support Recovery / Ongoing Control' },
    { value: 'enterprise_extension', label: 'Enterprise Extension' },
    { value: 'system_development_referral', label: 'System Development Referral' }
  ];

  const contactIntentContent: Record<
    ContactIntent,
    {
      seoTitle: string;
      seoDescription: string;
      eyebrow: string;
      title: string;
      description: string;
      formTitle: string;
      formDescription: string;
      messageLabel: string;
      messageHelper: string;
      messagePlaceholder: string;
    }
  > = {
    'governance-checklist': {
      seoTitle: 'Get the Workflow Control Checklist | CREATE SOMETHING .agency',
      seoDescription:
        'Request the workflow control checklist for approval rules, blocked states, receipts, and recovery questions before AI acts.',
      eyebrow: 'Control checklist',
      title: 'Get the questions before you map the workflow.',
      description:
        'Use the checklist to name what an agent can do, what needs approval, what must stop, and what evidence your team should keep.',
      formTitle: 'Request the control checklist',
      formDescription:
        'Send where to reply and one workflow you are considering. A short note is enough for a cold start.',
      messageLabel: 'Which workflow should the checklist help you evaluate?',
      messageHelper:
        'Name the tools, handoff, or decision boundary if you know it. Do not include credentials or client secrets.',
      messagePlaceholder:
        'e.g., We want AI to help with support follow-up, but need approval rules, blocked states, and receipts before anything can act.'
    },
    'workflow-teardown': {
      seoTitle: 'Request a Workflow Map | CREATE SOMETHING .agency',
      seoDescription:
        'Request a workflow map for the stack, bottleneck, risk boundary, owners, action rules, audit trail, and first controlled pilot.',
      eyebrow: 'Workflow map',
      title: 'Bring the workflow that needs a control path.',
      description:
        'Use this path when you can name the stack, bottleneck, owner, and the place where approval or evidence matters. The first output is a fixed-scope map, not an open-ended build.',
      formTitle: 'Request a workflow map',
      formDescription:
        'Share the current workflow shape so I can identify the likely operating path, first controlled pilot, and no-build stop condition.',
      messageLabel: 'Which workflow needs attention first?',
      messageHelper:
        'Name the stack, bottleneck, owner, and what should require approval before AI takes action. Do not include credentials or client secrets.',
      messagePlaceholder:
        'e.g., Zendesk + Shopify + Stripe. Support can draft replies, but credits, refunds, and account changes need approval rules and receipts before anything can act.'
    },
    'workflow-mapping': {
      seoTitle: 'Start a Workflow Mapping Session | CREATE SOMETHING .agency',
      seoDescription:
        'Send workflow mapping details when the workflow, owner, approval authority, and decision timeline are already clear.',
      eyebrow: 'Mapping session',
      title: 'Start when the workflow and owner are clear.',
      description:
        'Use this path when there is a real workflow, a decision owner, and enough urgency to map the allowed, approval-needed, blocked, and receipt states before a build decision.',
      formTitle: 'Send mapping details',
      formDescription:
        'Share the workflow, owner, systems, timeline, and first decision you need to make before booking.',
      messageLabel: 'What should we map in the session?',
      messageHelper:
        'Name the workflow, owner, source systems, approval authority, and decision timeline. Do not include credentials or client secrets.',
      messagePlaceholder:
        'e.g., Finance needs an approval path before AI drafts vendor follow-up. The owner is ops, the source systems are QuickBooks and Notion, and we need a decision this month.'
    }
  };

  const contactPathCards: PerformanceCardItem[] = contactPathOptions.map((option) => ({
    eyebrow: option.funnelStage,
    icon:
      option.funnelStage === 'awareness'
        ? 'document'
        : option.funnelStage === 'consideration'
          ? 'search'
          : 'check',
    title: option.label,
    detail: option.description
  }));

  const contactSource = $derived(data.contactSource);
  const contactCampaign = $derived(data.contactCampaign);
  const initialIntent = $derived(data.contactIntent as ContactIntent);
  const initialLane = $derived(data.contactLane as ServiceLane);

  function initial<T>(read: () => T): T {
    return read();
  }

  let selectedIntent = $state<ContactIntent>(initial(() => data.contactIntent as ContactIntent));
  let selectedLane = $state<ServiceLane>(initial(() => data.contactLane as ServiceLane));
  let submitting = $state(false);
  let submitMessage = $state('');
  let submitSuccess = $state(false);
  const selectedPath = $derived(
    contactPathOptions.find((option) => option.value === selectedIntent) ?? contactPathOptions[1]
  );
  const selectedContent = $derived(contactIntentContent[selectedIntent]);

  $effect(() => {
    selectedIntent = initialIntent;
    selectedLane = initialLane;
    submitMessage = '';
  });

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
        selectedIntent = initialIntent;
        selectedLane = initialLane;
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
  title={selectedContent.seoTitle}
  description={selectedContent.seoDescription}
  keywords="workflow mapping, production automation, reliability controls, enterprise workflows, custom mcp, automation risk"
  ogImage="/og-image.png"
  propertyName="agency"
/>

<PerformancePageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  expression="editorial"
  eyebrow={selectedContent.eyebrow}
  title={selectedContent.title}
  description={selectedContent.description}
>
  {#snippet aside()}
    <PerformanceCardGrid items={contactPathCards} columns={1} ariaLabel="Contact path options" />
  {/snippet}
</PerformancePageSection>

<section class="contact-section">
  <div class="contact-container">
    <div class="contact-option">
      <h2>{selectedContent.formTitle}</h2>
      <p>{selectedContent.formDescription}</p>

      <form class="contact-form" onsubmit={handleSubmit}>
        <fieldset class="form-field path-field">
          <legend class="form-label">What should happen next?</legend>
          <div class="path-options">
            {#each contactPathOptions as option}
              <label class="path-option" class:selected={selectedIntent === option.value}>
                <input
                  type="radio"
                  name="intent"
                  value={option.value}
                  bind:group={selectedIntent}
                />
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
          <label for="message" class="form-label">{selectedContent.messageLabel}</label>
          <p class="form-helper">{selectedContent.messageHelper}</p>
          <textarea
            id="message"
            name="message"
            required
            rows="4"
            class="form-input form-textarea"
            placeholder={selectedContent.messagePlaceholder}
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

    <div class="contact-option contact-option--calendar">
      <h2>Ready to book?</h2>
      <p>
        Use the calendar when you can bring one real workflow, the tools involved, who owns the
        decision, and what needs to be decided.
      </p>
      <div class="cal-button">
        <ScheduleButton variant="primary" size="lg" />
        <a href="/book" class="calendar-link">Review scheduling details</a>
      </div>
    </div>
  </div>
</section>

<PerformancePageSection
  variant="white"
  eyebrow="Funnel routing"
  title="One intake path, four levels of commitment."
>
  {#snippet after()}
    <FunnelLadder />
  {/snippet}
</PerformancePageSection>

<section class="email-section">
  <div class="section-container">
    <p class="email-text">
      Or email directly: <a href="mailto:micah@createsomething.agency" class="email-link"
        >micah@createsomething.agency</a
      >
    </p>
  </div>
</section>

<style>
  .section-container {
    width: min(var(--content-width-performance, 85rem), calc(100% - 2.5rem));
    margin: 0 auto;
  }

  .contact-section {
    padding: 4.5rem 0;
    background: var(--color-performance-paper, #f3f3f0);
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .contact-container {
    width: min(var(--content-width-performance, 85rem), calc(100% - 2.5rem));
    margin: 0 auto;
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(18rem, 0.9fr);
    gap: 1rem;
    align-items: start;
  }

  .contact-option {
    padding: 1.15rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-md, 4px);
    background: var(--color-performance-panel, #ffffff);
    color: var(--color-performance-ink, #090909);
  }

  .contact-option--calendar {
    border-color: var(--color-performance-line-strong, #9c9c96);
    background:
      linear-gradient(90deg, rgba(10, 14, 25, 0.035) 1px, transparent 1px) 0 0 / 3rem 3rem,
      color-mix(in srgb, var(--color-performance-signal-soft, #dce8f5) 18%, white);
  }

  .contact-option h2 {
    margin: 0 0 0.65rem;
    color: var(--color-performance-ink, #090909);
    font-size: 1.75rem;
    font-weight: var(--font-performance-medium);
    line-height: 1.1;
  }

  .contact-option > p {
    margin: 0 0 1.25rem;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.95rem;
    line-height: 1.55;
  }

	.cal-button {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
	}

	.calendar-link {
		color: var(--color-performance-ink, #090909);
		font-size: 0.95rem;
		font-weight: var(--font-performance-medium);
		text-decoration: underline;
		text-underline-offset: 0.18em;
	}

  .contact-option :global(.booking-cta) {
    border-radius: var(--radius-performance-sm, 4px);
    box-shadow: none;
    letter-spacing: 0;
  }

  .contact-option :global(.booking-cta.primary) {
    background: var(--color-performance-ink, #090909);
    border: 1px solid var(--color-performance-ink, #090909);
    color: #ffffff;
  }

  .contact-option :global(.booking-cta.primary:hover) {
    background: #1a2030;
    border-color: #1a2030;
  }

  .contact-form {
    display: grid;
    gap: 1rem;
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
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.76rem;
    font-weight: var(--font-performance-medium);
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .form-label span {
    color: var(--color-performance-muted, #5e6268);
    font-weight: 400;
  }

  .form-helper {
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.86rem;
    line-height: 1.45;
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
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-paper, #f3f3f0);
    cursor: pointer;
    transition:
      border-color 160ms ease,
      background 160ms ease;
  }

  .path-option:hover,
  .path-option.selected {
    border-color: var(--color-performance-signal, #0057b8);
    background: color-mix(in srgb, var(--color-performance-signal-soft, #dce8f5) 42%, white);
  }

  .path-option input {
    margin-top: 0.22rem;
    accent-color: var(--color-performance-signal, #0057b8);
  }

  .path-option span {
    display: grid;
    gap: 0.28rem;
  }

  .path-option strong {
    color: var(--color-performance-ink, #090909);
    font-size: 0.9rem;
    line-height: 1.25;
  }

  .path-option small {
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.8rem;
    line-height: 1.45;
  }

  .form-input {
    padding: 0.75rem 1rem;
    background: var(--color-performance-panel, #ffffff);
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    color: var(--color-performance-ink, #090909);
    font-size: 1rem;
    transition: border-color var(--duration-performance-micro, 200ms) var(--ease-performance-standard);
  }

  .form-input::placeholder {
    color: var(--color-performance-muted, #5e6268);
  }

  .form-input:focus {
    outline: 2px solid var(--color-performance-focus);
    outline-offset: 2px;
    border-color: var(--color-performance-signal, #0057b8);
  }

  .form-textarea {
    resize: none;
    min-height: 8.75rem;
  }

  .form-submit {
    padding: 0.75rem 1.5rem;
    background: var(--color-performance-ink, #090909);
    color: #ffffff;
    font-size: 1rem;
    font-weight: var(--font-performance-semibold);
    border: 1px solid var(--color-performance-ink, #090909);
    border-radius: var(--radius-performance-sm, 4px);
    cursor: pointer;
    transition:
      background var(--duration-performance-micro, 200ms) var(--ease-performance-standard),
      border-color var(--duration-performance-micro, 200ms) var(--ease-performance-standard),
      opacity var(--duration-performance-micro, 200ms) var(--ease-performance-standard);
  }

  .form-submit:hover:not(:disabled) {
    background: #1a2030;
    border-color: #1a2030;
    opacity: 1;
  }

  .form-submit:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .form-message {
    margin: 0;
    padding: 0.75rem;
    border-radius: var(--radius-performance-sm, 4px);
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .form-message.success {
    background: var(--color-performance-success-muted);
    color: var(--color-performance-success);
    border: 1px solid var(--color-performance-success-border);
  }

  .form-message.error {
    background: var(--color-performance-error-muted);
    color: var(--color-performance-error);
    border: 1px solid var(--color-performance-error-border);
  }

  .email-section {
    padding: 2.5rem 0;
    text-align: center;
    background: var(--color-performance-panel, #ffffff);
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .email-text {
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.95rem;
  }

  .email-link {
    color: var(--color-performance-ink, #090909);
    font-weight: var(--font-performance-medium);
    transition: opacity var(--duration-performance-micro, 200ms) var(--ease-performance-standard);
  }

  .email-link:hover {
    opacity: 0.7;
  }

  @media (max-width: 768px) {
    .contact-container,
    .section-container {
      width: min(100% - 1.5rem, var(--content-width-performance, 85rem));
    }

    .contact-container {
      grid-template-columns: 1fr;
    }

    .contact-section {
      padding-block: 2.75rem;
    }
  }
</style>
