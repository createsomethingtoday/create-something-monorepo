import type { CanonProjectOverlayManifest } from '@create-something/canon/registry';

export const CANON_PROJECT_OVERLAY_MANIFEST: CanonProjectOverlayManifest = {
  "id": "overlay.lms-workflow-learning",
  "name": "LMS Workflow Learning Overlay",
  "owner": "learning-team",
  "sourcePackage": "@create-something/lms",
  "sourcePath": "manifest.ts",
  "targetModalities": [
    "web",
    "app",
    "chat",
    "voice",
    "glasses"
  ],
  "tags": [
    "canon",
    "overlay",
    "project",
    "learning",
    "workflow-proof",
    "canon-training",
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
        "template.canon-project-overlay-template-pack",
        "template.canon-project-overlay-manifest"
      ]
    }
  ],
  "extensionIntakes": [
    {
      "id": "overlay.lms-workflow-learning.lesson-proof-surface",
      "title": "Workflow learning proof surface",
      "summary": "A candidate Canon learning template for teaching workflow proof across lesson content, path navigation, progress receipts, and event telemetry without promoting one course's copy into Canon stable.",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "owner": "learning-team",
      "sourcePackage": "@create-something/lms",
      "sourcePath": "src/lib/content/lessons/make-your-workflow-visible/what-images-prove.md",
      "tags": [
        "overlay",
        "learning",
        "workflow-proof",
        "receipt",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "lms-workflow-proof-lesson",
          "name": "Workflow proof lesson content",
          "modality": "web",
          "sourcePath": "src/lib/content/lessons/make-your-workflow-visible/what-images-prove.md",
          "proof": "Lesson teaches the Canon image rule and asks operators to name object, state, proof, and owner before using a workflow image."
        },
        {
          "surfaceId": "lms-workflow-path-page",
          "name": "Make Your Workflow Visible path page",
          "modality": "web",
          "sourcePath": "src/routes/paths/[id]/+page.svelte",
          "proof": "Path page renders the Canon workflow-visibility lesson sequence from PATHS, linking each lesson into a reusable operator learning flow."
        },
        {
          "surfaceId": "lms-progress-receipt",
          "name": "Learning progress receipt",
          "modality": "app",
          "sourcePath": "src/routes/progress/+page.svelte",
          "proof": "Progress surface shows paths completed, lessons completed, overall progress, and time learning so the workflow-learning overlay has an operational receipt."
        },
        {
          "surfaceId": "lms-learning-event-api",
          "name": "Learning event handoff API",
          "modality": "chat",
          "sourcePath": "src/routes/api/events/+server.ts",
          "proof": "Authenticated event API records property, event type, and metadata from CREATE SOMETHING properties, giving chat/agent handoffs a durable learning event channel."
        },
        {
          "surfaceId": "lms-learning-voice-coach",
          "name": "Learning voice coach policy",
          "modality": "voice",
          "sourcePath": "canon-overlay/copy-rules.md",
          "proof": "Overlay copy rules constrain spoken learning guidance to path, lesson, object, state, proof, owner, and next exercise instead of reading full lesson content."
        },
        {
          "surfaceId": "lms-learning-glasses-progress",
          "name": "Learning glasses progress policy",
          "modality": "glasses",
          "sourcePath": "canon-overlay/surface-policy.md",
          "proof": "Overlay surface policy keeps thin displays to current path, lesson state, progress receipt, owner, and next action while lesson bodies stay on web/app surfaces."
        }
      ],
      "dependencies": [
        "component.clear-proof-strip",
        "template.canon-project-overlay-manifest",
        "template.canon-project-overlay-template-pack",
        "template.canon-extension-intake",
        "policy.signal-decision-proof"
      ]
    }
  ]
};
