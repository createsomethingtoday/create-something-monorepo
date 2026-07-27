export const CANON_PROJECT_OVERLAY_MANIFEST = {
  "id": "overlay.client-workspace-desktop",
  "name": "Client Workspace Desktop Overlay",
  "owner": "client-workspace-operator",
  "sourcePackage": "@create-something/client-workspace-desktop",
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
    "client",
    "governance"
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
      "id": "overlay.client-workspace-desktop.surface-brief",
      "title": "Surface Brief Template",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "owner": "client-workspace-operator",
      "sourcePackage": "@create-something/client-workspace-desktop",
      "sourcePath": "canon-overlay/templates/surface-brief.md",
      "tags": [
        "overlay",
        "brief",
        "surface",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "web-client-workspace-desktop-brief-1",
          "name": "Web project overlay brief",
          "modality": "web",
          "sourcePath": "canon-overlay/templates/surface-brief.md",
          "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
        },
        {
          "surfaceId": "chat-client-workspace-desktop-brief-2",
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
      ]
    }
  ]
};
