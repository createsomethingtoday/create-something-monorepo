export const CANON_PROJECT_OVERLAY_MANIFEST = {
  "id": "overlay.space-workbench",
  "name": "Space Workbench Overlay",
  "owner": "space-team",
  "sourcePackage": "@create-something/space",
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
    "space",
    "workbench",
    "tools",
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
        "template.canon-project-overlay-manifest"
      ]
    }
  ],
  "extensionIntakes": [
    {
      "id": "overlay.space-workbench.surface-brief",
      "title": "Workbench tool proof surface",
      "summary": "A candidate Canon workbench template for turning live tools, playgrounds, data dashboards, and operator receipts into reusable proof surfaces without forking Canon components.",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "owner": "space-team",
      "sourcePackage": "@create-something/space",
      "sourcePath": "src/routes/+page.svelte",
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
          "proof": "The home route composes ClearPageSection, ClearCardGrid, ClearProofStrip, ClearDecisionPanel, and ClearCtaBand into a live tool directory with proof and handoff states."
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
      ]
    }
  ]
};
