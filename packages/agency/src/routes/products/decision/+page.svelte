<script lang="ts">
  import { SEO, type PerformanceCardItem, type PerformanceCtaItem } from '@create-something/canon';
  import {
    SIGNAL_DECISION_PROOF_COMPOSITION,
    getGovernanceProduct
  } from '@create-something/canon/governance';
  import GovernanceProductPage from '$lib/components/GovernanceProductPage.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const product = getGovernanceProduct('decision');
  const composition = SIGNAL_DECISION_PROOF_COMPOSITION;

  const faqItems = [
    {
      question: 'What is the Decision product?',
      answer:
        'Decision is the approval queue inside Control. It shows which tasks can run, which need a person, and which must stop.'
    },
    {
      question: 'How does Decision support human-in-the-loop work?',
      answer:
        'Decision gives operators a focused queue where they can approve, reject, request more evidence, or route work to an owner.'
    },
    {
      question: 'What happens after a Decision is made?',
      answer:
        'The outcome produces Proof: the evidence used, owner, action taken, receipt, audit trail, and rollback note.'
    }
  ];

  const heroCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Queue',
      icon: 'check',
      title: 'A focused judgment surface',
      detail:
        'Decision checks incoming work against your rules and sends it to the right person or agent.',
      points: ['Run', 'Wait', 'Stop', 'Escalate']
    },
    {
      eyebrow: 'Map connection',
      icon: 'folder',
      title: 'Judgment stays attached to the map',
      detail:
        'Map shows where the Decision sits, which systems are affected, and what Proof must be recorded after the action.',
      points: [`Composition: ${composition.id}`, 'Hub: Map']
    }
  ];

  const pathItems = [
    {
      icon: 'actions' as const,
      value: 'Signal',
      label: 'A watched source says something changed or needs attention.'
    },
    {
      icon: 'states' as const,
      value: 'Decision',
      label: 'The queue routes the update to a human, agent, policy rule, or stop point.'
    },
    {
      icon: 'objects' as const,
      value: 'Map',
      label: 'The map keeps the owner, system boundary, and downstream impact visible.'
    },
    {
      icon: 'receipts' as const,
      value: 'Proof',
      label: 'The decision produces evidence, outcome, receipt, audit trail, and rollback note.'
    }
  ];

  const detailCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Owns',
      icon: 'user',
      title: 'The review owner',
      detail:
        'Each task shows the reviewer, proposed action, applicable rule, and why it is running, waiting, or stopped.'
    },
    {
      eyebrow: 'Consumes',
      icon: 'plus',
      title: 'The incoming Signal',
      detail:
        'Start with a specific update, its source, the tool it affects, and why it needs review.'
    },
    {
      eyebrow: 'Produces',
      icon: 'document',
      title: 'A proof requirement',
      detail:
        'Decision produces the minimum proof needed for the next operator to understand what happened and why.'
    }
  ];

  const relatedCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Inbox',
      icon: 'plus',
      title: 'Signal',
      detail: 'Bring source updates and exceptions into the queue.',
      href: '/products/signal'
    },
    {
      eyebrow: 'Map',
      icon: 'folder',
      title: 'Map',
      detail: 'Show where the judgment sits in the workflow.',
      href: '/map'
    },
    {
      eyebrow: 'Ledger',
      icon: 'document',
      title: 'Proof',
      detail: 'Preserve the outcome, evidence, and audit trail.',
      href: '/products/proof'
    }
  ];

  const ctaItems: PerformanceCtaItem[] = [
    {
      label: 'Queue',
      icon: 'check',
      title: 'Define the operator action',
      detail: 'Decide what a reviewer can approve, reject, route, request, or stop.'
    },
    {
      label: 'Policy',
      icon: 'settings',
      title: 'Name the decision rule',
      detail: 'Turn hidden judgment into a policy rule or owner approval path.'
    },
    {
      label: 'Proof',
      icon: 'document',
      title: 'Require the evidence',
      detail: 'Make the queue ask for the proof record before the workflow moves on.'
    }
  ];

  const relatedLinks = [
    { label: 'Signal inbox', href: '/products/signal' },
    { label: 'Map', href: '/map' },
    { label: 'Proof graph', href: '/products/proof' },
    { label: 'Product overview', href: '/products' }
  ];
</script>

<SEO
  title="Decision Queue | Inside CREATE SOMETHING Control"
  description="Decision is the human-in-the-loop queue. Each Signal is routed to run, wait for approval, or stop with a reason."
  keywords="human in the loop decision queue, app governance approvals, policy review queue, workflow decision, workflow control"
  ogImage="/og-image.png"
  propertyName="agency"
  {faqItems}
/>

<GovernanceProductPage
  {product}
  title="Approve the work, ask for more information, or stop it."
  description="Decision shows incoming tasks and the information needed to review them. Your team can approve, reject, request evidence, or stop an action."
  {heroCards}
  {pathItems}
  {detailCards}
  {relatedCards}
  {ctaItems}
  primaryAction={agencyCoreMessaging.selfMapLabel}
  primaryHref={agencyCoreMessaging.selfMapHref}
  secondaryAction={agencyCoreMessaging.bookMappingSessionLabel}
  secondaryHref={agencyCoreMessaging.workflowMappingSessionHref}
  {relatedLinks}
/>
