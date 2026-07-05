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
      "id": "canon-overlay-candidate-promotion-readiness:overlay.atlas-studio-desktop.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.atlas-studio-desktop.surface-brief",
      "candidateId": "overlay.atlas-studio-desktop:overlay.atlas-studio-desktop.surface-brief",
      "intakeId": "overlay.atlas-studio-desktop.surface-brief",
      "title": "Surface Brief Template readiness report",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts.",
      "status": "needs-approval",
      "readinessUri": "canon://overlays/candidates/overlay.atlas-studio-desktop.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.atlas-studio-desktop.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.atlas-studio-desktop.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.atlas-studio-desktop.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.atlas-studio-desktop",
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
            "template.canon-extension-intake is a template candidate item with overlapping evidence.",
            "template.canon-project-overlay-template-pack is a template candidate item with overlapping evidence.",
            "token.canon-core is a token stable item with overlapping evidence."
          ],
          "requiredAction": "Choose whether to reuse, update, or create a Canon registry item id before editing implementation code."
        },
        {
          "id": "export-target",
          "label": "Canon Export Target",
          "status": "review",
          "evidence": [
            "./modality-readiness is registry-covered / registry-artifact.",
            "./mcp-snapshot is registry-covered / registry-artifact.",
            "./overlays/intake is registry-covered / registry-artifact.",
            "./registry is registry-covered / registry-artifact.",
            "./overlays is registry-covered / registry-artifact."
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
            "Related registry docs path: /canon/resources/registry.",
            "Related registry docs path: /canon/resources/tokens."
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
          "score": 32,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 31,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 30,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 29,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
        {
          "id": "token.canon-core",
          "name": "Canon Core Tokens",
          "kind": "token",
          "maturity": "stable",
          "modalities": [
            "web",
            "app",
            "chat",
            "voice",
            "glasses"
          ],
          "docsPath": "/canon/resources/tokens",
          "score": 20,
          "reason": "Overlaps 5 requested modalities."
        }
      ],
      "candidateExportPolicies": [
        {
          "exportPath": "./modality-readiness",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 15,
          "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
          "registryItemIds": [
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./mcp-snapshot",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 12,
          "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
          "registryItemIds": [
            "template.canon-project-overlay-template-pack",
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./overlays/intake",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 12,
          "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
          "registryItemIds": [
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./registry",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 12,
          "rationale": "Registry API is the Canon source of truth for discoverable artifacts and lifecycle rules.",
          "registryItemIds": [
            "template.canon-extension-intake",
            "template.canon-project-overlay-manifest"
          ]
        },
        {
          "exportPath": "./overlays",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 11,
          "rationale": "Overlay catalog export is covered by the Canon project overlay template pack, manifest, and extension intake registry items.",
          "registryItemIds": [
            "template.canon-project-overlay-template-pack",
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
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
      "id": "canon-overlay-candidate-promotion-readiness:overlay.marketplace-template-submission-cloud.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.marketplace-template-submission-cloud.surface-brief",
      "candidateId": "overlay.marketplace-template-submission-cloud:overlay.marketplace-template-submission-cloud.surface-brief",
      "intakeId": "overlay.marketplace-template-submission-cloud.surface-brief",
      "title": "Surface Brief Template readiness report",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts.",
      "status": "needs-approval",
      "readinessUri": "canon://overlays/candidates/overlay.marketplace-template-submission-cloud.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.marketplace-template-submission-cloud.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.marketplace-template-submission-cloud.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.marketplace-template-submission-cloud.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.marketplace-template-submission-cloud",
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
            "template.canon-project-overlay-manifest is a template candidate item with overlapping evidence.",
            "template.canon-extension-intake is a template candidate item with overlapping evidence.",
            "template.atlas-development-handoff is a template candidate item with overlapping evidence.",
            "template.canon-project-overlay-template-pack is a template candidate item with overlapping evidence.",
            "template.chat-decision-brief is a template candidate item with overlapping evidence."
          ],
          "requiredAction": "Choose whether to reuse, update, or create a Canon registry item id before editing implementation code."
        },
        {
          "id": "export-target",
          "label": "Canon Export Target",
          "status": "review",
          "evidence": [
            "./modality-readiness is registry-covered / registry-artifact.",
            "./mcp-snapshot is registry-covered / registry-artifact.",
            "./overlays/intake is registry-covered / registry-artifact.",
            "./registry is registry-covered / registry-artifact.",
            "./overlays is registry-covered / registry-artifact."
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
          "score": 34,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 33,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
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
          "score": 32,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 32,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
        {
          "id": "template.chat-decision-brief",
          "name": "Chat Decision Brief Template",
          "kind": "template",
          "maturity": "candidate",
          "modalities": [
            "chat",
            "voice"
          ],
          "docsPath": "/canon/resources/registry",
          "score": 21,
          "reason": "Matches requested kind and overlaps 2 requested modalities."
        }
      ],
      "candidateExportPolicies": [
        {
          "exportPath": "./modality-readiness",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 18,
          "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
          "registryItemIds": [
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./mcp-snapshot",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 15,
          "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
          "registryItemIds": [
            "template.canon-project-overlay-template-pack",
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./overlays/intake",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 15,
          "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
          "registryItemIds": [
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./registry",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 15,
          "rationale": "Registry API is the Canon source of truth for discoverable artifacts and lifecycle rules.",
          "registryItemIds": [
            "template.canon-extension-intake",
            "template.canon-project-overlay-manifest"
          ]
        },
        {
          "exportPath": "./overlays",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 14,
          "rationale": "Overlay catalog export is covered by the Canon project overlay template pack, manifest, and extension intake registry items.",
          "registryItemIds": [
            "template.canon-project-overlay-template-pack",
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
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
      "id": "canon-overlay-candidate-promotion-readiness:overlay.webflow-dashboard-cloud.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.webflow-dashboard-cloud.surface-brief",
      "candidateId": "overlay.webflow-dashboard-cloud:overlay.webflow-dashboard-cloud.surface-brief",
      "intakeId": "overlay.webflow-dashboard-cloud.surface-brief",
      "title": "Surface Brief Template readiness report",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts.",
      "status": "needs-approval",
      "readinessUri": "canon://overlays/candidates/overlay.webflow-dashboard-cloud.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.webflow-dashboard-cloud.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.webflow-dashboard-cloud.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.webflow-dashboard-cloud.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.webflow-dashboard-cloud",
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
            "template.canon-project-overlay-manifest is a template candidate item with overlapping evidence.",
            "template.canon-extension-intake is a template candidate item with overlapping evidence.",
            "template.atlas-development-handoff is a template candidate item with overlapping evidence.",
            "template.canon-project-overlay-template-pack is a template candidate item with overlapping evidence.",
            "token.canon-core is a token stable item with overlapping evidence."
          ],
          "requiredAction": "Choose whether to reuse, update, or create a Canon registry item id before editing implementation code."
        },
        {
          "id": "export-target",
          "label": "Canon Export Target",
          "status": "review",
          "evidence": [
            "./modality-readiness is registry-covered / registry-artifact.",
            "./mcp-snapshot is registry-covered / registry-artifact.",
            "./overlays/intake is registry-covered / registry-artifact.",
            "./registry is registry-covered / registry-artifact.",
            "./overlays is registry-covered / registry-artifact."
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
            "Related registry docs path: /canon/resources/registry.",
            "Related registry docs path: /canon/resources/tokens."
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
          "score": 31,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 30,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
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
          "score": 29,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 29,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
        {
          "id": "token.canon-core",
          "name": "Canon Core Tokens",
          "kind": "token",
          "maturity": "stable",
          "modalities": [
            "web",
            "app",
            "chat",
            "voice",
            "glasses"
          ],
          "docsPath": "/canon/resources/tokens",
          "score": 20,
          "reason": "Overlaps 5 requested modalities."
        }
      ],
      "candidateExportPolicies": [
        {
          "exportPath": "./modality-readiness",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 15,
          "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
          "registryItemIds": [
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./mcp-snapshot",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 12,
          "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
          "registryItemIds": [
            "template.canon-project-overlay-template-pack",
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./overlays/intake",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 12,
          "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
          "registryItemIds": [
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./registry",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 12,
          "rationale": "Registry API is the Canon source of truth for discoverable artifacts and lifecycle rules.",
          "registryItemIds": [
            "template.canon-extension-intake",
            "template.canon-project-overlay-manifest"
          ]
        },
        {
          "exportPath": "./overlays",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 11,
          "rationale": "Overlay catalog export is covered by the Canon project overlay template pack, manifest, and extension intake registry items.",
          "registryItemIds": [
            "template.canon-project-overlay-template-pack",
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
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
      "id": "canon-overlay-candidate-promotion-readiness:overlay.webflow-marketplace-category-cloud.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.webflow-marketplace-category-cloud.surface-brief",
      "candidateId": "overlay.webflow-marketplace-category-cloud:overlay.webflow-marketplace-category-cloud.surface-brief",
      "intakeId": "overlay.webflow-marketplace-category-cloud.surface-brief",
      "title": "Surface Brief Template readiness report",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts.",
      "status": "needs-approval",
      "readinessUri": "canon://overlays/candidates/overlay.webflow-marketplace-category-cloud.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.webflow-marketplace-category-cloud.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.webflow-marketplace-category-cloud.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.webflow-marketplace-category-cloud.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.webflow-marketplace-category-cloud",
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
            "template.canon-project-overlay-manifest is a template candidate item with overlapping evidence.",
            "template.canon-extension-intake is a template candidate item with overlapping evidence.",
            "template.atlas-development-handoff is a template candidate item with overlapping evidence.",
            "template.canon-project-overlay-template-pack is a template candidate item with overlapping evidence.",
            "token.canon-core is a token stable item with overlapping evidence."
          ],
          "requiredAction": "Choose whether to reuse, update, or create a Canon registry item id before editing implementation code."
        },
        {
          "id": "export-target",
          "label": "Canon Export Target",
          "status": "review",
          "evidence": [
            "./modality-readiness is registry-covered / registry-artifact.",
            "./mcp-snapshot is registry-covered / registry-artifact.",
            "./overlays/intake is registry-covered / registry-artifact.",
            "./registry is registry-covered / registry-artifact.",
            "./overlays is registry-covered / registry-artifact."
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
            "Related registry docs path: /canon/resources/registry.",
            "Related registry docs path: /canon/resources/tokens."
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
          "score": 31,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 30,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
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
          "score": 29,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 29,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
        {
          "id": "token.canon-core",
          "name": "Canon Core Tokens",
          "kind": "token",
          "maturity": "stable",
          "modalities": [
            "web",
            "app",
            "chat",
            "voice",
            "glasses"
          ],
          "docsPath": "/canon/resources/tokens",
          "score": 20,
          "reason": "Overlaps 5 requested modalities."
        }
      ],
      "candidateExportPolicies": [
        {
          "exportPath": "./modality-readiness",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 15,
          "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
          "registryItemIds": [
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./mcp-snapshot",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 12,
          "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
          "registryItemIds": [
            "template.canon-project-overlay-template-pack",
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./overlays/intake",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 12,
          "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
          "registryItemIds": [
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./registry",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 12,
          "rationale": "Registry API is the Canon source of truth for discoverable artifacts and lifecycle rules.",
          "registryItemIds": [
            "template.canon-extension-intake",
            "template.canon-project-overlay-manifest"
          ]
        },
        {
          "exportPath": "./overlays",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 11,
          "rationale": "Overlay catalog export is covered by the Canon project overlay template pack, manifest, and extension intake registry items.",
          "registryItemIds": [
            "template.canon-project-overlay-template-pack",
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
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
            "./modality-readiness is registry-covered / registry-artifact.",
            "./overlays/intake is registry-covered / registry-artifact.",
            "./atlas/handoff is registry-covered / headless-contract.",
            "./components#TriadHealth is candidate-review / domain-specific."
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
          "score": 34,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 28,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 26,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 25,
          "reason": "Overlaps 5 requested modalities."
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
          "score": 25,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "exportPath": "./modality-readiness",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 8,
          "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
          "registryItemIds": [
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
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
      "id": "canon-overlay-candidate-promotion-readiness:overlay.jandjhomehealth.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.jandjhomehealth.surface-brief",
      "candidateId": "overlay.jandjhomehealth:overlay.jandjhomehealth.surface-brief",
      "intakeId": "overlay.jandjhomehealth.surface-brief",
      "title": "Surface Brief Template readiness report",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts.",
      "status": "needs-approval",
      "readinessUri": "canon://overlays/candidates/overlay.jandjhomehealth.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.jandjhomehealth.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.jandjhomehealth.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.jandjhomehealth.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.jandjhomehealth",
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
            "template.canon-project-overlay-manifest is a template candidate item with overlapping evidence.",
            "template.canon-extension-intake is a template candidate item with overlapping evidence.",
            "template.canon-project-overlay-template-pack is a template candidate item with overlapping evidence.",
            "template.atlas-development-handoff is a template candidate item with overlapping evidence.",
            "component.triad-health is a component candidate item with overlapping evidence."
          ],
          "requiredAction": "Choose whether to reuse, update, or create a Canon registry item id before editing implementation code."
        },
        {
          "id": "export-target",
          "label": "Canon Export Target",
          "status": "review",
          "evidence": [
            "./modality-readiness is registry-covered / registry-artifact.",
            "./mcp-snapshot is registry-covered / registry-artifact.",
            "./overlays/intake is registry-covered / registry-artifact.",
            "./registry is registry-covered / registry-artifact.",
            "./overlays is registry-covered / registry-artifact."
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
            "Related registry docs path: /canon/resources/registry.",
            "Related registry docs path: /canon/components."
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
          "score": 32,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 31,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 30,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
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
          "score": 29,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
        {
          "id": "component.triad-health",
          "name": "TriadHealth",
          "kind": "component",
          "maturity": "candidate",
          "modalities": [
            "web",
            "app",
            "chat",
            "voice",
            "glasses"
          ],
          "docsPath": "/canon/components",
          "score": 20,
          "reason": "Overlaps 5 requested modalities."
        }
      ],
      "candidateExportPolicies": [
        {
          "exportPath": "./modality-readiness",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 15,
          "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
          "registryItemIds": [
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./mcp-snapshot",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 12,
          "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
          "registryItemIds": [
            "template.canon-project-overlay-template-pack",
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./overlays/intake",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 12,
          "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
          "registryItemIds": [
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./registry",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 12,
          "rationale": "Registry API is the Canon source of truth for discoverable artifacts and lifecycle rules.",
          "registryItemIds": [
            "template.canon-extension-intake",
            "template.canon-project-overlay-manifest"
          ]
        },
        {
          "exportPath": "./overlays",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 11,
          "rationale": "Overlay catalog export is covered by the Canon project overlay template pack, manifest, and extension intake registry items.",
          "registryItemIds": [
            "template.canon-project-overlay-template-pack",
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
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
      "id": "canon-overlay-candidate-promotion-readiness:overlay.outerfields.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.outerfields.surface-brief",
      "candidateId": "overlay.outerfields:overlay.outerfields.surface-brief",
      "intakeId": "overlay.outerfields.surface-brief",
      "title": "Surface Brief Template readiness report",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts.",
      "status": "needs-approval",
      "readinessUri": "canon://overlays/candidates/overlay.outerfields.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.outerfields.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.outerfields.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.outerfields.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.outerfields",
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
            "template.canon-project-overlay-manifest is a template candidate item with overlapping evidence.",
            "template.canon-extension-intake is a template candidate item with overlapping evidence.",
            "template.canon-project-overlay-template-pack is a template candidate item with overlapping evidence.",
            "template.atlas-development-handoff is a template candidate item with overlapping evidence.",
            "token.canon-core is a token stable item with overlapping evidence."
          ],
          "requiredAction": "Choose whether to reuse, update, or create a Canon registry item id before editing implementation code."
        },
        {
          "id": "export-target",
          "label": "Canon Export Target",
          "status": "review",
          "evidence": [
            "./modality-readiness is registry-covered / registry-artifact.",
            "./mcp-snapshot is registry-covered / registry-artifact.",
            "./overlays/intake is registry-covered / registry-artifact.",
            "./registry is registry-covered / registry-artifact.",
            "./overlays is registry-covered / registry-artifact."
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
            "Related registry docs path: /canon/resources/registry.",
            "Related registry docs path: /canon/resources/tokens."
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
          "score": 32,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 31,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 30,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
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
          "score": 29,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
        {
          "id": "token.canon-core",
          "name": "Canon Core Tokens",
          "kind": "token",
          "maturity": "stable",
          "modalities": [
            "web",
            "app",
            "chat",
            "voice",
            "glasses"
          ],
          "docsPath": "/canon/resources/tokens",
          "score": 20,
          "reason": "Overlaps 5 requested modalities."
        }
      ],
      "candidateExportPolicies": [
        {
          "exportPath": "./modality-readiness",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 15,
          "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
          "registryItemIds": [
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./mcp-snapshot",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 12,
          "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
          "registryItemIds": [
            "template.canon-project-overlay-template-pack",
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./overlays/intake",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 12,
          "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
          "registryItemIds": [
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./registry",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 12,
          "rationale": "Registry API is the Canon source of truth for discoverable artifacts and lifecycle rules.",
          "registryItemIds": [
            "template.canon-extension-intake",
            "template.canon-project-overlay-manifest"
          ]
        },
        {
          "exportPath": "./overlays",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 11,
          "rationale": "Overlay catalog export is covered by the Canon project overlay template pack, manifest, and extension intake registry items.",
          "registryItemIds": [
            "template.canon-project-overlay-template-pack",
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
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
      "id": "canon-overlay-candidate-promotion-readiness:overlay.the-stack.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.the-stack.surface-brief",
      "candidateId": "overlay.the-stack:overlay.the-stack.surface-brief",
      "intakeId": "overlay.the-stack.surface-brief",
      "title": "Surface Brief Template readiness report",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts.",
      "status": "needs-approval",
      "readinessUri": "canon://overlays/candidates/overlay.the-stack.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.the-stack.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.the-stack.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.the-stack.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.the-stack",
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
            "template.canon-project-overlay-manifest is a template candidate item with overlapping evidence.",
            "template.canon-extension-intake is a template candidate item with overlapping evidence.",
            "template.canon-project-overlay-template-pack is a template candidate item with overlapping evidence.",
            "template.atlas-development-handoff is a template candidate item with overlapping evidence.",
            "token.canon-core is a token stable item with overlapping evidence."
          ],
          "requiredAction": "Choose whether to reuse, update, or create a Canon registry item id before editing implementation code."
        },
        {
          "id": "export-target",
          "label": "Canon Export Target",
          "status": "review",
          "evidence": [
            "./modality-readiness is registry-covered / registry-artifact.",
            "./mcp-snapshot is registry-covered / registry-artifact.",
            "./overlays/intake is registry-covered / registry-artifact.",
            "./registry is registry-covered / registry-artifact.",
            "./overlays is registry-covered / registry-artifact."
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
            "Related registry docs path: /canon/resources/registry.",
            "Related registry docs path: /canon/resources/tokens."
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
          "score": 32,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 31,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 30,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
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
          "score": 29,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
        {
          "id": "token.canon-core",
          "name": "Canon Core Tokens",
          "kind": "token",
          "maturity": "stable",
          "modalities": [
            "web",
            "app",
            "chat",
            "voice",
            "glasses"
          ],
          "docsPath": "/canon/resources/tokens",
          "score": 20,
          "reason": "Overlaps 5 requested modalities."
        }
      ],
      "candidateExportPolicies": [
        {
          "exportPath": "./modality-readiness",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 15,
          "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
          "registryItemIds": [
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./mcp-snapshot",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 12,
          "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
          "registryItemIds": [
            "template.canon-project-overlay-template-pack",
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./overlays/intake",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 12,
          "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
          "registryItemIds": [
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./registry",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 12,
          "rationale": "Registry API is the Canon source of truth for discoverable artifacts and lifecycle rules.",
          "registryItemIds": [
            "template.canon-extension-intake",
            "template.canon-project-overlay-manifest"
          ]
        },
        {
          "exportPath": "./overlays",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 11,
          "rationale": "Overlay catalog export is covered by the Canon project overlay template pack, manifest, and extension intake registry items.",
          "registryItemIds": [
            "template.canon-project-overlay-template-pack",
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
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
      "id": "canon-overlay-candidate-promotion-readiness:overlay.clearway-conversion.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.clearway-conversion.surface-brief",
      "candidateId": "overlay.clearway-conversion:overlay.clearway-conversion.surface-brief",
      "intakeId": "overlay.clearway-conversion.surface-brief",
      "title": "Conversion booking and embed surface readiness report",
      "summary": "A candidate Canon conversion template for booking flows, developer embeds, admin receipts, and concise operator handoffs without turning Clearway-specific scheduling copy into Canon primitives. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts.",
      "status": "needs-approval",
      "readinessUri": "canon://overlays/candidates/overlay.clearway-conversion.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.clearway-conversion.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.clearway-conversion.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.clearway-conversion.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.clearway-conversion",
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
            "template.canon-project-overlay-manifest is a template candidate item with overlapping evidence.",
            "template.atlas-development-handoff is a template candidate item with overlapping evidence.",
            "template.canon-project-overlay-template-pack is a template candidate item with overlapping evidence.",
            "template.canon-extension-intake is a template candidate item with overlapping evidence.",
            "component.conversion-metric-counters is a component candidate item with overlapping evidence."
          ],
          "requiredAction": "Choose whether to reuse, update, or create a Canon registry item id before editing implementation code."
        },
        {
          "id": "export-target",
          "label": "Canon Export Target",
          "status": "review",
          "evidence": [
            "./modality-readiness is registry-covered / registry-artifact.",
            "./overlays/intake is registry-covered / registry-artifact.",
            "./components#PropertyFunnel is candidate-review / platform-surface.",
            "./conversion is candidate-review / composition-pattern.",
            "./components#TriadHealth is candidate-review / domain-specific."
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
            "Related registry docs path: /canon/resources/registry.",
            "Related registry docs path: /canon/components/conversion."
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
          "score": 25,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
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
          "score": 24,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 24,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 23,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
        {
          "id": "component.conversion-metric-counters",
          "name": "MetricCounters",
          "kind": "component",
          "maturity": "candidate",
          "modalities": [
            "web",
            "app",
            "chat",
            "voice",
            "glasses"
          ],
          "docsPath": "/canon/components/conversion",
          "score": 19,
          "reason": "Overlaps 5 requested modalities."
        }
      ],
      "candidateExportPolicies": [
        {
          "exportPath": "./modality-readiness",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 9,
          "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
          "registryItemIds": [
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./overlays/intake",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 9,
          "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
          "registryItemIds": [
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./components",
          "classification": "platform-surface",
          "registryPolicy": "candidate-review",
          "score": 8,
          "rationale": "Property conversion surface; needs funnel policy before becoming stable registry UI.",
          "exportName": "PropertyFunnel"
        },
        {
          "exportPath": "./conversion",
          "classification": "composition-pattern",
          "registryPolicy": "candidate-review",
          "score": 8,
          "rationale": "Conversion components need proof/receipt and property-policy contracts before promotion."
        },
        {
          "exportPath": "./components",
          "classification": "domain-specific",
          "registryPolicy": "candidate-review",
          "score": 7,
          "rationale": "CREATE SOMETHING framework display; needs governance-pattern contract before promotion.",
          "exportName": "TriadHealth"
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
      "id": "canon-overlay-candidate-promotion-readiness:overlay.concierge-chat-staffing.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.concierge-chat-staffing.surface-brief",
      "candidateId": "overlay.concierge-chat-staffing:overlay.concierge-chat-staffing.surface-brief",
      "intakeId": "overlay.concierge-chat-staffing.surface-brief",
      "title": "Staffing concierge chat surface readiness report",
      "summary": "A candidate Canon concierge template for governed chat, staffing intake, job matching, profile receipts, and operator settings without promoting one staffing vertical into Canon stable. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts.",
      "status": "needs-approval",
      "readinessUri": "canon://overlays/candidates/overlay.concierge-chat-staffing.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.concierge-chat-staffing.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.concierge-chat-staffing.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.concierge-chat-staffing.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.concierge-chat-staffing",
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
            "template.canon-extension-intake is a template candidate item with overlapping evidence.",
            "template.atlas-development-handoff is a template candidate item with overlapping evidence.",
            "template.canon-project-overlay-manifest is a template candidate item with overlapping evidence.",
            "template.canon-project-overlay-template-pack is a template candidate item with overlapping evidence.",
            "component.catalog-card is a component candidate item with overlapping evidence."
          ],
          "requiredAction": "Choose whether to reuse, update, or create a Canon registry item id before editing implementation code."
        },
        {
          "id": "export-target",
          "label": "Canon Export Target",
          "status": "review",
          "evidence": [
            "./modality-readiness is registry-covered / registry-artifact.",
            "./overlays/intake is registry-covered / registry-artifact.",
            "./mcp-snapshot is registry-covered / registry-artifact.",
            "./overlays is registry-covered / registry-artifact.",
            "./registry is registry-covered / registry-artifact."
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
            "Related registry docs path: /canon/resources/registry.",
            "Related registry docs path: /canon/components."
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
          "score": 31,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
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
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 30,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 30,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
        {
          "id": "component.catalog-card",
          "name": "CatalogCard",
          "kind": "component",
          "maturity": "candidate",
          "modalities": [
            "web",
            "app",
            "chat",
            "voice",
            "glasses"
          ],
          "docsPath": "/canon/components",
          "score": 24,
          "reason": "Overlaps 5 requested modalities."
        }
      ],
      "candidateExportPolicies": [
        {
          "exportPath": "./modality-readiness",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 16,
          "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
          "registryItemIds": [
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./overlays/intake",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 10,
          "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
          "registryItemIds": [
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./mcp-snapshot",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 8,
          "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
          "registryItemIds": [
            "template.canon-project-overlay-template-pack",
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./overlays",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 7,
          "rationale": "Overlay catalog export is covered by the Canon project overlay template pack, manifest, and extension intake registry items.",
          "registryItemIds": [
            "template.canon-project-overlay-template-pack",
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./registry",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 7,
          "rationale": "Registry API is the Canon source of truth for discoverable artifacts and lifecycle rules.",
          "registryItemIds": [
            "template.canon-extension-intake",
            "template.canon-project-overlay-manifest"
          ]
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
      "id": "canon-overlay-candidate-promotion-readiness:overlay.io-research-artifact.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.io-research-artifact.surface-brief",
      "candidateId": "overlay.io-research-artifact:overlay.io-research-artifact.surface-brief",
      "intakeId": "overlay.io-research-artifact.surface-brief",
      "title": "Research artifact proof surface readiness report",
      "summary": "A candidate Canon research-artifact template for publishing MCP papers, plugin references, visual summaries, and agent-readable source metadata without promoting one article's content into Canon stable. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts.",
      "status": "needs-approval",
      "readinessUri": "canon://overlays/candidates/overlay.io-research-artifact.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.io-research-artifact.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.io-research-artifact.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.io-research-artifact.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.io-research-artifact",
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
            "template.canon-extension-intake is a template candidate item with overlapping evidence.",
            "component.catalog-card is a component candidate item with overlapping evidence."
          ],
          "requiredAction": "Choose whether to reuse, update, or create a Canon registry item id before editing implementation code."
        },
        {
          "id": "export-target",
          "label": "Canon Export Target",
          "status": "review",
          "evidence": [
            "./modality-readiness is registry-covered / registry-artifact.",
            "./mcp-snapshot is registry-covered / registry-artifact.",
            "./overlays/intake is registry-covered / registry-artifact.",
            "./components#PapersGrid is candidate-review / content-utility.",
            "./registry is registry-covered / registry-artifact."
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
            "Related registry docs path: /canon/resources/registry.",
            "Related registry docs path: /canon/components."
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
          "score": 33,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 32,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 31,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 27,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
        {
          "id": "component.catalog-card",
          "name": "CatalogCard",
          "kind": "component",
          "maturity": "candidate",
          "modalities": [
            "web",
            "app",
            "chat",
            "voice",
            "glasses"
          ],
          "docsPath": "/canon/components",
          "score": 23,
          "reason": "Overlaps 5 requested modalities."
        }
      ],
      "candidateExportPolicies": [
        {
          "exportPath": "./modality-readiness",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 13,
          "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
          "registryItemIds": [
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./mcp-snapshot",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 12,
          "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
          "registryItemIds": [
            "template.canon-project-overlay-template-pack",
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./overlays/intake",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 12,
          "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
          "registryItemIds": [
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./components",
          "classification": "content-utility",
          "registryPolicy": "candidate-review",
          "score": 11,
          "rationale": "Research content collection layout, not yet a general Canon grid contract.",
          "exportName": "PapersGrid"
        },
        {
          "exportPath": "./registry",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 11,
          "rationale": "Registry API is the Canon source of truth for discoverable artifacts and lifecycle rules.",
          "registryItemIds": [
            "template.canon-extension-intake",
            "template.canon-project-overlay-manifest"
          ]
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
            "template.canon-project-overlay-template-pack is a template candidate item with overlapping evidence.",
            "template.canon-extension-intake is a template candidate item with overlapping evidence.",
            "template.canon-project-overlay-manifest is a template candidate item with overlapping evidence.",
            "template.web-governed-workflow is a template candidate item with overlapping evidence."
          ],
          "requiredAction": "Choose whether to reuse, update, or create a Canon registry item id before editing implementation code."
        },
        {
          "id": "export-target",
          "label": "Canon Export Target",
          "status": "review",
          "evidence": [
            "./modality-readiness is registry-covered / registry-artifact.",
            "./insights is candidate-review / content-utility.",
            "./interactive#IntegrationFlow is candidate-review / composition-pattern.",
            "./overlays/intake is registry-covered / registry-artifact.",
            "./components#PapersGrid is candidate-review / content-utility."
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
            "Related registry docs path: /canon/resources/registry.",
            "Related registry docs path: /canon/components/clear."
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
          "score": 32,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 27,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 26,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 26,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
        }
      ],
      "candidateExportPolicies": [
        {
          "exportPath": "./modality-readiness",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 9,
          "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
          "registryItemIds": [
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
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
      "id": "canon-overlay-candidate-promotion-readiness:overlay.ltd-canon-philosophy.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.ltd-canon-philosophy.surface-brief",
      "candidateId": "overlay.ltd-canon-philosophy:overlay.ltd-canon-philosophy.surface-brief",
      "intakeId": "overlay.ltd-canon-philosophy.surface-brief",
      "title": "Canon philosophy documentation surface readiness report",
      "summary": "A candidate Canon documentation template for turning philosophy, standards, voice, and live Canon docs into one reusable cross-property foundation surface without forking Canon primitives. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts.",
      "status": "needs-approval",
      "readinessUri": "canon://overlays/candidates/overlay.ltd-canon-philosophy.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.ltd-canon-philosophy.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.ltd-canon-philosophy.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.ltd-canon-philosophy.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.ltd-canon-philosophy",
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
            "template.canon-project-overlay-manifest is a template candidate item with overlapping evidence.",
            "template.atlas-development-handoff is a template candidate item with overlapping evidence.",
            "template.canon-extension-intake is a template candidate item with overlapping evidence.",
            "template.canon-project-overlay-template-pack is a template candidate item with overlapping evidence.",
            "component.catalog-card is a component candidate item with overlapping evidence."
          ],
          "requiredAction": "Choose whether to reuse, update, or create a Canon registry item id before editing implementation code."
        },
        {
          "id": "export-target",
          "label": "Canon Export Target",
          "status": "review",
          "evidence": [
            "./modality-readiness is registry-covered / registry-artifact.",
            "./overlays/intake is registry-covered / registry-artifact.",
            "./mcp-snapshot is registry-covered / registry-artifact.",
            "./overlays is registry-covered / registry-artifact.",
            "./overlays/project-template is registry-covered / registry-artifact."
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
            "Related registry docs path: /canon/resources/registry.",
            "Related registry docs path: /canon/components."
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
          "score": 32,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
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
          "score": 31,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 31,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 30,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
        {
          "id": "component.catalog-card",
          "name": "CatalogCard",
          "kind": "component",
          "maturity": "candidate",
          "modalities": [
            "web",
            "app",
            "chat",
            "voice",
            "glasses"
          ],
          "docsPath": "/canon/components",
          "score": 25,
          "reason": "Overlaps 5 requested modalities."
        }
      ],
      "candidateExportPolicies": [
        {
          "exportPath": "./modality-readiness",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 15,
          "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
          "registryItemIds": [
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./overlays/intake",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 14,
          "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
          "registryItemIds": [
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./mcp-snapshot",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 12,
          "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
          "registryItemIds": [
            "template.canon-project-overlay-template-pack",
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./overlays",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 11,
          "rationale": "Overlay catalog export is covered by the Canon project overlay template pack, manifest, and extension intake registry items.",
          "registryItemIds": [
            "template.canon-project-overlay-template-pack",
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./overlays/project-template",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 11,
          "rationale": "Project overlay template pack is covered by template.canon-project-overlay-template-pack.",
          "registryItemIds": [
            "template.canon-project-overlay-template-pack"
          ]
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
      "id": "canon-overlay-candidate-promotion-readiness:overlay.maverick-admin.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.maverick-admin.surface-brief",
      "candidateId": "overlay.maverick-admin:overlay.maverick-admin.surface-brief",
      "intakeId": "overlay.maverick-admin.surface-brief",
      "title": "Surface Brief Template readiness report",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts.",
      "status": "needs-approval",
      "readinessUri": "canon://overlays/candidates/overlay.maverick-admin.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.maverick-admin.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.maverick-admin.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.maverick-admin.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.maverick-admin",
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
            "template.canon-project-overlay-manifest is a template candidate item with overlapping evidence.",
            "template.canon-extension-intake is a template candidate item with overlapping evidence.",
            "template.atlas-development-handoff is a template candidate item with overlapping evidence.",
            "template.canon-project-overlay-template-pack is a template candidate item with overlapping evidence.",
            "token.canon-core is a token stable item with overlapping evidence."
          ],
          "requiredAction": "Choose whether to reuse, update, or create a Canon registry item id before editing implementation code."
        },
        {
          "id": "export-target",
          "label": "Canon Export Target",
          "status": "review",
          "evidence": [
            "./modality-readiness is registry-covered / registry-artifact.",
            "./mcp-snapshot is registry-covered / registry-artifact.",
            "./overlays/intake is registry-covered / registry-artifact.",
            "./registry is registry-covered / registry-artifact.",
            "./overlays is registry-covered / registry-artifact."
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
            "Related registry docs path: /canon/resources/registry.",
            "Related registry docs path: /canon/resources/tokens."
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
          "score": 31,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 30,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
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
          "score": 29,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 29,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
        {
          "id": "token.canon-core",
          "name": "Canon Core Tokens",
          "kind": "token",
          "maturity": "stable",
          "modalities": [
            "web",
            "app",
            "chat",
            "voice",
            "glasses"
          ],
          "docsPath": "/canon/resources/tokens",
          "score": 20,
          "reason": "Overlaps 5 requested modalities."
        }
      ],
      "candidateExportPolicies": [
        {
          "exportPath": "./modality-readiness",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 15,
          "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
          "registryItemIds": [
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./mcp-snapshot",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 12,
          "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
          "registryItemIds": [
            "template.canon-project-overlay-template-pack",
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./overlays/intake",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 12,
          "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
          "registryItemIds": [
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./registry",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 12,
          "rationale": "Registry API is the Canon source of truth for discoverable artifacts and lifecycle rules.",
          "registryItemIds": [
            "template.canon-extension-intake",
            "template.canon-project-overlay-manifest"
          ]
        },
        {
          "exportPath": "./overlays",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 11,
          "rationale": "Overlay catalog export is covered by the Canon project overlay template pack, manifest, and extension intake registry items.",
          "registryItemIds": [
            "template.canon-project-overlay-template-pack",
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
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
      "id": "canon-overlay-candidate-promotion-readiness:overlay.maverick-industry.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.maverick-industry.surface-brief",
      "candidateId": "overlay.maverick-industry:overlay.maverick-industry.surface-brief",
      "intakeId": "overlay.maverick-industry.surface-brief",
      "title": "Industry service proof surface readiness report",
      "summary": "A candidate Canon industry-service template for public sector pages, product proof, news context, and concise sales handoffs without promoting Maverick-specific claims into Canon. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts.",
      "status": "needs-approval",
      "readinessUri": "canon://overlays/candidates/overlay.maverick-industry.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.maverick-industry.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.maverick-industry.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.maverick-industry.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.maverick-industry",
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
            "template.canon-project-overlay-template-pack is a template candidate item with overlapping evidence.",
            "template.canon-extension-intake is a template candidate item with overlapping evidence.",
            "template.canon-project-overlay-manifest is a template candidate item with overlapping evidence.",
            "component.conversion-metric-counters is a component candidate item with overlapping evidence."
          ],
          "requiredAction": "Choose whether to reuse, update, or create a Canon registry item id before editing implementation code."
        },
        {
          "id": "export-target",
          "label": "Canon Export Target",
          "status": "review",
          "evidence": [
            "./modality-readiness is registry-covered / registry-artifact.",
            "./overlays/intake is registry-covered / registry-artifact.",
            "./components#TriadHealth is candidate-review / domain-specific.",
            "./filtering is candidate-review / composition-pattern.",
            "./mcp-snapshot is registry-covered / registry-artifact."
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
            "Related registry docs path: /canon/resources/registry.",
            "Related registry docs path: /canon/components/conversion."
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
          "score": 27,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 26,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 25,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 25,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
        {
          "id": "component.conversion-metric-counters",
          "name": "MetricCounters",
          "kind": "component",
          "maturity": "candidate",
          "modalities": [
            "web",
            "app",
            "chat",
            "voice",
            "glasses"
          ],
          "docsPath": "/canon/components/conversion",
          "score": 18,
          "reason": "Overlaps 5 requested modalities."
        }
      ],
      "candidateExportPolicies": [
        {
          "exportPath": "./modality-readiness",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 9,
          "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
          "registryItemIds": [
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./overlays/intake",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 9,
          "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
          "registryItemIds": [
            "template.canon-extension-intake"
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
          "exportPath": "./filtering",
          "classification": "composition-pattern",
          "registryPolicy": "candidate-review",
          "score": 7,
          "rationale": "Filtering surfaces may become templates/patterns after repeated product evidence."
        },
        {
          "exportPath": "./mcp-snapshot",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 7,
          "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
          "registryItemIds": [
            "template.canon-project-overlay-template-pack",
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
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
      "id": "canon-overlay-candidate-promotion-readiness:overlay.notion-agent-workspace.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.notion-agent-workspace.surface-brief",
      "candidateId": "overlay.notion-agent-workspace:overlay.notion-agent-workspace.surface-brief",
      "intakeId": "overlay.notion-agent-workspace.surface-brief",
      "title": "Notion agent workspace surface readiness report",
      "summary": "A candidate Canon workspace-agent template for OAuth entry, dashboard review, execution APIs, and compact operator handoffs without promoting Notion-specific tool details into Canon. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts.",
      "status": "needs-approval",
      "readinessUri": "canon://overlays/candidates/overlay.notion-agent-workspace.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.notion-agent-workspace.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.notion-agent-workspace.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.notion-agent-workspace.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.notion-agent-workspace",
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
            "template.canon-extension-intake is a template candidate item with overlapping evidence.",
            "component.filtering-agent-panel is a component candidate item with overlapping evidence."
          ],
          "requiredAction": "Choose whether to reuse, update, or create a Canon registry item id before editing implementation code."
        },
        {
          "id": "export-target",
          "label": "Canon Export Target",
          "status": "review",
          "evidence": [
            "./mcp-snapshot is registry-covered / registry-artifact.",
            "./modality-readiness is registry-covered / registry-artifact.",
            "./overlays/intake is registry-covered / registry-artifact.",
            "./components#TriadHealth is candidate-review / domain-specific.",
            "./design-audit is registry-covered / registry-artifact."
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
            "Related registry docs path: /canon/resources/registry.",
            "Related registry docs path: /canon/components/filtering."
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
          "score": 29,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 24,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 23,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
        {
          "id": "component.filtering-agent-panel",
          "name": "AgentPanel",
          "kind": "component",
          "maturity": "candidate",
          "modalities": [
            "web",
            "app",
            "chat",
            "voice",
            "glasses"
          ],
          "docsPath": "/canon/components/filtering",
          "score": 21,
          "reason": "Overlaps 5 requested modalities."
        }
      ],
      "candidateExportPolicies": [
        {
          "exportPath": "./mcp-snapshot",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 13,
          "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
          "registryItemIds": [
            "template.canon-project-overlay-template-pack",
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./modality-readiness",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 9,
          "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
          "registryItemIds": [
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./overlays/intake",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 9,
          "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
          "registryItemIds": [
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./components",
          "classification": "domain-specific",
          "registryPolicy": "candidate-review",
          "score": 8,
          "rationale": "CREATE SOMETHING framework display; needs governance-pattern contract before promotion.",
          "exportName": "TriadHealth"
        },
        {
          "exportPath": "./design-audit",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 8,
          "rationale": "Design audit checks operationalize Canon token, layout, motion, and accessibility policy for agent and human review.",
          "registryItemIds": [
            "policy.signal-decision-proof"
          ]
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
      "id": "canon-overlay-candidate-promotion-readiness:overlay.ona-agents.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.ona-agents.surface-brief",
      "candidateId": "overlay.ona-agents:overlay.ona-agents.surface-brief",
      "intakeId": "overlay.ona-agents.surface-brief",
      "title": "Surface Brief Template readiness report",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts.",
      "status": "needs-approval",
      "readinessUri": "canon://overlays/candidates/overlay.ona-agents.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.ona-agents.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.ona-agents.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.ona-agents.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.ona-agents",
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
            "template.canon-project-overlay-manifest is a template candidate item with overlapping evidence.",
            "template.canon-extension-intake is a template candidate item with overlapping evidence.",
            "template.atlas-development-handoff is a template candidate item with overlapping evidence.",
            "template.canon-project-overlay-template-pack is a template candidate item with overlapping evidence.",
            "token.canon-core is a token stable item with overlapping evidence."
          ],
          "requiredAction": "Choose whether to reuse, update, or create a Canon registry item id before editing implementation code."
        },
        {
          "id": "export-target",
          "label": "Canon Export Target",
          "status": "review",
          "evidence": [
            "./modality-readiness is registry-covered / registry-artifact.",
            "./mcp-snapshot is registry-covered / registry-artifact.",
            "./overlays/intake is registry-covered / registry-artifact.",
            "./registry is registry-covered / registry-artifact.",
            "./overlays is registry-covered / registry-artifact."
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
            "Related registry docs path: /canon/resources/registry.",
            "Related registry docs path: /canon/resources/tokens."
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
          "score": 31,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 30,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
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
          "score": 29,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 29,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
        {
          "id": "token.canon-core",
          "name": "Canon Core Tokens",
          "kind": "token",
          "maturity": "stable",
          "modalities": [
            "web",
            "app",
            "chat",
            "voice",
            "glasses"
          ],
          "docsPath": "/canon/resources/tokens",
          "score": 20,
          "reason": "Overlaps 5 requested modalities."
        }
      ],
      "candidateExportPolicies": [
        {
          "exportPath": "./modality-readiness",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 15,
          "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
          "registryItemIds": [
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./mcp-snapshot",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 12,
          "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
          "registryItemIds": [
            "template.canon-project-overlay-template-pack",
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./overlays/intake",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 12,
          "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
          "registryItemIds": [
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./registry",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 12,
          "rationale": "Registry API is the Canon source of truth for discoverable artifacts and lifecycle rules.",
          "registryItemIds": [
            "template.canon-extension-intake",
            "template.canon-project-overlay-manifest"
          ]
        },
        {
          "exportPath": "./overlays",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 11,
          "rationale": "Overlay catalog export is covered by the Canon project overlay template pack, manifest, and extension intake registry items.",
          "registryItemIds": [
            "template.canon-project-overlay-template-pack",
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
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
      "id": "canon-overlay-candidate-promotion-readiness:overlay.relay.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.relay.surface-brief",
      "candidateId": "overlay.relay:overlay.relay.surface-brief",
      "intakeId": "overlay.relay.surface-brief",
      "title": "Surface Brief Template readiness report",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts.",
      "status": "needs-approval",
      "readinessUri": "canon://overlays/candidates/overlay.relay.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.relay.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.relay.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.relay.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.relay",
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
            "template.canon-project-overlay-manifest is a template candidate item with overlapping evidence.",
            "template.canon-extension-intake is a template candidate item with overlapping evidence.",
            "template.atlas-development-handoff is a template candidate item with overlapping evidence.",
            "template.canon-project-overlay-template-pack is a template candidate item with overlapping evidence.",
            "token.canon-core is a token stable item with overlapping evidence."
          ],
          "requiredAction": "Choose whether to reuse, update, or create a Canon registry item id before editing implementation code."
        },
        {
          "id": "export-target",
          "label": "Canon Export Target",
          "status": "review",
          "evidence": [
            "./modality-readiness is registry-covered / registry-artifact.",
            "./mcp-snapshot is registry-covered / registry-artifact.",
            "./overlays/intake is registry-covered / registry-artifact.",
            "./registry is registry-covered / registry-artifact.",
            "./overlays is registry-covered / registry-artifact."
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
            "Related registry docs path: /canon/resources/registry.",
            "Related registry docs path: /canon/resources/tokens."
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
          "score": 31,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 30,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
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
          "score": 29,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 29,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
        {
          "id": "token.canon-core",
          "name": "Canon Core Tokens",
          "kind": "token",
          "maturity": "stable",
          "modalities": [
            "web",
            "app",
            "chat",
            "voice",
            "glasses"
          ],
          "docsPath": "/canon/resources/tokens",
          "score": 20,
          "reason": "Overlaps 5 requested modalities."
        }
      ],
      "candidateExportPolicies": [
        {
          "exportPath": "./modality-readiness",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 15,
          "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
          "registryItemIds": [
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./mcp-snapshot",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 12,
          "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
          "registryItemIds": [
            "template.canon-project-overlay-template-pack",
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./overlays/intake",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 12,
          "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
          "registryItemIds": [
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./registry",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 12,
          "rationale": "Registry API is the Canon source of truth for discoverable artifacts and lifecycle rules.",
          "registryItemIds": [
            "template.canon-extension-intake",
            "template.canon-project-overlay-manifest"
          ]
        },
        {
          "exportPath": "./overlays",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 11,
          "rationale": "Overlay catalog export is covered by the Canon project overlay template pack, manifest, and extension intake registry items.",
          "registryItemIds": [
            "template.canon-project-overlay-template-pack",
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
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
      "id": "canon-overlay-candidate-promotion-readiness:overlay.space-workbench.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.space-workbench.surface-brief",
      "candidateId": "overlay.space-workbench:overlay.space-workbench.surface-brief",
      "intakeId": "overlay.space-workbench.surface-brief",
      "title": "Workbench tool proof surface readiness report",
      "summary": "A candidate Canon workbench template for turning live tools, playgrounds, data dashboards, and operator receipts into reusable proof surfaces without forking Canon components. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts.",
      "status": "needs-approval",
      "readinessUri": "canon://overlays/candidates/overlay.space-workbench.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.space-workbench.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.space-workbench.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.space-workbench.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.space-workbench",
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
            "template.canon-extension-intake is a template candidate item with overlapping evidence.",
            "template.canon-project-overlay-template-pack is a template candidate item with overlapping evidence.",
            "component.triad-health is a component candidate item with overlapping evidence."
          ],
          "requiredAction": "Choose whether to reuse, update, or create a Canon registry item id before editing implementation code."
        },
        {
          "id": "export-target",
          "label": "Canon Export Target",
          "status": "review",
          "evidence": [
            "./modality-readiness is registry-covered / registry-artifact.",
            "./overlays/intake is registry-covered / registry-artifact.",
            "./components#TriadHealth is candidate-review / domain-specific.",
            "./components#CrossPropertyLink is candidate-review / platform-surface.",
            "./conversion is candidate-review / composition-pattern."
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
            "Related registry docs path: /canon/resources/registry.",
            "Related registry docs path: /canon/components."
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
          "score": 27,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 27,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 26,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 26,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
        {
          "id": "component.triad-health",
          "name": "TriadHealth",
          "kind": "component",
          "maturity": "candidate",
          "modalities": [
            "web",
            "app",
            "chat",
            "voice",
            "glasses"
          ],
          "docsPath": "/canon/components",
          "score": 21,
          "reason": "Overlaps 5 requested modalities."
        }
      ],
      "candidateExportPolicies": [
        {
          "exportPath": "./modality-readiness",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 9,
          "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
          "registryItemIds": [
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
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
        },
        {
          "exportPath": "./conversion",
          "classification": "composition-pattern",
          "registryPolicy": "candidate-review",
          "score": 7,
          "rationale": "Conversion components need proof/receipt and property-policy contracts before promotion."
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
      "id": "canon-overlay-candidate-promotion-readiness:overlay.spritz-reading.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.spritz-reading.surface-brief",
      "candidateId": "overlay.spritz-reading:overlay.spritz-reading.surface-brief",
      "intakeId": "overlay.spritz-reading.surface-brief",
      "title": "Reading component proof surface readiness report",
      "summary": "A candidate Canon component-demo template for interactive reading controls, component API evidence, and compact preview handoffs without making Spritz behavior a Canon primitive. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts.",
      "status": "needs-approval",
      "readinessUri": "canon://overlays/candidates/overlay.spritz-reading.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.spritz-reading.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.spritz-reading.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.spritz-reading.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.spritz-reading",
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
            "template.canon-extension-intake is a template candidate item with overlapping evidence.",
            "template.canon-project-overlay-manifest is a template candidate item with overlapping evidence.",
            "template.atlas-development-handoff is a template candidate item with overlapping evidence.",
            "template.canon-project-overlay-template-pack is a template candidate item with overlapping evidence.",
            "component.insights-statement-text is a component candidate item with overlapping evidence."
          ],
          "requiredAction": "Choose whether to reuse, update, or create a Canon registry item id before editing implementation code."
        },
        {
          "id": "export-target",
          "label": "Canon Export Target",
          "status": "review",
          "evidence": [
            "./components#CrossPropertyLink is candidate-review / platform-surface.",
            "./modality-readiness is registry-covered / registry-artifact.",
            "./overlays/intake is registry-covered / registry-artifact.",
            "./components#TriadHealth is candidate-review / domain-specific.",
            "./components#MarkdownPreviewModal is candidate-review / platform-surface."
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
            "Related registry docs path: /canon/resources/registry.",
            "Related registry docs path: /canon/components/insights."
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
          "score": 26,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 26,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
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
          "score": 25,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 25,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
        {
          "id": "component.insights-statement-text",
          "name": "StatementText",
          "kind": "component",
          "maturity": "candidate",
          "modalities": [
            "web",
            "app",
            "chat",
            "voice",
            "glasses"
          ],
          "docsPath": "/canon/components/insights",
          "score": 22,
          "reason": "Overlaps 5 requested modalities."
        }
      ],
      "candidateExportPolicies": [
        {
          "exportPath": "./components",
          "classification": "platform-surface",
          "registryPolicy": "candidate-review",
          "score": 10,
          "rationale": "Property-routing primitive candidate tied to CREATE SOMETHING property topology.",
          "exportName": "CrossPropertyLink"
        },
        {
          "exportPath": "./modality-readiness",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 10,
          "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
          "registryItemIds": [
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./overlays/intake",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 10,
          "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
          "registryItemIds": [
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./components",
          "classification": "domain-specific",
          "registryPolicy": "candidate-review",
          "score": 9,
          "rationale": "CREATE SOMETHING framework display; needs governance-pattern contract before promotion.",
          "exportName": "TriadHealth"
        },
        {
          "exportPath": "./components",
          "classification": "platform-surface",
          "registryPolicy": "candidate-review",
          "score": 9,
          "rationale": "Authoring modal surface; not a foundation primitive until editor patterns are formalized.",
          "exportName": "MarkdownPreviewModal"
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
      "id": "canon-overlay-candidate-promotion-readiness:overlay.tend-database.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.tend-database.surface-brief",
      "candidateId": "overlay.tend-database:overlay.tend-database.surface-brief",
      "intakeId": "overlay.tend-database.surface-brief",
      "title": "Database source management surface readiness report",
      "summary": "A candidate Canon database-service template for source setup, settings, agent automation, and receipt handoffs without promoting Tend-specific vertical schemas into Canon. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts.",
      "status": "needs-approval",
      "readinessUri": "canon://overlays/candidates/overlay.tend-database.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.tend-database.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.tend-database.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.tend-database.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.tend-database",
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
            "template.canon-extension-intake is a template candidate item with overlapping evidence.",
            "template.canon-project-overlay-template-pack is a template candidate item with overlapping evidence.",
            "component.triad-health is a component candidate item with overlapping evidence."
          ],
          "requiredAction": "Choose whether to reuse, update, or create a Canon registry item id before editing implementation code."
        },
        {
          "id": "export-target",
          "label": "Canon Export Target",
          "status": "review",
          "evidence": [
            "./modality-readiness is registry-covered / registry-artifact.",
            "./overlays/intake is registry-covered / registry-artifact.",
            "./mcp-snapshot is registry-covered / registry-artifact.",
            "./registry is registry-covered / registry-artifact.",
            "./components#TriadHealth is candidate-review / domain-specific."
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
            "Related registry docs path: /canon/resources/registry.",
            "Related registry docs path: /canon/components."
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
          "score": 32,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 29,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 25,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 25,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
        {
          "id": "component.triad-health",
          "name": "TriadHealth",
          "kind": "component",
          "maturity": "candidate",
          "modalities": [
            "web",
            "app",
            "chat",
            "voice",
            "glasses"
          ],
          "docsPath": "/canon/components",
          "score": 22,
          "reason": "Overlaps 5 requested modalities."
        }
      ],
      "candidateExportPolicies": [
        {
          "exportPath": "./modality-readiness",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 9,
          "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
          "registryItemIds": [
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./overlays/intake",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 9,
          "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
          "registryItemIds": [
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./mcp-snapshot",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 8,
          "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
          "registryItemIds": [
            "template.canon-project-overlay-template-pack",
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./registry",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 8,
          "rationale": "Registry API is the Canon source of truth for discoverable artifacts and lifecycle rules.",
          "registryItemIds": [
            "template.canon-extension-intake",
            "template.canon-project-overlay-manifest"
          ]
        },
        {
          "exportPath": "./components",
          "classification": "domain-specific",
          "registryPolicy": "candidate-review",
          "score": 7,
          "rationale": "CREATE SOMETHING framework display; needs governance-pattern contract before promotion.",
          "exportName": "TriadHealth"
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
      "id": "canon-overlay-candidate-promotion-readiness:overlay.webflow-apps-admin-audit.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.webflow-apps-admin-audit.surface-brief",
      "candidateId": "overlay.webflow-apps-admin-audit:overlay.webflow-apps-admin-audit.surface-brief",
      "intakeId": "overlay.webflow-apps-admin-audit.surface-brief",
      "title": "Webflow app audit dashboard surface readiness report",
      "summary": "A candidate Canon audit-dashboard template for app review status, governance evidence, and compact reviewer handoffs without promoting Webflow-specific exception policy into Canon stable. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts.",
      "status": "needs-approval",
      "readinessUri": "canon://overlays/candidates/overlay.webflow-apps-admin-audit.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.webflow-apps-admin-audit.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.webflow-apps-admin-audit.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.webflow-apps-admin-audit.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.webflow-apps-admin-audit",
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
            "template.canon-extension-intake is a template candidate item with overlapping evidence.",
            "template.canon-project-overlay-manifest is a template candidate item with overlapping evidence.",
            "template.atlas-development-handoff is a template candidate item with overlapping evidence.",
            "template.canon-project-overlay-template-pack is a template candidate item with overlapping evidence.",
            "component.triad-health is a component candidate item with overlapping evidence."
          ],
          "requiredAction": "Choose whether to reuse, update, or create a Canon registry item id before editing implementation code."
        },
        {
          "id": "export-target",
          "label": "Canon Export Target",
          "status": "review",
          "evidence": [
            "./modality-readiness is registry-covered / registry-artifact.",
            "./overlays/intake is registry-covered / registry-artifact.",
            "./components#TriadHealth is candidate-review / domain-specific.",
            "./design-audit is registry-covered / registry-artifact.",
            "./filtering is candidate-review / composition-pattern."
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
            "Related registry docs path: /canon/resources/registry.",
            "Related registry docs path: /canon/components."
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
          "score": 27,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 27,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
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
          "score": 26,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 26,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
        {
          "id": "component.triad-health",
          "name": "TriadHealth",
          "kind": "component",
          "maturity": "candidate",
          "modalities": [
            "web",
            "app",
            "chat",
            "voice",
            "glasses"
          ],
          "docsPath": "/canon/components",
          "score": 21,
          "reason": "Overlaps 5 requested modalities."
        }
      ],
      "candidateExportPolicies": [
        {
          "exportPath": "./modality-readiness",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 15,
          "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
          "registryItemIds": [
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./overlays/intake",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 10,
          "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
          "registryItemIds": [
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./components",
          "classification": "domain-specific",
          "registryPolicy": "candidate-review",
          "score": 9,
          "rationale": "CREATE SOMETHING framework display; needs governance-pattern contract before promotion.",
          "exportName": "TriadHealth"
        },
        {
          "exportPath": "./design-audit",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 9,
          "rationale": "Design audit checks operationalize Canon token, layout, motion, and accessibility policy for agent and human review.",
          "registryItemIds": [
            "policy.signal-decision-proof"
          ]
        },
        {
          "exportPath": "./filtering",
          "classification": "composition-pattern",
          "registryPolicy": "candidate-review",
          "score": 8,
          "rationale": "Filtering surfaces may become templates/patterns after repeated product evidence."
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
      "id": "canon-overlay-candidate-promotion-readiness:overlay.webflow-dashboard-marketplace.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.webflow-dashboard-marketplace.surface-brief",
      "candidateId": "overlay.webflow-dashboard-marketplace:overlay.webflow-dashboard-marketplace.surface-brief",
      "intakeId": "overlay.webflow-dashboard-marketplace.surface-brief",
      "title": "Webflow marketplace dashboard surface readiness report",
      "summary": "A candidate Canon marketplace-operations template for dashboard state, marketplace insights, validation, asset receipts, and compact operator handoffs without promoting Webflow-specific data policy into Canon. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts.",
      "status": "needs-approval",
      "readinessUri": "canon://overlays/candidates/overlay.webflow-dashboard-marketplace.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.webflow-dashboard-marketplace.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.webflow-dashboard-marketplace.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.webflow-dashboard-marketplace.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.webflow-dashboard-marketplace",
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
            "template.canon-project-overlay-template-pack is a template candidate item with overlapping evidence.",
            "template.canon-project-overlay-manifest is a template candidate item with overlapping evidence.",
            "template.canon-extension-intake is a template candidate item with overlapping evidence.",
            "component.triad-health is a component candidate item with overlapping evidence."
          ],
          "requiredAction": "Choose whether to reuse, update, or create a Canon registry item id before editing implementation code."
        },
        {
          "id": "export-target",
          "label": "Canon Export Target",
          "status": "review",
          "evidence": [
            "./modality-readiness is registry-covered / registry-artifact.",
            "./overlays/intake is registry-covered / registry-artifact.",
            "./components#TriadHealth is candidate-review / domain-specific.",
            "./mcp-snapshot is registry-covered / registry-artifact.",
            "./components#ShareButtons is candidate-review / platform-surface."
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
            "Related registry docs path: /canon/resources/registry.",
            "Related registry docs path: /canon/components."
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
          "score": 27,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 26,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 25,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 24,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
        {
          "id": "component.triad-health",
          "name": "TriadHealth",
          "kind": "component",
          "maturity": "candidate",
          "modalities": [
            "web",
            "app",
            "chat",
            "voice",
            "glasses"
          ],
          "docsPath": "/canon/components",
          "score": 20,
          "reason": "Overlaps 5 requested modalities."
        }
      ],
      "candidateExportPolicies": [
        {
          "exportPath": "./modality-readiness",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 9,
          "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
          "registryItemIds": [
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./overlays/intake",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 9,
          "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
          "registryItemIds": [
            "template.canon-extension-intake"
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
          "exportPath": "./mcp-snapshot",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 7,
          "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
          "registryItemIds": [
            "template.canon-project-overlay-template-pack",
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./components",
          "classification": "platform-surface",
          "registryPolicy": "candidate-review",
          "score": 6,
          "rationale": "Platform integration control that needs channel policy before registry promotion.",
          "exportName": "ShareButtons"
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
      "id": "canon-overlay-candidate-promotion-readiness:overlay.webflow-template-validation.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.webflow-template-validation.surface-brief",
      "candidateId": "overlay.webflow-template-validation:overlay.webflow-template-validation.surface-brief",
      "intakeId": "overlay.webflow-template-validation.surface-brief",
      "title": "Surface Brief Template readiness report",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts.",
      "status": "needs-approval",
      "readinessUri": "canon://overlays/candidates/overlay.webflow-template-validation.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.webflow-template-validation.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.webflow-template-validation.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.webflow-template-validation.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.webflow-template-validation",
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
            "template.canon-project-overlay-manifest is a template candidate item with overlapping evidence.",
            "template.canon-extension-intake is a template candidate item with overlapping evidence.",
            "template.atlas-development-handoff is a template candidate item with overlapping evidence.",
            "template.canon-project-overlay-template-pack is a template candidate item with overlapping evidence.",
            "template.chat-decision-brief is a template candidate item with overlapping evidence."
          ],
          "requiredAction": "Choose whether to reuse, update, or create a Canon registry item id before editing implementation code."
        },
        {
          "id": "export-target",
          "label": "Canon Export Target",
          "status": "review",
          "evidence": [
            "./modality-readiness is registry-covered / registry-artifact.",
            "./mcp-snapshot is registry-covered / registry-artifact.",
            "./overlays/intake is registry-covered / registry-artifact.",
            "./registry is registry-covered / registry-artifact.",
            "./overlays is registry-covered / registry-artifact."
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
          "score": 34,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 33,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
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
          "score": 32,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          "score": 32,
          "reason": "Matches requested kind and overlaps 5 requested modalities."
        },
        {
          "id": "template.chat-decision-brief",
          "name": "Chat Decision Brief Template",
          "kind": "template",
          "maturity": "candidate",
          "modalities": [
            "chat",
            "voice"
          ],
          "docsPath": "/canon/resources/registry",
          "score": 21,
          "reason": "Matches requested kind and overlaps 2 requested modalities."
        }
      ],
      "candidateExportPolicies": [
        {
          "exportPath": "./modality-readiness",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 18,
          "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
          "registryItemIds": [
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./mcp-snapshot",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 15,
          "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
          "registryItemIds": [
            "template.canon-project-overlay-template-pack",
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./overlays/intake",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 15,
          "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
          "registryItemIds": [
            "template.canon-extension-intake"
          ]
        },
        {
          "exportPath": "./registry",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 15,
          "rationale": "Registry API is the Canon source of truth for discoverable artifacts and lifecycle rules.",
          "registryItemIds": [
            "template.canon-extension-intake",
            "template.canon-project-overlay-manifest"
          ]
        },
        {
          "exportPath": "./overlays",
          "classification": "registry-artifact",
          "registryPolicy": "registry-covered",
          "score": 14,
          "rationale": "Overlay catalog export is covered by the Canon project overlay template pack, manifest, and extension intake registry items.",
          "registryItemIds": [
            "template.canon-project-overlay-template-pack",
            "template.canon-project-overlay-manifest",
            "template.canon-extension-intake"
          ]
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
    "total": 24,
    "needsApproval": 24,
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
