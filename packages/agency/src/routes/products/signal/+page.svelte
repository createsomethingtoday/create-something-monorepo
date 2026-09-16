<script lang="ts">
  import { SEO, type PerformanceCardItem, type PerformanceCtaItem } from '@create-something/canon';
  import {
    SIGNAL_DECISION_PROOF_COMPOSITION,
    getGovernanceProduct
  } from '@create-something/canon/governance';
  import GovernanceProductPage from '$lib/components/GovernanceProductPage.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const product = getGovernanceProduct('signal');
  const composition = SIGNAL_DECISION_PROOF_COMPOSITION;

  const faqItems = [
    {
      question: 'What does Signal collect?',
      answer:
        'Signal collects updates from your tools and explains which work they affect.'
    },
    {
      question: 'How does Signal connect back to Map?',
      answer:
        'Map shows where the update came from, the tools it affects, and who should review it.'
    },
    {
      question: 'Does Signal replace review?',
      answer:
        'No. Signal makes the right update visible early so human reviewers, agents, and policy rules can decide what should run, wait, or stop.'
    }
  ];

  const heroCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Inbox',
      icon: 'plus',
      title: 'One queue for important updates',
      detail:
        'Signal watches for changes in connected tools, messages, code, support notes, and review queues.',
      points: ['Source', 'Owner', 'Affected system', 'Reason to review']
    },
    {
      eyebrow: 'Map connection',
      icon: 'folder',
      title: 'Every signal lands on the map',
      detail:
        'Map connects the incoming Signal to the workflow, documentation path, reviewer queue, and downstream Proof record.',
      points: [`Composition: ${composition.id}`, 'Hub: Map']
    }
  ];

  const pathItems = [
    {
      icon: 'actions' as const,
      value: 'Signal',
      label: 'API updates, Slack posts, PRs, incidents, and exceptions enter the inbox.'
    },
    {
      icon: 'states' as const,
      value: 'Decision',
      label: 'The queue decides whether the update changes docs, reviewer policy, or product behavior.'
    },
    {
      icon: 'objects' as const,
      value: 'Map',
      label: 'The map shows which systems and owners are affected before action moves downstream.'
    },
    {
      icon: 'receipts' as const,
      value: 'Proof',
      label: 'The proof graph records the source, decision, action, receipt, and rollback note.'
    }
  ];

  const detailCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Owns',
      icon: 'document',
      title: 'Source context',
      detail:
        'Each update includes its source, account owner, affected tool, urgency, permissions, and reason for review.'
    },
    {
      eyebrow: 'Produces',
      icon: 'check',
      title: 'A review requirement',
      detail:
        'An update goes to review before it can change documentation, app behavior, or review rules.'
    },
    {
      eyebrow: 'Records',
      icon: 'settings',
      title: 'A proof seed',
      detail:
        'Signal gives Proof the starting evidence: who said what changed, where it came from, and what the workflow believed at intake.'
    }
  ];

  const relatedCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Map',
      icon: 'folder',
      title: 'Map',
      detail: 'Map where the Signal enters and which systems it touches.',
      href: '/map'
    },
    {
      eyebrow: 'Queue',
      icon: 'check',
      title: 'Decision',
      detail: 'Route the Signal into human, agent, or policy judgment.',
      href: '/products/decision'
    },
    {
      eyebrow: 'Ledger',
      icon: 'document',
      title: 'Proof',
      detail: 'Record the source, decision, outcome, and audit trail.',
      href: '/products/proof'
    }
  ];

  const ctaItems: PerformanceCtaItem[] = [
    {
      label: 'Source',
      icon: 'plus',
      title: 'Name the first watched channel',
      detail: 'Start with the Slack channel, API feed, PR path, or data source reviewers keep missing.'
    },
    {
      label: 'Decision',
      icon: 'check',
      title: 'Choose the review queue',
      detail: 'Route the update to docs, product review, policy review, or an owner approval.'
    },
    {
      label: 'Proof',
      icon: 'document',
      title: 'Define the receipt',
      detail: 'Decide what evidence should be saved after the update is reviewed.'
    }
  ];

  const relatedLinks = [
    { label: 'Map', href: '/map' },
    { label: 'Decision queue', href: '/products/decision' },
    { label: 'Proof graph', href: '/products/proof' },
    { label: 'Product overview', href: '/products' }
  ];
</script>

<SEO
  title="Signal Inbox | Inside CREATE SOMETHING Control"
  description="Signal is the Control inbox for app governance. Updates from your tools arrive as reviewable context, already attached to the workflow they affect."
  keywords="app governance signal inbox, API update review, reviewer notifications, workflow signal, workflow control map"
  ogImage="/og-image.png"
  propertyName="agency"
  {faqItems}
/>

<GovernanceProductPage
  {product}
  title="See the updates your team needs to review."
  description="Signal is the inbox inside Control. It gathers updates from connected tools and links each one to its source and affected workflow."
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
