<script lang="ts">
  import SelectedClientWork from '$lib/components/SelectedClientWork.svelte';
  import AgencyHero from '$lib/components/films/AgencyHero.svelte';
  import AgentEnablement from '$lib/components/AgentEnablement.svelte';
  import AgencyProof from '$lib/components/AgencyProof.svelte';
  import CanonServiceGuide from '$lib/components/CanonServiceGuide.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import FilmCollection from '$lib/components/films/FilmCollection.svelte';
  import BuiltWork from '$lib/components/BuiltWork.svelte';
  import MembershipOffer from '$lib/components/MembershipOffer.svelte';
  import { MeridianAccordion, SEO } from '@create-something/canon';
  import { PUBLIC_PRICING } from '$lib/data/publicPricing';

  const services = [
    { name: 'AI-native technical support membership', description: 'Recurring diagnosis, engineering improvements and learning support within an agreed scope.', type: 'Membership', price: PUBLIC_PRICING.membership.label, priceDescription: PUBLIC_PRICING.membership.terms },
    {
      name: 'Map',
      description:
        'A plan showing how work moves between people and tools, and where AI could help.',
      type: 'First workflow map',
      price: PUBLIC_PRICING.map.publicStarterLabel,
      priceDescription: PUBLIC_PRICING.map.workspaceLabel
    },
    {
      name: 'Agent Foundation',
      description:
        'An AI agent that does one agreed job, with code, instructions, tests, and a handover.',
      type: 'Fixed-scope Build',
      price: 'Custom',
      priceDescription: 'Quoted after fit; production promoted separately'
    },
    {
      name: 'Ongoing Workflow Control',
      description:
        'Ongoing monitoring, incident response, and regular reviews for AI systems already in use.',
      type: 'Operating Plan',
      price: PUBLIC_PRICING.managedControl.label,
      priceDescription: 'Managed Control after launch'
    },
    {
      name: 'Enterprise Extension',
      description:
        'Custom work for teams with higher volumes, stricter requirements, or several connected systems.',
      type: 'Project + Managed',
      price: 'Custom',
      priceDescription: 'Scoped implementation with optional ongoing support'
    }
  ];

  const faqItems = [
    {
      question: 'What does ongoing support mean?',
      answer: 'We keep project context across agreed work: the diagnosis, decisions, changes, checks and open questions. Scheduled sessions and Slack support follow your plan. Scope and response times are agreed before payment; production incident response requires a separate managed Control agreement.'
    },
    {
      question: 'Where do we start?',
      answer: 'Bring one task and an example of a good result. We agree on the deliverable, capacity, revisions and how to check the work before payment. If the task is unclear, start with a mapping session.'
    },
    {
      question: 'How do you check the work?',
      answer: 'We test an agreed example and a failure case. For AI agents—software that uses AI and connected tools to carry out a task—we agree on what AI may do and what needs approval. Your team reviews the result before launch. Launch and production incident response require a separate agreement.'
    },
    {
      question: 'What do we keep?',
      answer: 'After full payment, you own commissioned deliverables under your agreement, except reusable provider tools. You keep the instructions, tests, project history and recovery guide. We help your team use and maintain what we deliver. See Services for the delivery process and What You Keep for ownership and provider details.'
    },
    {
      question: 'How is AI spending controlled?',
      answer: 'For substantial AI development, testing or production, we arrange a client-owned provider project or agreed metered billing. Development and production have separate budgets. We pause new billable runs at the agreed limit until you approve more. A website or form that does not use AI needs no API account.'
    },
    {
      question: 'Can we cancel?',
      answer: 'Cancel before your next renewal by emailing support@createsomething.io to stop future membership charges. Support continues through your paid period while we hand over your code and documentation, document open work, and plan the transition. If you need more help afterward, we’ll agree on the scope and price before extending support. Separately scoped projects follow their agreed terms.'
    }
  ];
</script>

<SEO
  title="AI-native Technical Support | CREATE SOMETHING .agency"
  description="AI-native Technical support from $900/month. Set up, connect and improve agents in your team’s tools, with agreed permissions, inspectable outputs and ongoing support. Focused includes one workstream, one milestone and four scheduled sessions. Team is $2,500/month for up to two workstreams, two milestones and six sessions. Project costs are separate."
  keywords="AI-native technical support, workflow support, software engineering, client-owned AI agent, agent foundation"
  ogImage="/og-image.png"
  propertyName="agency"
  {services}
  {faqItems}
/>

<div class="home-pilot property-performance">
  <AgencyHero />
  <AgencyProof>
    <BuiltWork sectionId="engineering-work" />
    <FilmCollection />
    <SelectedClientWork />
  </AgencyProof>
  <AgentEnablement />
  <section class="conversion" aria-labelledby="conversion-title">
    <header class="conversion-intro">
      <div><p class="eyebrow">Start with one task</p><h2 id="conversion-title">What would you like working better?</h2><p>Bring the tools involved and an example of the result you need. We’ll discuss fit, then agree on the work and how to check it.</p><a class="conversion-action" href={agencyCoreMessaging.workflowMappingSessionHref}>Talk through your workflow ↗</a></div>
      <aside aria-label="Optional help choosing a service"><details><summary>Ask canon about service fit</summary><CanonServiceGuide /></details></aside>
    </header>
    <MembershipOffer compact />
  </section>
  <MeridianAccordion
    eyebrow="Before we begin"
    title="A few practical questions."
    description="Agree on the work, keep what we build, and control the costs."
    items={faqItems}
    openFirst={false}
  />
</div>

<style>
  .conversion { background: var(--color-performance-paper); color: var(--color-performance-ink); }
  .conversion-intro { padding: var(--space-performance-xl) 7vw var(--space-performance-lg); display: grid; grid-template-columns: minmax(0, 1fr) minmax(22rem, .9fr); gap: clamp(2rem, 5vw, 5rem); align-items: start; }
  .eyebrow { font: var(--text-performance-operator-label)/1.5 var(--font-performance-mono); text-transform: uppercase; }
  .conversion-intro h2 { font: var(--font-performance-medium) clamp(2.5rem,4vw,3.5rem)/1.08 var(--font-performance-interface); letter-spacing: var(--tracking-performance-tight); text-wrap: balance; margin-block: var(--space-performance-sm); }
  .conversion-intro p { max-width: 50ch; line-height: 1.65; }
  .conversion-intro > div, .conversion-intro aside { min-width: 0; }
  .conversion-intro aside { padding: var(--space-performance-md); background: var(--color-performance-shell-surface-secondary); color: var(--color-performance-fg-primary); border: 1px solid var(--color-performance-shell-border-default); border-radius: var(--radius-performance-sm); }
  .conversion-action { display: inline-flex; align-items: center; min-height: 48px; padding: var(--space-performance-sm) var(--space-performance-md); background: var(--color-performance-ink); color: var(--color-performance-paper); text-decoration: none; border-radius: var(--radius-performance-sm); }
  .conversion-action:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: 4px; }
  @media(max-width:1000px) { .conversion-intro { grid-template-columns: 1fr; } }
  @media (prefers-reduced-motion: reduce) { :global(html:has(.home-pilot)) { scroll-behavior: auto; } }
  .home-pilot { background: var(--color-performance-paper); color: var(--color-performance-ink); }
</style>
