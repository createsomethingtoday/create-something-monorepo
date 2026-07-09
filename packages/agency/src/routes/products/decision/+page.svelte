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
        'Decision is the queue for judgment. It shows which Signal needs human review, agent action, policy approval, or a stop state before work continues.'
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
        'Decision turns Signals into run, wait, or stop states so the right human, agent, or policy path can act with context.',
      points: ['Run', 'Wait', 'Stop', 'Escalate']
    },
    {
      eyebrow: 'Atlas connection',
      icon: 'folder',
      title: 'Judgment stays attached to the map',
      detail:
        'Atlas shows where the Decision sits, which systems are affected, and what Proof must be recorded after the action.',
      points: [`Composition: ${composition.id}`, 'Hub: Atlas']
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
      value: 'Atlas',
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
        'Decision owns the named review owner, allowed action, escalation reason, policy reason, and current run-wait-stop state.'
    },
    {
      eyebrow: 'Consumes',
      icon: 'plus',
      title: 'The incoming Signal',
      detail:
        'Decision should not start from a vague task. It consumes a Signal with source context, affected system, and reason to review.'
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
      title: 'Atlas',
      detail: 'Show where the judgment sits in the workflow.',
      href: '/atlas'
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
    { label: 'Atlas map', href: '/atlas' },
    { label: 'Proof graph', href: '/products/proof' },
    { label: 'Product overview', href: '/products' }
  ];
</script>

<SEO
  title="Decision Queue for App Governance | CREATE SOMETHING .agency"
  description="Decision is the human-in-the-loop queue for app governance: route Signals into review, approval, policy action, stop states, and Proof."
  keywords="human in the loop decision queue, app governance approvals, policy review queue, workflow decision, Atlas governance"
  ogImage="/og-image.png"
  propertyName="agency"
  {faqItems}
/>

<GovernanceProductPage
  {product}
  title="The queue where humans, agents, and policy decide what happens next."
  description="Decision gives operators one surface to review Signals, approve bounded action, ask for more context, or stop work before risk moves downstream."
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
