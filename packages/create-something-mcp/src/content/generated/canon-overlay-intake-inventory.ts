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
  "entries": [
    {
      "manifestPath": "packages/agency/canon-overlay/manifest.ts",
      "manifest": {
        "id": "overlay.agency-atlas-public",
        "name": "Agency Atlas Public Overlay",
        "owner": "agency-team",
        "sourcePackage": "@create-something/agency",
        "sourcePath": "manifest.ts",
        "targetModalities": [
          "web",
          "chat",
          "app"
        ],
        "tags": [
          "canon",
          "overlay",
          "project",
          "agency",
          "atlas",
          "public-proof",
          "governance"
        ],
        "artifacts": [
          {
            "kind": "theme",
            "path": "theme.css",
            "description": "Project-local CSS aliases that point back to Canon tokens.",
            "registryItemIds": [
              "token.canon-core"
            ]
          },
          {
            "kind": "tokens",
            "path": "tokens.json",
            "description": "Design-token aliases for project-specific names without a new token scale.",
            "registryItemIds": [
              "token.canon-core"
            ]
          },
          {
            "kind": "templates",
            "path": "templates",
            "description": "Copyable briefs for surface-specific workflow overlays.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "kind": "copy-rules",
            "path": "copy-rules.md",
            "description": "Project voice and terminology rules that keep Canon primitives stable.",
            "registryItemIds": [
              "policy.signal-decision-proof"
            ]
          },
          {
            "kind": "surface-policy",
            "path": "surface-policy.md",
            "description": "Modality policy for web, chat, app, voice, and glasses overlays.",
            "registryItemIds": [
              "policy.signal-decision-proof"
            ]
          },
          {
            "kind": "registry",
            "path": "registry.json",
            "description": "Project-local registry metadata and Canon dependency list.",
            "registryItemIds": [
              "component.clear-decision-panel",
              "component.clear-proof-strip",
              "component.atlas-atlas-flow",
              "component.atlas-atlas-story-canvas",
              "adapter.atlas-graph-artifact",
              "template.canon-project-overlay-manifest"
            ]
          }
        ],
        "extensionIntakes": [
          {
            "id": "overlay.agency-atlas-public.workflow-proof-surface",
            "title": "Agency public Atlas workflow proof surface",
            "summary": "A candidate Canon pattern for turning a public web route, chat-assisted canvas, and booking handoff into one reusable workflow-proof surface without forking Atlas primitives.",
            "requestedKind": "template",
            "requestedModalities": [
              "web",
              "chat",
              "app"
            ],
            "owner": "agency-team",
            "sourcePackage": "@create-something/agency",
            "sourcePath": "src/routes/atlas/+page.svelte",
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
            ]
          }
        ]
      },
      "review": {
        "status": "ready",
        "requiredArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "presentArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "missingArtifacts": [],
        "extensionDecisions": [
          {
            "packet": {
              "id": "overlay.agency-atlas-public.workflow-proof-surface",
              "title": "Agency public Atlas workflow proof surface",
              "summary": "A candidate Canon pattern for turning a public web route, chat-assisted canvas, and booking handoff into one reusable workflow-proof surface without forking Atlas primitives.",
              "requestedKind": "template",
              "requestedModalities": [
                "web",
                "chat",
                "app"
              ],
              "owner": "agency-team",
              "sourcePackage": "@create-something/agency",
              "sourcePath": "src/routes/atlas/+page.svelte",
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
              ]
            },
            "decision": {
              "stage": "candidate",
              "action": "promote-candidate",
              "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
              "requiredEvidence": [
                "Source-adjacent implementation path.",
                "At least two surface proofs or client receipts.",
                "Accessibility, evidence, motion, and extension contract notes.",
                "Registry dependencies and modality list."
              ],
              "stopBeforeStable": [
                "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
              ]
            }
          }
        ],
        "stopConditions": [
          "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
          "Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.",
          "Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts."
        ],
        "summary": "Agency Atlas Public Overlay declares the complete Canon overlay artifact set and has no project-local evidence gaps."
      }
    },
    {
      "manifestPath": "packages/lms/canon-overlay/manifest.ts",
      "manifest": {
        "id": "overlay.lms-workflow-learning",
        "name": "LMS Workflow Learning Overlay",
        "owner": "learning-team",
        "sourcePackage": "@create-something/lms",
        "sourcePath": "manifest.ts",
        "targetModalities": [
          "web",
          "app",
          "chat"
        ],
        "tags": [
          "canon",
          "overlay",
          "project",
          "learning",
          "workflow-proof",
          "canon-training",
          "governance"
        ],
        "artifacts": [
          {
            "kind": "theme",
            "path": "theme.css",
            "description": "Project-local CSS aliases that point back to Canon tokens.",
            "registryItemIds": [
              "token.canon-core"
            ]
          },
          {
            "kind": "tokens",
            "path": "tokens.json",
            "description": "Design-token aliases for project-specific names without a new token scale.",
            "registryItemIds": [
              "token.canon-core"
            ]
          },
          {
            "kind": "templates",
            "path": "templates",
            "description": "Copyable briefs for surface-specific workflow overlays.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "kind": "copy-rules",
            "path": "copy-rules.md",
            "description": "Project voice and terminology rules that keep Canon primitives stable.",
            "registryItemIds": [
              "policy.signal-decision-proof"
            ]
          },
          {
            "kind": "surface-policy",
            "path": "surface-policy.md",
            "description": "Modality policy for web, chat, app, voice, and glasses overlays.",
            "registryItemIds": [
              "policy.signal-decision-proof"
            ]
          },
          {
            "kind": "registry",
            "path": "registry.json",
            "description": "Project-local registry metadata and Canon dependency list.",
            "registryItemIds": [
              "component.clear-decision-panel",
              "component.clear-proof-strip",
              "template.canon-project-overlay-template-pack",
              "template.canon-project-overlay-manifest"
            ]
          }
        ],
        "extensionIntakes": [
          {
            "id": "overlay.lms-workflow-learning.lesson-proof-surface",
            "title": "Workflow learning proof surface",
            "summary": "A candidate Canon learning template for teaching workflow proof across lesson content, path navigation, progress receipts, and event telemetry without promoting one course's copy into Canon stable.",
            "requestedKind": "template",
            "requestedModalities": [
              "web",
              "app",
              "chat"
            ],
            "owner": "learning-team",
            "sourcePackage": "@create-something/lms",
            "sourcePath": "src/lib/content/lessons/make-your-workflow-visible/what-images-prove.md",
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
            ]
          }
        ]
      },
      "review": {
        "status": "ready",
        "requiredArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "presentArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "missingArtifacts": [],
        "extensionDecisions": [
          {
            "packet": {
              "id": "overlay.lms-workflow-learning.lesson-proof-surface",
              "title": "Workflow learning proof surface",
              "summary": "A candidate Canon learning template for teaching workflow proof across lesson content, path navigation, progress receipts, and event telemetry without promoting one course's copy into Canon stable.",
              "requestedKind": "template",
              "requestedModalities": [
                "web",
                "app",
                "chat"
              ],
              "owner": "learning-team",
              "sourcePackage": "@create-something/lms",
              "sourcePath": "src/lib/content/lessons/make-your-workflow-visible/what-images-prove.md",
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
              ]
            },
            "decision": {
              "stage": "candidate",
              "action": "promote-candidate",
              "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
              "requiredEvidence": [
                "Source-adjacent implementation path.",
                "At least two surface proofs or client receipts.",
                "Accessibility, evidence, motion, and extension contract notes.",
                "Registry dependencies and modality list."
              ],
              "stopBeforeStable": [
                "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
              ]
            }
          }
        ],
        "stopConditions": [
          "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
          "Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.",
          "Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts."
        ],
        "summary": "LMS Workflow Learning Overlay declares the complete Canon overlay artifact set and has no project-local evidence gaps."
      }
    }
  ],
  "summary": {
    "total": 2,
    "ready": 2,
    "needsArtifacts": 0,
    "needsEvidence": 0,
    "needsReview": 0,
    "candidateIntakes": 2,
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
