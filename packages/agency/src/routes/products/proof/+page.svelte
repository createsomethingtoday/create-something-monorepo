<script lang="ts">
  import { SEO, type PerformanceCardItem, type PerformanceCtaItem } from '@create-something/canon';
  import {
    SIGNAL_DECISION_PROOF_COMPOSITION,
    getGovernanceProduct
  } from '@create-something/canon/governance';
  import GovernanceProductPage from '$lib/components/GovernanceProductPage.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const product = getGovernanceProduct('proof');
  const composition = SIGNAL_DECISION_PROOF_COMPOSITION;

  const faqItems = [
    {
      question: 'What is the Proof product?',
      answer:
        'Proof is the durable record of app governance work: evidence, decision, owner, outcome, receipt, rollback note, and audit trail.'
    },
    {
      question: 'Is Proof the same as a ledger?',
      answer:
        'Proof is the product surface for the ledger idea. It records what happened and why without exposing private logs, credentials, or sensitive client data.'
    },
    {
      question: 'How does Proof connect back to Map?',
      answer:
        'Proof records back onto Map so operators can see which workflow node produced the outcome and what evidence supports it.'
    }
  ];

  const heroCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Proof graph',
      icon: 'document',
      title: 'Evidence that survives the action',
      detail:
        'Proof keeps the source, decision, owner, outcome, receipt, rollback note, and audit trail attached to the workflow.',
      points: ['Evidence', 'Outcome', 'Receipt', 'Rollback note']
    },
    {
      eyebrow: 'Map connection',
      icon: 'folder',
      title: 'Every receipt points back to the map',
      detail:
        'Map shows where the Proof came from, which Signal and Decision produced it, and what owner should inspect it next.',
      points: [`Composition: ${composition.id}`, 'Hub: Map']
    }
  ];

  const pathItems = [
    {
      icon: 'actions' as const,
      value: 'Signal',
      label: 'The source event and reason for review are saved as the beginning of the record.'
    },
    {
      icon: 'states' as const,
      value: 'Decision',
      label: 'The human, agent, or policy judgment explains why the workflow moved, waited, or stopped.'
    },
    {
      icon: 'receipts' as const,
      value: 'Proof',
      label: 'The proof graph preserves the evidence, outcome, receipt, and rollback note.'
    },
    {
      icon: 'objects' as const,
      value: 'Map',
      label: 'The map shows where the Proof belongs and what system relationship it affects.'
    }
  ];

  const detailCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Owns',
      icon: 'document',
      title: 'The durable record',
      detail:
        'Proof owns the evidence, outcome, receipt, rollback note, audit trail, and next owner.'
    },
    {
      eyebrow: 'Consumes',
      icon: 'plus',
      title: 'Signal and Decision context',
      detail:
        'Proof consumes the incoming Signal and the Decision outcome so the record explains both source and judgment.'
    },
    {
      eyebrow: 'Protects',
      icon: 'settings',
      title: 'Public and private boundaries',
      detail:
        'Proof can show the business-readable record while keeping credentials, raw logs, and sensitive data out of the public surface.'
    }
  ];

  const relatedCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Inbox',
      icon: 'plus',
      title: 'Signal',
      detail: 'Capture the source context before proof is written.',
      href: '/products/signal'
    },
    {
      eyebrow: 'Queue',
      icon: 'check',
      title: 'Decision',
      detail: 'Name the judgment that produced the record.',
      href: '/products/decision'
    },
    {
      eyebrow: 'Map',
      icon: 'folder',
      title: 'Map',
      detail: 'Attach each proof record to the workflow map.',
      href: '/map'
    }
  ];

  const ctaItems: PerformanceCtaItem[] = [
    {
      label: 'Record',
      icon: 'document',
      title: 'Define the proof record',
      detail: 'Name the evidence, outcome, owner, receipt, and rollback note the workflow must keep.'
    },
    {
      label: 'Boundary',
      icon: 'settings',
      title: 'Separate public from private',
      detail: 'Show the audit trail without exposing credentials, raw logs, or sensitive client data.'
    },
    {
      label: 'Map',
      icon: 'folder',
      title: 'Attach the receipt to the map',
      detail: 'Make the proof record visible in the workflow where the decision happened.'
    }
  ];

  const relatedLinks = [
    { label: 'Signal inbox', href: '/products/signal' },
    { label: 'Decision queue', href: '/products/decision' },
    { label: 'Map', href: '/map' },
    { label: 'Product overview', href: '/products' }
  ];
</script>

<SEO
  title="Proof Graph | Inside CREATE SOMETHING Control"
  description="Proof is the ledger inside Control. Every decision keeps its evidence, its outcome, and its rollback note in one place."
  keywords="app governance proof graph, workflow ledger, decision receipts, audit trail, workflow control proof"
  ogImage="/og-image.png"
  propertyName="agency"
  {faqItems}
/>

<GovernanceProductPage
  {product}
  title="The proof graph that records what happened and why."
  description="Proof turns Signals and Decisions into a durable record operators can inspect without exposing private credentials, raw logs, or sensitive data."
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
