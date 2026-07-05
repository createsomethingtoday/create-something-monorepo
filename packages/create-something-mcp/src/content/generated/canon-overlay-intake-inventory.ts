/**
 * Generated Canon overlay intake inventory content — DO NOT EDIT MANUALLY.
 * Run: npm run build:content
 * Source: packages/canon/src/lib/overlays/intake.ts
 */

import type { CanonProjectOverlayInventory } from '../types.js';

export const CANON_OVERLAY_INTAKE_INVENTORY: CanonProjectOverlayInventory = {
  "schemaVersion": 1,
  "id": "canon-overlay-intake-inventory",
  "sourceOfTruth": "@create-something/canon/overlays/intake",
  "description": "Repo-level Canon overlay intake inventory for discovering project overlay manifests, reviewing evidence, and routing repeated-surface proposals back to Canon without forking primitives.",
  "rootDir": "<repo-root>",
  "searchRoots": [
    "apps",
    "packages"
  ],
  "entries": [],
  "summary": {
    "total": 0,
    "ready": 0,
    "needsArtifacts": 0,
    "needsEvidence": 0,
    "needsReview": 0,
    "candidateIntakes": 0,
    "projectLocalIntakes": 0
  },
  "agentContract": {
    "purpose": "canon-overlay-intake-inventory",
    "primaryConsumers": [
      "codex",
      "mcp",
      "ltd-docs",
      "project-overlays"
    ],
    "useFor": [
      "finding project/client Canon overlays across repo packages and apps",
      "reviewing overlay artifact completeness before handoff",
      "identifying extension intakes that are project-local versus candidate promotion",
      "keeping multi-project feedback attached to Canon overlay manifests instead of ad hoc docs"
    ],
    "stopBefore": [
      "automatically promoting a project-local overlay into Canon stable",
      "mutating project overlay files during inventory discovery",
      "using a one-surface overlay as evidence for shared Canon primitives",
      "creating a second overlay intake tracker outside Canon and Linear"
    ]
  }
};
