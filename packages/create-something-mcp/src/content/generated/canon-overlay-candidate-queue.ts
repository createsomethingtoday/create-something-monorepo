/**
 * Generated Canon overlay candidate queue content — DO NOT EDIT MANUALLY.
 * Run: npm run build:content
 * Source: packages/canon/src/lib/mcp-snapshot/
 */

import type { CanonOverlayCandidateQueue } from '../types.js';

export const CANON_OVERLAY_CANDIDATE_QUEUE: CanonOverlayCandidateQueue = {
  "schemaVersion": 1,
  "id": "canon-overlay-candidate-queue",
  "sourceOfTruth": "@create-something/canon/overlays/intake",
  "description": "Read-only queue of Canon overlay extension intakes that have repeated-surface evidence and are ready for Canon candidate review.",
  "entries": [
    {
      "id": "overlay.agency-atlas-public:overlay.agency-atlas-public.workflow-proof-surface",
      "overlayId": "overlay.agency-atlas-public",
      "overlayName": "Agency Atlas Public Overlay",
      "manifestPath": "packages/agency/canon-overlay/manifest.ts",
      "intakeId": "overlay.agency-atlas-public.workflow-proof-surface",
      "title": "Agency public Atlas workflow proof surface",
      "summary": "A candidate Canon pattern for turning a public web route, chat-assisted canvas, and booking handoff into one reusable workflow-proof surface without forking Atlas primitives.",
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
      "handoffUri": "canon://overlays/candidates/overlay.agency-atlas-public.workflow-proof-surface/handoff"
    },
    {
      "id": "overlay.lms-workflow-learning:overlay.lms-workflow-learning.lesson-proof-surface",
      "overlayId": "overlay.lms-workflow-learning",
      "overlayName": "LMS Workflow Learning Overlay",
      "manifestPath": "packages/lms/canon-overlay/manifest.ts",
      "intakeId": "overlay.lms-workflow-learning.lesson-proof-surface",
      "title": "Workflow learning proof surface",
      "summary": "A candidate Canon learning template for teaching workflow proof across lesson content, path navigation, progress receipts, and event telemetry without promoting one course's copy into Canon stable.",
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
      "handoffUri": "canon://overlays/candidates/overlay.lms-workflow-learning.lesson-proof-surface/handoff"
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
    "purpose": "canon-overlay-candidate-review",
    "primaryConsumers": [
      "codex",
      "mcp",
      "ltd-docs",
      "project-overlays"
    ],
    "useFor": [
      "reviewing repeated-surface overlay evidence before Canon promotion work",
      "prioritizing candidate templates, components, adapters, tokens, or policies by modality and source package",
      "connecting candidate review back to the owning project overlay manifest and intake review",
      "keeping Canon stable promotion gated on export path, docs, tests, and compatibility evidence"
    ],
    "stopBefore": [
      "automatically creating Linear issues from candidate queue entries",
      "automatically promoting any candidate queue entry into Canon stable",
      "editing project overlay manifests from the candidate queue",
      "treating queued candidates as approved production changes"
    ]
  }
};
