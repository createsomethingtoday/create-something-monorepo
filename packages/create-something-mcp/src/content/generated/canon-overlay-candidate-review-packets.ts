/**
 * Generated Canon overlay candidate review packet content — DO NOT EDIT MANUALLY.
 * Run: npm run build:content
 * Source: packages/canon/src/lib/mcp-snapshot/
 */

import type { CanonOverlayCandidateReviewPacketCollection } from '../types.js';

export const CANON_OVERLAY_CANDIDATE_REVIEW_PACKETS: CanonOverlayCandidateReviewPacketCollection = {
  "schemaVersion": 1,
  "id": "canon-overlay-candidate-review-packets",
  "sourceOfTruth": "@create-something/canon/overlays/intake",
  "description": "Read-only review packets for Canon overlay candidate intakes, including approval boundaries and promotion evidence before Canon implementation work starts.",
  "entries": [
    {
      "id": "canon-overlay-candidate-review:overlay.atlas-studio-desktop.surface-brief",
      "candidateId": "overlay.atlas-studio-desktop:overlay.atlas-studio-desktop.surface-brief",
      "title": "Surface Brief Template review packet",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
      "overlayId": "overlay.atlas-studio-desktop",
      "overlayName": "Atlas Studio Desktop Overlay",
      "manifestPath": "apps/atlas-studio-desktop/canon-overlay/manifest.ts",
      "intakeId": "overlay.atlas-studio-desktop.surface-brief",
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
      "tags": [
        "overlay",
        "brief",
        "surface",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "web-atlas-studio-desktop-brief-1",
          "name": "Web project overlay brief",
          "modality": "web",
          "sourcePath": "canon-overlay/templates/surface-brief.md",
          "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
        },
        {
          "surfaceId": "chat-atlas-studio-desktop-brief-2",
          "name": "Chat project overlay brief",
          "modality": "chat",
          "sourcePath": "canon-overlay/templates/surface-brief.md",
          "proof": "The same structure summarizes cleanly for agent/chat handoff."
        }
      ],
      "dependencies": [
        "template.canon-project-overlay-manifest",
        "template.canon-extension-intake",
        "policy.signal-decision-proof"
      ],
      "requiredEvidence": [
        "Source-adjacent implementation path.",
        "At least two surface proofs or client receipts.",
        "Accessibility, evidence, motion, and extension contract notes.",
        "Registry dependencies and modality list."
      ],
      "stopBeforeStable": [
        "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
      ],
      "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
      "reviewUri": "canon://overlays/intake/overlay.atlas-studio-desktop",
      "candidateUri": "canon://overlays/candidates/overlay.atlas-studio-desktop.surface-brief",
      "handoffUri": "canon://overlays/candidates/overlay.atlas-studio-desktop.surface-brief/handoff",
      "promotionChecklist": [
        "Confirm a human maintainer approved opening Canon promotion work from this packet.",
        "Review the owning overlay manifest, source package, source path, surfaces, and proofs.",
        "Verify every required evidence item has current source or test coverage.",
        "Decide whether the candidate becomes a Canon registry item, template, adapter, token, policy, or remains project-local.",
        "Update Canon export path, docs, tests, MCP generated content, and compatibility notes before any stable promotion."
      ],
      "approvalBoundary": [
        "This packet is read-only and does not create Linear issues, mutate overlay manifests, or approve stable promotion.",
        "Open promotion work only after explicit human approval.",
        "Do not mark stable until every stop-before-stable item is resolved."
      ],
      "agentContract": {
        "purpose": "canon-overlay-candidate-review-packet",
        "primaryConsumers": [
          "codex",
          "mcp",
          "ltd-docs",
          "project-overlays"
        ],
        "useFor": [
          "turning a queued overlay candidate into a reviewable handoff",
          "checking candidate source evidence before implementation planning",
          "preparing a bounded promotion slice after human approval"
        ],
        "stopBefore": [
          "automatically opening Linear work from the packet",
          "automatically editing Canon registry or stable exports",
          "overriding stop-before-stable requirements"
        ]
      }
    },
    {
      "id": "canon-overlay-candidate-review:overlay.marketplace-template-submission-cloud.surface-brief",
      "candidateId": "overlay.marketplace-template-submission-cloud:overlay.marketplace-template-submission-cloud.surface-brief",
      "title": "Surface Brief Template review packet",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
      "overlayId": "overlay.marketplace-template-submission-cloud",
      "overlayName": "Marketplace Template Submission Cloud Overlay",
      "manifestPath": "apps/marketplace-template-submission-cloud/canon-overlay/manifest.ts",
      "intakeId": "overlay.marketplace-template-submission-cloud.surface-brief",
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
      "tags": [
        "overlay",
        "brief",
        "surface",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "web-marketplace-template-submission-cloud-brief-1",
          "name": "Web project overlay brief",
          "modality": "web",
          "sourcePath": "canon-overlay/templates/surface-brief.md",
          "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
        },
        {
          "surfaceId": "chat-marketplace-template-submission-cloud-brief-2",
          "name": "Chat project overlay brief",
          "modality": "chat",
          "sourcePath": "canon-overlay/templates/surface-brief.md",
          "proof": "The same structure summarizes cleanly for agent/chat handoff."
        }
      ],
      "dependencies": [
        "template.canon-project-overlay-manifest",
        "template.canon-extension-intake",
        "policy.signal-decision-proof"
      ],
      "requiredEvidence": [
        "Source-adjacent implementation path.",
        "At least two surface proofs or client receipts.",
        "Accessibility, evidence, motion, and extension contract notes.",
        "Registry dependencies and modality list."
      ],
      "stopBeforeStable": [
        "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
      ],
      "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
      "reviewUri": "canon://overlays/intake/overlay.marketplace-template-submission-cloud",
      "candidateUri": "canon://overlays/candidates/overlay.marketplace-template-submission-cloud.surface-brief",
      "handoffUri": "canon://overlays/candidates/overlay.marketplace-template-submission-cloud.surface-brief/handoff",
      "promotionChecklist": [
        "Confirm a human maintainer approved opening Canon promotion work from this packet.",
        "Review the owning overlay manifest, source package, source path, surfaces, and proofs.",
        "Verify every required evidence item has current source or test coverage.",
        "Decide whether the candidate becomes a Canon registry item, template, adapter, token, policy, or remains project-local.",
        "Update Canon export path, docs, tests, MCP generated content, and compatibility notes before any stable promotion."
      ],
      "approvalBoundary": [
        "This packet is read-only and does not create Linear issues, mutate overlay manifests, or approve stable promotion.",
        "Open promotion work only after explicit human approval.",
        "Do not mark stable until every stop-before-stable item is resolved."
      ],
      "agentContract": {
        "purpose": "canon-overlay-candidate-review-packet",
        "primaryConsumers": [
          "codex",
          "mcp",
          "ltd-docs",
          "project-overlays"
        ],
        "useFor": [
          "turning a queued overlay candidate into a reviewable handoff",
          "checking candidate source evidence before implementation planning",
          "preparing a bounded promotion slice after human approval"
        ],
        "stopBefore": [
          "automatically opening Linear work from the packet",
          "automatically editing Canon registry or stable exports",
          "overriding stop-before-stable requirements"
        ]
      }
    },
    {
      "id": "canon-overlay-candidate-review:overlay.webflow-dashboard-cloud.surface-brief",
      "candidateId": "overlay.webflow-dashboard-cloud:overlay.webflow-dashboard-cloud.surface-brief",
      "title": "Surface Brief Template review packet",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
      "overlayId": "overlay.webflow-dashboard-cloud",
      "overlayName": "Webflow Dashboard Cloud Overlay",
      "manifestPath": "apps/webflow-dashboard-cloud/canon-overlay/manifest.ts",
      "intakeId": "overlay.webflow-dashboard-cloud.surface-brief",
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
      "tags": [
        "overlay",
        "brief",
        "surface",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "web-webflow-dashboard-cloud-brief-1",
          "name": "Web project overlay brief",
          "modality": "web",
          "sourcePath": "canon-overlay/templates/surface-brief.md",
          "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
        },
        {
          "surfaceId": "chat-webflow-dashboard-cloud-brief-2",
          "name": "Chat project overlay brief",
          "modality": "chat",
          "sourcePath": "canon-overlay/templates/surface-brief.md",
          "proof": "The same structure summarizes cleanly for agent/chat handoff."
        }
      ],
      "dependencies": [
        "template.canon-project-overlay-manifest",
        "template.canon-extension-intake",
        "policy.signal-decision-proof"
      ],
      "requiredEvidence": [
        "Source-adjacent implementation path.",
        "At least two surface proofs or client receipts.",
        "Accessibility, evidence, motion, and extension contract notes.",
        "Registry dependencies and modality list."
      ],
      "stopBeforeStable": [
        "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
      ],
      "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
      "reviewUri": "canon://overlays/intake/overlay.webflow-dashboard-cloud",
      "candidateUri": "canon://overlays/candidates/overlay.webflow-dashboard-cloud.surface-brief",
      "handoffUri": "canon://overlays/candidates/overlay.webflow-dashboard-cloud.surface-brief/handoff",
      "promotionChecklist": [
        "Confirm a human maintainer approved opening Canon promotion work from this packet.",
        "Review the owning overlay manifest, source package, source path, surfaces, and proofs.",
        "Verify every required evidence item has current source or test coverage.",
        "Decide whether the candidate becomes a Canon registry item, template, adapter, token, policy, or remains project-local.",
        "Update Canon export path, docs, tests, MCP generated content, and compatibility notes before any stable promotion."
      ],
      "approvalBoundary": [
        "This packet is read-only and does not create Linear issues, mutate overlay manifests, or approve stable promotion.",
        "Open promotion work only after explicit human approval.",
        "Do not mark stable until every stop-before-stable item is resolved."
      ],
      "agentContract": {
        "purpose": "canon-overlay-candidate-review-packet",
        "primaryConsumers": [
          "codex",
          "mcp",
          "ltd-docs",
          "project-overlays"
        ],
        "useFor": [
          "turning a queued overlay candidate into a reviewable handoff",
          "checking candidate source evidence before implementation planning",
          "preparing a bounded promotion slice after human approval"
        ],
        "stopBefore": [
          "automatically opening Linear work from the packet",
          "automatically editing Canon registry or stable exports",
          "overriding stop-before-stable requirements"
        ]
      }
    },
    {
      "id": "canon-overlay-candidate-review:overlay.webflow-marketplace-category-cloud.surface-brief",
      "candidateId": "overlay.webflow-marketplace-category-cloud:overlay.webflow-marketplace-category-cloud.surface-brief",
      "title": "Surface Brief Template review packet",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
      "overlayId": "overlay.webflow-marketplace-category-cloud",
      "overlayName": "Webflow Marketplace Category Cloud Overlay",
      "manifestPath": "apps/webflow-marketplace-category-cloud/canon-overlay/manifest.ts",
      "intakeId": "overlay.webflow-marketplace-category-cloud.surface-brief",
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
      "tags": [
        "overlay",
        "brief",
        "surface",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "web-webflow-marketplace-category-cloud-brief-1",
          "name": "Web project overlay brief",
          "modality": "web",
          "sourcePath": "canon-overlay/templates/surface-brief.md",
          "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
        },
        {
          "surfaceId": "chat-webflow-marketplace-category-cloud-brief-2",
          "name": "Chat project overlay brief",
          "modality": "chat",
          "sourcePath": "canon-overlay/templates/surface-brief.md",
          "proof": "The same structure summarizes cleanly for agent/chat handoff."
        }
      ],
      "dependencies": [
        "template.canon-project-overlay-manifest",
        "template.canon-extension-intake",
        "policy.signal-decision-proof"
      ],
      "requiredEvidence": [
        "Source-adjacent implementation path.",
        "At least two surface proofs or client receipts.",
        "Accessibility, evidence, motion, and extension contract notes.",
        "Registry dependencies and modality list."
      ],
      "stopBeforeStable": [
        "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
      ],
      "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
      "reviewUri": "canon://overlays/intake/overlay.webflow-marketplace-category-cloud",
      "candidateUri": "canon://overlays/candidates/overlay.webflow-marketplace-category-cloud.surface-brief",
      "handoffUri": "canon://overlays/candidates/overlay.webflow-marketplace-category-cloud.surface-brief/handoff",
      "promotionChecklist": [
        "Confirm a human maintainer approved opening Canon promotion work from this packet.",
        "Review the owning overlay manifest, source package, source path, surfaces, and proofs.",
        "Verify every required evidence item has current source or test coverage.",
        "Decide whether the candidate becomes a Canon registry item, template, adapter, token, policy, or remains project-local.",
        "Update Canon export path, docs, tests, MCP generated content, and compatibility notes before any stable promotion."
      ],
      "approvalBoundary": [
        "This packet is read-only and does not create Linear issues, mutate overlay manifests, or approve stable promotion.",
        "Open promotion work only after explicit human approval.",
        "Do not mark stable until every stop-before-stable item is resolved."
      ],
      "agentContract": {
        "purpose": "canon-overlay-candidate-review-packet",
        "primaryConsumers": [
          "codex",
          "mcp",
          "ltd-docs",
          "project-overlays"
        ],
        "useFor": [
          "turning a queued overlay candidate into a reviewable handoff",
          "checking candidate source evidence before implementation planning",
          "preparing a bounded promotion slice after human approval"
        ],
        "stopBefore": [
          "automatically opening Linear work from the packet",
          "automatically editing Canon registry or stable exports",
          "overriding stop-before-stable requirements"
        ]
      }
    },
    {
      "id": "canon-overlay-candidate-review:overlay.agency-atlas-public.workflow-proof-surface",
      "candidateId": "overlay.agency-atlas-public:overlay.agency-atlas-public.workflow-proof-surface",
      "title": "Agency public Atlas workflow proof surface review packet",
      "summary": "A candidate Canon pattern for turning a public web route, chat-assisted canvas, and booking handoff into one reusable workflow-proof surface without forking Atlas primitives.",
      "overlayId": "overlay.agency-atlas-public",
      "overlayName": "Agency Atlas Public Overlay",
      "manifestPath": "packages/agency/canon-overlay/manifest.ts",
      "intakeId": "overlay.agency-atlas-public.workflow-proof-surface",
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
      "tags": [
        "overlay",
        "atlas",
        "workflow-proof",
        "booking-handoff",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "agency-atlas-route",
          "name": "Public Atlas route",
          "modality": "web",
          "sourcePath": "src/routes/atlas/+page.svelte",
          "proof": "Route composes PerformancePageSection, PublicAtlasStoryCanvas, and PublicAtlasCanvas so the public page shows story, editable map, readiness, and booking context from one Canon Atlas graph contract."
        },
        {
          "surfaceId": "agency-atlas-agent-canvas",
          "name": "Public Atlas chat-assisted canvas",
          "modality": "chat",
          "sourcePath": "src/lib/components/PublicAtlasCanvas.svelte",
          "proof": "Canvas posts visitor prompts to /api/atlas/public-agent, enforces public Atlas intake limits, persists summary metadata, and keeps mutations bounded to the prospect map."
        },
        {
          "surfaceId": "agency-atlas-booking-context",
          "name": "Atlas booking handoff",
          "modality": "app",
          "sourcePath": "src/lib/components/PublicAtlasCanvas.svelte",
          "proof": "buildBookingUrl carries atlas_session_id, readiness, score, lane, intent, and message count into the booking flow as structured handoff context."
        },
        {
          "surfaceId": "agency-atlas-proof-routes",
          "name": "Agency proof route policy",
          "modality": "web",
          "sourcePath": "src/lib/atlas/surface-policy.ts",
          "proof": "AGENCY_ATLAS_PROOF_PATHS names /services, /atlas, /methodology, /stack, and product routes as public proof surfaces that share the overlay language."
        },
        {
          "surfaceId": "agency-atlas-voice-routing-summary",
          "name": "Agency Atlas voice routing summary",
          "modality": "voice",
          "sourcePath": "canon-overlay/copy-rules.md",
          "proof": "Voice copy is constrained to short declarative handoffs that name the owner, next step, proof, and durable record without exposing hidden reasoning or private system access."
        },
        {
          "surfaceId": "agency-atlas-glasses-routing-hud",
          "name": "Agency Atlas glasses routing HUD policy",
          "modality": "glasses",
          "sourcePath": "canon-overlay/surface-policy.md",
          "proof": "Glasses output is limited to glanceable state, owner, and next action while policy bodies, review history, and reasoning stay on larger Canon surfaces."
        }
      ],
      "dependencies": [
        "component.clear-page-section",
        "component.clear-proof-strip",
        "component.atlas-atlas-flow",
        "component.atlas-atlas-story-canvas",
        "adapter.atlas-graph-artifact",
        "template.atlas-development-handoff",
        "template.canon-project-overlay-manifest",
        "template.canon-extension-intake",
        "policy.signal-decision-proof"
      ],
      "requiredEvidence": [
        "Source-adjacent implementation path.",
        "At least two surface proofs or client receipts.",
        "Accessibility, evidence, motion, and extension contract notes.",
        "Registry dependencies and modality list."
      ],
      "stopBeforeStable": [
        "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
      ],
      "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
      "reviewUri": "canon://overlays/intake/overlay.agency-atlas-public",
      "candidateUri": "canon://overlays/candidates/overlay.agency-atlas-public.workflow-proof-surface",
      "handoffUri": "canon://overlays/candidates/overlay.agency-atlas-public.workflow-proof-surface/handoff",
      "promotionChecklist": [
        "Confirm a human maintainer approved opening Canon promotion work from this packet.",
        "Review the owning overlay manifest, source package, source path, surfaces, and proofs.",
        "Verify every required evidence item has current source or test coverage.",
        "Decide whether the candidate becomes a Canon registry item, template, adapter, token, policy, or remains project-local.",
        "Update Canon export path, docs, tests, MCP generated content, and compatibility notes before any stable promotion."
      ],
      "approvalBoundary": [
        "This packet is read-only and does not create Linear issues, mutate overlay manifests, or approve stable promotion.",
        "Open promotion work only after explicit human approval.",
        "Do not mark stable until every stop-before-stable item is resolved."
      ],
      "agentContract": {
        "purpose": "canon-overlay-candidate-review-packet",
        "primaryConsumers": [
          "codex",
          "mcp",
          "ltd-docs",
          "project-overlays"
        ],
        "useFor": [
          "turning a queued overlay candidate into a reviewable handoff",
          "checking candidate source evidence before implementation planning",
          "preparing a bounded promotion slice after human approval"
        ],
        "stopBefore": [
          "automatically opening Linear work from the packet",
          "automatically editing Canon registry or stable exports",
          "overriding stop-before-stable requirements"
        ]
      }
    },
    {
      "id": "canon-overlay-candidate-review:overlay.jandjhomehealth.surface-brief",
      "candidateId": "overlay.jandjhomehealth:overlay.jandjhomehealth.surface-brief",
      "title": "Surface Brief Template review packet",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
      "overlayId": "overlay.jandjhomehealth",
      "overlayName": "J&J Home Health Client Overlay",
      "manifestPath": "packages/agency/clients/jandjhomehealth/canon-overlay/manifest.ts",
      "intakeId": "overlay.jandjhomehealth.surface-brief",
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
      "tags": [
        "overlay",
        "brief",
        "surface",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "web-jandjhomehealth-brief-1",
          "name": "Web project overlay brief",
          "modality": "web",
          "sourcePath": "canon-overlay/templates/surface-brief.md",
          "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
        },
        {
          "surfaceId": "chat-jandjhomehealth-brief-2",
          "name": "Chat project overlay brief",
          "modality": "chat",
          "sourcePath": "canon-overlay/templates/surface-brief.md",
          "proof": "The same structure summarizes cleanly for agent/chat handoff."
        }
      ],
      "dependencies": [
        "template.canon-project-overlay-manifest",
        "template.canon-extension-intake",
        "policy.signal-decision-proof"
      ],
      "requiredEvidence": [
        "Source-adjacent implementation path.",
        "At least two surface proofs or client receipts.",
        "Accessibility, evidence, motion, and extension contract notes.",
        "Registry dependencies and modality list."
      ],
      "stopBeforeStable": [
        "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
      ],
      "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
      "reviewUri": "canon://overlays/intake/overlay.jandjhomehealth",
      "candidateUri": "canon://overlays/candidates/overlay.jandjhomehealth.surface-brief",
      "handoffUri": "canon://overlays/candidates/overlay.jandjhomehealth.surface-brief/handoff",
      "promotionChecklist": [
        "Confirm a human maintainer approved opening Canon promotion work from this packet.",
        "Review the owning overlay manifest, source package, source path, surfaces, and proofs.",
        "Verify every required evidence item has current source or test coverage.",
        "Decide whether the candidate becomes a Canon registry item, template, adapter, token, policy, or remains project-local.",
        "Update Canon export path, docs, tests, MCP generated content, and compatibility notes before any stable promotion."
      ],
      "approvalBoundary": [
        "This packet is read-only and does not create Linear issues, mutate overlay manifests, or approve stable promotion.",
        "Open promotion work only after explicit human approval.",
        "Do not mark stable until every stop-before-stable item is resolved."
      ],
      "agentContract": {
        "purpose": "canon-overlay-candidate-review-packet",
        "primaryConsumers": [
          "codex",
          "mcp",
          "ltd-docs",
          "project-overlays"
        ],
        "useFor": [
          "turning a queued overlay candidate into a reviewable handoff",
          "checking candidate source evidence before implementation planning",
          "preparing a bounded promotion slice after human approval"
        ],
        "stopBefore": [
          "automatically opening Linear work from the packet",
          "automatically editing Canon registry or stable exports",
          "overriding stop-before-stable requirements"
        ]
      }
    },
    {
      "id": "canon-overlay-candidate-review:overlay.outerfields.surface-brief",
      "candidateId": "overlay.outerfields:overlay.outerfields.surface-brief",
      "title": "Surface Brief Template review packet",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
      "overlayId": "overlay.outerfields",
      "overlayName": "Outerfields Client Overlay",
      "manifestPath": "packages/agency/clients/outerfields/canon-overlay/manifest.ts",
      "intakeId": "overlay.outerfields.surface-brief",
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
      "tags": [
        "overlay",
        "brief",
        "surface",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "web-outerfields-brief-1",
          "name": "Web project overlay brief",
          "modality": "web",
          "sourcePath": "canon-overlay/templates/surface-brief.md",
          "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
        },
        {
          "surfaceId": "chat-outerfields-brief-2",
          "name": "Chat project overlay brief",
          "modality": "chat",
          "sourcePath": "canon-overlay/templates/surface-brief.md",
          "proof": "The same structure summarizes cleanly for agent/chat handoff."
        }
      ],
      "dependencies": [
        "template.canon-project-overlay-manifest",
        "template.canon-extension-intake",
        "policy.signal-decision-proof"
      ],
      "requiredEvidence": [
        "Source-adjacent implementation path.",
        "At least two surface proofs or client receipts.",
        "Accessibility, evidence, motion, and extension contract notes.",
        "Registry dependencies and modality list."
      ],
      "stopBeforeStable": [
        "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
      ],
      "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
      "reviewUri": "canon://overlays/intake/overlay.outerfields",
      "candidateUri": "canon://overlays/candidates/overlay.outerfields.surface-brief",
      "handoffUri": "canon://overlays/candidates/overlay.outerfields.surface-brief/handoff",
      "promotionChecklist": [
        "Confirm a human maintainer approved opening Canon promotion work from this packet.",
        "Review the owning overlay manifest, source package, source path, surfaces, and proofs.",
        "Verify every required evidence item has current source or test coverage.",
        "Decide whether the candidate becomes a Canon registry item, template, adapter, token, policy, or remains project-local.",
        "Update Canon export path, docs, tests, MCP generated content, and compatibility notes before any stable promotion."
      ],
      "approvalBoundary": [
        "This packet is read-only and does not create Linear issues, mutate overlay manifests, or approve stable promotion.",
        "Open promotion work only after explicit human approval.",
        "Do not mark stable until every stop-before-stable item is resolved."
      ],
      "agentContract": {
        "purpose": "canon-overlay-candidate-review-packet",
        "primaryConsumers": [
          "codex",
          "mcp",
          "ltd-docs",
          "project-overlays"
        ],
        "useFor": [
          "turning a queued overlay candidate into a reviewable handoff",
          "checking candidate source evidence before implementation planning",
          "preparing a bounded promotion slice after human approval"
        ],
        "stopBefore": [
          "automatically opening Linear work from the packet",
          "automatically editing Canon registry or stable exports",
          "overriding stop-before-stable requirements"
        ]
      }
    },
    {
      "id": "canon-overlay-candidate-review:overlay.the-stack.surface-brief",
      "candidateId": "overlay.the-stack:overlay.the-stack.surface-brief",
      "title": "Surface Brief Template review packet",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
      "overlayId": "overlay.the-stack",
      "overlayName": "The Stack Client Overlay",
      "manifestPath": "packages/agency/clients/the-stack/canon-overlay/manifest.ts",
      "intakeId": "overlay.the-stack.surface-brief",
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
      "tags": [
        "overlay",
        "brief",
        "surface",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "web-the-stack-brief-1",
          "name": "Web project overlay brief",
          "modality": "web",
          "sourcePath": "canon-overlay/templates/surface-brief.md",
          "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
        },
        {
          "surfaceId": "chat-the-stack-brief-2",
          "name": "Chat project overlay brief",
          "modality": "chat",
          "sourcePath": "canon-overlay/templates/surface-brief.md",
          "proof": "The same structure summarizes cleanly for agent/chat handoff."
        }
      ],
      "dependencies": [
        "template.canon-project-overlay-manifest",
        "template.canon-extension-intake",
        "policy.signal-decision-proof"
      ],
      "requiredEvidence": [
        "Source-adjacent implementation path.",
        "At least two surface proofs or client receipts.",
        "Accessibility, evidence, motion, and extension contract notes.",
        "Registry dependencies and modality list."
      ],
      "stopBeforeStable": [
        "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
      ],
      "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
      "reviewUri": "canon://overlays/intake/overlay.the-stack",
      "candidateUri": "canon://overlays/candidates/overlay.the-stack.surface-brief",
      "handoffUri": "canon://overlays/candidates/overlay.the-stack.surface-brief/handoff",
      "promotionChecklist": [
        "Confirm a human maintainer approved opening Canon promotion work from this packet.",
        "Review the owning overlay manifest, source package, source path, surfaces, and proofs.",
        "Verify every required evidence item has current source or test coverage.",
        "Decide whether the candidate becomes a Canon registry item, template, adapter, token, policy, or remains project-local.",
        "Update Canon export path, docs, tests, MCP generated content, and compatibility notes before any stable promotion."
      ],
      "approvalBoundary": [
        "This packet is read-only and does not create Linear issues, mutate overlay manifests, or approve stable promotion.",
        "Open promotion work only after explicit human approval.",
        "Do not mark stable until every stop-before-stable item is resolved."
      ],
      "agentContract": {
        "purpose": "canon-overlay-candidate-review-packet",
        "primaryConsumers": [
          "codex",
          "mcp",
          "ltd-docs",
          "project-overlays"
        ],
        "useFor": [
          "turning a queued overlay candidate into a reviewable handoff",
          "checking candidate source evidence before implementation planning",
          "preparing a bounded promotion slice after human approval"
        ],
        "stopBefore": [
          "automatically opening Linear work from the packet",
          "automatically editing Canon registry or stable exports",
          "overriding stop-before-stable requirements"
        ]
      }
    },
    {
      "id": "canon-overlay-candidate-review:overlay.clearway-conversion.surface-brief",
      "candidateId": "overlay.clearway-conversion:overlay.clearway-conversion.surface-brief",
      "title": "Conversion booking and embed surface review packet",
      "summary": "A candidate Canon conversion template for booking flows, developer embeds, admin receipts, and concise operator handoffs without turning Clearway-specific scheduling copy into Canon primitives.",
      "overlayId": "overlay.clearway-conversion",
      "overlayName": "Clearway Conversion Overlay",
      "manifestPath": "packages/clearway/canon-overlay/manifest.ts",
      "intakeId": "overlay.clearway-conversion.surface-brief",
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
      "tags": [
        "overlay",
        "clearway",
        "conversion",
        "booking",
        "docs",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "clearway-home",
          "name": "Clearway conversion home",
          "modality": "web",
          "sourcePath": "src/routes/+page.svelte",
          "proof": "The home route frames the conversion flow, proof, pricing, and next action for public visitors."
        },
        {
          "surfaceId": "clearway-embed",
          "name": "Developer embed surface",
          "modality": "chat",
          "sourcePath": "src/routes/embed/+page.svelte",
          "proof": "The embed route gives agents and implementers a durable widget target for summarizing integration state without scraping marketing copy."
        },
        {
          "surfaceId": "clearway-admin",
          "name": "Admin booking receipt surface",
          "modality": "app",
          "sourcePath": "src/routes/admin/+page.svelte",
          "proof": "The admin route is the operator-facing app surface for booking state, evidence, and follow-up work."
        },
        {
          "surfaceId": "clearway-booking-voice",
          "name": "Booking voice handoff policy",
          "modality": "voice",
          "sourcePath": "src/routes/book/+page.svelte",
          "proof": "The booking route supplies the short spoken conversion handoff: intent, available action, proof, owner, and next step."
        },
        {
          "surfaceId": "clearway-glance-state",
          "name": "Clearway glasses state policy",
          "modality": "glasses",
          "sourcePath": "canon-overlay/surface-policy.md",
          "proof": "The overlay policy keeps thin displays to booking state, owner, proof, and next action while controls stay on web/app."
        }
      ],
      "dependencies": [
        "component.clear-decision-panel",
        "component.clear-proof-strip",
        "template.canon-project-overlay-manifest",
        "template.canon-extension-intake",
        "policy.signal-decision-proof"
      ],
      "requiredEvidence": [
        "Source-adjacent implementation path.",
        "At least two surface proofs or client receipts.",
        "Accessibility, evidence, motion, and extension contract notes.",
        "Registry dependencies and modality list."
      ],
      "stopBeforeStable": [
        "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
      ],
      "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
      "reviewUri": "canon://overlays/intake/overlay.clearway-conversion",
      "candidateUri": "canon://overlays/candidates/overlay.clearway-conversion.surface-brief",
      "handoffUri": "canon://overlays/candidates/overlay.clearway-conversion.surface-brief/handoff",
      "promotionChecklist": [
        "Confirm a human maintainer approved opening Canon promotion work from this packet.",
        "Review the owning overlay manifest, source package, source path, surfaces, and proofs.",
        "Verify every required evidence item has current source or test coverage.",
        "Decide whether the candidate becomes a Canon registry item, template, adapter, token, policy, or remains project-local.",
        "Update Canon export path, docs, tests, MCP generated content, and compatibility notes before any stable promotion."
      ],
      "approvalBoundary": [
        "This packet is read-only and does not create Linear issues, mutate overlay manifests, or approve stable promotion.",
        "Open promotion work only after explicit human approval.",
        "Do not mark stable until every stop-before-stable item is resolved."
      ],
      "agentContract": {
        "purpose": "canon-overlay-candidate-review-packet",
        "primaryConsumers": [
          "codex",
          "mcp",
          "ltd-docs",
          "project-overlays"
        ],
        "useFor": [
          "turning a queued overlay candidate into a reviewable handoff",
          "checking candidate source evidence before implementation planning",
          "preparing a bounded promotion slice after human approval"
        ],
        "stopBefore": [
          "automatically opening Linear work from the packet",
          "automatically editing Canon registry or stable exports",
          "overriding stop-before-stable requirements"
        ]
      }
    },
    {
      "id": "canon-overlay-candidate-review:overlay.concierge-chat-staffing.surface-brief",
      "candidateId": "overlay.concierge-chat-staffing:overlay.concierge-chat-staffing.surface-brief",
      "title": "Staffing concierge chat surface review packet",
      "summary": "A candidate Canon concierge template for governed chat, staffing intake, job matching, profile receipts, and operator settings without promoting one staffing vertical into Canon stable.",
      "overlayId": "overlay.concierge-chat-staffing",
      "overlayName": "Concierge Chat Staffing Overlay",
      "manifestPath": "packages/concierge-chat/canon-overlay/manifest.ts",
      "intakeId": "overlay.concierge-chat-staffing.surface-brief",
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
      "tags": [
        "overlay",
        "concierge",
        "staffing",
        "chat",
        "jobs",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "concierge-home",
          "name": "Concierge staffing home",
          "modality": "web",
          "sourcePath": "src/routes/+page.svelte",
          "proof": "The home route introduces the staffing concierge surface and routes visitors to jobs, nurses, facilities, or chat."
        },
        {
          "surfaceId": "concierge-chat",
          "name": "Governed chat surface",
          "modality": "chat",
          "sourcePath": "src/routes/chat/+page.svelte",
          "proof": "The chat route is the primary conversation surface for progressive profiling, handoff cards, and proof-backed next steps."
        },
        {
          "surfaceId": "concierge-settings",
          "name": "Operator settings surface",
          "modality": "app",
          "sourcePath": "src/routes/settings/+page.svelte",
          "proof": "The settings route gives operators a local app surface for reviewing configuration and handoff state."
        },
        {
          "surfaceId": "concierge-jobs-voice",
          "name": "Jobs voice summary policy",
          "modality": "voice",
          "sourcePath": "src/routes/jobs/+page.svelte",
          "proof": "The jobs route supports short spoken summaries of role, location, fit, proof, and next action."
        },
        {
          "surfaceId": "concierge-glasses-handoff",
          "name": "Concierge glasses handoff policy",
          "modality": "glasses",
          "sourcePath": "canon-overlay/surface-policy.md",
          "proof": "The overlay policy keeps thin displays to candidate/facility state, owner, proof, and next action."
        }
      ],
      "dependencies": [
        "component.clear-decision-panel",
        "component.clear-proof-strip",
        "template.canon-project-overlay-manifest",
        "template.canon-extension-intake",
        "policy.signal-decision-proof"
      ],
      "requiredEvidence": [
        "Source-adjacent implementation path.",
        "At least two surface proofs or client receipts.",
        "Accessibility, evidence, motion, and extension contract notes.",
        "Registry dependencies and modality list."
      ],
      "stopBeforeStable": [
        "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
      ],
      "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
      "reviewUri": "canon://overlays/intake/overlay.concierge-chat-staffing",
      "candidateUri": "canon://overlays/candidates/overlay.concierge-chat-staffing.surface-brief",
      "handoffUri": "canon://overlays/candidates/overlay.concierge-chat-staffing.surface-brief/handoff",
      "promotionChecklist": [
        "Confirm a human maintainer approved opening Canon promotion work from this packet.",
        "Review the owning overlay manifest, source package, source path, surfaces, and proofs.",
        "Verify every required evidence item has current source or test coverage.",
        "Decide whether the candidate becomes a Canon registry item, template, adapter, token, policy, or remains project-local.",
        "Update Canon export path, docs, tests, MCP generated content, and compatibility notes before any stable promotion."
      ],
      "approvalBoundary": [
        "This packet is read-only and does not create Linear issues, mutate overlay manifests, or approve stable promotion.",
        "Open promotion work only after explicit human approval.",
        "Do not mark stable until every stop-before-stable item is resolved."
      ],
      "agentContract": {
        "purpose": "canon-overlay-candidate-review-packet",
        "primaryConsumers": [
          "codex",
          "mcp",
          "ltd-docs",
          "project-overlays"
        ],
        "useFor": [
          "turning a queued overlay candidate into a reviewable handoff",
          "checking candidate source evidence before implementation planning",
          "preparing a bounded promotion slice after human approval"
        ],
        "stopBefore": [
          "automatically opening Linear work from the packet",
          "automatically editing Canon registry or stable exports",
          "overriding stop-before-stable requirements"
        ]
      }
    },
    {
      "id": "canon-overlay-candidate-review:overlay.io-research-artifact.surface-brief",
      "candidateId": "overlay.io-research-artifact:overlay.io-research-artifact.surface-brief",
      "title": "Research artifact proof surface review packet",
      "summary": "A candidate Canon research-artifact template for publishing MCP papers, plugin references, visual summaries, and agent-readable source metadata without promoting one article's content into Canon stable.",
      "overlayId": "overlay.io-research-artifact",
      "overlayName": "IO Research Artifact Overlay",
      "manifestPath": "packages/io/canon-overlay/manifest.ts",
      "intakeId": "overlay.io-research-artifact.surface-brief",
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
      "tags": [
        "overlay",
        "research",
        "mcp",
        "artifact",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "io-papers-index",
          "name": "Research papers index",
          "modality": "web",
          "sourcePath": "src/routes/papers/+page.svelte",
          "proof": "The papers index exposes file-backed research artifacts through the shared property shell, Canon navigation, and artifact catalog metadata."
        },
        {
          "surfaceId": "io-paper-catalog",
          "name": "File-backed paper catalog",
          "modality": "chat",
          "sourcePath": "src/lib/config/fileBasedPapers.ts",
          "proof": "Checked-in paper metadata gives agents a durable source for title, summary, publication state, and routing without depending on rendered HTML."
        },
        {
          "surfaceId": "io-visual-communication-contract",
          "name": "Research visual communication contract",
          "modality": "app",
          "sourcePath": "src/lib/config/visualCommunication.ts",
          "proof": "The visual communication config binds ASCII, visual summaries, and generated image specs to research artifacts as operator-reviewable evidence."
        },
        {
          "surfaceId": "io-research-voice-summary",
          "name": "Research voice summary policy",
          "modality": "voice",
          "sourcePath": "canon-overlay/copy-rules.md",
          "proof": "The overlay copy rules constrain spoken research summaries to claim, source artifact, proof, and next reading/action rather than long paper bodies."
        },
        {
          "surfaceId": "io-research-glasses-brief",
          "name": "Research glasses brief policy",
          "modality": "glasses",
          "sourcePath": "canon-overlay/surface-policy.md",
          "proof": "The overlay surface policy keeps thin displays to artifact title, status, source, and next action while full papers and diagrams stay on web/app surfaces."
        }
      ],
      "dependencies": [
        "component.clear-proof-strip",
        "template.canon-project-overlay-manifest",
        "template.canon-extension-intake",
        "policy.signal-decision-proof"
      ],
      "requiredEvidence": [
        "Source-adjacent implementation path.",
        "At least two surface proofs or client receipts.",
        "Accessibility, evidence, motion, and extension contract notes.",
        "Registry dependencies and modality list."
      ],
      "stopBeforeStable": [
        "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
      ],
      "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
      "reviewUri": "canon://overlays/intake/overlay.io-research-artifact",
      "candidateUri": "canon://overlays/candidates/overlay.io-research-artifact.surface-brief",
      "handoffUri": "canon://overlays/candidates/overlay.io-research-artifact.surface-brief/handoff",
      "promotionChecklist": [
        "Confirm a human maintainer approved opening Canon promotion work from this packet.",
        "Review the owning overlay manifest, source package, source path, surfaces, and proofs.",
        "Verify every required evidence item has current source or test coverage.",
        "Decide whether the candidate becomes a Canon registry item, template, adapter, token, policy, or remains project-local.",
        "Update Canon export path, docs, tests, MCP generated content, and compatibility notes before any stable promotion."
      ],
      "approvalBoundary": [
        "This packet is read-only and does not create Linear issues, mutate overlay manifests, or approve stable promotion.",
        "Open promotion work only after explicit human approval.",
        "Do not mark stable until every stop-before-stable item is resolved."
      ],
      "agentContract": {
        "purpose": "canon-overlay-candidate-review-packet",
        "primaryConsumers": [
          "codex",
          "mcp",
          "ltd-docs",
          "project-overlays"
        ],
        "useFor": [
          "turning a queued overlay candidate into a reviewable handoff",
          "checking candidate source evidence before implementation planning",
          "preparing a bounded promotion slice after human approval"
        ],
        "stopBefore": [
          "automatically opening Linear work from the packet",
          "automatically editing Canon registry or stable exports",
          "overriding stop-before-stable requirements"
        ]
      }
    },
    {
      "id": "canon-overlay-candidate-review:overlay.lms-workflow-learning.lesson-proof-surface",
      "candidateId": "overlay.lms-workflow-learning:overlay.lms-workflow-learning.lesson-proof-surface",
      "title": "Workflow learning proof surface review packet",
      "summary": "A candidate Canon learning template for teaching workflow proof across lesson content, path navigation, progress receipts, and event telemetry without promoting one course's copy into Canon stable.",
      "overlayId": "overlay.lms-workflow-learning",
      "overlayName": "LMS Workflow Learning Overlay",
      "manifestPath": "packages/lms/canon-overlay/manifest.ts",
      "intakeId": "overlay.lms-workflow-learning.lesson-proof-surface",
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
      "tags": [
        "overlay",
        "learning",
        "workflow-proof",
        "receipt",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "lms-workflow-proof-lesson",
          "name": "Workflow proof lesson content",
          "modality": "web",
          "sourcePath": "src/lib/content/lessons/make-your-workflow-visible/what-images-prove.md",
          "proof": "Lesson teaches the Canon image rule and asks operators to name object, state, proof, and owner before using a workflow image."
        },
        {
          "surfaceId": "lms-workflow-path-page",
          "name": "Make Your Workflow Visible path page",
          "modality": "web",
          "sourcePath": "src/routes/paths/[id]/+page.svelte",
          "proof": "Path page renders the Canon workflow-visibility lesson sequence from PATHS, linking each lesson into a reusable operator learning flow."
        },
        {
          "surfaceId": "lms-progress-receipt",
          "name": "Learning progress receipt",
          "modality": "app",
          "sourcePath": "src/routes/progress/+page.svelte",
          "proof": "Progress surface shows paths completed, lessons completed, overall progress, and time learning so the workflow-learning overlay has an operational receipt."
        },
        {
          "surfaceId": "lms-learning-event-api",
          "name": "Learning event handoff API",
          "modality": "chat",
          "sourcePath": "src/routes/api/events/+server.ts",
          "proof": "Authenticated event API records property, event type, and metadata from CREATE SOMETHING properties, giving chat/agent handoffs a durable learning event channel."
        },
        {
          "surfaceId": "lms-learning-voice-coach",
          "name": "Learning voice coach policy",
          "modality": "voice",
          "sourcePath": "canon-overlay/copy-rules.md",
          "proof": "Overlay copy rules constrain spoken learning guidance to path, lesson, object, state, proof, owner, and next exercise instead of reading full lesson content."
        },
        {
          "surfaceId": "lms-learning-glasses-progress",
          "name": "Learning glasses progress policy",
          "modality": "glasses",
          "sourcePath": "canon-overlay/surface-policy.md",
          "proof": "Overlay surface policy keeps thin displays to current path, lesson state, progress receipt, owner, and next action while lesson bodies stay on web/app surfaces."
        }
      ],
      "dependencies": [
        "component.clear-proof-strip",
        "template.canon-project-overlay-manifest",
        "template.canon-project-overlay-template-pack",
        "template.canon-extension-intake",
        "policy.signal-decision-proof"
      ],
      "requiredEvidence": [
        "Source-adjacent implementation path.",
        "At least two surface proofs or client receipts.",
        "Accessibility, evidence, motion, and extension contract notes.",
        "Registry dependencies and modality list."
      ],
      "stopBeforeStable": [
        "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
      ],
      "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
      "reviewUri": "canon://overlays/intake/overlay.lms-workflow-learning",
      "candidateUri": "canon://overlays/candidates/overlay.lms-workflow-learning.lesson-proof-surface",
      "handoffUri": "canon://overlays/candidates/overlay.lms-workflow-learning.lesson-proof-surface/handoff",
      "promotionChecklist": [
        "Confirm a human maintainer approved opening Canon promotion work from this packet.",
        "Review the owning overlay manifest, source package, source path, surfaces, and proofs.",
        "Verify every required evidence item has current source or test coverage.",
        "Decide whether the candidate becomes a Canon registry item, template, adapter, token, policy, or remains project-local.",
        "Update Canon export path, docs, tests, MCP generated content, and compatibility notes before any stable promotion."
      ],
      "approvalBoundary": [
        "This packet is read-only and does not create Linear issues, mutate overlay manifests, or approve stable promotion.",
        "Open promotion work only after explicit human approval.",
        "Do not mark stable until every stop-before-stable item is resolved."
      ],
      "agentContract": {
        "purpose": "canon-overlay-candidate-review-packet",
        "primaryConsumers": [
          "codex",
          "mcp",
          "ltd-docs",
          "project-overlays"
        ],
        "useFor": [
          "turning a queued overlay candidate into a reviewable handoff",
          "checking candidate source evidence before implementation planning",
          "preparing a bounded promotion slice after human approval"
        ],
        "stopBefore": [
          "automatically opening Linear work from the packet",
          "automatically editing Canon registry or stable exports",
          "overriding stop-before-stable requirements"
        ]
      }
    },
    {
      "id": "canon-overlay-candidate-review:overlay.ltd-canon-philosophy.surface-brief",
      "candidateId": "overlay.ltd-canon-philosophy:overlay.ltd-canon-philosophy.surface-brief",
      "title": "Canon philosophy documentation surface review packet",
      "summary": "A candidate Canon documentation template for turning philosophy, standards, voice, and live Canon docs into one reusable cross-property foundation surface without forking Canon primitives.",
      "overlayId": "overlay.ltd-canon-philosophy",
      "overlayName": "LTD Canon Philosophy Overlay",
      "manifestPath": "packages/ltd/canon-overlay/manifest.ts",
      "intakeId": "overlay.ltd-canon-philosophy.surface-brief",
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
      "tags": [
        "overlay",
        "canon-docs",
        "philosophy",
        "standards",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "ltd-canon-docs-route",
          "name": "Canon documentation route",
          "modality": "web",
          "sourcePath": "src/routes/canon/+page.svelte",
          "proof": "The Canon route publishes foundations, components, patterns, resources, and contribution paths from the property-owned Canon documentation tree."
        },
        {
          "surfaceId": "ltd-canon-content-loader",
          "name": "Canon content loader",
          "modality": "chat",
          "sourcePath": "src/lib/content-loader.ts",
          "proof": "The content loader turns checked-in Canon markdown into structured page metadata that agents can summarize without scraping route markup."
        },
        {
          "surfaceId": "ltd-standards-checklist",
          "name": "Canon standards checklist",
          "modality": "app",
          "sourcePath": "src/routes/standards/+page.svelte",
          "proof": "The standards route gives operators a usable decision surface for Clear Communication UI, token usage, spacing, motion, accessibility, and proof before shipping."
        },
        {
          "surfaceId": "ltd-voice-guidance",
          "name": "Canon voice guidance",
          "modality": "voice",
          "sourcePath": "src/routes/voice/+page.svelte",
          "proof": "The voice route defines the words, phrases, and forbidden patterns that keep spoken or summarized Canon guidance concise and consistent."
        },
        {
          "surfaceId": "ltd-thin-canon-navigation-policy",
          "name": "Thin Canon navigation policy",
          "modality": "glasses",
          "sourcePath": "canon-overlay/surface-policy.md",
          "proof": "The overlay policy keeps thin displays to route, state, owner, and next action while full philosophy and standards stay in the Canon docs route."
        }
      ],
      "dependencies": [
        "component.clear-decision-panel",
        "component.clear-proof-strip",
        "template.canon-project-overlay-manifest",
        "template.canon-extension-intake",
        "policy.signal-decision-proof"
      ],
      "requiredEvidence": [
        "Source-adjacent implementation path.",
        "At least two surface proofs or client receipts.",
        "Accessibility, evidence, motion, and extension contract notes.",
        "Registry dependencies and modality list."
      ],
      "stopBeforeStable": [
        "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
      ],
      "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
      "reviewUri": "canon://overlays/intake/overlay.ltd-canon-philosophy",
      "candidateUri": "canon://overlays/candidates/overlay.ltd-canon-philosophy.surface-brief",
      "handoffUri": "canon://overlays/candidates/overlay.ltd-canon-philosophy.surface-brief/handoff",
      "promotionChecklist": [
        "Confirm a human maintainer approved opening Canon promotion work from this packet.",
        "Review the owning overlay manifest, source package, source path, surfaces, and proofs.",
        "Verify every required evidence item has current source or test coverage.",
        "Decide whether the candidate becomes a Canon registry item, template, adapter, token, policy, or remains project-local.",
        "Update Canon export path, docs, tests, MCP generated content, and compatibility notes before any stable promotion."
      ],
      "approvalBoundary": [
        "This packet is read-only and does not create Linear issues, mutate overlay manifests, or approve stable promotion.",
        "Open promotion work only after explicit human approval.",
        "Do not mark stable until every stop-before-stable item is resolved."
      ],
      "agentContract": {
        "purpose": "canon-overlay-candidate-review-packet",
        "primaryConsumers": [
          "codex",
          "mcp",
          "ltd-docs",
          "project-overlays"
        ],
        "useFor": [
          "turning a queued overlay candidate into a reviewable handoff",
          "checking candidate source evidence before implementation planning",
          "preparing a bounded promotion slice after human approval"
        ],
        "stopBefore": [
          "automatically opening Linear work from the packet",
          "automatically editing Canon registry or stable exports",
          "overriding stop-before-stable requirements"
        ]
      }
    },
    {
      "id": "canon-overlay-candidate-review:overlay.maverick-admin.surface-brief",
      "candidateId": "overlay.maverick-admin:overlay.maverick-admin.surface-brief",
      "title": "Surface Brief Template review packet",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
      "overlayId": "overlay.maverick-admin",
      "overlayName": "Maverick Admin Overlay",
      "manifestPath": "packages/maverick-admin/canon-overlay/manifest.ts",
      "intakeId": "overlay.maverick-admin.surface-brief",
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
      "tags": [
        "overlay",
        "brief",
        "surface",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "web-maverick-admin-brief-1",
          "name": "Web project overlay brief",
          "modality": "web",
          "sourcePath": "canon-overlay/templates/surface-brief.md",
          "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
        },
        {
          "surfaceId": "chat-maverick-admin-brief-2",
          "name": "Chat project overlay brief",
          "modality": "chat",
          "sourcePath": "canon-overlay/templates/surface-brief.md",
          "proof": "The same structure summarizes cleanly for agent/chat handoff."
        }
      ],
      "dependencies": [
        "template.canon-project-overlay-manifest",
        "template.canon-extension-intake",
        "policy.signal-decision-proof"
      ],
      "requiredEvidence": [
        "Source-adjacent implementation path.",
        "At least two surface proofs or client receipts.",
        "Accessibility, evidence, motion, and extension contract notes.",
        "Registry dependencies and modality list."
      ],
      "stopBeforeStable": [
        "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
      ],
      "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
      "reviewUri": "canon://overlays/intake/overlay.maverick-admin",
      "candidateUri": "canon://overlays/candidates/overlay.maverick-admin.surface-brief",
      "handoffUri": "canon://overlays/candidates/overlay.maverick-admin.surface-brief/handoff",
      "promotionChecklist": [
        "Confirm a human maintainer approved opening Canon promotion work from this packet.",
        "Review the owning overlay manifest, source package, source path, surfaces, and proofs.",
        "Verify every required evidence item has current source or test coverage.",
        "Decide whether the candidate becomes a Canon registry item, template, adapter, token, policy, or remains project-local.",
        "Update Canon export path, docs, tests, MCP generated content, and compatibility notes before any stable promotion."
      ],
      "approvalBoundary": [
        "This packet is read-only and does not create Linear issues, mutate overlay manifests, or approve stable promotion.",
        "Open promotion work only after explicit human approval.",
        "Do not mark stable until every stop-before-stable item is resolved."
      ],
      "agentContract": {
        "purpose": "canon-overlay-candidate-review-packet",
        "primaryConsumers": [
          "codex",
          "mcp",
          "ltd-docs",
          "project-overlays"
        ],
        "useFor": [
          "turning a queued overlay candidate into a reviewable handoff",
          "checking candidate source evidence before implementation planning",
          "preparing a bounded promotion slice after human approval"
        ],
        "stopBefore": [
          "automatically opening Linear work from the packet",
          "automatically editing Canon registry or stable exports",
          "overriding stop-before-stable requirements"
        ]
      }
    },
    {
      "id": "canon-overlay-candidate-review:overlay.maverick-industry.surface-brief",
      "candidateId": "overlay.maverick-industry:overlay.maverick-industry.surface-brief",
      "title": "Industry service proof surface review packet",
      "summary": "A candidate Canon industry-service template for public sector pages, product proof, news context, and concise sales handoffs without promoting Maverick-specific claims into Canon.",
      "overlayId": "overlay.maverick-industry",
      "overlayName": "Maverick Industry Overlay",
      "manifestPath": "packages/maverick/canon-overlay/manifest.ts",
      "intakeId": "overlay.maverick-industry.surface-brief",
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
      "tags": [
        "overlay",
        "maverick",
        "industry",
        "energy",
        "services",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "maverick-home",
          "name": "Maverick public home",
          "modality": "web",
          "sourcePath": "src/routes/+page.svelte",
          "proof": "The home route presents the public industry story and routes visitors to sector-specific proof."
        },
        {
          "surfaceId": "maverick-news",
          "name": "Industry news context",
          "modality": "chat",
          "sourcePath": "src/routes/news/+page.svelte",
          "proof": "The news route gives agents a bounded source for current context and public claims."
        },
        {
          "surfaceId": "maverick-oil-gas",
          "name": "Oil and gas service surface",
          "modality": "app",
          "sourcePath": "src/routes/oil-gas/+page.svelte",
          "proof": "The oil and gas route acts as a focused service surface with offer, proof, and next action."
        },
        {
          "surfaceId": "maverick-water-voice",
          "name": "Water treatment voice handoff",
          "modality": "voice",
          "sourcePath": "src/routes/water-treatment/+page.svelte",
          "proof": "The water-treatment route supports concise spoken summaries of sector, problem, proof, and next action."
        },
        {
          "surfaceId": "maverick-glasses-proof",
          "name": "Maverick glasses proof policy",
          "modality": "glasses",
          "sourcePath": "canon-overlay/surface-policy.md",
          "proof": "The overlay policy keeps thin displays to sector, status, proof, owner, and next action."
        }
      ],
      "dependencies": [
        "component.clear-decision-panel",
        "component.clear-proof-strip",
        "template.canon-project-overlay-manifest",
        "template.canon-extension-intake",
        "policy.signal-decision-proof"
      ],
      "requiredEvidence": [
        "Source-adjacent implementation path.",
        "At least two surface proofs or client receipts.",
        "Accessibility, evidence, motion, and extension contract notes.",
        "Registry dependencies and modality list."
      ],
      "stopBeforeStable": [
        "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
      ],
      "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
      "reviewUri": "canon://overlays/intake/overlay.maverick-industry",
      "candidateUri": "canon://overlays/candidates/overlay.maverick-industry.surface-brief",
      "handoffUri": "canon://overlays/candidates/overlay.maverick-industry.surface-brief/handoff",
      "promotionChecklist": [
        "Confirm a human maintainer approved opening Canon promotion work from this packet.",
        "Review the owning overlay manifest, source package, source path, surfaces, and proofs.",
        "Verify every required evidence item has current source or test coverage.",
        "Decide whether the candidate becomes a Canon registry item, template, adapter, token, policy, or remains project-local.",
        "Update Canon export path, docs, tests, MCP generated content, and compatibility notes before any stable promotion."
      ],
      "approvalBoundary": [
        "This packet is read-only and does not create Linear issues, mutate overlay manifests, or approve stable promotion.",
        "Open promotion work only after explicit human approval.",
        "Do not mark stable until every stop-before-stable item is resolved."
      ],
      "agentContract": {
        "purpose": "canon-overlay-candidate-review-packet",
        "primaryConsumers": [
          "codex",
          "mcp",
          "ltd-docs",
          "project-overlays"
        ],
        "useFor": [
          "turning a queued overlay candidate into a reviewable handoff",
          "checking candidate source evidence before implementation planning",
          "preparing a bounded promotion slice after human approval"
        ],
        "stopBefore": [
          "automatically opening Linear work from the packet",
          "automatically editing Canon registry or stable exports",
          "overriding stop-before-stable requirements"
        ]
      }
    },
    {
      "id": "canon-overlay-candidate-review:overlay.notion-agent-workspace.surface-brief",
      "candidateId": "overlay.notion-agent-workspace:overlay.notion-agent-workspace.surface-brief",
      "title": "Notion agent workspace surface review packet",
      "summary": "A candidate Canon workspace-agent template for OAuth entry, dashboard review, execution APIs, and compact operator handoffs without promoting Notion-specific tool details into Canon.",
      "overlayId": "overlay.notion-agent-workspace",
      "overlayName": "Notion Agent Workspace Overlay",
      "manifestPath": "packages/notion-agent/canon-overlay/manifest.ts",
      "intakeId": "overlay.notion-agent-workspace.surface-brief",
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
      "tags": [
        "overlay",
        "notion",
        "agents",
        "workspace",
        "dashboard",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "notion-agent-home",
          "name": "Notion agent public home",
          "modality": "web",
          "sourcePath": "src/routes/+page.svelte",
          "proof": "The home route explains the Notion agent offer and directs operators toward the authenticated workspace flow."
        },
        {
          "surfaceId": "notion-agent-execute-api",
          "name": "Agent execution handoff API",
          "modality": "chat",
          "sourcePath": "src/routes/api/execute/+server.ts",
          "proof": "The execution API gives chat/agent handoffs a durable source for action, result, and receipt state."
        },
        {
          "surfaceId": "notion-agent-dashboard",
          "name": "Workspace dashboard",
          "modality": "app",
          "sourcePath": "src/routes/dashboard/+page.svelte",
          "proof": "The dashboard route is the operator-facing app surface for agent state and workspace receipts."
        },
        {
          "surfaceId": "notion-agent-voice-policy",
          "name": "Workspace voice handoff policy",
          "modality": "voice",
          "sourcePath": "canon-overlay/copy-rules.md",
          "proof": "The copy rules constrain spoken summaries to workspace, action, proof, owner, and next step."
        },
        {
          "surfaceId": "notion-agent-glasses-policy",
          "name": "Workspace glasses state policy",
          "modality": "glasses",
          "sourcePath": "canon-overlay/surface-policy.md",
          "proof": "The surface policy keeps glasses output to workspace state, owner, proof, and next action."
        }
      ],
      "dependencies": [
        "component.clear-decision-panel",
        "component.clear-proof-strip",
        "template.canon-project-overlay-manifest",
        "template.canon-extension-intake",
        "policy.signal-decision-proof"
      ],
      "requiredEvidence": [
        "Source-adjacent implementation path.",
        "At least two surface proofs or client receipts.",
        "Accessibility, evidence, motion, and extension contract notes.",
        "Registry dependencies and modality list."
      ],
      "stopBeforeStable": [
        "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
      ],
      "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
      "reviewUri": "canon://overlays/intake/overlay.notion-agent-workspace",
      "candidateUri": "canon://overlays/candidates/overlay.notion-agent-workspace.surface-brief",
      "handoffUri": "canon://overlays/candidates/overlay.notion-agent-workspace.surface-brief/handoff",
      "promotionChecklist": [
        "Confirm a human maintainer approved opening Canon promotion work from this packet.",
        "Review the owning overlay manifest, source package, source path, surfaces, and proofs.",
        "Verify every required evidence item has current source or test coverage.",
        "Decide whether the candidate becomes a Canon registry item, template, adapter, token, policy, or remains project-local.",
        "Update Canon export path, docs, tests, MCP generated content, and compatibility notes before any stable promotion."
      ],
      "approvalBoundary": [
        "This packet is read-only and does not create Linear issues, mutate overlay manifests, or approve stable promotion.",
        "Open promotion work only after explicit human approval.",
        "Do not mark stable until every stop-before-stable item is resolved."
      ],
      "agentContract": {
        "purpose": "canon-overlay-candidate-review-packet",
        "primaryConsumers": [
          "codex",
          "mcp",
          "ltd-docs",
          "project-overlays"
        ],
        "useFor": [
          "turning a queued overlay candidate into a reviewable handoff",
          "checking candidate source evidence before implementation planning",
          "preparing a bounded promotion slice after human approval"
        ],
        "stopBefore": [
          "automatically opening Linear work from the packet",
          "automatically editing Canon registry or stable exports",
          "overriding stop-before-stable requirements"
        ]
      }
    },
    {
      "id": "canon-overlay-candidate-review:overlay.ona-agents.surface-brief",
      "candidateId": "overlay.ona-agents:overlay.ona-agents.surface-brief",
      "title": "Surface Brief Template review packet",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
      "overlayId": "overlay.ona-agents",
      "overlayName": "Ona Agents Overlay",
      "manifestPath": "packages/ona-agents/canon-overlay/manifest.ts",
      "intakeId": "overlay.ona-agents.surface-brief",
      "owner": "ona-team",
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
      "tags": [
        "overlay",
        "brief",
        "surface",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "web-ona-agents-brief-1",
          "name": "Web project overlay brief",
          "modality": "web",
          "sourcePath": "canon-overlay/templates/surface-brief.md",
          "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
        },
        {
          "surfaceId": "chat-ona-agents-brief-2",
          "name": "Chat project overlay brief",
          "modality": "chat",
          "sourcePath": "canon-overlay/templates/surface-brief.md",
          "proof": "The same structure summarizes cleanly for agent/chat handoff."
        }
      ],
      "dependencies": [
        "template.canon-project-overlay-manifest",
        "template.canon-extension-intake",
        "policy.signal-decision-proof"
      ],
      "requiredEvidence": [
        "Source-adjacent implementation path.",
        "At least two surface proofs or client receipts.",
        "Accessibility, evidence, motion, and extension contract notes.",
        "Registry dependencies and modality list."
      ],
      "stopBeforeStable": [
        "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
      ],
      "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
      "reviewUri": "canon://overlays/intake/overlay.ona-agents",
      "candidateUri": "canon://overlays/candidates/overlay.ona-agents.surface-brief",
      "handoffUri": "canon://overlays/candidates/overlay.ona-agents.surface-brief/handoff",
      "promotionChecklist": [
        "Confirm a human maintainer approved opening Canon promotion work from this packet.",
        "Review the owning overlay manifest, source package, source path, surfaces, and proofs.",
        "Verify every required evidence item has current source or test coverage.",
        "Decide whether the candidate becomes a Canon registry item, template, adapter, token, policy, or remains project-local.",
        "Update Canon export path, docs, tests, MCP generated content, and compatibility notes before any stable promotion."
      ],
      "approvalBoundary": [
        "This packet is read-only and does not create Linear issues, mutate overlay manifests, or approve stable promotion.",
        "Open promotion work only after explicit human approval.",
        "Do not mark stable until every stop-before-stable item is resolved."
      ],
      "agentContract": {
        "purpose": "canon-overlay-candidate-review-packet",
        "primaryConsumers": [
          "codex",
          "mcp",
          "ltd-docs",
          "project-overlays"
        ],
        "useFor": [
          "turning a queued overlay candidate into a reviewable handoff",
          "checking candidate source evidence before implementation planning",
          "preparing a bounded promotion slice after human approval"
        ],
        "stopBefore": [
          "automatically opening Linear work from the packet",
          "automatically editing Canon registry or stable exports",
          "overriding stop-before-stable requirements"
        ]
      }
    },
    {
      "id": "canon-overlay-candidate-review:overlay.relay.surface-brief",
      "candidateId": "overlay.relay:overlay.relay.surface-brief",
      "title": "Surface Brief Template review packet",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
      "overlayId": "overlay.relay",
      "overlayName": "Relay Control UI Overlay",
      "manifestPath": "packages/relay/canon-overlay/manifest.ts",
      "intakeId": "overlay.relay.surface-brief",
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
      "tags": [
        "overlay",
        "brief",
        "surface",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "web-relay-brief-1",
          "name": "Web project overlay brief",
          "modality": "web",
          "sourcePath": "canon-overlay/templates/surface-brief.md",
          "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
        },
        {
          "surfaceId": "chat-relay-brief-2",
          "name": "Chat project overlay brief",
          "modality": "chat",
          "sourcePath": "canon-overlay/templates/surface-brief.md",
          "proof": "The same structure summarizes cleanly for agent/chat handoff."
        }
      ],
      "dependencies": [
        "template.canon-project-overlay-manifest",
        "template.canon-extension-intake",
        "policy.signal-decision-proof"
      ],
      "requiredEvidence": [
        "Source-adjacent implementation path.",
        "At least two surface proofs or client receipts.",
        "Accessibility, evidence, motion, and extension contract notes.",
        "Registry dependencies and modality list."
      ],
      "stopBeforeStable": [
        "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
      ],
      "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
      "reviewUri": "canon://overlays/intake/overlay.relay",
      "candidateUri": "canon://overlays/candidates/overlay.relay.surface-brief",
      "handoffUri": "canon://overlays/candidates/overlay.relay.surface-brief/handoff",
      "promotionChecklist": [
        "Confirm a human maintainer approved opening Canon promotion work from this packet.",
        "Review the owning overlay manifest, source package, source path, surfaces, and proofs.",
        "Verify every required evidence item has current source or test coverage.",
        "Decide whether the candidate becomes a Canon registry item, template, adapter, token, policy, or remains project-local.",
        "Update Canon export path, docs, tests, MCP generated content, and compatibility notes before any stable promotion."
      ],
      "approvalBoundary": [
        "This packet is read-only and does not create Linear issues, mutate overlay manifests, or approve stable promotion.",
        "Open promotion work only after explicit human approval.",
        "Do not mark stable until every stop-before-stable item is resolved."
      ],
      "agentContract": {
        "purpose": "canon-overlay-candidate-review-packet",
        "primaryConsumers": [
          "codex",
          "mcp",
          "ltd-docs",
          "project-overlays"
        ],
        "useFor": [
          "turning a queued overlay candidate into a reviewable handoff",
          "checking candidate source evidence before implementation planning",
          "preparing a bounded promotion slice after human approval"
        ],
        "stopBefore": [
          "automatically opening Linear work from the packet",
          "automatically editing Canon registry or stable exports",
          "overriding stop-before-stable requirements"
        ]
      }
    },
    {
      "id": "canon-overlay-candidate-review:overlay.space-workbench.surface-brief",
      "candidateId": "overlay.space-workbench:overlay.space-workbench.surface-brief",
      "title": "Workbench tool proof surface review packet",
      "summary": "A candidate Canon workbench template for turning live tools, playgrounds, data dashboards, and operator receipts into reusable proof surfaces without forking Canon components.",
      "overlayId": "overlay.space-workbench",
      "overlayName": "Space Workbench Overlay",
      "manifestPath": "packages/space/canon-overlay/manifest.ts",
      "intakeId": "overlay.space-workbench.surface-brief",
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
      "tags": [
        "overlay",
        "workbench",
        "tool",
        "proof",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "space-workbench-home",
          "name": "Workbench home",
          "modality": "web",
          "sourcePath": "src/routes/+page.svelte",
          "proof": "The home route composes PerformancePageSection, PerformanceCardGrid, PerformanceProofStrip, PerformanceDecisionPanel, and PerformanceCtaBand into a live tool directory with proof and handoff states."
        },
        {
          "surfaceId": "space-tool-routing-data",
          "name": "Workbench routing data",
          "modality": "chat",
          "sourcePath": "src/lib/data/routing-experiments.json",
          "proof": "Routing experiment data gives agents structured tool state, notes, and evidence for summarizing live workbench choices."
        },
        {
          "surfaceId": "space-live-data-dashboard",
          "name": "Live data dashboard",
          "modality": "app",
          "sourcePath": "src/routes/data/+page.svelte",
          "proof": "The data route turns live datasets into an operator-facing app surface backed by Canon cards and route-level proof."
        },
        {
          "surfaceId": "space-workbench-voice-handoff",
          "name": "Workbench voice handoff policy",
          "modality": "voice",
          "sourcePath": "canon-overlay/copy-rules.md",
          "proof": "The overlay copy rules constrain spoken tool handoffs to tool, state, required input, proof, and next action."
        },
        {
          "surfaceId": "space-workbench-glasses-state",
          "name": "Workbench glasses state policy",
          "modality": "glasses",
          "sourcePath": "canon-overlay/surface-policy.md",
          "proof": "The overlay surface policy keeps glasses output to tool status, owner, next action, and receipt while live controls stay on larger workbench surfaces."
        }
      ],
      "dependencies": [
        "component.clear-decision-panel",
        "template.canon-project-overlay-manifest",
        "template.canon-extension-intake",
        "policy.signal-decision-proof"
      ],
      "requiredEvidence": [
        "Source-adjacent implementation path.",
        "At least two surface proofs or client receipts.",
        "Accessibility, evidence, motion, and extension contract notes.",
        "Registry dependencies and modality list."
      ],
      "stopBeforeStable": [
        "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
      ],
      "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
      "reviewUri": "canon://overlays/intake/overlay.space-workbench",
      "candidateUri": "canon://overlays/candidates/overlay.space-workbench.surface-brief",
      "handoffUri": "canon://overlays/candidates/overlay.space-workbench.surface-brief/handoff",
      "promotionChecklist": [
        "Confirm a human maintainer approved opening Canon promotion work from this packet.",
        "Review the owning overlay manifest, source package, source path, surfaces, and proofs.",
        "Verify every required evidence item has current source or test coverage.",
        "Decide whether the candidate becomes a Canon registry item, template, adapter, token, policy, or remains project-local.",
        "Update Canon export path, docs, tests, MCP generated content, and compatibility notes before any stable promotion."
      ],
      "approvalBoundary": [
        "This packet is read-only and does not create Linear issues, mutate overlay manifests, or approve stable promotion.",
        "Open promotion work only after explicit human approval.",
        "Do not mark stable until every stop-before-stable item is resolved."
      ],
      "agentContract": {
        "purpose": "canon-overlay-candidate-review-packet",
        "primaryConsumers": [
          "codex",
          "mcp",
          "ltd-docs",
          "project-overlays"
        ],
        "useFor": [
          "turning a queued overlay candidate into a reviewable handoff",
          "checking candidate source evidence before implementation planning",
          "preparing a bounded promotion slice after human approval"
        ],
        "stopBefore": [
          "automatically opening Linear work from the packet",
          "automatically editing Canon registry or stable exports",
          "overriding stop-before-stable requirements"
        ]
      }
    },
    {
      "id": "canon-overlay-candidate-review:overlay.spritz-reading.surface-brief",
      "candidateId": "overlay.spritz-reading:overlay.spritz-reading.surface-brief",
      "title": "Reading component proof surface review packet",
      "summary": "A candidate Canon component-demo template for interactive reading controls, component API evidence, and compact preview handoffs without making Spritz behavior a Canon primitive.",
      "overlayId": "overlay.spritz-reading",
      "overlayName": "Spritz Reading Overlay",
      "manifestPath": "packages/spritz/canon-overlay/manifest.ts",
      "intakeId": "overlay.spritz-reading.surface-brief",
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
      "tags": [
        "overlay",
        "spritz",
        "reading",
        "component",
        "demo",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "spritz-demo",
          "name": "Spritz demo route",
          "modality": "web",
          "sourcePath": "src/routes/+page.svelte",
          "proof": "The demo route renders the interactive reading component and its visitor-facing proof."
        },
        {
          "surfaceId": "spritz-component-api",
          "name": "Spritz component API",
          "modality": "chat",
          "sourcePath": "src/lib/index.ts",
          "proof": "The library entry gives agents a stable source for exports and integration summaries."
        },
        {
          "surfaceId": "spritz-component",
          "name": "Spritz component implementation",
          "modality": "app",
          "sourcePath": "src/lib/Spritz.svelte",
          "proof": "The component implementation is the app-level control surface for reading state and interaction behavior."
        },
        {
          "surfaceId": "spritz-voice-policy",
          "name": "Spritz voice preview policy",
          "modality": "voice",
          "sourcePath": "canon-overlay/copy-rules.md",
          "proof": "The copy rules constrain spoken previews to reading state, speed, proof, and next action."
        },
        {
          "surfaceId": "spritz-glasses-policy",
          "name": "Spritz glasses preview policy",
          "modality": "glasses",
          "sourcePath": "canon-overlay/surface-policy.md",
          "proof": "The surface policy keeps thin displays to current word/state, speed, and next action."
        }
      ],
      "dependencies": [
        "component.clear-decision-panel",
        "component.clear-proof-strip",
        "template.canon-project-overlay-manifest",
        "template.canon-extension-intake",
        "policy.signal-decision-proof"
      ],
      "requiredEvidence": [
        "Source-adjacent implementation path.",
        "At least two surface proofs or client receipts.",
        "Accessibility, evidence, motion, and extension contract notes.",
        "Registry dependencies and modality list."
      ],
      "stopBeforeStable": [
        "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
      ],
      "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
      "reviewUri": "canon://overlays/intake/overlay.spritz-reading",
      "candidateUri": "canon://overlays/candidates/overlay.spritz-reading.surface-brief",
      "handoffUri": "canon://overlays/candidates/overlay.spritz-reading.surface-brief/handoff",
      "promotionChecklist": [
        "Confirm a human maintainer approved opening Canon promotion work from this packet.",
        "Review the owning overlay manifest, source package, source path, surfaces, and proofs.",
        "Verify every required evidence item has current source or test coverage.",
        "Decide whether the candidate becomes a Canon registry item, template, adapter, token, policy, or remains project-local.",
        "Update Canon export path, docs, tests, MCP generated content, and compatibility notes before any stable promotion."
      ],
      "approvalBoundary": [
        "This packet is read-only and does not create Linear issues, mutate overlay manifests, or approve stable promotion.",
        "Open promotion work only after explicit human approval.",
        "Do not mark stable until every stop-before-stable item is resolved."
      ],
      "agentContract": {
        "purpose": "canon-overlay-candidate-review-packet",
        "primaryConsumers": [
          "codex",
          "mcp",
          "ltd-docs",
          "project-overlays"
        ],
        "useFor": [
          "turning a queued overlay candidate into a reviewable handoff",
          "checking candidate source evidence before implementation planning",
          "preparing a bounded promotion slice after human approval"
        ],
        "stopBefore": [
          "automatically opening Linear work from the packet",
          "automatically editing Canon registry or stable exports",
          "overriding stop-before-stable requirements"
        ]
      }
    },
    {
      "id": "canon-overlay-candidate-review:overlay.tend-database.surface-brief",
      "candidateId": "overlay.tend-database:overlay.tend-database.surface-brief",
      "title": "Database source management surface review packet",
      "summary": "A candidate Canon database-service template for source setup, settings, agent automation, and receipt handoffs without promoting Tend-specific vertical schemas into Canon.",
      "overlayId": "overlay.tend-database",
      "overlayName": "Tend Database Overlay",
      "manifestPath": "packages/tend/canon-overlay/manifest.ts",
      "intakeId": "overlay.tend-database.surface-brief",
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
      "tags": [
        "overlay",
        "tend",
        "database",
        "sources",
        "settings",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "tend-home",
          "name": "Tend public home",
          "modality": "web",
          "sourcePath": "src/routes/+page.svelte",
          "proof": "The home route introduces the database service, automation model, and next action."
        },
        {
          "surfaceId": "tend-agent-sdk",
          "name": "Agent SDK handoff",
          "modality": "chat",
          "sourcePath": "src/lib/sdk/agent.ts",
          "proof": "The SDK agent module gives agents a source for summarizing automation capabilities without relying on rendered copy."
        },
        {
          "surfaceId": "tend-sources",
          "name": "Source management route",
          "modality": "app",
          "sourcePath": "src/routes/sources/+page.svelte",
          "proof": "The sources route is the app surface for database inputs, state, and receipts."
        },
        {
          "surfaceId": "tend-settings-voice",
          "name": "Settings voice handoff",
          "modality": "voice",
          "sourcePath": "src/routes/settings/+page.svelte",
          "proof": "The settings route supports concise spoken summaries of configuration, state, owner, and next action."
        },
        {
          "surfaceId": "tend-glasses-state",
          "name": "Tend glasses state policy",
          "modality": "glasses",
          "sourcePath": "canon-overlay/surface-policy.md",
          "proof": "The overlay policy keeps thin displays to source state, owner, proof, and next action."
        }
      ],
      "dependencies": [
        "component.clear-decision-panel",
        "component.clear-proof-strip",
        "template.canon-project-overlay-manifest",
        "template.canon-extension-intake",
        "policy.signal-decision-proof"
      ],
      "requiredEvidence": [
        "Source-adjacent implementation path.",
        "At least two surface proofs or client receipts.",
        "Accessibility, evidence, motion, and extension contract notes.",
        "Registry dependencies and modality list."
      ],
      "stopBeforeStable": [
        "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
      ],
      "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
      "reviewUri": "canon://overlays/intake/overlay.tend-database",
      "candidateUri": "canon://overlays/candidates/overlay.tend-database.surface-brief",
      "handoffUri": "canon://overlays/candidates/overlay.tend-database.surface-brief/handoff",
      "promotionChecklist": [
        "Confirm a human maintainer approved opening Canon promotion work from this packet.",
        "Review the owning overlay manifest, source package, source path, surfaces, and proofs.",
        "Verify every required evidence item has current source or test coverage.",
        "Decide whether the candidate becomes a Canon registry item, template, adapter, token, policy, or remains project-local.",
        "Update Canon export path, docs, tests, MCP generated content, and compatibility notes before any stable promotion."
      ],
      "approvalBoundary": [
        "This packet is read-only and does not create Linear issues, mutate overlay manifests, or approve stable promotion.",
        "Open promotion work only after explicit human approval.",
        "Do not mark stable until every stop-before-stable item is resolved."
      ],
      "agentContract": {
        "purpose": "canon-overlay-candidate-review-packet",
        "primaryConsumers": [
          "codex",
          "mcp",
          "ltd-docs",
          "project-overlays"
        ],
        "useFor": [
          "turning a queued overlay candidate into a reviewable handoff",
          "checking candidate source evidence before implementation planning",
          "preparing a bounded promotion slice after human approval"
        ],
        "stopBefore": [
          "automatically opening Linear work from the packet",
          "automatically editing Canon registry or stable exports",
          "overriding stop-before-stable requirements"
        ]
      }
    },
    {
      "id": "canon-overlay-candidate-review:overlay.webflow-apps-admin-audit.surface-brief",
      "candidateId": "overlay.webflow-apps-admin-audit:overlay.webflow-apps-admin-audit.surface-brief",
      "title": "Webflow app audit dashboard surface review packet",
      "summary": "A candidate Canon audit-dashboard template for app review status, governance evidence, and compact reviewer handoffs without promoting Webflow-specific exception policy into Canon stable.",
      "overlayId": "overlay.webflow-apps-admin-audit",
      "overlayName": "Webflow Apps Admin Audit Overlay",
      "manifestPath": "packages/webflow-apps-admin/dashboard/canon-overlay/manifest.ts",
      "intakeId": "overlay.webflow-apps-admin-audit.surface-brief",
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
      "tags": [
        "overlay",
        "webflow",
        "apps",
        "audit",
        "dashboard",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "webflow-apps-admin-dashboard",
          "name": "Webflow apps audit dashboard",
          "modality": "web",
          "sourcePath": "src/routes/+page.svelte",
          "proof": "The dashboard route renders app-review audit status and evidence for operators."
        },
        {
          "surfaceId": "webflow-apps-admin-summary",
          "name": "App audit chat summary policy",
          "modality": "chat",
          "sourcePath": "canon-overlay/copy-rules.md",
          "proof": "The copy rules constrain chat summaries to app, status, evidence, owner, and next action."
        },
        {
          "surfaceId": "webflow-apps-admin-review",
          "name": "App audit app surface",
          "modality": "app",
          "sourcePath": "src/routes/+page.svelte",
          "proof": "The same dashboard route acts as the app surface for repeated review and comparison work."
        },
        {
          "surfaceId": "webflow-apps-admin-voice",
          "name": "App audit voice policy",
          "modality": "voice",
          "sourcePath": "canon-overlay/copy-rules.md",
          "proof": "The copy rules constrain spoken review summaries to app, status, blocker, proof, and next action."
        },
        {
          "surfaceId": "webflow-apps-admin-glasses",
          "name": "App audit glasses policy",
          "modality": "glasses",
          "sourcePath": "canon-overlay/surface-policy.md",
          "proof": "The surface policy keeps thin displays to app status, owner, proof, and next action."
        }
      ],
      "dependencies": [
        "component.clear-decision-panel",
        "component.clear-proof-strip",
        "template.canon-project-overlay-manifest",
        "template.canon-extension-intake",
        "policy.signal-decision-proof"
      ],
      "requiredEvidence": [
        "Source-adjacent implementation path.",
        "At least two surface proofs or client receipts.",
        "Accessibility, evidence, motion, and extension contract notes.",
        "Registry dependencies and modality list."
      ],
      "stopBeforeStable": [
        "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
      ],
      "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
      "reviewUri": "canon://overlays/intake/overlay.webflow-apps-admin-audit",
      "candidateUri": "canon://overlays/candidates/overlay.webflow-apps-admin-audit.surface-brief",
      "handoffUri": "canon://overlays/candidates/overlay.webflow-apps-admin-audit.surface-brief/handoff",
      "promotionChecklist": [
        "Confirm a human maintainer approved opening Canon promotion work from this packet.",
        "Review the owning overlay manifest, source package, source path, surfaces, and proofs.",
        "Verify every required evidence item has current source or test coverage.",
        "Decide whether the candidate becomes a Canon registry item, template, adapter, token, policy, or remains project-local.",
        "Update Canon export path, docs, tests, MCP generated content, and compatibility notes before any stable promotion."
      ],
      "approvalBoundary": [
        "This packet is read-only and does not create Linear issues, mutate overlay manifests, or approve stable promotion.",
        "Open promotion work only after explicit human approval.",
        "Do not mark stable until every stop-before-stable item is resolved."
      ],
      "agentContract": {
        "purpose": "canon-overlay-candidate-review-packet",
        "primaryConsumers": [
          "codex",
          "mcp",
          "ltd-docs",
          "project-overlays"
        ],
        "useFor": [
          "turning a queued overlay candidate into a reviewable handoff",
          "checking candidate source evidence before implementation planning",
          "preparing a bounded promotion slice after human approval"
        ],
        "stopBefore": [
          "automatically opening Linear work from the packet",
          "automatically editing Canon registry or stable exports",
          "overriding stop-before-stable requirements"
        ]
      }
    },
    {
      "id": "canon-overlay-candidate-review:overlay.webflow-dashboard-marketplace.surface-brief",
      "candidateId": "overlay.webflow-dashboard-marketplace:overlay.webflow-dashboard-marketplace.surface-brief",
      "title": "Webflow marketplace dashboard surface review packet",
      "summary": "A candidate Canon marketplace-operations template for dashboard state, marketplace insights, validation, asset receipts, and compact operator handoffs without promoting Webflow-specific data policy into Canon.",
      "overlayId": "overlay.webflow-dashboard-marketplace",
      "overlayName": "Webflow Dashboard Marketplace Overlay",
      "manifestPath": "packages/webflow-dashboard/canon-overlay/manifest.ts",
      "intakeId": "overlay.webflow-dashboard-marketplace.surface-brief",
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
      "tags": [
        "overlay",
        "webflow",
        "marketplace",
        "dashboard",
        "validation",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "webflow-dashboard-home",
          "name": "Webflow dashboard home",
          "modality": "web",
          "sourcePath": "src/routes/+page.svelte",
          "proof": "The home route introduces the dashboard and routes operators toward marketplace and validation work."
        },
        {
          "surfaceId": "webflow-dashboard-insights",
          "name": "Marketplace insights data",
          "modality": "chat",
          "sourcePath": "src/lib/marketplace-insights.ts",
          "proof": "The marketplace insights module gives agents a structured source for summarizing dashboard state."
        },
        {
          "surfaceId": "webflow-dashboard-app",
          "name": "Operator dashboard",
          "modality": "app",
          "sourcePath": "src/routes/dashboard/+page.svelte",
          "proof": "The dashboard route is the main app surface for status, proof, and next operational action."
        },
        {
          "surfaceId": "webflow-dashboard-validation-voice",
          "name": "Validation voice handoff",
          "modality": "voice",
          "sourcePath": "src/routes/validation/+page.svelte",
          "proof": "The validation route supports concise spoken summaries of issue, status, proof, and next action."
        },
        {
          "surfaceId": "webflow-dashboard-glasses",
          "name": "Marketplace glasses state policy",
          "modality": "glasses",
          "sourcePath": "canon-overlay/surface-policy.md",
          "proof": "The surface policy keeps thin displays to template/app status, owner, proof, and next action."
        }
      ],
      "dependencies": [
        "component.clear-decision-panel",
        "component.clear-proof-strip",
        "template.canon-project-overlay-manifest",
        "template.canon-extension-intake",
        "policy.signal-decision-proof"
      ],
      "requiredEvidence": [
        "Source-adjacent implementation path.",
        "At least two surface proofs or client receipts.",
        "Accessibility, evidence, motion, and extension contract notes.",
        "Registry dependencies and modality list."
      ],
      "stopBeforeStable": [
        "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
      ],
      "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
      "reviewUri": "canon://overlays/intake/overlay.webflow-dashboard-marketplace",
      "candidateUri": "canon://overlays/candidates/overlay.webflow-dashboard-marketplace.surface-brief",
      "handoffUri": "canon://overlays/candidates/overlay.webflow-dashboard-marketplace.surface-brief/handoff",
      "promotionChecklist": [
        "Confirm a human maintainer approved opening Canon promotion work from this packet.",
        "Review the owning overlay manifest, source package, source path, surfaces, and proofs.",
        "Verify every required evidence item has current source or test coverage.",
        "Decide whether the candidate becomes a Canon registry item, template, adapter, token, policy, or remains project-local.",
        "Update Canon export path, docs, tests, MCP generated content, and compatibility notes before any stable promotion."
      ],
      "approvalBoundary": [
        "This packet is read-only and does not create Linear issues, mutate overlay manifests, or approve stable promotion.",
        "Open promotion work only after explicit human approval.",
        "Do not mark stable until every stop-before-stable item is resolved."
      ],
      "agentContract": {
        "purpose": "canon-overlay-candidate-review-packet",
        "primaryConsumers": [
          "codex",
          "mcp",
          "ltd-docs",
          "project-overlays"
        ],
        "useFor": [
          "turning a queued overlay candidate into a reviewable handoff",
          "checking candidate source evidence before implementation planning",
          "preparing a bounded promotion slice after human approval"
        ],
        "stopBefore": [
          "automatically opening Linear work from the packet",
          "automatically editing Canon registry or stable exports",
          "overriding stop-before-stable requirements"
        ]
      }
    },
    {
      "id": "canon-overlay-candidate-review:overlay.webflow-template-validation.surface-brief",
      "candidateId": "overlay.webflow-template-validation:overlay.webflow-template-validation.surface-brief",
      "title": "Surface Brief Template review packet",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
      "overlayId": "overlay.webflow-template-validation",
      "overlayName": "Webflow Template Validation Overlay",
      "manifestPath": "packages/webflow-template-validation/canon-overlay/manifest.ts",
      "intakeId": "overlay.webflow-template-validation.surface-brief",
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
      "tags": [
        "overlay",
        "brief",
        "surface",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "web-webflow-template-validation-brief-1",
          "name": "Web project overlay brief",
          "modality": "web",
          "sourcePath": "canon-overlay/templates/surface-brief.md",
          "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
        },
        {
          "surfaceId": "chat-webflow-template-validation-brief-2",
          "name": "Chat project overlay brief",
          "modality": "chat",
          "sourcePath": "canon-overlay/templates/surface-brief.md",
          "proof": "The same structure summarizes cleanly for agent/chat handoff."
        }
      ],
      "dependencies": [
        "template.canon-project-overlay-manifest",
        "template.canon-extension-intake",
        "policy.signal-decision-proof"
      ],
      "requiredEvidence": [
        "Source-adjacent implementation path.",
        "At least two surface proofs or client receipts.",
        "Accessibility, evidence, motion, and extension contract notes.",
        "Registry dependencies and modality list."
      ],
      "stopBeforeStable": [
        "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
      ],
      "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
      "reviewUri": "canon://overlays/intake/overlay.webflow-template-validation",
      "candidateUri": "canon://overlays/candidates/overlay.webflow-template-validation.surface-brief",
      "handoffUri": "canon://overlays/candidates/overlay.webflow-template-validation.surface-brief/handoff",
      "promotionChecklist": [
        "Confirm a human maintainer approved opening Canon promotion work from this packet.",
        "Review the owning overlay manifest, source package, source path, surfaces, and proofs.",
        "Verify every required evidence item has current source or test coverage.",
        "Decide whether the candidate becomes a Canon registry item, template, adapter, token, policy, or remains project-local.",
        "Update Canon export path, docs, tests, MCP generated content, and compatibility notes before any stable promotion."
      ],
      "approvalBoundary": [
        "This packet is read-only and does not create Linear issues, mutate overlay manifests, or approve stable promotion.",
        "Open promotion work only after explicit human approval.",
        "Do not mark stable until every stop-before-stable item is resolved."
      ],
      "agentContract": {
        "purpose": "canon-overlay-candidate-review-packet",
        "primaryConsumers": [
          "codex",
          "mcp",
          "ltd-docs",
          "project-overlays"
        ],
        "useFor": [
          "turning a queued overlay candidate into a reviewable handoff",
          "checking candidate source evidence before implementation planning",
          "preparing a bounded promotion slice after human approval"
        ],
        "stopBefore": [
          "automatically opening Linear work from the packet",
          "automatically editing Canon registry or stable exports",
          "overriding stop-before-stable requirements"
        ]
      }
    }
  ],
  "summary": {
    "total": 24,
    "overlays": 24,
    "byRequestedKind": [
      {
        "kind": "template",
        "count": 24
      }
    ],
    "byModality": [
      {
        "modality": "app",
        "count": 24
      },
      {
        "modality": "chat",
        "count": 24
      },
      {
        "modality": "glasses",
        "count": 24
      },
      {
        "modality": "voice",
        "count": 24
      },
      {
        "modality": "web",
        "count": 24
      }
    ]
  },
  "agentContract": {
    "purpose": "canon-overlay-candidate-review-packets",
    "primaryConsumers": [
      "codex",
      "mcp",
      "ltd-docs",
      "project-overlays"
    ],
    "useFor": [
      "preparing a human-reviewable handoff before opening Canon promotion work",
      "checking required evidence, surfaces, dependencies, and stop-before-stable constraints in one packet",
      "keeping candidate review anchored to the owning overlay manifest and candidate queue entry",
      "recording the approval boundary between project-local evidence and Canon stable implementation"
    ],
    "stopBefore": [
      "automatically creating Linear issues from review packets",
      "automatically promoting review packets into Canon stable registry items",
      "editing project overlay manifests while rendering review packets",
      "treating review packets as production approval without human review"
    ]
  }
};
