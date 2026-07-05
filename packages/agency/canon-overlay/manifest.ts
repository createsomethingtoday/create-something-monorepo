import type { CanonProjectOverlayManifest } from '@create-something/canon/registry';

export const CANON_PROJECT_OVERLAY_MANIFEST: CanonProjectOverlayManifest = {
  "id": "overlay.agency-atlas-public",
  "name": "Agency Atlas Public Overlay",
  "owner": "agency-team",
  "sourcePackage": "@create-something/agency",
  "sourcePath": "manifest.ts",
  "targetModalities": [
    "web",
    "chat",
    "app",
    "voice",
    "glasses"
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
        "app",
        "voice",
        "glasses"
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
      ]
    }
  ]
};
