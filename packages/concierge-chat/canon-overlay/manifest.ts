export const CANON_PROJECT_OVERLAY_MANIFEST = {
  "id": "overlay.concierge-chat-staffing",
  "name": "Concierge Chat Staffing Overlay",
  "owner": "concierge-team",
  "sourcePackage": "@create-something/concierge-chat",
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
    "concierge",
    "staffing",
    "chat",
    "jobs"
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
      "id": "overlay.concierge-chat-staffing.surface-brief",
      "title": "Staffing concierge chat surface",
      "summary": "A candidate Canon concierge template for governed chat, staffing intake, job matching, profile receipts, and operator settings without promoting one staffing vertical into Canon stable.",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "owner": "concierge-team",
      "sourcePackage": "@create-something/concierge-chat",
      "sourcePath": "src/routes/chat/+page.svelte",
      "tags": [
        "overlay",
        "concierge",
        "staffing",
        "chat",
        "jobs",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "concierge-home",
          "name": "Concierge staffing home",
          "modality": "web",
          "sourcePath": "src/routes/+page.svelte",
          "proof": "The home route introduces the staffing concierge surface and routes visitors to jobs, nurses, facilities, or chat."
        },
        {
          "surfaceId": "concierge-chat",
          "name": "Governed chat surface",
          "modality": "chat",
          "sourcePath": "src/routes/chat/+page.svelte",
          "proof": "The chat route is the primary conversation surface for progressive profiling, handoff cards, and proof-backed next steps."
        },
        {
          "surfaceId": "concierge-settings",
          "name": "Operator settings surface",
          "modality": "app",
          "sourcePath": "src/routes/settings/+page.svelte",
          "proof": "The settings route gives operators a local app surface for reviewing configuration and handoff state."
        },
        {
          "surfaceId": "concierge-jobs-voice",
          "name": "Jobs voice summary policy",
          "modality": "voice",
          "sourcePath": "src/routes/jobs/+page.svelte",
          "proof": "The jobs route supports short spoken summaries of role, location, fit, proof, and next action."
        },
        {
          "surfaceId": "concierge-glasses-handoff",
          "name": "Concierge glasses handoff policy",
          "modality": "glasses",
          "sourcePath": "canon-overlay/surface-policy.md",
          "proof": "The overlay policy keeps thin displays to candidate/facility state, owner, proof, and next action."
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
