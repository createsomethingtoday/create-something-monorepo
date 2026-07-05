import type { CanonProjectOverlayManifest } from '@create-something/canon/registry';

export const CANON_PROJECT_OVERLAY_MANIFEST: CanonProjectOverlayManifest = {
  "id": "overlay.clearway-conversion",
  "name": "Clearway Conversion Overlay",
  "owner": "clearway-team",
  "sourcePackage": "@create-something/clearway",
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
    "clearway",
    "conversion",
    "booking",
    "docs"
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
        "template.canon-project-overlay-manifest"
      ]
    }
  ],
  "extensionIntakes": [
    {
      "id": "overlay.clearway-conversion.surface-brief",
      "title": "Conversion booking and embed surface",
      "summary": "A candidate Canon conversion template for booking flows, developer embeds, admin receipts, and concise operator handoffs without turning Clearway-specific scheduling copy into Canon primitives.",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "owner": "clearway-team",
      "sourcePackage": "@create-something/clearway",
      "sourcePath": "src/routes/+page.svelte",
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
      ]
    }
  ]
};
