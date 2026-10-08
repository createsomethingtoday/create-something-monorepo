<script lang="ts">
  import { createContactRequest } from '$lib/contact/request';
  let contactRequest: ReturnType<typeof createContactRequest> | undefined;
  import {
    Button,
    PerformancePageSection,
    SEO
  } from '@create-something/canon';
  import { page } from '$app/stores';
  import { getAnalytics } from '@create-something/canon/analytics';
  import { ScheduleButton } from '@create-something/canon/domains/agency';
  import FunnelLadder from '$lib/components/FunnelLadder.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  type ContactIntent =
    | 'system-support'
    | 'membership'
    | 'governance-checklist'
    | 'workflow-teardown'
    | 'workflow-mapping';
  type ServiceLane =
    | 'workflow_infrastructure'
    | 'reliability_and_control'
    | 'enterprise_extension'
    | 'system_development_referral'
    | 'not_sure';
  type MembershipPlan = 'focused' | 'team';

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
      value: 'system-support',
      label: 'Get software support',
      description: 'Get remote help with a failing automation, integration, form or AI-built project.',
      funnelStage: 'decision',
      serviceInterest: 'Remote software and workflow support',
      submitLabel: 'Send support inquiry',
      successMessage: 'Received. We will review the problem and reply about fit and scope.'
    },
    {
      value: 'membership',
      label: 'Discuss membership',
      description:
        'Focused is $900/month for one milestone, two check-ins and two remote work sessions. Team is $2,500/month for two milestones, two check-ins and four remote sessions.',
      funnelStage: 'decision',
      serviceInterest: 'Agent engineering membership',
      submitLabel: 'Send membership inquiry',
      successMessage:
        'Received. We will review your workflow and reply with fit and onboarding details.'
    },
    {
      value: 'governance-checklist',
      label: 'Send the control checklist',
      description: 'Start here if you want a checklist for planning an AI task.',
      funnelStage: 'awareness',
      serviceInterest: 'AI workflow control checklist',
      submitLabel: 'Request checklist',
      successMessage: "Sent. I'll send the checklist and the next-step notes."
    },
    {
      value: 'workflow-teardown',
      label: 'Request a workflow map',
      description: 'Ask us to review a task, its tools, and the part that slows you down.',
      funnelStage: 'consideration',
      serviceInterest: 'Workflow Map',
      submitLabel: 'Request map',
      successMessage: 'Sent. I’ll review the task and reply with a suggested next step.'
    },
    {
      value: 'workflow-mapping',
      label: 'Book a mapping session',
      description: 'Talk through a task with the person responsible for it.',
      funnelStage: 'decision',
      serviceInterest: 'Workflow mapping session',
      submitLabel: 'Send mapping details',
      successMessage: 'Received. I’ll review the details and reply about the next step.'
    }
  ];

  const laneOptions: Array<{ value: ServiceLane; label: string }> = [
    { value: 'not_sure', label: 'Not sure yet' },
    { value: 'workflow_infrastructure', label: 'Plan or build an AI task' },
    { value: 'reliability_and_control', label: 'Fix or support a live system' },
    { value: 'enterprise_extension', label: 'A larger or more complex project' },
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
    'system-support': {
      seoTitle: 'Remote Software Support Inquiry | CREATE SOMETHING',
      seoDescription: 'Request remote help with a failing automation, integration, form or AI-built project. Agree on scope before work begins.',
      eyebrow: 'Remote software support',
      title: 'Tell us what stopped working.',
      description: 'Bring one software or workflow problem. We review fit, then agree on scope, price and access before work begins.',
      formTitle: 'Send a support inquiry',
      formDescription: 'A short description is enough to start. This form does not book emergency support.',
      messageLabel: 'What is failing, and what should happen instead?',
      messageHelper: 'Name the tools, the last working state and who owns the system. Do not include passwords, API keys or private customer records.',
      messagePlaceholder: 'Our form stopped sending leads to Airtable. It last worked on… The system owner is…'
    },
    membership: {
      seoTitle: 'Discuss Membership | CREATE SOMETHING',
      seoDescription: 'Discuss Focused support at $900/month or Team support at $2,500/month before payment.',
      eyebrow: 'AI-native tech support',
      title: 'Start with the workflow you want to improve.',
      description:
        'Focused is $900/month for one workstream and one milestone, with two check-ins and two remote work sessions. Team is $2,500/month for up to two workstreams and two milestones, with two check-ins and four remote sessions. We agree on scope before payment. Project costs are separate.',
      formTitle: 'Discuss membership',
      formDescription: 'Tell us where you are starting and what is getting in the way.',
      messageLabel: 'What would you like help with?',
      messageHelper:
        'Include your tools, the result you want and whether AI usage is involved. We will agree on any development and runtime budgets before billable work. Do not include API keys, passwords or client secrets.',
      messagePlaceholder: 'We want to improve one workflow. We currently use…'
    },
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
        'Send where to reply and one workflow you are considering. A short note is enough.',
      messageLabel: 'Which workflow should the checklist help you evaluate?',
      messageHelper:
        'Tell us the tools you use and what you want help with. Do not include credentials or client secrets.',
      messagePlaceholder:
        'e.g., We want AI to help with support follow-up, but need approval rules, blocked states, and receipts before anything can act.'
    },
    'workflow-teardown': {
      seoTitle: 'Request a Workflow Map | CREATE SOMETHING .agency',
      seoDescription:
        'Request a workflow map for the stack, bottleneck, risk boundary, owners, action rules, audit trail, and first controlled pilot.',
      eyebrow: 'Workflow map',
      title: 'Tell us which task needs attention.',
      description:
        'Tell us how the task works today, who handles it, and what slows it down. The first project is a workflow plan with an agreed scope.',
      formTitle: 'Request a workflow map',
      formDescription:
        'Describe the task so we can suggest a first step and assess whether building an agent would help.',
      messageLabel: 'Which workflow needs attention first?',
      messageHelper:
        'List the tools, the problem, who handles it, and what needs approval. Do not include credentials or client secrets.',
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
        'Send a task you want to improve and who is responsible for it. We’ll discuss what AI could do and what should stay with a person.',
      formTitle: 'Send mapping details',
      formDescription: 'Tell us the task, tools, person responsible, and timing.',
      messageLabel: 'What should we map in the session?',
      messageHelper:
        'Describe the task, the tools, who approves the work, and when you need it. Do not include credentials or client secrets.',
      messagePlaceholder:
        'e.g., Finance needs an approval path before AI drafts vendor follow-up. The owner is ops, the source systems are QuickBooks and Notion, and we need a decision this month.'
    }
  };

  const contactSource = $derived(data.contactSource);
  const contactCampaign = $derived(data.contactCampaign);
  const initialIntent = $derived(data.contactIntent as ContactIntent);
  const initialLane = $derived(data.contactLane as ServiceLane);
  const initialPlan = $derived(data.contactPlan as MembershipPlan);

  function initial<T>(read: () => T): T {
    return read();
  }

  let selectedIntent = $state<ContactIntent>(initial(() => data.contactIntent as ContactIntent));
  let selectedLane = $state<ServiceLane>(initial(() => data.contactLane as ServiceLane));
  let selectedPlan = $state<MembershipPlan>(initial(() => data.contactPlan as MembershipPlan));
  let submitting = $state(false);
  let submitMessage = $state('');
  let submitSuccess = $state(false);
  const selectedPath = $derived(
    contactPathOptions.find((option) => option.value === selectedIntent) ?? contactPathOptions[1]
  );
  const hasChosenIntent = $derived(contactPathOptions.some(option => option.value === $page.url.searchParams.get('intent')));
  const selectedContent = $derived(contactIntentContent[selectedIntent]);

  $effect(() => {
    selectedIntent = initialIntent;
    selectedLane = initialLane;
    selectedPlan = initialPlan;
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
      if (!contactRequest) {
        let storage: Storage | undefined;
        try { storage = window.sessionStorage; } catch { /* Storage may be disabled. */ }
        contactRequest = createContactRequest(storage);
      }
      const result = await contactRequest({
          name: formData.get('name'),
          email: formData.get('email'),
          company: formData.get('company') || undefined,
          message: formData.get('message'),
          service: selectedIntent === 'membership'
            ? `${selectedPath.serviceInterest}: ${selectedPlan === 'team' ? 'Team' : 'Focused'}`
            : selectedPath.serviceInterest,
          source: contactSource,
          intent: selectedIntent,
          lane: selectedLane,
          campaign: contactCampaign || undefined,
          session_id: analytics?.getSessionId(),
          source_property: analytics?.getSourceProperty() ?? undefined,
          landing_url: typeof window !== 'undefined' ? window.location.href : undefined,
          referrer: typeof document !== 'undefined' ? document.referrer : undefined
      });

      if (result.success) {
        submitSuccess = true;
        submitMessage = result.message;
        analytics?.conversion('contact_submitted', {
          source: contactSource,
          intent: selectedIntent,
          lane: selectedLane,
          funnelStage: selectedPath.funnelStage,
          serviceInterest: selectedPath.serviceInterest,
          ...(selectedIntent === 'membership' ? { membershipPlan: selectedPlan } : {}),
          surface: 'contact_form'
        });
        // Keep the submitted routing choices for the scheduling handoff.
        // Native form reset also resets Svelte-bound radios and selects.
        for (const name of ['name', 'email', 'company', 'message']) {
          const field = form.elements.namedItem(name);
          if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
            field.value = '';
          }
        }
      } else {
        submitSuccess = false;
        submitMessage = result.message || 'Something went wrong. Try again.';
      }
    } catch (error) {
      submitSuccess = false;
      submitMessage = 'We could not confirm receipt. Please keep this request open and do not start a new submission.';
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

<header class="inquiry-intro">
  <p class="inquiry-eyebrow">{selectedContent.eyebrow}</p>
  <h1>{selectedContent.title}</h1>
  <p>{selectedContent.description}</p>
  <a href="#inquiry-form">{selectedContent.formTitle} ↓</a>
</header>

<section class="contact-section">
  <div class="contact-container">
    <div class="contact-option">
      <h2>{hasChosenIntent ? "Tell us about the work." : selectedContent.formTitle}</h2>
      <p>{selectedContent.formDescription}</p>

      <form id="inquiry-form" class="contact-form" onsubmit={handleSubmit}>
        <details class="path-choice"><summary>{selectedPath.label} · Change inquiry type</summary>
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
        </fieldset></details>

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

        {#if selectedIntent === 'membership'}
          <div class="form-field">
            <label for="membership-plan" class="form-label">Support plan</label>
            <select id="membership-plan" name="membership-plan" class="form-input" bind:value={selectedPlan}>
              <option value="focused">Focused · $900/month · 2 check-ins + 2 remote sessions</option>
              <option value="team">Team · $2,500/month · 2 check-ins + 4 remote sessions</option>
            </select>
          </div>
        {/if}

        <div class="form-field form-field--message">
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

        {#if selectedIntent === 'membership'}
          <p class="form-helper form-note" role="note">
            This is an inquiry, not a payment or permission to spend. We confirm delivery scope and
            separate AI usage costs before work begins. For substantial AI work, we arrange scoped
            access to your provider account or agree on metered billing. Do not send credentials here.
          </p>
        {/if}
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
        {#if selectedIntent === 'system-support'}
          <Button href={`/book?${new URLSearchParams({ source: contactSource, intent: selectedIntent, lane: selectedLane })}`}>Review scheduling details</Button>
        {:else}
          <ScheduleButton variant="primary" size="lg" />
        {/if}
        {#if selectedIntent !== 'system-support'}
          <a href="/book" class="calendar-link">Review scheduling details</a>
        {/if}
      </div>
    </div>
  </div>
</section>

<PerformancePageSection variant="white" eyebrow="Funnel routing" title="Choose a useful next step.">
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
  .inquiry-intro { width: min(var(--content-width-performance), 86%); margin: 0 auto; padding-block: var(--space-performance-lg) var(--space-performance-sm); }
  .inquiry-intro h1 { max-width: 24ch; margin: var(--space-performance-sm) 0; font: var(--font-performance-medium) clamp(1.8rem, 3vw, 2.75rem)/1.15 var(--font-performance-interface); letter-spacing: var(--tracking-performance-tight); }
  .inquiry-intro p { max-width: 70ch; line-height: 1.55; }
  .inquiry-eyebrow { font: var(--text-performance-operator-label) var(--font-performance-mono); }
  .inquiry-intro a { display: inline-flex; align-items: center; min-height: 44px; color: inherit; text-underline-offset: .2em; }
  .contact-form summary { cursor: pointer; min-height: 44px; padding-block: var(--space-performance-xs); }
  .contact-form summary:focus-visible, .inquiry-intro a:focus-visible, .form-submit:focus-visible, .calendar-link:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: 3px; }
  #inquiry-form { scroll-margin-top: 7rem; }
  .path-choice, .form-field--message, .form-note, .form-submit, .form-message { grid-column: 1 / -1; }
  .form-field { min-width: 0; }
  .form-input, .form-submit { scroll-margin-block: 7rem; }
  .form-input { width: 100%; box-sizing: border-box; }
  .path-option:focus-within { outline: 2px solid var(--color-performance-focus); outline-offset: 2px; }
  @media (min-width: 900px) { .contact-form { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (prefers-reduced-motion: reduce) { .path-option, .form-input, .form-submit, .email-link { transition: none; } }


  .section-container {
    width: min(var(--content-width-performance, 85rem), 86%);
    margin: 0 auto;
  }

  .contact-section {
    padding: var(--space-performance-sm) 0 var(--space-performance-xl);
    background: var(--color-performance-paper, #f3f3f0);
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .contact-container {
    width: min(var(--content-width-performance, 85rem), 86%);
    margin: 0 auto;
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(16rem, 1fr);
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
    background: var(--color-performance-paper);
  }

  .contact-option h2 {
    font-family: var(--font-performance-interface);
    margin: 0 0 0.65rem;
    color: var(--color-performance-ink, #090909);
    font-size: 1.35rem;
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
    transition: border-color var(--duration-performance-micro, 200ms)
      var(--ease-performance-standard);
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
    resize: vertical;
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
    .inquiry-intro { padding-top: var(--space-performance-sm); }
    .contact-container,
    .section-container {
      width: min(86%, var(--content-width-performance, 85rem));
    }

    .contact-container {
      grid-template-columns: 1fr;
    }

    .contact-section {
      padding-block: var(--space-performance-sm) var(--space-performance-lg);
    }
  }
</style>
