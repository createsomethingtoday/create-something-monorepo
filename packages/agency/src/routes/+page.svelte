<script lang="ts">
  import AgencySalesHome from '$lib/components/AgencySalesHome.svelte';
  import { SEO } from '@create-something/canon';
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

  // Keep this schema identical to the five visible native FAQ items; guarded by public-marketing-copy.test.ts.
  const faqItems = [
    {
      "question": "What needs a separate agreement?",
      "answer": "Larger Builds, managed Control and production incident response need separate agreements. Membership capacity covers the agreed workstreams and milestones above."
    },
    {
      "question": "What costs extra?",
      "answer": "Project-specific AI development, testing and production usage, hosting and third-party services are budgeted separately. You approve the budget first. Our everyday coding tools are our expense. More API credit does not add delivery capacity."
    },
    {
      "question": "Who delivers the service?",
      "answer": "Micah Johnson currently delivers the service, with agents assisting the work. The dedicated member portal is in development. We confirm resource access, session times and response times before payment."
    },
    {
      "question": "What does our team keep?",
      "answer": "After full payment, you own commissioned deliverables under your agreement, except reusable provider tools, which are licensed for continued use. You keep the agreed code, tests, instructions and project history."
    },
    {
      "question": "Can we cancel?",
      "answer": "Cancel before renewal by emailing support@createsomething.io. Support continues through your paid period while we document open work and arrange the handoff. Separately scoped projects follow their agreed terms."
    }
  ];
</script>

<SEO
  title="AI-native Technical Support | CREATE SOMETHING .agency"
  description="AI-native Technical support from $900/month. Set up, connect and improve agents in your team’s tools, with agreed permissions, inspectable outputs and ongoing support. Focused includes one workstream, one milestone, two check-ins and two remote work sessions. Team is $2,500/month for up to two workstreams, two milestones, two check-ins and four remote work sessions. Project costs are separate."
  keywords="AI-native technical support, workflow support, software engineering, client-owned AI agent, agent foundation"
  ogImage="/og-image.png"
  propertyName="agency"
  {services}
  {faqItems}
/>

<AgencySalesHome />
