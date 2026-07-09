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
        'Signal collects source updates, exceptions, Slack posts, API changes, account context, affected systems, and the reason a reviewer or agent should care.'
    },
    {
      question: 'How does Signal connect to Atlas?',
      answer:
        'Atlas maps where the Signal enters the workflow, which systems it touches, and which Decision queue should review it.'
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
        'Signal watches API updates, Slack channels, schema diffs, incidents, PRs, support notes, and reviewer exceptions before they become hidden process debt.',
      points: ['Source', 'Owner', 'Affected system', 'Reason to review']
    },
    {
      eyebrow: 'Atlas connection',
      icon: 'folder',
      title: 'Every signal lands on the map',
      detail:
        'Atlas connects the incoming Signal to the workflow, documentation path, reviewer queue, and downstream Proof record.',
      points: [`Composition: ${composition.id}`, 'Hub: Atlas']
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
      value: 'Atlas',
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
        'Signal owns the source event, account owner, affected system, urgency, authority context, and why the update matters.'
    },
    {
      eyebrow: 'Produces',
      icon: 'check',
      title: 'A review requirement',
      detail:
        'A good Signal produces a Decision requirement instead of silently changing documentation, API review, or front-end behavior.'
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
      title: 'Atlas',
      detail: 'Map where the Signal enters and which systems it touches.',
      href: '/atlas'
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
    { label: 'Atlas map', href: '/atlas' },
    { label: 'Decision queue', href: '/products/decision' },
    { label: 'Proof graph', href: '/products/proof' },
    { label: 'Product overview', href: '/products' }
  ];
</script>

<SEO
  title="Signal Inbox for App Governance | CREATE SOMETHING .agency"
  description="Signal is the inbox for app governance: API updates, Slack posts, PRs, exceptions, and reviewer context routed into Atlas, Decision, and Proof."
  keywords="app governance signal inbox, API update review, reviewer notifications, workflow signal, Atlas governance map"
  ogImage="/og-image.png"
  propertyName="agency"
  {faqItems}
/>

<GovernanceProductPage
  {product}
  title="The inbox for updates that should not surprise reviewers."
  description="Signal follows the places where work changes, turns those updates into reviewable context, and attaches each source to Atlas, Decision, and Proof."
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
