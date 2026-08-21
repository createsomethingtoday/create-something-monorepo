import {
  APP_REVIEW_GOVERNANCE_COMPOSITION,
  createRegistryArcComposition,
  type AtlasComposition,
  type AtlasRegistryArcDefinition,
  type AtlasRegistryArcStep
} from '@create-something/atlas-composition';

import { OPERATOR_PLAYBOOKS } from './operator-playbooks.js';
import { OUTCOME_PLAYBOOKS } from './outcome-playbooks.js';
import { HOST_PLAYBOOKS } from './playbooks.js';
import { WORKFLOWS } from './workflows.js';

export type ArcCatalogSourceKind =
  | 'host-playbook'
  | 'outcome-playbook'
  | 'operator-playbook'
  | 'runbook'
  | 'prototype';

export type ArcCatalogEntry = {
  slug: string;
  title: string;
  description: string;
  href: string;
  visibility: 'public-noindex';
  source: {
    id: string;
    kind: ArcCatalogSourceKind;
    registered: true;
    registry: string;
  };
  composition: AtlasComposition;
};

export type ArcCatalogSummary = Omit<ArcCatalogEntry, 'composition'> & {
  sceneCount: number;
  stepCount: number;
};

function slugPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function stepsFromStrings(values: string[]): AtlasRegistryArcStep[] {
  return values.map((detail, index) => ({
    id: `step-${index + 1}`,
    title: detail.replace(/[.:;].*$/, '').replace(/\.$/, ''),
    detail
  }));
}

function entry(
  prefix: 'host' | 'outcome' | 'operator' | 'runbook',
  source: ArcCatalogEntry['source'],
  definition: Omit<AtlasRegistryArcDefinition, 'id'>
): ArcCatalogEntry {
  const slug = `${prefix}-${slugPart(source.id)}`;
  const composition = createRegistryArcComposition({ ...definition, id: slug });
  return {
    slug,
    title: definition.title,
    description: definition.description,
    href: `/arc/${slug}`,
    visibility: 'public-noindex',
    source,
    composition
  };
}

const HOST_ARCS = HOST_PLAYBOOKS.map((playbook) =>
  entry(
    'host',
    {
      id: playbook.slug,
      kind: 'host-playbook',
      registered: true,
      registry: 'playbooks://hosts'
    },
    {
      title: `${playbook.name} Workflow Playbook`,
      description: playbook.description,
      owner: `${playbook.name} operator`,
      boundary: `Use the registered workflow patterns and avoid these anti-patterns: ${playbook.antiPatterns.slice(0, 2).join(' ')}`,
      proof: `A configured ${playbook.name} workspace, a selected workflow pattern, and inspectable output from the run.`,
      source: 'packages/playbook-mcp/src/playbooks.ts',
      steps: [
        {
          id: 'configure-host',
          title: `Configure ${playbook.name}`,
          detail: `Use ${playbook.configLocation} and preserve the project context described by the Playbook.`
        },
        ...playbook.workflowPatterns.map((pattern) => ({
          id: pattern.id,
          title: pattern.name,
          detail: pattern.description
        }))
      ]
    }
  )
);

const OUTCOME_ARCS = OUTCOME_PLAYBOOKS.map((playbook) =>
  entry(
    'outcome',
    {
      id: playbook.id,
      kind: 'outcome-playbook',
      registered: true,
      registry: 'playbooks://outcomes'
    },
    {
      title: playbook.name,
      description: playbook.description,
      owner: playbook.oversight === 'required' ? 'Named human reviewer' : 'Named workflow operator',
      boundary: `${playbook.judgment.notes} Oversight: ${playbook.oversight}.`,
      proof: `${playbook.outputs.map((output) => output.description).join(' ')} Preserve the decision and source evidence in the run record.`,
      source: 'packages/playbook-mcp/src/outcome-playbooks.ts',
      steps: playbook.steps.map((step, index) => ({
        id: `${index + 1}-${step.referenceId}`,
        title: step.customLabel,
        detail: step.notes
      }))
    }
  )
);

const OPERATOR_ARCS = OPERATOR_PLAYBOOKS.map((playbook) =>
  entry(
    'operator',
    {
      id: playbook.slug,
      kind: 'operator-playbook',
      registered: true,
      registry: 'playbooks://operators'
    },
    {
      title: playbook.title,
      description: playbook.summary,
      owner: playbook.owner,
      boundary: playbook.waitPoint,
      proof: playbook.proof,
      source: 'packages/playbook-mcp/src/operator-playbooks.ts',
      steps: stepsFromStrings(playbook.runbook)
    }
  )
);

const RUNBOOK_ARCS = WORKFLOWS.map((workflow) =>
  entry(
    'runbook',
    {
      id: workflow.id,
      kind: 'runbook',
      registered: true,
      registry: 'playbooks://workflows'
    },
    {
      title: workflow.name,
      description: workflow.description,
      owner: `${workflow.hostName} operator`,
      boundary: `Run only within the connected ${workflow.hostName} workspace and preserve human review wherever the registered steps require it.`,
      proof: `The ${workflow.name} output, its source context, and the final operator-visible state.`,
      source: 'packages/playbook-mcp/src/workflows.ts',
      steps: workflow.steps.map((step, index) => ({
        id: `${index + 1}-${step.referenceId}`,
        title: step.customLabel,
        detail: step.notes
      }))
    }
  )
);

export const ARC_CATALOG_COUNTS = {
  hostPlaybooks: HOST_ARCS.length,
  outcomePlaybooks: OUTCOME_ARCS.length,
  operatorPlaybooks: OPERATOR_ARCS.length,
  runbooks: RUNBOOK_ARCS.length,
  generated: HOST_ARCS.length + OUTCOME_ARCS.length + OPERATOR_ARCS.length + RUNBOOK_ARCS.length
} as const;

export const ARC_CATALOG: ArcCatalogEntry[] = [
  ...HOST_ARCS,
  ...OUTCOME_ARCS,
  ...OPERATOR_ARCS,
  ...RUNBOOK_ARCS
];

const APP_REVIEW_ARC: ArcCatalogEntry = {
  slug: 'app-review-governance',
  title: APP_REVIEW_GOVERNANCE_COMPOSITION.title,
  description: APP_REVIEW_GOVERNANCE_COMPOSITION.description,
  href: '/arc/app-review-governance',
  visibility: 'public-noindex',
  source: {
    id: APP_REVIEW_GOVERNANCE_COMPOSITION.id,
    kind: 'prototype',
    registered: true,
    registry: '@create-something/atlas-composition'
  },
  composition: APP_REVIEW_GOVERNANCE_COMPOSITION
};

export const ALL_ARC_CATALOG: ArcCatalogEntry[] = [APP_REVIEW_ARC, ...ARC_CATALOG];

export function getArcBySlug(slug: string): ArcCatalogEntry | undefined {
  return ALL_ARC_CATALOG.find((arc) => arc.slug === slug);
}

export function listArcSummaries(): ArcCatalogSummary[] {
  return ALL_ARC_CATALOG.map(({ composition, ...arc }) => ({
    ...arc,
    sceneCount: composition.scenes.length,
    stepCount:
      composition.scenes.find((scene) => scene.kind === 'runbook')?.presentation.branches?.length ??
      0
  }));
}
