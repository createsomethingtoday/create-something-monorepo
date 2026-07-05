/**
 * Generated Canon overlay candidate promotion plan content — DO NOT EDIT MANUALLY.
 * Run: npm run build:content
 * Source: packages/canon/src/lib/overlays/intake.ts
 */

import type { CanonOverlayCandidatePromotionPlanCollection } from '../types.js';

export const CANON_OVERLAY_CANDIDATE_PROMOTION_PLANS: CanonOverlayCandidatePromotionPlanCollection = {
  "schemaVersion": 1,
  "id": "canon-overlay-candidate-promotion-plans",
  "sourceOfTruth": "@create-something/canon/overlays/intake",
  "description": "Read-only implementation plans for Canon overlay candidates after explicit human approval, preserving export, docs, tests, compatibility, and stop-condition requirements before stable promotion.",
  "entries": [
    {
      "id": "canon-overlay-candidate-promotion-plan:overlay.agency-atlas-public.workflow-proof-surface",
      "packetId": "canon-overlay-candidate-review:overlay.agency-atlas-public.workflow-proof-surface",
      "candidateId": "overlay.agency-atlas-public:overlay.agency-atlas-public.workflow-proof-surface",
      "intakeId": "overlay.agency-atlas-public.workflow-proof-surface",
      "title": "Agency public Atlas workflow proof surface promotion plan",
      "summary": "A candidate Canon pattern for turning a public web route, chat-assisted canvas, and booking handoff into one reusable workflow-proof surface without forking Atlas primitives.",
      "overlayId": "overlay.agency-atlas-public",
      "overlayName": "Agency Atlas Public Overlay",
      "manifestPath": "packages/agency/canon-overlay/manifest.ts",
      "owner": "agency-team",
      "sourcePackage": "@create-something/agency",
      "sourcePath": "src/routes/atlas/+page.svelte",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app"
      ],
      "planUri": "canon://overlays/candidates/overlay.agency-atlas-public.workflow-proof-surface/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.agency-atlas-public.workflow-proof-surface/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.agency-atlas-public.workflow-proof-surface",
      "reviewUri": "canon://overlays/intake/overlay.agency-atlas-public",
      "preconditions": [
        "Human maintainer approval is recorded outside this plan before implementation starts.",
        "Candidate review packet has been read and current source paths still resolve.",
        "Implementation owner confirms the candidate should move toward Canon candidate or stable work instead of remaining project-local."
      ],
      "implementationScope": [
        "Evaluate the template candidate for Canon-owned source, export, docs, tests, compatibility, and registry routing.",
        "Preserve the owning overlay as evidence: Agency Atlas Public Overlay (overlay.agency-atlas-public).",
        "Cover modalities: web, chat, app.",
        "Review source package @create-something/agency at src/routes/atlas/+page.svelte."
      ],
      "requiredChanges": [
        "Choose the Canon source module, package export path, registry item id, and maturity target before editing.",
        "Add or update Canon source implementation only after confirming no stable registry item already satisfies the candidate.",
        "Update Canon registry metadata with kind, modalities, dependencies, docs path, and contract notes.",
        "Update MCP generated content and public Canon docs for the new or changed Canon primitive.",
        "Keep project overlay artifacts as evidence; do not mutate them as part of promotion planning."
      ],
      "validationPlan": [
        "Run focused Canon tests for the touched source and registry behavior.",
        "Run Canon build or package check covering public exports.",
        "Run MCP parity/build checks if generated registry, overlay, or docs content changes.",
        "Run .ltd check if public Canon docs change.",
        "Record exact commands and evidence in the promotion PR or Linear issue."
      ],
      "documentationPlan": [
        "Document the Canon-owned behavior and import path in the nearest Canon docs page.",
        "Link the promoted item back to the registry and overlay evidence where useful.",
        "Call out modality responsibilities for web, chat, app, voice, or glasses as applicable."
      ],
      "compatibilityPlan": [
        "Preserve existing project overlay behavior until Canon consumers intentionally migrate.",
        "Name any breaking API, token, copy, or policy change before promotion.",
        "Include rollback or keep-local guidance if the candidate remains project-owned."
      ],
      "stopConditions": [
        "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
        "Stop if human approval is missing or ambiguous.",
        "Stop if source paths, surface proofs, or required evidence are stale.",
        "Stop if implementation would create a fork instead of a Canon-owned export and registry item.",
        "Stop before creating Linear work automatically from this plan."
      ],
      "approvalBoundary": [
        "This plan is read-only and does not approve implementation, create Linear issues, mutate overlays, or mark anything stable.",
        "Open implementation work only after explicit human approval.",
        "Stable promotion still requires Canon-owned export path, docs, tests, compatibility notes, and registry routing."
      ],
      "agentContract": {
        "purpose": "canon-overlay-candidate-promotion-plan",
        "primaryConsumers": [
          "codex",
          "mcp",
          "ltd-docs",
          "project-overlays"
        ],
        "useFor": [
          "planning implementation after candidate approval",
          "checking promotion scope before editing Canon",
          "carrying evidence and stop conditions into a follow-up PR"
        ],
        "stopBefore": [
          "automatically creating Linear issues",
          "automatically editing Canon source",
          "treating the plan as approval or stable promotion"
        ]
      }
    },
    {
      "id": "canon-overlay-candidate-promotion-plan:overlay.lms-workflow-learning.lesson-proof-surface",
      "packetId": "canon-overlay-candidate-review:overlay.lms-workflow-learning.lesson-proof-surface",
      "candidateId": "overlay.lms-workflow-learning:overlay.lms-workflow-learning.lesson-proof-surface",
      "intakeId": "overlay.lms-workflow-learning.lesson-proof-surface",
      "title": "Workflow learning proof surface promotion plan",
      "summary": "A candidate Canon learning template for teaching workflow proof across lesson content, path navigation, progress receipts, and event telemetry without promoting one course's copy into Canon stable.",
      "overlayId": "overlay.lms-workflow-learning",
      "overlayName": "LMS Workflow Learning Overlay",
      "manifestPath": "packages/lms/canon-overlay/manifest.ts",
      "owner": "learning-team",
      "sourcePackage": "@create-something/lms",
      "sourcePath": "src/lib/content/lessons/make-your-workflow-visible/what-images-prove.md",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "app",
        "chat"
      ],
      "planUri": "canon://overlays/candidates/overlay.lms-workflow-learning.lesson-proof-surface/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.lms-workflow-learning.lesson-proof-surface/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.lms-workflow-learning.lesson-proof-surface",
      "reviewUri": "canon://overlays/intake/overlay.lms-workflow-learning",
      "preconditions": [
        "Human maintainer approval is recorded outside this plan before implementation starts.",
        "Candidate review packet has been read and current source paths still resolve.",
        "Implementation owner confirms the candidate should move toward Canon candidate or stable work instead of remaining project-local."
      ],
      "implementationScope": [
        "Evaluate the template candidate for Canon-owned source, export, docs, tests, compatibility, and registry routing.",
        "Preserve the owning overlay as evidence: LMS Workflow Learning Overlay (overlay.lms-workflow-learning).",
        "Cover modalities: web, app, chat.",
        "Review source package @create-something/lms at src/lib/content/lessons/make-your-workflow-visible/what-images-prove.md."
      ],
      "requiredChanges": [
        "Choose the Canon source module, package export path, registry item id, and maturity target before editing.",
        "Add or update Canon source implementation only after confirming no stable registry item already satisfies the candidate.",
        "Update Canon registry metadata with kind, modalities, dependencies, docs path, and contract notes.",
        "Update MCP generated content and public Canon docs for the new or changed Canon primitive.",
        "Keep project overlay artifacts as evidence; do not mutate them as part of promotion planning."
      ],
      "validationPlan": [
        "Run focused Canon tests for the touched source and registry behavior.",
        "Run Canon build or package check covering public exports.",
        "Run MCP parity/build checks if generated registry, overlay, or docs content changes.",
        "Run .ltd check if public Canon docs change.",
        "Record exact commands and evidence in the promotion PR or Linear issue."
      ],
      "documentationPlan": [
        "Document the Canon-owned behavior and import path in the nearest Canon docs page.",
        "Link the promoted item back to the registry and overlay evidence where useful.",
        "Call out modality responsibilities for web, chat, app, voice, or glasses as applicable."
      ],
      "compatibilityPlan": [
        "Preserve existing project overlay behavior until Canon consumers intentionally migrate.",
        "Name any breaking API, token, copy, or policy change before promotion.",
        "Include rollback or keep-local guidance if the candidate remains project-owned."
      ],
      "stopConditions": [
        "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
        "Stop if human approval is missing or ambiguous.",
        "Stop if source paths, surface proofs, or required evidence are stale.",
        "Stop if implementation would create a fork instead of a Canon-owned export and registry item.",
        "Stop before creating Linear work automatically from this plan."
      ],
      "approvalBoundary": [
        "This plan is read-only and does not approve implementation, create Linear issues, mutate overlays, or mark anything stable.",
        "Open implementation work only after explicit human approval.",
        "Stable promotion still requires Canon-owned export path, docs, tests, compatibility notes, and registry routing."
      ],
      "agentContract": {
        "purpose": "canon-overlay-candidate-promotion-plan",
        "primaryConsumers": [
          "codex",
          "mcp",
          "ltd-docs",
          "project-overlays"
        ],
        "useFor": [
          "planning implementation after candidate approval",
          "checking promotion scope before editing Canon",
          "carrying evidence and stop conditions into a follow-up PR"
        ],
        "stopBefore": [
          "automatically creating Linear issues",
          "automatically editing Canon source",
          "treating the plan as approval or stable promotion"
        ]
      }
    }
  ],
  "summary": {
    "total": 2,
    "overlays": 2,
    "byRequestedKind": [
      {
        "kind": "template",
        "count": 2
      }
    ],
    "byModality": [
      {
        "modality": "app",
        "count": 2
      },
      {
        "modality": "chat",
        "count": 2
      },
      {
        "modality": "web",
        "count": 2
      }
    ]
  },
  "agentContract": {
    "purpose": "canon-overlay-candidate-promotion-plans",
    "primaryConsumers": [
      "codex",
      "mcp",
      "ltd-docs",
      "project-overlays"
    ],
    "useFor": [
      "planning a bounded Canon implementation slice after a human approves a candidate handoff",
      "checking export, docs, tests, compatibility, MCP content, and rollback expectations before stable promotion",
      "keeping candidate implementation work separate from approval and Linear issue creation",
      "turning repeated-surface overlay evidence into a reviewable implementation checklist"
    ],
    "stopBefore": [
      "automatically creating Linear issues from promotion plans",
      "automatically approving or marking any candidate stable",
      "editing project overlay manifests while rendering promotion plans",
      "treating a plan as production permission without explicit human approval"
    ]
  }
};
