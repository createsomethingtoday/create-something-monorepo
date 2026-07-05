import type { CanonProjectOverlayManifest } from '@create-something/canon/registry';

export const CANON_PROJECT_OVERLAY_MANIFEST: CanonProjectOverlayManifest = {
  "id": "overlay.io-research-artifact",
  "name": "IO Research Artifact Overlay",
  "owner": "research-team",
  "sourcePackage": "@create-something/io",
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
    "io",
    "research",
    "mcp",
    "artifacts"
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
      "id": "overlay.io-research-artifact.surface-brief",
      "title": "Research artifact proof surface",
      "summary": "A candidate Canon research-artifact template for publishing MCP papers, plugin references, visual summaries, and agent-readable source metadata without promoting one article's content into Canon stable.",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "owner": "research-team",
      "sourcePackage": "@create-something/io",
      "sourcePath": "src/lib/config/fileBasedPapers.ts",
      "tags": [
        "overlay",
        "research",
        "mcp",
        "artifact",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "io-papers-index",
          "name": "Research papers index",
          "modality": "web",
          "sourcePath": "src/routes/papers/+page.svelte",
          "proof": "The papers index exposes file-backed research artifacts through the shared property shell, Canon navigation, and artifact catalog metadata."
        },
        {
          "surfaceId": "io-paper-catalog",
          "name": "File-backed paper catalog",
          "modality": "chat",
          "sourcePath": "src/lib/config/fileBasedPapers.ts",
          "proof": "Checked-in paper metadata gives agents a durable source for title, summary, publication state, and routing without depending on rendered HTML."
        },
        {
          "surfaceId": "io-visual-communication-contract",
          "name": "Research visual communication contract",
          "modality": "app",
          "sourcePath": "src/lib/config/visualCommunication.ts",
          "proof": "The visual communication config binds ASCII, visual summaries, and generated image specs to research artifacts as operator-reviewable evidence."
        },
        {
          "surfaceId": "io-research-voice-summary",
          "name": "Research voice summary policy",
          "modality": "voice",
          "sourcePath": "canon-overlay/copy-rules.md",
          "proof": "The overlay copy rules constrain spoken research summaries to claim, source artifact, proof, and next reading/action rather than long paper bodies."
        },
        {
          "surfaceId": "io-research-glasses-brief",
          "name": "Research glasses brief policy",
          "modality": "glasses",
          "sourcePath": "canon-overlay/surface-policy.md",
          "proof": "The overlay surface policy keeps thin displays to artifact title, status, source, and next action while full papers and diagrams stay on web/app surfaces."
        }
      ],
      "dependencies": [
        "component.clear-proof-strip",
        "template.canon-project-overlay-manifest",
        "template.canon-extension-intake",
        "policy.signal-decision-proof"
      ]
    }
  ]
};
