<script lang="ts">
  import AgencyHeroFrame from '$lib/components/AgencyHeroFrame.svelte';
  import { createContactRequest } from '$lib/contact/request';
  let contactRequest: ReturnType<typeof createContactRequest> | undefined;
  import {
    SEO
  } from '@create-something/canon';
  import { getAnalytics } from '@create-something/canon/analytics';
  import ContactOnboarding from '$lib/components/ContactOnboarding.svelte';
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
        'Ongoing technical support. Focused is $900/month. Team is $2,500/month. We agree on scope before payment.',
      funnelStage: 'decision',
      serviceInterest: 'AI-native technical support membership',
      submitLabel: 'Send membership inquiry',
      successMessage:
        'Received. We will review your goals and reply with fit and onboarding details.'
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
      seoTitle: 'Discuss Technical Support | CREATE SOMETHING',
      seoDescription: 'Discuss AI-native technical support: Focused at $900/month or Team at $2,500/month. Agree on diagnosis, engineering work, and scope before payment.',
      eyebrow: 'AI-native technical support',
      title: 'Start with the work you want to improve.',
      description:
        'A workstream is one agreed area of work, such as improving a product or connecting a workflow. Focused is $900/month for one workstream and one milestone. Team is $2,500/month for up to two workstreams and two milestones. We agree the next useful change, work between check-ins and show what changed. Scope is agreed before payment. Project costs are separate.',
      formTitle: 'Discuss membership',
      formDescription: 'Tell us what needs diagnosis or improvement, and what your team needs help learning.',
      messageLabel: 'What would you like help with?',
      messageHelper:
        'Include your tools, the result you want and whether AI usage is involved. We will agree on any development and runtime budgets before billable work. Do not include API keys, passwords or client secrets.',
      messagePlaceholder: 'We want to improve our product or connect a workflow. We currently use…'
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
  let retryLocked = $state(false);
  const selectedPath = $derived(
    contactPathOptions.find((option) => option.value === selectedIntent) ?? contactPathOptions[1]
  );
  const selectedContent = $derived(contactIntentContent[selectedIntent]);

  $effect(() => {
    selectedIntent = initialIntent;
    selectedLane = initialLane;
    selectedPlan = initialPlan;
    submitMessage = '';
  });

  async function handleSubmit(event: Event) {
    event.preventDefault();
    if (submitting || submitSuccess) return;
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

      retryLocked = !result.success && result.status !== 400;
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
      } else {
        submitSuccess = false;
        submitMessage = result.message || 'Something went wrong. Try again.';
      }
    } catch {
      retryLocked = true;
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

<AgencyHeroFrame compact={true}>
<header class="contact-intro">
  <p class="contact-eyebrow">Start a conversation</p>
  <h1>Let’s find your next step.</h1>
  <p>Tell us what needs attention. We’ll review your brief and reply about fit, scope and the next useful step.</p>
</header>
</AgencyHeroFrame>

<section class="contact-workspace" aria-label="Prepare your inquiry">
  <ContactOnboarding
    bind:selectedIntent bind:selectedLane bind:selectedPlan
    options={contactPathOptions} content={selectedContent}
    submitLabel={selectedPath.submitLabel}
    {submitting} {submitMessage} {submitSuccess} {retryLocked}
    onsubmit={handleSubmit}
  />
  <div class="contact-other">
    <p>Already have a workflow and owner in mind?</p>
    <a href={`/book?${new URLSearchParams({ source: contactSource, intent: selectedIntent, lane: selectedLane })}`}>Review scheduling details <span aria-hidden="true">↗</span></a>
  </div>
</section>

<details class="contact-alternatives"><summary>Other ways to begin</summary><FunnelLadder /></details>

<section class="email-section">
  <p>Prefer email? <a href="mailto:support@createsomething.io">support@createsomething.io</a></p>
</section>

<style>
  .contact-intro, .contact-workspace, .contact-alternatives, .email-section {
    width: min(var(--content-width-performance), 90%);
    margin-inline: auto;
  }
  .contact-intro { padding-block: var(--space-performance-md) var(--space-performance-sm); }
  .contact-eyebrow { font: var(--text-performance-operator-label) var(--font-performance-mono); text-transform: uppercase; letter-spacing: var(--tracking-performance-label); }
  h1 { max-width: 24ch; margin-block: var(--space-performance-xs); font: var(--font-performance-medium) clamp(2rem, 4vw, 3.5rem)/1.08 var(--font-performance-interface); letter-spacing: var(--tracking-performance-tight); }
  .contact-intro > p:last-child { max-width: 62ch; line-height: 1.6; color: var(--color-performance-muted); }
  .contact-workspace { padding-top: 0; padding-bottom: var(--space-performance-md); }
  .contact-other { display: flex; flex-wrap: wrap; gap: .5rem 1rem; align-items: center; justify-content: space-between; padding-block: var(--space-performance-sm); border-bottom: 1px solid var(--color-performance-line); font-size: .9rem; }
  .contact-other p { margin: 0; color: var(--color-performance-muted); }
  a { color: inherit; text-underline-offset: .25em; }
  .contact-other a, summary { display: inline-flex; align-items: center; min-height: 44px; gap: .75rem; }
  summary { cursor: pointer; }
  a:focus-visible, summary:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: 4px; }
  .contact-alternatives { margin-bottom: var(--space-performance-sm); }
  .email-section { padding-bottom: var(--space-performance-md); font-size: .9rem; }
</style>
