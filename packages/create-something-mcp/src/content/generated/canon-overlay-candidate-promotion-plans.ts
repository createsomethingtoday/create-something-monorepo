/**
 * Generated Canon overlay candidate promotion plan content — DO NOT EDIT MANUALLY.
 * Run: npm run build:content
 * Source: packages/canon/src/lib/mcp-snapshot/
 */

import type { CanonOverlayCandidatePromotionPlanCollection } from '../types.js';

export const CANON_OVERLAY_CANDIDATE_PROMOTION_PLANS: CanonOverlayCandidatePromotionPlanCollection = {
  "schemaVersion": 1,
  "id": "canon-overlay-candidate-promotion-plans",
  "sourceOfTruth": "@create-something/canon/overlays/intake",
  "description": "Read-only implementation plans for Canon overlay candidates after explicit human approval, preserving export, docs, tests, compatibility, and stop-condition requirements before stable promotion.",
  "entries": [
    {
      "id": "canon-overlay-candidate-promotion-plan:overlay.atlas-studio-desktop.surface-brief",
      "packetId": "canon-overlay-candidate-review:overlay.atlas-studio-desktop.surface-brief",
      "candidateId": "overlay.atlas-studio-desktop:overlay.atlas-studio-desktop.surface-brief",
      "intakeId": "overlay.atlas-studio-desktop.surface-brief",
      "title": "Surface Brief Template promotion plan",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
      "overlayId": "overlay.atlas-studio-desktop",
      "overlayName": "Atlas Studio Desktop Overlay",
      "manifestPath": "apps/atlas-studio-desktop/canon-overlay/manifest.ts",
      "owner": "atlas-team",
      "sourcePackage": "@create-something/atlas-studio-desktop",
      "sourcePath": "canon-overlay/templates/surface-brief.md",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "planUri": "canon://overlays/candidates/overlay.atlas-studio-desktop.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.atlas-studio-desktop.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.atlas-studio-desktop.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.atlas-studio-desktop",
      "preconditions": [
        "Human maintainer approval is recorded outside this plan before implementation starts.",
        "Candidate review packet has been read and current source paths still resolve.",
        "Implementation owner confirms the candidate should move toward Canon candidate or stable work instead of remaining project-local."
      ],
      "implementationScope": [
        "Evaluate the template candidate for Canon-owned source, export, docs, tests, compatibility, and registry routing.",
        "Preserve the owning overlay as evidence: Atlas Studio Desktop Overlay (overlay.atlas-studio-desktop).",
        "Cover modalities: web, chat, app, voice, glasses.",
        "Review source package @create-something/atlas-studio-desktop at canon-overlay/templates/surface-brief.md."
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
      "id": "canon-overlay-candidate-promotion-plan:overlay.guard-performance-lab.surface-brief",
      "packetId": "canon-overlay-candidate-review:overlay.guard-performance-lab.surface-brief",
      "candidateId": "overlay.guard-performance-lab:overlay.guard-performance-lab.surface-brief",
      "intakeId": "overlay.guard-performance-lab.surface-brief",
      "title": "Surface Brief Template promotion plan",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
      "overlayId": "overlay.guard-performance-lab",
      "overlayName": "Guard Performance Lab Overlay",
      "manifestPath": "apps/guard-performance-lab/canon-overlay/manifest.ts",
      "owner": "performance-lab",
      "sourcePackage": "@create-something/guard-performance-lab",
      "sourcePath": "canon-overlay/templates/surface-brief.md",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "planUri": "canon://overlays/candidates/overlay.guard-performance-lab.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.guard-performance-lab.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.guard-performance-lab.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.guard-performance-lab",
      "preconditions": [
        "Human maintainer approval is recorded outside this plan before implementation starts.",
        "Candidate review packet has been read and current source paths still resolve.",
        "Implementation owner confirms the candidate should move toward Canon candidate or stable work instead of remaining project-local."
      ],
      "implementationScope": [
        "Evaluate the template candidate for Canon-owned source, export, docs, tests, compatibility, and registry routing.",
        "Preserve the owning overlay as evidence: Guard Performance Lab Overlay (overlay.guard-performance-lab).",
        "Cover modalities: web, chat, app, voice, glasses.",
        "Review source package @create-something/guard-performance-lab at canon-overlay/templates/surface-brief.md."
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
      "id": "canon-overlay-candidate-promotion-plan:overlay.marketplace-template-submission-cloud.surface-brief",
      "packetId": "canon-overlay-candidate-review:overlay.marketplace-template-submission-cloud.surface-brief",
      "candidateId": "overlay.marketplace-template-submission-cloud:overlay.marketplace-template-submission-cloud.surface-brief",
      "intakeId": "overlay.marketplace-template-submission-cloud.surface-brief",
      "title": "Surface Brief Template promotion plan",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
      "overlayId": "overlay.marketplace-template-submission-cloud",
      "overlayName": "Marketplace Template Submission Cloud Overlay",
      "manifestPath": "apps/marketplace-template-submission-cloud/canon-overlay/manifest.ts",
      "owner": "webflow-marketplace-team",
      "sourcePackage": "@create-something/marketplace-template-submission-cloud",
      "sourcePath": "canon-overlay/templates/surface-brief.md",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "planUri": "canon://overlays/candidates/overlay.marketplace-template-submission-cloud.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.marketplace-template-submission-cloud.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.marketplace-template-submission-cloud.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.marketplace-template-submission-cloud",
      "preconditions": [
        "Human maintainer approval is recorded outside this plan before implementation starts.",
        "Candidate review packet has been read and current source paths still resolve.",
        "Implementation owner confirms the candidate should move toward Canon candidate or stable work instead of remaining project-local."
      ],
      "implementationScope": [
        "Evaluate the template candidate for Canon-owned source, export, docs, tests, compatibility, and registry routing.",
        "Preserve the owning overlay as evidence: Marketplace Template Submission Cloud Overlay (overlay.marketplace-template-submission-cloud).",
        "Cover modalities: web, chat, app, voice, glasses.",
        "Review source package @create-something/marketplace-template-submission-cloud at canon-overlay/templates/surface-brief.md."
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
      "id": "canon-overlay-candidate-promotion-plan:overlay.webflow-dashboard-cloud.surface-brief",
      "packetId": "canon-overlay-candidate-review:overlay.webflow-dashboard-cloud.surface-brief",
      "candidateId": "overlay.webflow-dashboard-cloud:overlay.webflow-dashboard-cloud.surface-brief",
      "intakeId": "overlay.webflow-dashboard-cloud.surface-brief",
      "title": "Surface Brief Template promotion plan",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
      "overlayId": "overlay.webflow-dashboard-cloud",
      "overlayName": "Webflow Dashboard Cloud Overlay",
      "manifestPath": "apps/webflow-dashboard-cloud/canon-overlay/manifest.ts",
      "owner": "webflow-dashboard-team",
      "sourcePackage": "@create-something/webflow-dashboard-cloud",
      "sourcePath": "canon-overlay/templates/surface-brief.md",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "planUri": "canon://overlays/candidates/overlay.webflow-dashboard-cloud.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.webflow-dashboard-cloud.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.webflow-dashboard-cloud.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.webflow-dashboard-cloud",
      "preconditions": [
        "Human maintainer approval is recorded outside this plan before implementation starts.",
        "Candidate review packet has been read and current source paths still resolve.",
        "Implementation owner confirms the candidate should move toward Canon candidate or stable work instead of remaining project-local."
      ],
      "implementationScope": [
        "Evaluate the template candidate for Canon-owned source, export, docs, tests, compatibility, and registry routing.",
        "Preserve the owning overlay as evidence: Webflow Dashboard Cloud Overlay (overlay.webflow-dashboard-cloud).",
        "Cover modalities: web, chat, app, voice, glasses.",
        "Review source package @create-something/webflow-dashboard-cloud at canon-overlay/templates/surface-brief.md."
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
      "id": "canon-overlay-candidate-promotion-plan:overlay.webflow-marketplace-category-cloud.surface-brief",
      "packetId": "canon-overlay-candidate-review:overlay.webflow-marketplace-category-cloud.surface-brief",
      "candidateId": "overlay.webflow-marketplace-category-cloud:overlay.webflow-marketplace-category-cloud.surface-brief",
      "intakeId": "overlay.webflow-marketplace-category-cloud.surface-brief",
      "title": "Surface Brief Template promotion plan",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
      "overlayId": "overlay.webflow-marketplace-category-cloud",
      "overlayName": "Webflow Marketplace Category Cloud Overlay",
      "manifestPath": "apps/webflow-marketplace-category-cloud/canon-overlay/manifest.ts",
      "owner": "webflow-marketplace-team",
      "sourcePackage": "@create-something/webflow-marketplace-category-cloud",
      "sourcePath": "canon-overlay/templates/surface-brief.md",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "planUri": "canon://overlays/candidates/overlay.webflow-marketplace-category-cloud.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.webflow-marketplace-category-cloud.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.webflow-marketplace-category-cloud.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.webflow-marketplace-category-cloud",
      "preconditions": [
        "Human maintainer approval is recorded outside this plan before implementation starts.",
        "Candidate review packet has been read and current source paths still resolve.",
        "Implementation owner confirms the candidate should move toward Canon candidate or stable work instead of remaining project-local."
      ],
      "implementationScope": [
        "Evaluate the template candidate for Canon-owned source, export, docs, tests, compatibility, and registry routing.",
        "Preserve the owning overlay as evidence: Webflow Marketplace Category Cloud Overlay (overlay.webflow-marketplace-category-cloud).",
        "Cover modalities: web, chat, app, voice, glasses.",
        "Review source package @create-something/webflow-marketplace-category-cloud at canon-overlay/templates/surface-brief.md."
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
        "app",
        "voice",
        "glasses"
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
        "Cover modalities: web, chat, app, voice, glasses.",
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
      "id": "canon-overlay-candidate-promotion-plan:overlay.jandjhomehealth.surface-brief",
      "packetId": "canon-overlay-candidate-review:overlay.jandjhomehealth.surface-brief",
      "candidateId": "overlay.jandjhomehealth:overlay.jandjhomehealth.surface-brief",
      "intakeId": "overlay.jandjhomehealth.surface-brief",
      "title": "Surface Brief Template promotion plan",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
      "overlayId": "overlay.jandjhomehealth",
      "overlayName": "J&J Home Health Client Overlay",
      "manifestPath": "packages/agency/clients/jandjhomehealth/canon-overlay/manifest.ts",
      "owner": "agency-client-team",
      "sourcePackage": "@create-something/jandjhomehealth",
      "sourcePath": "canon-overlay/templates/surface-brief.md",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "planUri": "canon://overlays/candidates/overlay.jandjhomehealth.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.jandjhomehealth.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.jandjhomehealth.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.jandjhomehealth",
      "preconditions": [
        "Human maintainer approval is recorded outside this plan before implementation starts.",
        "Candidate review packet has been read and current source paths still resolve.",
        "Implementation owner confirms the candidate should move toward Canon candidate or stable work instead of remaining project-local."
      ],
      "implementationScope": [
        "Evaluate the template candidate for Canon-owned source, export, docs, tests, compatibility, and registry routing.",
        "Preserve the owning overlay as evidence: J&J Home Health Client Overlay (overlay.jandjhomehealth).",
        "Cover modalities: web, chat, app, voice, glasses.",
        "Review source package @create-something/jandjhomehealth at canon-overlay/templates/surface-brief.md."
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
      "id": "canon-overlay-candidate-promotion-plan:overlay.outerfields.surface-brief",
      "packetId": "canon-overlay-candidate-review:overlay.outerfields.surface-brief",
      "candidateId": "overlay.outerfields:overlay.outerfields.surface-brief",
      "intakeId": "overlay.outerfields.surface-brief",
      "title": "Surface Brief Template promotion plan",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
      "overlayId": "overlay.outerfields",
      "overlayName": "Outerfields Client Overlay",
      "manifestPath": "packages/agency/clients/outerfields/canon-overlay/manifest.ts",
      "owner": "agency-client-team",
      "sourcePackage": "@create-something/outerfields",
      "sourcePath": "canon-overlay/templates/surface-brief.md",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "planUri": "canon://overlays/candidates/overlay.outerfields.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.outerfields.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.outerfields.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.outerfields",
      "preconditions": [
        "Human maintainer approval is recorded outside this plan before implementation starts.",
        "Candidate review packet has been read and current source paths still resolve.",
        "Implementation owner confirms the candidate should move toward Canon candidate or stable work instead of remaining project-local."
      ],
      "implementationScope": [
        "Evaluate the template candidate for Canon-owned source, export, docs, tests, compatibility, and registry routing.",
        "Preserve the owning overlay as evidence: Outerfields Client Overlay (overlay.outerfields).",
        "Cover modalities: web, chat, app, voice, glasses.",
        "Review source package @create-something/outerfields at canon-overlay/templates/surface-brief.md."
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
      "id": "canon-overlay-candidate-promotion-plan:overlay.the-stack.surface-brief",
      "packetId": "canon-overlay-candidate-review:overlay.the-stack.surface-brief",
      "candidateId": "overlay.the-stack:overlay.the-stack.surface-brief",
      "intakeId": "overlay.the-stack.surface-brief",
      "title": "Surface Brief Template promotion plan",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
      "overlayId": "overlay.the-stack",
      "overlayName": "The Stack Client Overlay",
      "manifestPath": "packages/agency/clients/the-stack/canon-overlay/manifest.ts",
      "owner": "agency-client-team",
      "sourcePackage": "@create-something/the-stack",
      "sourcePath": "canon-overlay/templates/surface-brief.md",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "planUri": "canon://overlays/candidates/overlay.the-stack.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.the-stack.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.the-stack.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.the-stack",
      "preconditions": [
        "Human maintainer approval is recorded outside this plan before implementation starts.",
        "Candidate review packet has been read and current source paths still resolve.",
        "Implementation owner confirms the candidate should move toward Canon candidate or stable work instead of remaining project-local."
      ],
      "implementationScope": [
        "Evaluate the template candidate for Canon-owned source, export, docs, tests, compatibility, and registry routing.",
        "Preserve the owning overlay as evidence: The Stack Client Overlay (overlay.the-stack).",
        "Cover modalities: web, chat, app, voice, glasses.",
        "Review source package @create-something/the-stack at canon-overlay/templates/surface-brief.md."
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
      "id": "canon-overlay-candidate-promotion-plan:overlay.app-governance-dashboard.surface-brief",
      "packetId": "canon-overlay-candidate-review:overlay.app-governance-dashboard.surface-brief",
      "candidateId": "overlay.app-governance-dashboard:overlay.app-governance-dashboard.surface-brief",
      "intakeId": "overlay.app-governance-dashboard.surface-brief",
      "title": "Surface Brief Template promotion plan",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
      "overlayId": "overlay.app-governance-dashboard",
      "overlayName": "App Governance Dashboard Overlay",
      "manifestPath": "packages/app-governance-db/dashboard/canon-overlay/manifest.ts",
      "owner": "app-governance-team",
      "sourcePackage": "app-governance-dashboard",
      "sourcePath": "canon-overlay/templates/surface-brief.md",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "planUri": "canon://overlays/candidates/overlay.app-governance-dashboard.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.app-governance-dashboard.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.app-governance-dashboard.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.app-governance-dashboard",
      "preconditions": [
        "Human maintainer approval is recorded outside this plan before implementation starts.",
        "Candidate review packet has been read and current source paths still resolve.",
        "Implementation owner confirms the candidate should move toward Canon candidate or stable work instead of remaining project-local."
      ],
      "implementationScope": [
        "Evaluate the template candidate for Canon-owned source, export, docs, tests, compatibility, and registry routing.",
        "Preserve the owning overlay as evidence: App Governance Dashboard Overlay (overlay.app-governance-dashboard).",
        "Cover modalities: web, chat, app, voice, glasses.",
        "Review source package app-governance-dashboard at canon-overlay/templates/surface-brief.md."
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
      "id": "canon-overlay-candidate-promotion-plan:overlay.app-governance-desktop.surface-brief",
      "packetId": "canon-overlay-candidate-review:overlay.app-governance-desktop.surface-brief",
      "candidateId": "overlay.app-governance-desktop:overlay.app-governance-desktop.surface-brief",
      "intakeId": "overlay.app-governance-desktop.surface-brief",
      "title": "Surface Brief Template promotion plan",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
      "overlayId": "overlay.app-governance-desktop",
      "overlayName": "App Governance Desktop Overlay",
      "manifestPath": "packages/app-governance-desktop/canon-overlay/manifest.ts",
      "owner": "app-governance-team",
      "sourcePackage": "app-governance-desktop",
      "sourcePath": "canon-overlay/templates/surface-brief.md",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "planUri": "canon://overlays/candidates/overlay.app-governance-desktop.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.app-governance-desktop.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.app-governance-desktop.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.app-governance-desktop",
      "preconditions": [
        "Human maintainer approval is recorded outside this plan before implementation starts.",
        "Candidate review packet has been read and current source paths still resolve.",
        "Implementation owner confirms the candidate should move toward Canon candidate or stable work instead of remaining project-local."
      ],
      "implementationScope": [
        "Evaluate the template candidate for Canon-owned source, export, docs, tests, compatibility, and registry routing.",
        "Preserve the owning overlay as evidence: App Governance Desktop Overlay (overlay.app-governance-desktop).",
        "Cover modalities: web, chat, app, voice, glasses.",
        "Review source package app-governance-desktop at canon-overlay/templates/surface-brief.md."
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
      "id": "canon-overlay-candidate-promotion-plan:overlay.clearway-conversion.surface-brief",
      "packetId": "canon-overlay-candidate-review:overlay.clearway-conversion.surface-brief",
      "candidateId": "overlay.clearway-conversion:overlay.clearway-conversion.surface-brief",
      "intakeId": "overlay.clearway-conversion.surface-brief",
      "title": "Conversion booking and embed surface promotion plan",
      "summary": "A candidate Canon conversion template for booking flows, developer embeds, admin receipts, and concise operator handoffs without turning Clearway-specific scheduling copy into Canon primitives.",
      "overlayId": "overlay.clearway-conversion",
      "overlayName": "Clearway Conversion Overlay",
      "manifestPath": "packages/clearway/canon-overlay/manifest.ts",
      "owner": "clearway-team",
      "sourcePackage": "@create-something/clearway",
      "sourcePath": "src/routes/+page.svelte",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "planUri": "canon://overlays/candidates/overlay.clearway-conversion.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.clearway-conversion.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.clearway-conversion.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.clearway-conversion",
      "preconditions": [
        "Human maintainer approval is recorded outside this plan before implementation starts.",
        "Candidate review packet has been read and current source paths still resolve.",
        "Implementation owner confirms the candidate should move toward Canon candidate or stable work instead of remaining project-local."
      ],
      "implementationScope": [
        "Evaluate the template candidate for Canon-owned source, export, docs, tests, compatibility, and registry routing.",
        "Preserve the owning overlay as evidence: Clearway Conversion Overlay (overlay.clearway-conversion).",
        "Cover modalities: web, chat, app, voice, glasses.",
        "Review source package @create-something/clearway at src/routes/+page.svelte."
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
      "id": "canon-overlay-candidate-promotion-plan:overlay.concierge-chat-staffing.surface-brief",
      "packetId": "canon-overlay-candidate-review:overlay.concierge-chat-staffing.surface-brief",
      "candidateId": "overlay.concierge-chat-staffing:overlay.concierge-chat-staffing.surface-brief",
      "intakeId": "overlay.concierge-chat-staffing.surface-brief",
      "title": "Staffing concierge chat surface promotion plan",
      "summary": "A candidate Canon concierge template for governed chat, staffing intake, job matching, profile receipts, and operator settings without promoting one staffing vertical into Canon stable.",
      "overlayId": "overlay.concierge-chat-staffing",
      "overlayName": "Concierge Chat Staffing Overlay",
      "manifestPath": "packages/concierge-chat/canon-overlay/manifest.ts",
      "owner": "concierge-team",
      "sourcePackage": "@create-something/concierge-chat",
      "sourcePath": "src/routes/chat/+page.svelte",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "planUri": "canon://overlays/candidates/overlay.concierge-chat-staffing.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.concierge-chat-staffing.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.concierge-chat-staffing.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.concierge-chat-staffing",
      "preconditions": [
        "Human maintainer approval is recorded outside this plan before implementation starts.",
        "Candidate review packet has been read and current source paths still resolve.",
        "Implementation owner confirms the candidate should move toward Canon candidate or stable work instead of remaining project-local."
      ],
      "implementationScope": [
        "Evaluate the template candidate for Canon-owned source, export, docs, tests, compatibility, and registry routing.",
        "Preserve the owning overlay as evidence: Concierge Chat Staffing Overlay (overlay.concierge-chat-staffing).",
        "Cover modalities: web, chat, app, voice, glasses.",
        "Review source package @create-something/concierge-chat at src/routes/chat/+page.svelte."
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
      "id": "canon-overlay-candidate-promotion-plan:overlay.io-research-artifact.surface-brief",
      "packetId": "canon-overlay-candidate-review:overlay.io-research-artifact.surface-brief",
      "candidateId": "overlay.io-research-artifact:overlay.io-research-artifact.surface-brief",
      "intakeId": "overlay.io-research-artifact.surface-brief",
      "title": "Research artifact proof surface promotion plan",
      "summary": "A candidate Canon research-artifact template for publishing MCP papers, plugin references, visual summaries, and agent-readable source metadata without promoting one article's content into Canon stable.",
      "overlayId": "overlay.io-research-artifact",
      "overlayName": "IO Research Artifact Overlay",
      "manifestPath": "packages/io/canon-overlay/manifest.ts",
      "owner": "research-team",
      "sourcePackage": "@create-something/io",
      "sourcePath": "src/lib/config/fileBasedPapers.ts",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "planUri": "canon://overlays/candidates/overlay.io-research-artifact.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.io-research-artifact.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.io-research-artifact.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.io-research-artifact",
      "preconditions": [
        "Human maintainer approval is recorded outside this plan before implementation starts.",
        "Candidate review packet has been read and current source paths still resolve.",
        "Implementation owner confirms the candidate should move toward Canon candidate or stable work instead of remaining project-local."
      ],
      "implementationScope": [
        "Evaluate the template candidate for Canon-owned source, export, docs, tests, compatibility, and registry routing.",
        "Preserve the owning overlay as evidence: IO Research Artifact Overlay (overlay.io-research-artifact).",
        "Cover modalities: web, chat, app, voice, glasses.",
        "Review source package @create-something/io at src/lib/config/fileBasedPapers.ts."
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
        "chat",
        "voice",
        "glasses"
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
        "Cover modalities: web, app, chat, voice, glasses.",
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
    },
    {
      "id": "canon-overlay-candidate-promotion-plan:overlay.ltd-canon-philosophy.surface-brief",
      "packetId": "canon-overlay-candidate-review:overlay.ltd-canon-philosophy.surface-brief",
      "candidateId": "overlay.ltd-canon-philosophy:overlay.ltd-canon-philosophy.surface-brief",
      "intakeId": "overlay.ltd-canon-philosophy.surface-brief",
      "title": "Canon philosophy documentation surface promotion plan",
      "summary": "A candidate Canon documentation template for turning philosophy, standards, voice, and live Canon docs into one reusable cross-property foundation surface without forking Canon primitives.",
      "overlayId": "overlay.ltd-canon-philosophy",
      "overlayName": "LTD Canon Philosophy Overlay",
      "manifestPath": "packages/ltd/canon-overlay/manifest.ts",
      "owner": "ltd-team",
      "sourcePackage": "@create-something/ltd",
      "sourcePath": "src/routes/canon/+page.svelte",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "planUri": "canon://overlays/candidates/overlay.ltd-canon-philosophy.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.ltd-canon-philosophy.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.ltd-canon-philosophy.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.ltd-canon-philosophy",
      "preconditions": [
        "Human maintainer approval is recorded outside this plan before implementation starts.",
        "Candidate review packet has been read and current source paths still resolve.",
        "Implementation owner confirms the candidate should move toward Canon candidate or stable work instead of remaining project-local."
      ],
      "implementationScope": [
        "Evaluate the template candidate for Canon-owned source, export, docs, tests, compatibility, and registry routing.",
        "Preserve the owning overlay as evidence: LTD Canon Philosophy Overlay (overlay.ltd-canon-philosophy).",
        "Cover modalities: web, chat, app, voice, glasses.",
        "Review source package @create-something/ltd at src/routes/canon/+page.svelte."
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
      "id": "canon-overlay-candidate-promotion-plan:overlay.maverick-admin.surface-brief",
      "packetId": "canon-overlay-candidate-review:overlay.maverick-admin.surface-brief",
      "candidateId": "overlay.maverick-admin:overlay.maverick-admin.surface-brief",
      "intakeId": "overlay.maverick-admin.surface-brief",
      "title": "Surface Brief Template promotion plan",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
      "overlayId": "overlay.maverick-admin",
      "overlayName": "Maverick Admin Overlay",
      "manifestPath": "packages/maverick-admin/canon-overlay/manifest.ts",
      "owner": "maverick-team",
      "sourcePackage": "@create-something/maverick-admin",
      "sourcePath": "canon-overlay/templates/surface-brief.md",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "planUri": "canon://overlays/candidates/overlay.maverick-admin.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.maverick-admin.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.maverick-admin.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.maverick-admin",
      "preconditions": [
        "Human maintainer approval is recorded outside this plan before implementation starts.",
        "Candidate review packet has been read and current source paths still resolve.",
        "Implementation owner confirms the candidate should move toward Canon candidate or stable work instead of remaining project-local."
      ],
      "implementationScope": [
        "Evaluate the template candidate for Canon-owned source, export, docs, tests, compatibility, and registry routing.",
        "Preserve the owning overlay as evidence: Maverick Admin Overlay (overlay.maverick-admin).",
        "Cover modalities: web, chat, app, voice, glasses.",
        "Review source package @create-something/maverick-admin at canon-overlay/templates/surface-brief.md."
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
      "id": "canon-overlay-candidate-promotion-plan:overlay.maverick-industry.surface-brief",
      "packetId": "canon-overlay-candidate-review:overlay.maverick-industry.surface-brief",
      "candidateId": "overlay.maverick-industry:overlay.maverick-industry.surface-brief",
      "intakeId": "overlay.maverick-industry.surface-brief",
      "title": "Industry service proof surface promotion plan",
      "summary": "A candidate Canon industry-service template for public sector pages, product proof, news context, and concise sales handoffs without promoting Maverick-specific claims into Canon.",
      "overlayId": "overlay.maverick-industry",
      "overlayName": "Maverick Industry Overlay",
      "manifestPath": "packages/maverick/canon-overlay/manifest.ts",
      "owner": "maverick-team",
      "sourcePackage": "@create-something/maverick",
      "sourcePath": "src/routes/+page.svelte",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "planUri": "canon://overlays/candidates/overlay.maverick-industry.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.maverick-industry.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.maverick-industry.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.maverick-industry",
      "preconditions": [
        "Human maintainer approval is recorded outside this plan before implementation starts.",
        "Candidate review packet has been read and current source paths still resolve.",
        "Implementation owner confirms the candidate should move toward Canon candidate or stable work instead of remaining project-local."
      ],
      "implementationScope": [
        "Evaluate the template candidate for Canon-owned source, export, docs, tests, compatibility, and registry routing.",
        "Preserve the owning overlay as evidence: Maverick Industry Overlay (overlay.maverick-industry).",
        "Cover modalities: web, chat, app, voice, glasses.",
        "Review source package @create-something/maverick at src/routes/+page.svelte."
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
      "id": "canon-overlay-candidate-promotion-plan:overlay.notion-agent-workspace.surface-brief",
      "packetId": "canon-overlay-candidate-review:overlay.notion-agent-workspace.surface-brief",
      "candidateId": "overlay.notion-agent-workspace:overlay.notion-agent-workspace.surface-brief",
      "intakeId": "overlay.notion-agent-workspace.surface-brief",
      "title": "Notion agent workspace surface promotion plan",
      "summary": "A candidate Canon workspace-agent template for OAuth entry, dashboard review, execution APIs, and compact operator handoffs without promoting Notion-specific tool details into Canon.",
      "overlayId": "overlay.notion-agent-workspace",
      "overlayName": "Notion Agent Workspace Overlay",
      "manifestPath": "packages/notion-agent/canon-overlay/manifest.ts",
      "owner": "notion-agent-team",
      "sourcePackage": "@create-something/notion-agent",
      "sourcePath": "src/routes/dashboard/+page.svelte",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "planUri": "canon://overlays/candidates/overlay.notion-agent-workspace.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.notion-agent-workspace.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.notion-agent-workspace.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.notion-agent-workspace",
      "preconditions": [
        "Human maintainer approval is recorded outside this plan before implementation starts.",
        "Candidate review packet has been read and current source paths still resolve.",
        "Implementation owner confirms the candidate should move toward Canon candidate or stable work instead of remaining project-local."
      ],
      "implementationScope": [
        "Evaluate the template candidate for Canon-owned source, export, docs, tests, compatibility, and registry routing.",
        "Preserve the owning overlay as evidence: Notion Agent Workspace Overlay (overlay.notion-agent-workspace).",
        "Cover modalities: web, chat, app, voice, glasses.",
        "Review source package @create-something/notion-agent at src/routes/dashboard/+page.svelte."
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
      "id": "canon-overlay-candidate-promotion-plan:overlay.ona-agents.surface-brief",
      "packetId": "canon-overlay-candidate-review:overlay.ona-agents.surface-brief",
      "candidateId": "overlay.ona-agents:overlay.ona-agents.surface-brief",
      "intakeId": "overlay.ona-agents.surface-brief",
      "title": "Surface Brief Template promotion plan",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
      "overlayId": "overlay.ona-agents",
      "overlayName": "Performance Agents Overlay",
      "manifestPath": "packages/ona-agents/canon-overlay/manifest.ts",
      "owner": "performance-lab",
      "sourcePackage": "@create-something/ona-agents",
      "sourcePath": "canon-overlay/templates/surface-brief.md",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "planUri": "canon://overlays/candidates/overlay.ona-agents.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.ona-agents.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.ona-agents.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.ona-agents",
      "preconditions": [
        "Human maintainer approval is recorded outside this plan before implementation starts.",
        "Candidate review packet has been read and current source paths still resolve.",
        "Implementation owner confirms the candidate should move toward Canon candidate or stable work instead of remaining project-local."
      ],
      "implementationScope": [
        "Evaluate the template candidate for Canon-owned source, export, docs, tests, compatibility, and registry routing.",
        "Preserve the owning overlay as evidence: Performance Agents Overlay (overlay.ona-agents).",
        "Cover modalities: web, chat, app, voice, glasses.",
        "Review source package @create-something/ona-agents at canon-overlay/templates/surface-brief.md."
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
      "id": "canon-overlay-candidate-promotion-plan:overlay.relay.surface-brief",
      "packetId": "canon-overlay-candidate-review:overlay.relay.surface-brief",
      "candidateId": "overlay.relay:overlay.relay.surface-brief",
      "intakeId": "overlay.relay.surface-brief",
      "title": "Surface Brief Template promotion plan",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
      "overlayId": "overlay.relay",
      "overlayName": "Relay Control UI Overlay",
      "manifestPath": "packages/relay/canon-overlay/manifest.ts",
      "owner": "relay-team",
      "sourcePackage": "@create-something/relay",
      "sourcePath": "canon-overlay/templates/surface-brief.md",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "planUri": "canon://overlays/candidates/overlay.relay.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.relay.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.relay.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.relay",
      "preconditions": [
        "Human maintainer approval is recorded outside this plan before implementation starts.",
        "Candidate review packet has been read and current source paths still resolve.",
        "Implementation owner confirms the candidate should move toward Canon candidate or stable work instead of remaining project-local."
      ],
      "implementationScope": [
        "Evaluate the template candidate for Canon-owned source, export, docs, tests, compatibility, and registry routing.",
        "Preserve the owning overlay as evidence: Relay Control UI Overlay (overlay.relay).",
        "Cover modalities: web, chat, app, voice, glasses.",
        "Review source package @create-something/relay at canon-overlay/templates/surface-brief.md."
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
      "id": "canon-overlay-candidate-promotion-plan:overlay.space-workbench.surface-brief",
      "packetId": "canon-overlay-candidate-review:overlay.space-workbench.surface-brief",
      "candidateId": "overlay.space-workbench:overlay.space-workbench.surface-brief",
      "intakeId": "overlay.space-workbench.surface-brief",
      "title": "Workbench tool proof surface promotion plan",
      "summary": "A candidate Canon workbench template for turning live tools, playgrounds, data dashboards, and operator receipts into reusable proof surfaces without forking Canon components.",
      "overlayId": "overlay.space-workbench",
      "overlayName": "Space Workbench Overlay",
      "manifestPath": "packages/space/canon-overlay/manifest.ts",
      "owner": "space-team",
      "sourcePackage": "@create-something/space",
      "sourcePath": "src/routes/+page.svelte",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "planUri": "canon://overlays/candidates/overlay.space-workbench.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.space-workbench.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.space-workbench.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.space-workbench",
      "preconditions": [
        "Human maintainer approval is recorded outside this plan before implementation starts.",
        "Candidate review packet has been read and current source paths still resolve.",
        "Implementation owner confirms the candidate should move toward Canon candidate or stable work instead of remaining project-local."
      ],
      "implementationScope": [
        "Evaluate the template candidate for Canon-owned source, export, docs, tests, compatibility, and registry routing.",
        "Preserve the owning overlay as evidence: Space Workbench Overlay (overlay.space-workbench).",
        "Cover modalities: web, chat, app, voice, glasses.",
        "Review source package @create-something/space at src/routes/+page.svelte."
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
      "id": "canon-overlay-candidate-promotion-plan:overlay.spritz-reading.surface-brief",
      "packetId": "canon-overlay-candidate-review:overlay.spritz-reading.surface-brief",
      "candidateId": "overlay.spritz-reading:overlay.spritz-reading.surface-brief",
      "intakeId": "overlay.spritz-reading.surface-brief",
      "title": "Reading component proof surface promotion plan",
      "summary": "A candidate Canon component-demo template for interactive reading controls, component API evidence, and compact preview handoffs without making Spritz behavior a Canon primitive.",
      "overlayId": "overlay.spritz-reading",
      "overlayName": "Spritz Reading Overlay",
      "manifestPath": "packages/spritz/canon-overlay/manifest.ts",
      "owner": "spritz-team",
      "sourcePackage": "@create-something/spritz",
      "sourcePath": "src/routes/+page.svelte",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "planUri": "canon://overlays/candidates/overlay.spritz-reading.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.spritz-reading.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.spritz-reading.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.spritz-reading",
      "preconditions": [
        "Human maintainer approval is recorded outside this plan before implementation starts.",
        "Candidate review packet has been read and current source paths still resolve.",
        "Implementation owner confirms the candidate should move toward Canon candidate or stable work instead of remaining project-local."
      ],
      "implementationScope": [
        "Evaluate the template candidate for Canon-owned source, export, docs, tests, compatibility, and registry routing.",
        "Preserve the owning overlay as evidence: Spritz Reading Overlay (overlay.spritz-reading).",
        "Cover modalities: web, chat, app, voice, glasses.",
        "Review source package @create-something/spritz at src/routes/+page.svelte."
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
      "id": "canon-overlay-candidate-promotion-plan:overlay.tend-database.surface-brief",
      "packetId": "canon-overlay-candidate-review:overlay.tend-database.surface-brief",
      "candidateId": "overlay.tend-database:overlay.tend-database.surface-brief",
      "intakeId": "overlay.tend-database.surface-brief",
      "title": "Database source management surface promotion plan",
      "summary": "A candidate Canon database-service template for source setup, settings, agent automation, and receipt handoffs without promoting Tend-specific vertical schemas into Canon.",
      "overlayId": "overlay.tend-database",
      "overlayName": "Tend Database Overlay",
      "manifestPath": "packages/tend/canon-overlay/manifest.ts",
      "owner": "tend-team",
      "sourcePackage": "@create-something/tend",
      "sourcePath": "src/routes/+page.svelte",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "planUri": "canon://overlays/candidates/overlay.tend-database.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.tend-database.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.tend-database.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.tend-database",
      "preconditions": [
        "Human maintainer approval is recorded outside this plan before implementation starts.",
        "Candidate review packet has been read and current source paths still resolve.",
        "Implementation owner confirms the candidate should move toward Canon candidate or stable work instead of remaining project-local."
      ],
      "implementationScope": [
        "Evaluate the template candidate for Canon-owned source, export, docs, tests, compatibility, and registry routing.",
        "Preserve the owning overlay as evidence: Tend Database Overlay (overlay.tend-database).",
        "Cover modalities: web, chat, app, voice, glasses.",
        "Review source package @create-something/tend at src/routes/+page.svelte."
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
      "id": "canon-overlay-candidate-promotion-plan:overlay.webflow-apps-admin-audit.surface-brief",
      "packetId": "canon-overlay-candidate-review:overlay.webflow-apps-admin-audit.surface-brief",
      "candidateId": "overlay.webflow-apps-admin-audit:overlay.webflow-apps-admin-audit.surface-brief",
      "intakeId": "overlay.webflow-apps-admin-audit.surface-brief",
      "title": "Webflow app audit dashboard surface promotion plan",
      "summary": "A candidate Canon audit-dashboard template for app review status, governance evidence, and compact reviewer handoffs without promoting Webflow-specific exception policy into Canon stable.",
      "overlayId": "overlay.webflow-apps-admin-audit",
      "overlayName": "Webflow Apps Admin Audit Overlay",
      "manifestPath": "packages/webflow-apps-admin/dashboard/canon-overlay/manifest.ts",
      "owner": "webflow-apps-team",
      "sourcePackage": "@create-something/webflow-apps-audit-dashboard",
      "sourcePath": "src/routes/+page.svelte",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "planUri": "canon://overlays/candidates/overlay.webflow-apps-admin-audit.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.webflow-apps-admin-audit.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.webflow-apps-admin-audit.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.webflow-apps-admin-audit",
      "preconditions": [
        "Human maintainer approval is recorded outside this plan before implementation starts.",
        "Candidate review packet has been read and current source paths still resolve.",
        "Implementation owner confirms the candidate should move toward Canon candidate or stable work instead of remaining project-local."
      ],
      "implementationScope": [
        "Evaluate the template candidate for Canon-owned source, export, docs, tests, compatibility, and registry routing.",
        "Preserve the owning overlay as evidence: Webflow Apps Admin Audit Overlay (overlay.webflow-apps-admin-audit).",
        "Cover modalities: web, chat, app, voice, glasses.",
        "Review source package @create-something/webflow-apps-audit-dashboard at src/routes/+page.svelte."
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
      "id": "canon-overlay-candidate-promotion-plan:overlay.webflow-dashboard-marketplace.surface-brief",
      "packetId": "canon-overlay-candidate-review:overlay.webflow-dashboard-marketplace.surface-brief",
      "candidateId": "overlay.webflow-dashboard-marketplace:overlay.webflow-dashboard-marketplace.surface-brief",
      "intakeId": "overlay.webflow-dashboard-marketplace.surface-brief",
      "title": "Webflow marketplace dashboard surface promotion plan",
      "summary": "A candidate Canon marketplace-operations template for dashboard state, marketplace insights, validation, asset receipts, and compact operator handoffs without promoting Webflow-specific data policy into Canon.",
      "overlayId": "overlay.webflow-dashboard-marketplace",
      "overlayName": "Webflow Dashboard Marketplace Overlay",
      "manifestPath": "packages/webflow-dashboard/canon-overlay/manifest.ts",
      "owner": "webflow-dashboard-team",
      "sourcePackage": "@create-something/webflow-dashboard",
      "sourcePath": "src/routes/dashboard/+page.svelte",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "planUri": "canon://overlays/candidates/overlay.webflow-dashboard-marketplace.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.webflow-dashboard-marketplace.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.webflow-dashboard-marketplace.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.webflow-dashboard-marketplace",
      "preconditions": [
        "Human maintainer approval is recorded outside this plan before implementation starts.",
        "Candidate review packet has been read and current source paths still resolve.",
        "Implementation owner confirms the candidate should move toward Canon candidate or stable work instead of remaining project-local."
      ],
      "implementationScope": [
        "Evaluate the template candidate for Canon-owned source, export, docs, tests, compatibility, and registry routing.",
        "Preserve the owning overlay as evidence: Webflow Dashboard Marketplace Overlay (overlay.webflow-dashboard-marketplace).",
        "Cover modalities: web, chat, app, voice, glasses.",
        "Review source package @create-something/webflow-dashboard at src/routes/dashboard/+page.svelte."
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
      "id": "canon-overlay-candidate-promotion-plan:overlay.webflow-template-validation.surface-brief",
      "packetId": "canon-overlay-candidate-review:overlay.webflow-template-validation.surface-brief",
      "candidateId": "overlay.webflow-template-validation:overlay.webflow-template-validation.surface-brief",
      "intakeId": "overlay.webflow-template-validation.surface-brief",
      "title": "Surface Brief Template promotion plan",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
      "overlayId": "overlay.webflow-template-validation",
      "overlayName": "Webflow Template Validation Overlay",
      "manifestPath": "packages/webflow-template-validation/canon-overlay/manifest.ts",
      "owner": "webflow-validation-team",
      "sourcePackage": "@create-something/webflow-template-validation",
      "sourcePath": "canon-overlay/templates/surface-brief.md",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "planUri": "canon://overlays/candidates/overlay.webflow-template-validation.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.webflow-template-validation.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.webflow-template-validation.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.webflow-template-validation",
      "preconditions": [
        "Human maintainer approval is recorded outside this plan before implementation starts.",
        "Candidate review packet has been read and current source paths still resolve.",
        "Implementation owner confirms the candidate should move toward Canon candidate or stable work instead of remaining project-local."
      ],
      "implementationScope": [
        "Evaluate the template candidate for Canon-owned source, export, docs, tests, compatibility, and registry routing.",
        "Preserve the owning overlay as evidence: Webflow Template Validation Overlay (overlay.webflow-template-validation).",
        "Cover modalities: web, chat, app, voice, glasses.",
        "Review source package @create-something/webflow-template-validation at canon-overlay/templates/surface-brief.md."
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
    "total": 27,
    "overlays": 27,
    "byRequestedKind": [
      {
        "kind": "template",
        "count": 27
      }
    ],
    "byModality": [
      {
        "modality": "app",
        "count": 27
      },
      {
        "modality": "chat",
        "count": 27
      },
      {
        "modality": "glasses",
        "count": 27
      },
      {
        "modality": "voice",
        "count": 27
      },
      {
        "modality": "web",
        "count": 27
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
