/**
 * V2 API - AI-Native Artifact Operations
 * 
 * Structured artifacts with patch-based updates and versioning.
 */

import { join } from "path";
import type { Server, ServerWebSocket } from "bun";
import {
  type ArtifactV2,
  type PatchOperation,
  defaultStyle,
  defaultContent,
  renderArtifact,
  applyPatch,
  applySimplePatch,
} from "./schema";

// ============ STORAGE ============

interface ArtifactStore {
  artifacts: Record<string, ArtifactV2>;
  history: Record<string, ArtifactV2[]>; // Version history per artifact
}

let store: ArtifactStore = {
  artifacts: {},
  history: {},
};

const STORE_PATH = "./artifacts-v2";

export async function loadV2Store() {
  try {
    const indexFile = Bun.file(join(STORE_PATH, "index.json"));
    if (await indexFile.exists()) {
      store = await indexFile.json();
      console.log(`✓ Loaded ${Object.keys(store.artifacts).length} v2 artifacts`);
    } else {
      // Ensure directory exists
      await Bun.write(join(STORE_PATH, ".gitkeep"), "");
    }
  } catch (e) {
    console.log("→ Starting with empty v2 artifact store");
  }
}

async function saveStore() {
  await Bun.write(
    join(STORE_PATH, "index.json"),
    JSON.stringify(store, null, 2)
  );
}

function generateId(): string {
  return `art-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// ============ BROADCAST ============

let broadcastFn: ((msg: object) => void) | null = null;

export function setBroadcast(fn: (msg: object) => void) {
  broadcastFn = fn;
}

function broadcast(artifactId: string, artifact: ArtifactV2) {
  if (!broadcastFn) return;
  
  const { html, css } = renderArtifact(artifact);
  
  broadcastFn({
    type: "render",
    artifactId,
    html,
    css,
    scope_id: "",
    animations: [],
    animation_css: "",
    timestamp: Date.now(),
    // Include schema for debugging
    schema: artifact,
  });
  
  console.log(`→ V2 Broadcast: ${artifact.name} v${artifact.version}`);
}

// ============ API HANDLERS ============

export interface V2Response {
  status: number;
  body: object;
}

// List all artifacts
export function listArtifacts(): V2Response {
  return {
    status: 200,
    body: {
      artifacts: Object.values(store.artifacts),
      count: Object.keys(store.artifacts).length,
    },
  };
}

// Get single artifact
export function getArtifact(id: string): V2Response {
  const artifact = store.artifacts[id];
  if (!artifact) {
    return { status: 404, body: { error: "Artifact not found" } };
  }
  
  return { status: 200, body: artifact };
}

// Get artifact with rendered HTML/CSS
export function getArtifactRendered(id: string): V2Response {
  const artifact = store.artifacts[id];
  if (!artifact) {
    return { status: 404, body: { error: "Artifact not found" } };
  }
  
  const { html, css } = renderArtifact(artifact);
  
  return {
    status: 200,
    body: {
      ...artifact,
      rendered: { html, css },
    },
  };
}

// Create new artifact
export async function createArtifact(body: {
  name: string;
  type?: ArtifactV2["type"];
  content?: Partial<ArtifactV2["content"]>;
  style?: Partial<ArtifactV2["style"]>;
}): Promise<V2Response> {
  const id = generateId();
  const now = new Date().toISOString();
  
  const artifact: ArtifactV2 = {
    id,
    name: body.name || "Untitled",
    version: 1,
    type: body.type || "card",
    content: { ...defaultContent, ...body.content },
    style: { ...defaultStyle, ...body.style },
    createdAt: now,
    updatedAt: now,
  };
  
  store.artifacts[id] = artifact;
  store.history[id] = [artifact];
  
  await saveStore();
  broadcast(id, artifact);
  
  return { status: 201, body: artifact };
}

// Patch artifact (AI-native updates)
export async function patchArtifact(
  id: string,
  patch: { set?: Record<string, unknown>; delete?: string[] }
): Promise<V2Response> {
  const artifact = store.artifacts[id];
  if (!artifact) {
    return { status: 404, body: { error: "Artifact not found" } };
  }
  
  // Store previous version
  if (!store.history[id]) {
    store.history[id] = [];
  }
  store.history[id].push(JSON.parse(JSON.stringify(artifact)));
  
  // Apply patch
  const updated = applySimplePatch(artifact, patch);
  store.artifacts[id] = updated;
  
  await saveStore();
  broadcast(id, updated);
  
  return {
    status: 200,
    body: {
      artifact: updated,
      previousVersion: artifact.version,
      newVersion: updated.version,
    },
  };
}

// Replace entire artifact
export async function replaceArtifact(
  id: string,
  body: Partial<ArtifactV2>
): Promise<V2Response> {
  const artifact = store.artifacts[id];
  if (!artifact) {
    return { status: 404, body: { error: "Artifact not found" } };
  }
  
  // Store previous version
  if (!store.history[id]) {
    store.history[id] = [];
  }
  store.history[id].push(JSON.parse(JSON.stringify(artifact)));
  
  // Merge updates
  const updated: ArtifactV2 = {
    ...artifact,
    ...body,
    id, // Can't change ID
    version: artifact.version + 1,
    updatedAt: new Date().toISOString(),
  };
  
  store.artifacts[id] = updated;
  
  await saveStore();
  broadcast(id, updated);
  
  return { status: 200, body: updated };
}

// Get version history
export function getHistory(id: string): V2Response {
  const artifact = store.artifacts[id];
  if (!artifact) {
    return { status: 404, body: { error: "Artifact not found" } };
  }
  
  const history = store.history[id] || [];
  
  return {
    status: 200,
    body: {
      artifactId: id,
      currentVersion: artifact.version,
      history: history.map((h) => ({
        version: h.version,
        updatedAt: h.updatedAt,
      })),
      full: history,
    },
  };
}

// Restore specific version
export async function restoreVersion(id: string, version: number): Promise<V2Response> {
  const history = store.history[id];
  if (!history) {
    return { status: 404, body: { error: "Artifact not found" } };
  }
  
  const target = history.find((h) => h.version === version);
  if (!target) {
    return { status: 404, body: { error: `Version ${version} not found` } };
  }
  
  // Store current as new history entry
  const current = store.artifacts[id];
  if (current) {
    history.push(JSON.parse(JSON.stringify(current)));
  }
  
  // Restore with bumped version
  const restored: ArtifactV2 = {
    ...JSON.parse(JSON.stringify(target)),
    version: (current?.version || 0) + 1,
    updatedAt: new Date().toISOString(),
  };
  
  store.artifacts[id] = restored;
  
  await saveStore();
  broadcast(id, restored);
  
  return {
    status: 200,
    body: {
      artifact: restored,
      restoredFrom: version,
    },
  };
}

// Delete artifact
export async function deleteArtifact(id: string): Promise<V2Response> {
  if (!store.artifacts[id]) {
    return { status: 404, body: { error: "Artifact not found" } };
  }
  
  delete store.artifacts[id];
  delete store.history[id];
  
  await saveStore();
  
  return { status: 200, body: { deleted: id } };
}

// Render artifact (for refresh/load by URL)
export function renderArtifactById(id: string): V2Response {
  const artifact = store.artifacts[id];
  if (!artifact) {
    return { status: 404, body: { error: "Artifact not found" } };
  }
  
  broadcast(id, artifact);
  
  return { status: 200, body: { broadcasted: true, version: artifact.version } };
}
