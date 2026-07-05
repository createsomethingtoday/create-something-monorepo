export const CANON_PROJECT_OVERLAY_MANIFEST = {
  "id": "overlay.maverick-industry",
  "name": "Maverick Industry Overlay",
  "owner": "maverick-team",
  "sourcePackage": "@create-something/maverick",
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
    "maverick",
    "industry",
    "energy",
    "services"
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
      "id": "overlay.maverick-industry.surface-brief",
      "title": "Industry service proof surface",
      "summary": "A candidate Canon industry-service template for public sector pages, product proof, news context, and concise sales handoffs without promoting Maverick-specific claims into Canon.",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "owner": "maverick-team",
      "sourcePackage": "@create-something/maverick",
      "sourcePath": "src/routes/+page.svelte",
      "tags": [
        "overlay",
        "maverick",
        "industry",
        "energy",
        "services",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "maverick-home",
          "name": "Maverick public home",
          "modality": "web",
          "sourcePath": "src/routes/+page.svelte",
          "proof": "The home route presents the public industry story and routes visitors to sector-specific proof."
        },
        {
          "surfaceId": "maverick-news",
          "name": "Industry news context",
          "modality": "chat",
          "sourcePath": "src/routes/news/+page.svelte",
          "proof": "The news route gives agents a bounded source for current context and public claims."
        },
        {
          "surfaceId": "maverick-oil-gas",
          "name": "Oil and gas service surface",
          "modality": "app",
          "sourcePath": "src/routes/oil-gas/+page.svelte",
          "proof": "The oil and gas route acts as a focused service surface with offer, proof, and next action."
        },
        {
          "surfaceId": "maverick-water-voice",
          "name": "Water treatment voice handoff",
          "modality": "voice",
          "sourcePath": "src/routes/water-treatment/+page.svelte",
          "proof": "The water-treatment route supports concise spoken summaries of sector, problem, proof, and next action."
        },
        {
          "surfaceId": "maverick-glasses-proof",
          "name": "Maverick glasses proof policy",
          "modality": "glasses",
          "sourcePath": "canon-overlay/surface-policy.md",
          "proof": "The overlay policy keeps thin displays to sector, status, proof, owner, and next action."
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
