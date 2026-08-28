export const CANON_PROJECT_OVERLAY_MANIFEST = {
  "id": "overlay.mapping-canvas-meeting-authoring",
  "name": "Mapping Canvas Meeting Authoring Overlay",
  "owner": "mapping-canvas-team",
  "sourcePackage": "@create-something/mapping-canvas",
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
    "mapping",
    "meeting",
    "authoring"
  ],
  "artifacts": [
    {
      "kind": "theme",
      "path": "theme.css",
      "description": "Project-local CSS aliases that point back to Canon tokens.",
      "registryItemIds": [
        "token.performance-core"
      ]
    },
    {
      "kind": "tokens",
      "path": "tokens.json",
      "description": "Design-token aliases for project-specific names without a new token scale.",
      "registryItemIds": [
        "token.performance-core"
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
      "id": "overlay.mapping-canvas-meeting-authoring.surface-brief",
      "title": "Free-form mapping meeting surface",
      "summary": "A candidate Canon authoring pattern for preserving provisional ink, operator-approved conversions, local recovery, and portable meeting artifacts without promoting scratch material into canonical Map or Atlas data.",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "owner": "mapping-canvas-team",
      "sourcePackage": "@create-something/mapping-canvas",
      "sourcePath": "canon-overlay/templates/surface-brief.md",
      "tags": [
        "overlay",
        "brief",
        "surface",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "mapping-canvas-workbench",
          "name": "Mapping meeting workbench",
          "modality": "web",
          "sourcePath": "src/routes/+page.svelte",
          "proof": "The route provides the dark local-first authoring surface, spatial tools, explicit conversions, recovery controls, and portable exports."
        },
        {
          "surfaceId": "mapping-canvas-document-handoff",
          "name": "Portable document handoff",
          "modality": "chat",
          "sourcePath": "src/lib/document.ts",
          "proof": "The versioned JSON document contract lets an agent summarize retained objects and provenance without interpreting or promoting scratch material."
        },
        {
          "surfaceId": "mapping-canvas-pwa",
          "name": "Installable mapping canvas",
          "modality": "app",
          "sourcePath": "static/manifest.webmanifest",
          "proof": "The installable PWA preserves the same local document and interaction contract in standalone display mode."
        },
        {
          "surfaceId": "mapping-canvas-voice-handoff",
          "name": "Meeting artifact voice handoff",
          "modality": "voice",
          "sourcePath": "canon-overlay/copy-rules.md",
          "proof": "Copy rules constrain spoken handoff to document status, retained structure, provenance, and the operator-owned next action."
        },
        {
          "surfaceId": "mapping-canvas-glance-state",
          "name": "Mapping session glance state",
          "modality": "glasses",
          "sourcePath": "canon-overlay/surface-policy.md",
          "proof": "The surface policy limits thin-display output to save state, selected count, conversion provenance, and next action."
        }
      ],
      "dependencies": [
        "template.canon-project-overlay-manifest",
        "template.canon-extension-intake",
        "policy.signal-decision-proof"
      ]
    }
  ]
};
