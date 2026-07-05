export const CANON_PROJECT_OVERLAY_MANIFEST = {
  "id": "overlay.ltd-canon-philosophy",
  "name": "LTD Canon Philosophy Overlay",
  "owner": "ltd-team",
  "sourcePackage": "@create-something/ltd",
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
    "ltd",
    "philosophy",
    "standards",
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
      "id": "overlay.ltd-canon-philosophy.surface-brief",
      "title": "Canon philosophy documentation surface",
      "summary": "A candidate Canon documentation template for turning philosophy, standards, voice, and live Canon docs into one reusable cross-property foundation surface without forking Canon primitives.",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "owner": "ltd-team",
      "sourcePackage": "@create-something/ltd",
      "sourcePath": "src/routes/canon/+page.svelte",
      "tags": [
        "overlay",
        "canon-docs",
        "philosophy",
        "standards",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "ltd-canon-docs-route",
          "name": "Canon documentation route",
          "modality": "web",
          "sourcePath": "src/routes/canon/+page.svelte",
          "proof": "The Canon route publishes foundations, components, patterns, resources, and contribution paths from the property-owned Canon documentation tree."
        },
        {
          "surfaceId": "ltd-canon-content-loader",
          "name": "Canon content loader",
          "modality": "chat",
          "sourcePath": "src/lib/content-loader.ts",
          "proof": "The content loader turns checked-in Canon markdown into structured page metadata that agents can summarize without scraping route markup."
        },
        {
          "surfaceId": "ltd-standards-checklist",
          "name": "Canon standards checklist",
          "modality": "app",
          "sourcePath": "src/routes/standards/+page.svelte",
          "proof": "The standards route gives operators a usable decision surface for Clear Communication UI, token usage, spacing, motion, accessibility, and proof before shipping."
        },
        {
          "surfaceId": "ltd-voice-guidance",
          "name": "Canon voice guidance",
          "modality": "voice",
          "sourcePath": "src/routes/voice/+page.svelte",
          "proof": "The voice route defines the words, phrases, and forbidden patterns that keep spoken or summarized Canon guidance concise and consistent."
        },
        {
          "surfaceId": "ltd-thin-canon-navigation-policy",
          "name": "Thin Canon navigation policy",
          "modality": "glasses",
          "sourcePath": "canon-overlay/surface-policy.md",
          "proof": "The overlay policy keeps thin displays to route, state, owner, and next action while full philosophy and standards stay in the Canon docs route."
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
