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
        "app"
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
          "proof": "Route composes ClearPageSection, PublicAtlasStoryCanvas, and PublicAtlasCanvas so the public page shows story, editable map, readiness, and booking context from one Canon Atlas graph contract."
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
        "chat"
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
