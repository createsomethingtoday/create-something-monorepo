export const CANON_PROJECT_OVERLAY_MANIFEST = {
  "id": "overlay.tend-database",
  "name": "Tend Database Overlay",
  "owner": "tend-team",
  "sourcePackage": "@create-something/tend",
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
    "tend",
    "database",
    "sources",
    "settings"
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
      "id": "overlay.tend-database.surface-brief",
      "title": "Database source management surface",
      "summary": "A candidate Canon database-service template for source setup, settings, agent automation, and receipt handoffs without promoting Tend-specific vertical schemas into Canon.",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "owner": "tend-team",
      "sourcePackage": "@create-something/tend",
      "sourcePath": "src/routes/+page.svelte",
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
      ]
    }
  ]
};
