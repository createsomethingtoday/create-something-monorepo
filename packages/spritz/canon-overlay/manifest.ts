export const CANON_PROJECT_OVERLAY_MANIFEST = {
  "id": "overlay.spritz-reading",
  "name": "Spritz Reading Overlay",
  "owner": "spritz-team",
  "sourcePackage": "@create-something/spritz",
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
    "spritz",
    "reading",
    "component",
    "demo"
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
      "id": "overlay.spritz-reading.surface-brief",
      "title": "Reading component proof surface",
      "summary": "A candidate Canon component-demo template for interactive reading controls, component API evidence, and compact preview handoffs without making Spritz behavior a Canon primitive.",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "owner": "spritz-team",
      "sourcePackage": "@create-something/spritz",
      "sourcePath": "src/routes/+page.svelte",
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
      ]
    }
  ]
};
