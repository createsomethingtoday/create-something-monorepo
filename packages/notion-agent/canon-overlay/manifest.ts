import type { CanonProjectOverlayManifest } from '@create-something/canon/registry';

export const CANON_PROJECT_OVERLAY_MANIFEST: CanonProjectOverlayManifest = {
  "id": "overlay.notion-agent-workspace",
  "name": "Notion Agent Workspace Overlay",
  "owner": "notion-agent-team",
  "sourcePackage": "@create-something/notion-agent",
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
    "notion",
    "agents",
    "workspace",
    "dashboard"
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
      "id": "overlay.notion-agent-workspace.surface-brief",
      "title": "Notion agent workspace surface",
      "summary": "A candidate Canon workspace-agent template for OAuth entry, dashboard review, execution APIs, and compact operator handoffs without promoting Notion-specific tool details into Canon.",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "owner": "notion-agent-team",
      "sourcePackage": "@create-something/notion-agent",
      "sourcePath": "src/routes/dashboard/+page.svelte",
      "tags": [
        "overlay",
        "notion",
        "agents",
        "workspace",
        "dashboard",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "notion-agent-home",
          "name": "Notion agent public home",
          "modality": "web",
          "sourcePath": "src/routes/+page.svelte",
          "proof": "The home route explains the Notion agent offer and directs operators toward the authenticated workspace flow."
        },
        {
          "surfaceId": "notion-agent-execute-api",
          "name": "Agent execution handoff API",
          "modality": "chat",
          "sourcePath": "src/routes/api/execute/+server.ts",
          "proof": "The execution API gives chat/agent handoffs a durable source for action, result, and receipt state."
        },
        {
          "surfaceId": "notion-agent-dashboard",
          "name": "Workspace dashboard",
          "modality": "app",
          "sourcePath": "src/routes/dashboard/+page.svelte",
          "proof": "The dashboard route is the operator-facing app surface for agent state and workspace receipts."
        },
        {
          "surfaceId": "notion-agent-voice-policy",
          "name": "Workspace voice handoff policy",
          "modality": "voice",
          "sourcePath": "canon-overlay/copy-rules.md",
          "proof": "The copy rules constrain spoken summaries to workspace, action, proof, owner, and next step."
        },
        {
          "surfaceId": "notion-agent-glasses-policy",
          "name": "Workspace glasses state policy",
          "modality": "glasses",
          "sourcePath": "canon-overlay/surface-policy.md",
          "proof": "The surface policy keeps glasses output to workspace state, owner, proof, and next action."
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
