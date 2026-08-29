export const CANON_PROJECT_OVERLAY_MANIFEST = {
  id: "overlay.draw-native-paired-canvas",
  name: "Draw Native Paired Canvas Overlay",
  owner: "mapping-canvas-team",
  sourcePackage: "@create-something/draw-native",
  sourcePath: "manifest.ts",
  targetModalities: ["web", "chat", "app", "voice", "glasses"],
  tags: ["canon", "overlay", "draw", "native", "iphone", "pairing"],
  artifacts: [
    { kind: "theme", path: "theme.css", description: "Native aliases that retain Performance and Meridian token authority.", registryItemIds: ["token.performance-core"] },
    { kind: "tokens", path: "tokens.json", description: "Paired-canvas aliases without a new product color scale.", registryItemIds: ["token.performance-core"] },
    { kind: "templates", path: "templates", description: "Reusable paired-session surface brief.", registryItemIds: ["template.canon-project-overlay-manifest", "template.canon-extension-intake"] },
    { kind: "copy-rules", path: "copy-rules.md", description: "Stable authority, pairing, and recovery language.", registryItemIds: ["policy.signal-decision-proof"] },
    { kind: "surface-policy", path: "surface-policy.md", description: "Mac/iPhone modality and promotion boundaries.", registryItemIds: ["policy.signal-decision-proof"] },
    { kind: "registry", path: "registry.json", description: "Native overlay dependency metadata.", registryItemIds: ["component.clear-decision-panel", "component.clear-proof-strip", "template.canon-project-overlay-manifest"] }
  ],
  extensionIntakes: [{
    id: "overlay.draw-native-paired-canvas.surface-brief",
    title: "Mac-authoritative paired drawing surface",
    summary: "A candidate Canon pattern for explicit nearby-device pairing, Mac-owned canonical state, companion input, mirrored results, offline reconciliation, and revocation.",
    requestedKind: "template",
    requestedModalities: ["web", "chat", "app", "voice", "glasses"],
    owner: "mapping-canvas-team",
    sourcePackage: "@create-something/draw-native",
    sourcePath: "canon-overlay/templates/surface-brief.md",
    tags: ["overlay", "paired-device", "local-first", "evidence"],
    surfaces: [
      { surfaceId: "draw-native-mac-authority", name: "Draw Mac authority", modality: "app", sourcePath: "src-tauri/src/lib.rs", proof: "Rust owns canonical persistence, monotonic revision, validated replacement, pairing, revoke, and transport state." },
      { surfaceId: "draw-native-iphone-companion", name: "Draw iPhone companion", modality: "app", sourcePath: "README.md", proof: "The compact companion contract submits touch operations, mirrors Mac commits, queues offline work, and exposes recovery state." },
      { surfaceId: "draw-native-session-handoff", name: "Paired-session evidence handoff", modality: "chat", sourcePath: "README.md", proof: "Operator guidance states authority, permissions, recovery, revocation, and production evidence boundaries." },
      { surfaceId: "draw-native-spoken-status", name: "Paired-session spoken status", modality: "voice", sourcePath: "canon-overlay/copy-rules.md", proof: "Copy rules constrain spoken status to connection, queue, owner, and next action." },
      { surfaceId: "draw-native-glance-state", name: "Paired-session glance state", modality: "glasses", sourcePath: "canon-overlay/surface-policy.md", proof: "Thin surfaces expose only authority, connection, queue, revision, and next action." },
      { surfaceId: "draw-native-public-continuity", name: "Draw web continuity", modality: "web", sourcePath: "src-tauri/tauri.conf.json", proof: "The native product packages the mapping-canvas build and therefore reuses the same document and token-governed renderer as the Cloudflare web surface." }
    ],
    dependencies: ["template.canon-project-overlay-manifest", "template.canon-extension-intake", "policy.signal-decision-proof"]
  }]
};
