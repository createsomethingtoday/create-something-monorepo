<script lang="ts">
  import AgencySalesHome from '$lib/components/AgencySalesHome.svelte';
  import { SEO } from '@create-something/canon';
  import { PUBLIC_PRICING } from '$lib/data/publicPricing';

  const services = [
    { name: 'AI-native technical support membership', description: 'Recurring diagnosis, engineering improvements and learning support within an agreed scope.', type: 'Membership', price: PUBLIC_PRICING.membership.monthlyUsd, priceDescription: `${PUBLIC_PRICING.membership.label}; ${PUBLIC_PRICING.membership.terms}` },
    {
      name: 'Map',
      description:
        'A workflow plan that identifies tasks, people, tools, and possible uses for AI.',
      type: 'First workflow map',
      price: 0,
      priceDescription: `${PUBLIC_PRICING.map.publicStarterLabel}; ${PUBLIC_PRICING.map.workspaceLabel}`
    },
    {
      name: 'Agent Foundation',
      description:
        'Software that uses AI to perform one agreed task. Includes code, instructions, tests, and a handover.',
      type: 'Fixed-scope Build',
      priceDescription: 'Quoted after fit; production promoted separately'
    },
    {
      name: 'Ongoing Workflow Control',
      description:
        'Ongoing monitoring, incident response, and regular reviews for AI systems already in use.',
      type: 'Operating Plan',
      price: PUBLIC_PRICING.managedControl.startingMonthlyUsd,
      priceDescription: `${PUBLIC_PRICING.managedControl.longLabel}; separately agreed managed Control scope`
    },
    {
      name: 'Enterprise Extension',
      description:
        'Custom work for teams with higher volumes, stricter requirements, or several connected systems.',
      type: 'Project + Managed',
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
      "answer": "We budget project-specific AI development, testing, production usage, hosting and third-party services separately. You approve the budget first. Our everyday coding tools are our expense. More API credit does not add delivery capacity."
    },
    {
      "question": "Who delivers the service?",
      "answer": "Micah Johnson and Huzaifa Tofeeq deliver the service. Huzaifa is our forward-deployed engineer. AI agents assist the team with software tasks. The dedicated member portal is in development. We confirm resource access, session times and response times before payment."
    },
    {
      "question": "What does our team keep?",
      "answer": "After full payment, you own commissioned deliverables under your agreement. Reusable provider tools remain licensed for continued use. You keep the agreed code, tests, instructions and project history."
    },
    {
      "question": "Can we cancel?",
      "answer": "Cancel before your next renewal by emailing support@createsomething.io to stop future membership charges. Support continues through your paid period. We hand over your code and documentation. We document open work and plan the transition. If you need more help afterward, we agree on the scope and price before we extend support. Separately scoped projects follow their agreed terms."
    }
  ];
</script>

<SEO
  title="Connect AI to your tools | CREATE SOMETHING .agency"
  description="We connect your tools and make AI systems for your team. You select the tasks and give approval for system changes. We do system tests and show the results. Technical support from $900/month."
  keywords="AI-native technical support, workflow support, software engineering, client-owned AI agent, agent foundation"
  ogImage="/og-image.png"
  propertyName="agency"
  {services}
  {faqItems}
/>

<AgencySalesHome />
