/**
 * Generated Canon overlay candidate promotion readiness report content — DO NOT EDIT MANUALLY.
 * Run: npm run build:content
 * Source: packages/canon/src/lib/mcp-snapshot/
 */

import type { CanonOverlayCandidatePromotionReadinessReportCollection } from '../types.js';

export const CANON_OVERLAY_CANDIDATE_PROMOTION_READINESS_REPORTS: CanonOverlayCandidatePromotionReadinessReportCollection = {
  "schemaVersion": 1,
  "id": "canon-overlay-candidate-promotion-readiness-reports",
  "sourceOfTruth": "@create-something/canon/overlays/intake",
  "description": "Read-only readiness reports for Canon overlay candidate promotion plans, showing approval, registry, export, docs, validation, compatibility, and stop-condition gaps before implementation starts.",
  "entries": [
    {
      "id": "canon-overlay-candidate-promotion-readiness:overlay.agency-atlas-public.workflow-proof-surface",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.agency-atlas-public.workflow-proof-surface",
      "candidateId": "overlay.agency-atlas-public:overlay.agency-atlas-public.workflow-proof-surface",
      "intakeId": "overlay.agency-atlas-public.workflow-proof-surface",
      "title": "Agency public Atlas workflow proof surface readiness report",
      "summary": "A candidate Canon pattern for turning a public web route, chat-assisted canvas, and booking handoff into one reusable workflow-proof surface without forking Atlas primitives. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts.",
      "status": "needs-approval",
      "readinessUri": "canon://overlays/candidates/overlay.agency-atlas-public.workflow-proof-surface/readiness",
      "planUri": "canon://overlays/candidates/overlay.agency-atlas-public.workflow-proof-surface/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.agency-atlas-public.workflow-proof-surface/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.agency-atlas-public.workflow-proof-surface",
      "reviewUri": "canon://overlays/intake/overlay.agency-atlas-public",
      "checks": [
        {
          "id": "human-approval",
          "label": "Human Approval",
          "status": "needs-input",
          "evidence": [
            "Promotion plans and readiness reports cannot verify approval automatically.",
            "Plan approval boundary: This plan is read-only and does not approve implementation, create Linear issues, mutate overlays, or mark anything stable. Open implementation work only after explicit human approval. Stable promotion still requires Canon-owned export path, docs, tests, compatibility notes, and registry routing."
          ],
          "requiredAction": "Record explicit maintainer approval before implementation starts."
        },
        {
          "id": "registry-target",
          "label": "Canon Registry Target",
          "status": "review",
          "evidence": [
            "template.atlas-development-handoff is a template candidate item with overlapping evidence.",
            "template.canon-project-overlay-manifest is a template candidate item with overlapping evidence.",
            "template.canon-project-overlay-template-pack is a template candidate item with overlapping evidence.",
            "component.atlas-atlas-story-canvas is a component candidate item with overlapping evidence.",
            "template.canon-extension-intake is a template candidate item with overlapping evidence."
          ],
          "requiredAction": "Choose whether to reuse, update, or create a Canon registry item id before editing implementation code."
        },
        {
          "id": "export-target",
          "label": "Canon Export Target",
          "status": "review",
          "evidence": [
            "./atlas is candidate-review / stable-foundation-candidate.",
            "./overlays/intake is registry-covered / registry-artifact.",
            "./atlas/handoff is registry-covered / headless-contract.",
            "./components#TriadHealth is candidate-review / domain-specific.",
            "./components#CrossPropertyLink is candidate-review / platform-surface."
          ],
          "requiredAction": "Select the Canon export path and confirm whether public export policy needs a new or updated rule."
        },
        {
          "id": "docs-target",
          "label": "Canon Docs Target",
          "status": "review",
          "evidence": [
            "Related registry docs path: /canon/resources/registry.",
            "Related registry docs path: /canon/resources/registry.",
            "Related registry docs path: /canon/resources/registry.",
            "Related registry docs path: /canon/components/atlas.",
            "Related registry docs path: /canon/resources/registry."
          ],
          "requiredAction": "Choose the nearest Canon docs page and update it during implementation."
        },
        {
          "id": "validation-scope",
          "label": "Validation Scope",
          "status": "ready",
          "evidence": [
            "Run focused Canon tests for the touched source and registry behavior.",
            "Run Canon build or package check covering public exports.",
            "Run MCP parity/build checks if generated registry, overlay, or docs content changes.",
            "Run .ltd check if public Canon docs change.",
            "Record exact commands and evidence in the promotion PR or Linear issue."
          ],
          "requiredAction": "Run and record the focused Canon, MCP, and docs validation commands."
        },
        {
          "id": "compatibility-scope",
          "label": "Compatibility Scope",
          "status": "ready",
          "evidence": [
            "Preserve existing project overlay behavior until Canon consumers intentionally migrate.",
            "Name any breaking API, token, copy, or policy change before promotion.",
            "Include rollback or keep-local guidance if the candidate remains project-owned."
          ],
          "requiredAction": "Name migration, rollback, or keep-local behavior before stable promotion."
        }
      ],
      "relatedRegistryItems": [
        {
          "id": "template.atlas-development-handoff",
          "name": "Atlas Development Handoff Template",
          "kind": "template",
          "maturity": "candidate",
          "modalities": [
            "web",
            "chat",
            "app",
            "voice",
            "glasses"
          ],
          "docsPath": "/canon/resources/registry",
          "score": 30,
          "reason": "Matches requested kind and overlaps 3 requested modalities."
        },
        {
          "id": "template.canon-project-overlay-manifest",
          "name": "Canon Project Overlay Manifest",
          "kind": "template",
          "maturity": "candidate",
          "modalities": [
            "web",
            "chat",
            "app",
            "voice",
            "glasses"
          ],
          "docsPath": "/canon/resources/registry",
          "score": 24,
          "reason": "Matches requested kind and overlaps 3 requested modalities."
        },
        {
          "id": "template.canon-project-overlay-template-pack",
          "name": "Canon Project Overlay Template Pack",
          "kind": "template",
          "maturity": "candidate",
          "modalities": [
            "web",
            "chat",
            "app",
            "voice",
            "glasses"
          ],
          "docsPath": "/canon/resources/registry",
          "score": 22,
          "reason": "Matches requested kind and overlaps 3 requested modalities."
        },
        {
          "id": "component.atlas-atlas-story-canvas",
          "name": "AtlasStoryCanvas",
          "kind": "component",
          "maturity": "candidate",
          "modalities": [
            "web",
            "app",
            "chat",
            "voice",
            "glasses"
          ],
          "docsPath": "/canon/components/atlas",
          "score": 21,
          "reason": "Overlaps 3 requested modalities."
        },
        {
          "id": "template.canon-extension-intake",
          "name": "Canon Extension Intake Template",
          "kind": "template",
          "maturity": "candidate",
          "modalities": [
            "web",
            "chat",
            "app",
            "voice",
            "glasses"
          ],
          "docsPath": "/canon/resources/registry",
          "score": 21,
          "reason": "Matches requested kind and overlaps 3 requested modalities."
        }
      ],
      "candidateExportPolicies": [
        {
          "exportPath": "./atlas",
          "classification": "stable-foundation-candidate",
          "registryPolicy": "candidate-review",
          "score": 9,
          "rationale": "Atlas renderers should align with the existing headless graph adapter before promotion."
        },
        {
          "exportPath": "./overlays/intake",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 8,
          "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
          "registryItemIds": [
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./atlas/handoff",
          "classification": "headless-contract",
          "registryPolicy": "registry-covered",
          "score": 7,
          "rationale": "Atlas handoff API is covered by template.atlas-development-handoff.",
          "registryItemIds": [
            "template.atlas-development-handoff"
          ]
        },
        {
          "exportPath": "./components",
          "classification": "domain-specific",
          "registryPolicy": "candidate-review",
          "score": 7,
          "rationale": "CREATE SOMETHING framework display; needs governance-pattern contract before promotion.",
          "exportName": "TriadHealth"
        },
        {
          "exportPath": "./components",
          "classification": "platform-surface",
          "registryPolicy": "candidate-review",
          "score": 7,
          "rationale": "Property-routing primitive candidate tied to CREATE SOMETHING property topology.",
          "exportName": "CrossPropertyLink"
        }
      ],
      "stopConditions": [
        "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
        "Stop if human approval is missing or ambiguous.",
        "Stop if source paths, surface proofs, or required evidence are stale.",
        "Stop if implementation would create a fork instead of a Canon-owned export and registry item.",
        "Stop before creating Linear work automatically from this plan.",
        "Stop if readiness output is used as approval instead of evidence for a maintainer decision.",
        "Stop if no Canon registry id, export path, docs path, and validation scope have been selected."
      ],
      "approvalBoundary": [
        "This readiness report is read-only and does not approve implementation, create Linear issues, mutate overlays, or mark anything stable.",
        "Human approval and target selection must be recorded outside this report before implementation starts.",
        "Use related registry items and export policies as review hints, not automatic target choices."
      ],
      "agentContract": {
        "purpose": "canon-overlay-candidate-promotion-readiness-report",
        "primaryConsumers": [
          "codex",
          "mcp",
          "ltd-docs",
          "project-overlays"
        ],
        "useFor": [
          "checking whether promotion work has approval and target-selection prerequisites",
          "finding likely registry or export-policy neighbors before implementation",
          "carrying missing target evidence into a follow-up implementation slice"
        ],
        "stopBefore": [
          "automatically creating Linear issues",
          "automatically selecting registry ids or export paths",
          "automatically editing Canon or project overlays",
          "treating readiness as stable promotion"
        ]
      }
    },
    {
      "id": "canon-overlay-candidate-promotion-readiness:overlay.lms-workflow-learning.lesson-proof-surface",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.lms-workflow-learning.lesson-proof-surface",
      "candidateId": "overlay.lms-workflow-learning:overlay.lms-workflow-learning.lesson-proof-surface",
      "intakeId": "overlay.lms-workflow-learning.lesson-proof-surface",
      "title": "Workflow learning proof surface readiness report",
      "summary": "A candidate Canon learning template for teaching workflow proof across lesson content, path navigation, progress receipts, and event telemetry without promoting one course's copy into Canon stable. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts.",
      "status": "needs-approval",
      "readinessUri": "canon://overlays/candidates/overlay.lms-workflow-learning.lesson-proof-surface/readiness",
      "planUri": "canon://overlays/candidates/overlay.lms-workflow-learning.lesson-proof-surface/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.lms-workflow-learning.lesson-proof-surface/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.lms-workflow-learning.lesson-proof-surface",
      "reviewUri": "canon://overlays/intake/overlay.lms-workflow-learning",
      "checks": [
        {
          "id": "human-approval",
          "label": "Human Approval",
          "status": "needs-input",
          "evidence": [
            "Promotion plans and readiness reports cannot verify approval automatically.",
            "Plan approval boundary: This plan is read-only and does not approve implementation, create Linear issues, mutate overlays, or mark anything stable. Open implementation work only after explicit human approval. Stable promotion still requires Canon-owned export path, docs, tests, compatibility notes, and registry routing."
          ],
          "requiredAction": "Record explicit maintainer approval before implementation starts."
        },
        {
          "id": "registry-target",
          "label": "Canon Registry Target",
          "status": "review",
          "evidence": [
            "template.atlas-development-handoff is a template candidate item with overlapping evidence.",
            "template.web-governed-workflow is a template candidate item with overlapping evidence.",
            "template.canon-project-overlay-template-pack is a template candidate item with overlapping evidence.",
            "template.canon-extension-intake is a template candidate item with overlapping evidence.",
            "template.canon-project-overlay-manifest is a template candidate item with overlapping evidence."
          ],
          "requiredAction": "Choose whether to reuse, update, or create a Canon registry item id before editing implementation code."
        },
        {
          "id": "export-target",
          "label": "Canon Export Target",
          "status": "review",
          "evidence": [
            "./insights is candidate-review / content-utility.",
            "./interactive#IntegrationFlow is candidate-review / composition-pattern.",
            "./overlays/intake is registry-covered / registry-artifact.",
            "./components#PapersGrid is candidate-review / content-utility.",
            "./brand is candidate-review / brand-surface."
          ],
          "requiredAction": "Select the Canon export path and confirm whether public export policy needs a new or updated rule."
        },
        {
          "id": "docs-target",
          "label": "Canon Docs Target",
          "status": "review",
          "evidence": [
            "Related registry docs path: /canon/resources/registry.",
            "Related registry docs path: /canon/components/clear.",
            "Related registry docs path: /canon/resources/registry.",
            "Related registry docs path: /canon/resources/registry.",
            "Related registry docs path: /canon/resources/registry."
          ],
          "requiredAction": "Choose the nearest Canon docs page and update it during implementation."
        },
        {
          "id": "validation-scope",
          "label": "Validation Scope",
          "status": "ready",
          "evidence": [
            "Run focused Canon tests for the touched source and registry behavior.",
            "Run Canon build or package check covering public exports.",
            "Run MCP parity/build checks if generated registry, overlay, or docs content changes.",
            "Run .ltd check if public Canon docs change.",
            "Record exact commands and evidence in the promotion PR or Linear issue."
          ],
          "requiredAction": "Run and record the focused Canon, MCP, and docs validation commands."
        },
        {
          "id": "compatibility-scope",
          "label": "Compatibility Scope",
          "status": "ready",
          "evidence": [
            "Preserve existing project overlay behavior until Canon consumers intentionally migrate.",
            "Name any breaking API, token, copy, or policy change before promotion.",
            "Include rollback or keep-local guidance if the candidate remains project-owned."
          ],
          "requiredAction": "Name migration, rollback, or keep-local behavior before stable promotion."
        }
      ],
      "relatedRegistryItems": [
        {
          "id": "template.atlas-development-handoff",
          "name": "Atlas Development Handoff Template",
          "kind": "template",
          "maturity": "candidate",
          "modalities": [
            "web",
            "chat",
            "app",
            "voice",
            "glasses"
          ],
          "docsPath": "/canon/resources/registry",
          "score": 28,
          "reason": "Matches requested kind and overlaps 3 requested modalities."
        },
        {
          "id": "template.web-governed-workflow",
          "name": "Web Governed Workflow Template",
          "kind": "template",
          "maturity": "candidate",
          "modalities": [
            "web",
            "app"
          ],
          "docsPath": "/canon/components/clear",
          "score": 24,
          "reason": "Matches requested kind and overlaps 2 requested modalities."
        },
        {
          "id": "template.canon-project-overlay-template-pack",
          "name": "Canon Project Overlay Template Pack",
          "kind": "template",
          "maturity": "candidate",
          "modalities": [
            "web",
            "chat",
            "app",
            "voice",
            "glasses"
          ],
          "docsPath": "/canon/resources/registry",
          "score": 23,
          "reason": "Matches requested kind and overlaps 3 requested modalities."
        },
        {
          "id": "template.canon-extension-intake",
          "name": "Canon Extension Intake Template",
          "kind": "template",
          "maturity": "candidate",
          "modalities": [
            "web",
            "chat",
            "app",
            "voice",
            "glasses"
          ],
          "docsPath": "/canon/resources/registry",
          "score": 22,
          "reason": "Matches requested kind and overlaps 3 requested modalities."
        },
        {
          "id": "template.canon-project-overlay-manifest",
          "name": "Canon Project Overlay Manifest",
          "kind": "template",
          "maturity": "candidate",
          "modalities": [
            "web",
            "chat",
            "app",
            "voice",
            "glasses"
          ],
          "docsPath": "/canon/resources/registry",
          "score": 22,
          "reason": "Matches requested kind and overlaps 3 requested modalities."
        }
      ],
      "candidateExportPolicies": [
        {
          "exportPath": "./insights",
          "classification": "content-utility",
          "registryPolicy": "candidate-review",
          "score": 8,
          "rationale": "Insight visuals need content and proof contracts before registry promotion."
        },
        {
          "exportPath": "./interactive",
          "classification": "composition-pattern",
          "registryPolicy": "candidate-review",
          "score": 8,
          "rationale": "IntegrationFlow can become a shared workflow/integration disclosure pattern after data and nonvisual contracts settle.",
          "exportName": "IntegrationFlow"
        },
        {
          "exportPath": "./overlays/intake",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 8,
          "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
          "registryItemIds": [
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./components",
          "classification": "content-utility",
          "registryPolicy": "candidate-review",
          "score": 7,
          "rationale": "Research content collection layout, not yet a general Canon grid contract.",
          "exportName": "PapersGrid"
        },
        {
          "exportPath": "./brand",
          "classification": "brand-surface",
          "registryPolicy": "candidate-review",
          "score": 6,
          "rationale": "Brand support exports need brand-contract review before any stable registry promotion."
        }
      ],
      "stopConditions": [
        "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
        "Stop if human approval is missing or ambiguous.",
        "Stop if source paths, surface proofs, or required evidence are stale.",
        "Stop if implementation would create a fork instead of a Canon-owned export and registry item.",
        "Stop before creating Linear work automatically from this plan.",
        "Stop if readiness output is used as approval instead of evidence for a maintainer decision.",
        "Stop if no Canon registry id, export path, docs path, and validation scope have been selected."
      ],
      "approvalBoundary": [
        "This readiness report is read-only and does not approve implementation, create Linear issues, mutate overlays, or mark anything stable.",
        "Human approval and target selection must be recorded outside this report before implementation starts.",
        "Use related registry items and export policies as review hints, not automatic target choices."
      ],
      "agentContract": {
        "purpose": "canon-overlay-candidate-promotion-readiness-report",
        "primaryConsumers": [
          "codex",
          "mcp",
          "ltd-docs",
          "project-overlays"
        ],
        "useFor": [
          "checking whether promotion work has approval and target-selection prerequisites",
          "finding likely registry or export-policy neighbors before implementation",
          "carrying missing target evidence into a follow-up implementation slice"
        ],
        "stopBefore": [
          "automatically creating Linear issues",
          "automatically selecting registry ids or export paths",
          "automatically editing Canon or project overlays",
          "treating readiness as stable promotion"
        ]
      }
    }
  ],
  "summary": {
    "total": 2,
    "needsApproval": 2,
    "needsTargets": 0,
    "readyForImplementation": 0
  },
  "agentContract": {
    "purpose": "canon-overlay-candidate-promotion-readiness-reports",
    "primaryConsumers": [
      "codex",
      "mcp",
      "ltd-docs",
      "project-overlays"
    ],
    "useFor": [
      "checking whether an approved promotion plan has enough Canon target information to start implementation",
      "comparing candidates with current Canon registry and public export policy snapshots",
      "keeping human approval and target selection explicit before code changes"
    ],
    "stopBefore": [
      "treating readiness as human approval",
      "automatically creating Linear work from readiness reports",
      "automatically editing Canon registry, exports, docs, or project overlays",
      "marking candidates stable from readiness output"
    ]
  }
};
