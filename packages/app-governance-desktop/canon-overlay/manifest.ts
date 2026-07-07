export const CANON_PROJECT_OVERLAY_MANIFEST = {
  "id": "overlay.app-governance-desktop",
  "name": "App Governance Desktop Overlay",
  "owner": "app-governance-team",
  "sourcePackage": "app-governance-desktop",
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
    "app-governance",
    "desktop",
    "operator"
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
      "id": "overlay.app-governance-desktop.surface-brief",
      "title": "App governance desktop operator shell",
      "summary": "A candidate Canon operator-shell template for wrapping governed web surfaces with native keychain storage, high-signal notifications, tray actions, and local proof scripts without promoting app-governance URLs or operator keys into Canon.",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "owner": "app-governance-team",
      "sourcePackage": "app-governance-desktop",
      "sourcePath": "src-tauri/src/main.rs",
      "tags": [
        "overlay",
        "app-governance",
        "desktop",
        "operator",
        "notifications",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "app-governance-desktop-dashboard",
          "name": "Remote governance dashboard",
          "modality": "web",
          "sourcePath": "src-tauri/src/main.rs",
          "proof": "The dashboard window opens the deployed app-governance dashboard as a remote webview while keeping IPC scoped to the local settings window."
        },
        {
          "surfaceId": "app-governance-desktop-live-feed",
          "name": "Live governance signal feed",
          "modality": "chat",
          "sourcePath": "src-tauri/src/events.rs",
          "proof": "The presence event filter turns high-signal collaboration events into concise operator notifications and drops cursors, heartbeats, joins, and malformed frames."
        },
        {
          "surfaceId": "app-governance-desktop-native-shell",
          "name": "Native operator shell",
          "modality": "app",
          "sourcePath": "src-tauri/src/main.rs",
          "proof": "The Tauri tray, Settings page, keychain storage, repo-path validation, and local script runner provide the native app surface around governed web state."
        },
        {
          "surfaceId": "app-governance-desktop-voice-summary",
          "name": "High-signal notification summary",
          "modality": "voice",
          "sourcePath": "src-tauri/src/events.rs",
          "proof": "Notification bodies preserve operator, action, and finding id in a short phrase that can be read aloud without exposing low-signal presence noise."
        },
        {
          "surfaceId": "app-governance-desktop-glasses-policy",
          "name": "Thin-display governance policy",
          "modality": "glasses",
          "sourcePath": "canon-overlay/surface-policy.md",
          "proof": "The overlay policy keeps glanceable displays to surface, owner, signal, receipt, and next action while leaving secrets and full dashboard context in the desktop/web surfaces."
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
