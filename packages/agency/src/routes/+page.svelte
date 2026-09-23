<script lang="ts">
  import SelectedClientWork from '$lib/components/SelectedClientWork.svelte';
  import AgencyHero from '$lib/components/films/AgencyHero.svelte';
  import FilmCollection from '$lib/components/films/FilmCollection.svelte';
  import BuiltWork from '$lib/components/BuiltWork.svelte';
  import MembershipOffer from '$lib/components/MembershipOffer.svelte';
  import { MeridianAccordion, SEO } from '@create-something/canon';
  import { PUBLIC_PRICING } from '$lib/data/publicPricing';

  const services = [
    { name: 'Agent engineering membership', description: 'Hands-on delivery within an agreed scope, skills and operator support for one active workstream.', type: 'Membership', price: PUBLIC_PRICING.membership.label, priceDescription: PUBLIC_PRICING.membership.terms },
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
      question: 'Where do we start?',
      answer: 'Bring one task and an example of a good result. We agree on the deliverable, capacity, revisions and how to check the work before payment. If the task is unclear, start with a mapping session.'
    },
    {
      question: 'How do you check the work?',
      answer: 'We test an agreed example and a failure case. For AI agents—software that uses AI and connected tools to carry out a task—we agree on what AI may do and what needs approval. Your team reviews the result before launch. Launch and production incident response require a separate agreement.'
    },
    {
      question: 'What do we keep?',
      answer: 'You keep the code, instructions, tests, project history and recovery guide. We help your team use and maintain what we deliver. See Services for the delivery process and What You Keep for ownership and provider details.'
    },
    {
      question: 'How is AI spending controlled?',
      answer: 'For substantial AI development, testing or production, we arrange a client-owned provider project or agreed metered billing. Development and production have separate budgets. We pause new billable runs at the agreed limit until you approve more. A website or form that does not use AI needs no API account.'
    },
    {
      question: 'Can we cancel?',
      answer: 'Cancel before your next renewal to stop future membership charges. Support continues through the paid period. You keep delivered code and documentation. Separately scoped projects follow their agreed terms.'
    }
  ];
</script>

<SEO
  title="Agent Engineering Membership | CREATE SOMETHING .agency"
  description="Build with agents with CREATE SOMETHING. $900/month for delivery within an agreed scope, learning and operator support. Project-specific AI usage, hosting and third-party costs are separate."
  keywords="AI workflow systems, business task automation, client-owned AI agent, agent foundation"
  ogImage="/og-image.png"
  propertyName="agency"
  {services}
  {faqItems}
/>

<div class="home-pilot property-performance">
  <AgencyHero />
  <FilmCollection />
  <SelectedClientWork />
  <MembershipOffer compact />
  <MeridianAccordion
    eyebrow="Before we begin"
    title="A few practical questions."
    description="Agree on the work, keep what we build, and control the costs."
    items={faqItems}
    openFirst={false}
  />
  <BuiltWork />
</div>

<style>
  .home-pilot { background: var(--color-performance-paper); color: var(--color-performance-ink); }
</style>
