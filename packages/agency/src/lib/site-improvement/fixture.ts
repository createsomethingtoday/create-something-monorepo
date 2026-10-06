// Local test fixture only. Public routes do not import this file; no cookie, network or analytics effects.
import type { ExperimentSpec, SiteAdapter } from '../../../../site-improvement/src/index.ts';

export const agencySiteAdapter: SiteAdapter = {
  tenantId: 'create-something', siteId: 'agency', surface: 'agency-home-hero', paths: ['/'],
  recipeFields: ['lede', 'primaryActionLabel'],
  outcomes: {
    qualified_inquiry: { authority: 'server_receipt', channel: 'site' },
    accepted_contact_receipt: { authority: 'server_receipt', channel: 'site' },
    booking_notification: { authority: 'client_diagnostic', channel: 'site' },
    synthetic_inquiry_intent: { authority: 'task_evaluation', channel: 'synthetic_agent' }
  }
};

export const agencyExperimentFixture: ExperimentSpec = {
  scope: { tenantId: 'create-something', siteId: 'agency', experimentId: 'home-task-clarity-fixture', allocationVersion: 'v1' },
  enabled: false, killSwitch: true, rolloutBps: 0,
  // Relative synthetic clock for fixture tests, not scheduled live dates or a recommended study length.
  startAt: 0, endAt: 10000, seed: 'first-slice-v1', surface: 'agency-home-hero', paths: ['/'], controlId: 'control',
  recipes: [
    { id: 'control', version: 'v1', changes: {
      lede: 'We diagnose problems, engineer improvements, and help your team use the result.',
      primaryActionLabel: 'Talk through your workflow ↗'
    } },
    { id: 'task-first', version: 'v1', changes: {
      lede: 'Bring one workflow that needs help. We can diagnose the problem, improve its software, and help your team use the result.',
      primaryActionLabel: 'Discuss one workflow ↗'
    } }
  ],
  plan: {
    primaryOutcome: 'qualified_inquiry', channel: 'site', unit: 'assigned_subject',
    baselineRef: null, outcomeDefinitionRef: null, attributionWindowMs: null, minAssignments: null,
    maxMissingExposureFraction: null, guardrails: ['consent', 'cache-isolation', 'offer-facts', 'accessibility']
  }
};

export const agencyRecipeBoundary = {
  sourceRef: '33fcc0fd2335b04dfca6d860372db46cd4c43030',
  sourcePath: 'packages/agency/src/lib/components/films/AgencyHero.svelte',
  hypothesis: 'A task-first explanation helps appropriate visitors decide whether to inquire.',
  fixedDestinationSource: 'agencyCoreMessaging.workflowMappingSessionHref',
  preserve: ['heading', 'destination', 'pricing', 'ownership', 'launch terms', 'proof', 'structure', 'motion', 'accessibility'],
  primaryOutcomeNeeds: 'A reviewed qualification rubric and observed baseline; saved contact does not mean qualified.',
  bookingNeeds: 'An authoritative scheduler receipt; browser lifecycle notifications remain diagnostic.'
} as const;
