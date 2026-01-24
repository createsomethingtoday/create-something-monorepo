/**
 * UI Bridge Server
 * 
 * Watches files for changes, computes diffs using ui-diff (Rust WASM),
 * and streams operations to connected viewers via WebSocket.
 * 
 * This is the "bridge" between CLI agents editing code and the visual
 * preview in ui-viewer.
 */

import type { Server, ServerWebSocket } from "bun";

// Types
interface Operation {
  type: 'insert' | 'update' | 'delete' | 'move';
  target?: string;
  parent?: string;
  node?: unknown;
  changes?: Array<{ prop: string; from?: string; to: string }>;
  index?: number;
  animate?: string;
}

interface FileChange {
  path: string;
  operations: Operation[];
  timestamp: number;
}

interface ViewerMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping';
  patterns?: string[];
}

// State
const clients = new Set<ServerWebSocket<unknown>>();
const fileContents = new Map<string, string>();
const subscriptions = new Map<ServerWebSocket<unknown>, Set<string>>();

// Configuration
const config = {
  port: parseInt(process.env.UI_BRIDGE_PORT || "4201"),
  watchDir: process.env.UI_BRIDGE_WATCH_DIR || "./src",
  extensions: [".svelte", ".html", ".tsx", ".jsx", ".vue"],
  // CORS origins for embedded viewers (comma-separated)
  corsOrigins: (process.env.UI_BRIDGE_CORS_ORIGINS || "*").split(",").map(o => o.trim()),
};

// WASM functions (will be loaded dynamically)
let wasmDiff: ((before: string, after: string, syntax: string) => string) | null = null;
let wasmRender: ((source: string, syntax: string, previous: string | undefined) => string) | null = null;

async function loadWasm() {
  try {
    // Try to load the WASM module
    const wasmPath = new URL("../wasm/ui_diff.js", import.meta.url);
    const wasm = await import(wasmPath.href);
    await wasm.default();
    wasmDiff = wasm.diff;
    wasmRender = wasm.render_component;
    console.log("✓ WASM diff module loaded");
    console.log("✓ WASM render module loaded");
  } catch (e) {
    console.warn("⚠ WASM module not found, using fallback diff");
    // Fallback: simple text diff that just reports "changed"
    wasmDiff = fallbackDiff;
    wasmRender = null;
  }
}

// Fallback diff when WASM isn't available
function fallbackDiff(before: string, after: string, syntax: string): string {
  if (before === after) return "[]";
  
  // Simple fallback: report the whole file as changed
  return JSON.stringify([{
    type: "update",
    target: "root",
    changes: [{ prop: "content", from: "[previous]", to: "[updated]" }]
  }]);
}

// Determine syntax from file extension
function getSyntax(path: string): string {
  if (path.endsWith(".svelte")) return "svelte";
  if (path.endsWith(".tsx") || path.endsWith(".jsx")) return "react";
  if (path.endsWith(".vue")) return "vue";
  return "html";
}

// Check if a path matches any subscription patterns
function matchesSubscription(path: string, patterns: Set<string>): boolean {
  if (patterns.size === 0) return true; // No patterns = subscribe to all
  
  for (const pattern of patterns) {
    if (path.includes(pattern)) return true;
    // Simple glob support
    if (pattern.includes("*")) {
      const regex = new RegExp(pattern.replace(/\*/g, ".*"));
      if (regex.test(path)) return true;
    }
  }
  return false;
}

// Process a file change (operations mode)
async function processFileChange(path: string): Promise<FileChange | null> {
  const ext = "." + path.split(".").pop();
  if (!config.extensions.includes(ext)) return null;
  
  try {
    const file = Bun.file(path);
    const current = await file.text();
    const previous = fileContents.get(path) || "";
    
    // Skip if content hasn't changed
    if (current === previous) return null;
    
    // Store new content
    fileContents.set(path, current);
    
    // Compute diff
    const syntax = getSyntax(path);
    const opsJson = wasmDiff!(previous, current, syntax);
    const operations: Operation[] = JSON.parse(opsJson);
    
    // Skip if no meaningful operations
    if (operations.length === 0) return null;
    
    return {
      path,
      operations,
      timestamp: Date.now(),
    };
  } catch (e) {
    console.error(`Error processing ${path}:`, e);
    return null;
  }
}

// Process a file change and render (canvas mode)
async function processFileChangeRender(path: string): Promise<RenderResult & { path: string } | null> {
  const ext = "." + path.split(".").pop();
  if (!config.extensions.includes(ext)) return null;
  if (!wasmRender) return null;
  
  try {
    const file = Bun.file(path);
    const current = await file.text();
    const previous = fileContents.get(path);
    
    // Skip if content hasn't changed
    if (current === previous) return null;
    
    // Store new content
    fileContents.set(path, current);
    
    // Render with animations
    const syntax = getSyntax(path);
    const resultJson = wasmRender(current, syntax, previous);
    const result: RenderResult = JSON.parse(resultJson);
    
    return {
      path,
      ...result,
    };
  } catch (e) {
    console.error(`Error rendering ${path}:`, e);
    return null;
  }
}

// Broadcast rendered component to canvas clients
function broadcastRender(result: RenderResult & { path: string }) {
  const message = JSON.stringify({
    type: "render",
    ...result,
    timestamp: Date.now(),
  });
  
  for (const client of clients) {
    client.send(message);
  }
  
  console.log(`→ Render: ${result.path} (${result.animations.length} animations)`);
}

// Broadcast change to subscribed clients
function broadcastChange(change: FileChange) {
  const message = JSON.stringify({
    type: "change",
    ...change,
  });
  
  for (const client of clients) {
    const patterns = subscriptions.get(client) || new Set();
    if (matchesSubscription(change.path, patterns)) {
      client.send(message);
    }
  }
  
  console.log(`→ Broadcast: ${change.path} (${change.operations.length} ops)`);
}

// Broadcast to ALL clients (for simulations)
function broadcastToAll(change: FileChange) {
  const message = JSON.stringify({
    type: "change",
    ...change,
  });
  
  for (const client of clients) {
    client.send(message);
  }
  
  console.log(`→ Simulate: ${change.path} (${change.operations.length} ops) to ${clients.size} clients`);
}

// CORS headers helper
function corsHeaders(origin?: string): HeadersInit {
  const allowedOrigin = config.corsOrigins.includes("*") 
    ? "*" 
    : (origin && config.corsOrigins.includes(origin) ? origin : config.corsOrigins[0]);
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

// Simulation request interface
interface SimulateRequest {
  path: string;
  before: string;
  after: string;
  syntax?: string;
}

// Sequence request interface
interface SequenceRequest {
  path: string;
  steps: Array<{
    before: string;
    after: string;
    delay?: number; // ms between steps
  }>;
  syntax?: string;
}

// Render request interface
interface RenderRequest {
  source: string;
  syntax?: string;
  previous?: string; // For animation generation
}

// Render file request interface
interface RenderFileRequest {
  path: string;
  syntax?: string;
}

// Artifact interfaces
interface Artifact {
  id: string;
  name: string;
  source: string;        // Full HTML/CSS source
  createdAt: string;
  updatedAt: string;
  sourceComponent?: string; // Original component path if cloned
}

interface ArtifactStore {
  artifacts: Record<string, Artifact>;
  activeArtifact: string | null;
}

// Artifact store (in-memory, persisted to file)
let artifactStore: ArtifactStore = {
  artifacts: {},
  activeArtifact: null,
};

const ARTIFACTS_PATH = resolve("./artifacts");

// Load artifacts from disk
async function loadArtifacts() {
  try {
    const indexFile = Bun.file(join(ARTIFACTS_PATH, "index.json"));
    if (await indexFile.exists()) {
      artifactStore = await indexFile.json();
      console.log(`✓ Loaded ${Object.keys(artifactStore.artifacts).length} artifacts`);
    }
  } catch (e) {
    console.log("→ Starting with empty artifact store");
  }
}

// Save artifacts to disk
async function saveArtifacts() {
  await Bun.write(
    join(ARTIFACTS_PATH, "index.json"),
    JSON.stringify(artifactStore, null, 2)
  );
}

// Generate artifact ID
function generateArtifactId(): string {
  return `artifact-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Render result from WASM
interface RenderResult {
  html: string;
  css: string;
  scope_id: string;
  animations: Array<{
    selector: string;
    name: string;
    keyframes: string;
    duration_ms: number;
    easing: string;
    fill_mode: string;
  }>;
  animation_css: string;
}

// Process a simulation (no file system)
function processSimulation(req: SimulateRequest): FileChange | null {
  if (!wasmDiff) return null;
  
  const syntax = req.syntax || getSyntax(req.path);
  const opsJson = wasmDiff(req.before, req.after, syntax);
  const operations: Operation[] = JSON.parse(opsJson);
  
  if (operations.length === 0) return null;
  
  return {
    path: req.path,
    operations,
    timestamp: Date.now(),
  };
}

// Start file watcher using fs.watch (more compatible)
import { watch } from "fs";
import { join, resolve } from "path";

// V2 AI-Native API
import {
  loadV2Store,
  setBroadcast,
  listArtifacts as listV2Artifacts,
  getArtifact as getV2Artifact,
  getArtifactRendered,
  createArtifact as createV2Artifact,
  patchArtifact,
  replaceArtifact,
  getHistory,
  restoreVersion,
  deleteArtifact as deleteV2Artifact,
  renderArtifactById,
} from "./v2-api";

// Mode: "operations" (AST diffs) or "render" (full HTML/CSS)
const watchMode = process.env.UI_BRIDGE_MODE || "render";

function startWatcher() {
  const watchPath = resolve(config.watchDir);
  
  console.log(`👁 Watching: ${watchPath}`);
  console.log(`📋 Mode: ${watchMode}`);
  
  // Use Node-compatible fs.watch (works in Bun)
  const watcher = watch(watchPath, { recursive: true }, async (eventType, filename) => {
    if (!filename) return;
    
    const fullPath = join(watchPath, filename);
    
    if (watchMode === "render" && wasmRender) {
      // Canvas mode: send rendered HTML/CSS
      const result = await processFileChangeRender(fullPath);
      if (result) {
        broadcastRender(result);
      }
    } else {
      // Operations mode: send AST diffs
      const change = await processFileChange(fullPath);
      if (change) {
        broadcastChange(change);
      }
    }
  });
  
  // Handle watcher errors
  watcher.on("error", (err) => {
    console.error("Watcher error:", err);
  });
  
  return watcher;
}

// Start WebSocket server
function startServer(): Server {
  return Bun.serve({
    port: config.port,
    
    async fetch(req, server) {
      const origin = req.headers.get("Origin") || undefined;
      
      // Handle CORS preflight
      if (req.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: corsHeaders(origin),
        });
      }
      
      // Upgrade WebSocket connections
      if (server.upgrade(req)) {
        return;
      }
      
      // HTTP endpoints
      const url = new URL(req.url);
      
      // Health check
      if (url.pathname === "/health") {
        return new Response(JSON.stringify({ 
          status: "ok",
          clients: clients.size,
          watching: config.watchDir,
        }), {
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders(origin),
          },
        });
      }
      
      // Simulation API - inject changes without filesystem
      if (url.pathname === "/api/simulate" && req.method === "POST") {
        try {
          const body = await req.json() as SimulateRequest;
          
          if (!body.path || body.before === undefined || body.after === undefined) {
            return new Response(JSON.stringify({ 
              error: "Missing required fields: path, before, after" 
            }), {
              status: 400,
              headers: { 
                "Content-Type": "application/json",
                ...corsHeaders(origin),
              },
            });
          }
          
          const change = processSimulation(body);
          
          if (change) {
            broadcastToAll(change);
            return new Response(JSON.stringify({ 
              success: true,
              operations: change.operations.length,
              clients: clients.size,
            }), {
              headers: { 
                "Content-Type": "application/json",
                ...corsHeaders(origin),
              },
            });
          }
          
          return new Response(JSON.stringify({ 
            success: true,
            operations: 0,
            message: "No changes detected",
          }), {
            headers: { 
              "Content-Type": "application/json",
              ...corsHeaders(origin),
            },
          });
        } catch (e) {
          return new Response(JSON.stringify({ 
            error: "Invalid request body" 
          }), {
            status: 400,
            headers: { 
              "Content-Type": "application/json",
              ...corsHeaders(origin),
            },
          });
        }
      }
      
      // Sequence API - run a sequence of simulations with delays
      if (url.pathname === "/api/sequence" && req.method === "POST") {
        try {
          const body = await req.json() as SequenceRequest;
          
          if (!body.path || !body.steps || !Array.isArray(body.steps)) {
            return new Response(JSON.stringify({ 
              error: "Missing required fields: path, steps[]" 
            }), {
              status: 400,
              headers: { 
                "Content-Type": "application/json",
                ...corsHeaders(origin),
              },
            });
          }
          
          // Run sequence in background
          (async () => {
            for (let i = 0; i < body.steps.length; i++) {
              const step = body.steps[i];
              const change = processSimulation({
                path: body.path,
                before: step.before,
                after: step.after,
                syntax: body.syntax,
              });
              
              if (change) {
                broadcastToAll(change);
              }
              
              // Wait before next step
              const delay = step.delay ?? 500;
              if (i < body.steps.length - 1 && delay > 0) {
                await new Promise(r => setTimeout(r, delay));
              }
            }
          })();
          
          return new Response(JSON.stringify({ 
            success: true,
            steps: body.steps.length,
            message: "Sequence started",
          }), {
            headers: { 
              "Content-Type": "application/json",
              ...corsHeaders(origin),
            },
          });
        } catch (e) {
          return new Response(JSON.stringify({ 
            error: "Invalid request body" 
          }), {
            status: 400,
            headers: { 
              "Content-Type": "application/json",
              ...corsHeaders(origin),
            },
          });
        }
      }
      
      // Reset API - clear all connected viewers
      if (url.pathname === "/api/reset" && req.method === "POST") {
        const message = JSON.stringify({ type: "reset" });
        for (const client of clients) {
          client.send(message);
        }
        return new Response(JSON.stringify({ 
          success: true,
          clients: clients.size,
        }), {
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders(origin),
          },
        });
      }
      
      // Render API - render component to HTML with styles and animations
      if (url.pathname === "/api/render" && req.method === "POST") {
        try {
          const body = await req.json() as RenderRequest;
          
          if (!body.source) {
            return new Response(JSON.stringify({ 
              error: "Missing required field: source" 
            }), {
              status: 400,
              headers: { 
                "Content-Type": "application/json",
                ...corsHeaders(origin),
              },
            });
          }
          
          if (!wasmRender) {
            return new Response(JSON.stringify({ 
              error: "Render module not available" 
            }), {
              status: 500,
              headers: { 
                "Content-Type": "application/json",
                ...corsHeaders(origin),
              },
            });
          }
          
          const syntax = body.syntax || "svelte";
          const resultJson = wasmRender(body.source, syntax, body.previous);
          const result: RenderResult = JSON.parse(resultJson);
          
          // Optionally broadcast to connected clients
          const broadcast = url.searchParams.get("broadcast") === "true";
          if (broadcast) {
            const message = JSON.stringify({
              type: "render",
              ...result,
              timestamp: Date.now(),
            });
            for (const client of clients) {
              client.send(message);
            }
          }
          
          return new Response(JSON.stringify(result), {
            headers: { 
              "Content-Type": "application/json",
              ...corsHeaders(origin),
            },
          });
        } catch (e) {
          console.error("Render error:", e);
          return new Response(JSON.stringify({ 
            error: "Render failed",
            details: String(e),
          }), {
            status: 500,
            headers: { 
              "Content-Type": "application/json",
              ...corsHeaders(origin),
            },
          });
        }
      }
      
      // Render file API - render a file by path (for agents)
      if (url.pathname === "/api/render-file" && req.method === "POST") {
        try {
          const body = await req.json() as RenderFileRequest;
          
          if (!body.path) {
            return new Response(JSON.stringify({ 
              error: "Missing required field: path" 
            }), {
              status: 400,
              headers: { 
                "Content-Type": "application/json",
                ...corsHeaders(origin),
              },
            });
          }
          
          if (!wasmRender) {
            return new Response(JSON.stringify({ 
              error: "Render module not available" 
            }), {
              status: 500,
              headers: { 
                "Content-Type": "application/json",
                ...corsHeaders(origin),
              },
            });
          }
          
          // Resolve path (relative to watch dir or absolute)
          const filePath = body.path.startsWith("/") 
            ? body.path 
            : join(resolve(config.watchDir), body.path);
          
          // Read file
          const file = Bun.file(filePath);
          const exists = await file.exists();
          
          if (!exists) {
            return new Response(JSON.stringify({ 
              error: `File not found: ${filePath}` 
            }), {
              status: 404,
              headers: { 
                "Content-Type": "application/json",
                ...corsHeaders(origin),
              },
            });
          }
          
          const source = await file.text();
          const previous = fileContents.get(filePath);
          
          // Store for future diffs
          fileContents.set(filePath, source);
          
          // Render
          const syntax = body.syntax || getSyntax(filePath);
          const resultJson = wasmRender(source, syntax, previous);
          const result: RenderResult = JSON.parse(resultJson);
          
          // Broadcast to connected clients
          const broadcast = url.searchParams.get("broadcast") !== "false";
          if (broadcast) {
            const message = JSON.stringify({
              type: "render",
              path: filePath,
              ...result,
              timestamp: Date.now(),
            });
            for (const client of clients) {
              client.send(message);
            }
            console.log(`→ Render file: ${filePath} (${result.animations.length} animations)`);
          }
          
          return new Response(JSON.stringify({
            path: filePath,
            ...result,
          }), {
            headers: { 
              "Content-Type": "application/json",
              ...corsHeaders(origin),
            },
          });
        } catch (e) {
          console.error("Render file error:", e);
          return new Response(JSON.stringify({ 
            error: "Render failed",
            details: String(e),
          }), {
            status: 500,
            headers: { 
              "Content-Type": "application/json",
              ...corsHeaders(origin),
            },
          });
        }
      }
      
      // ====== ARTIFACT API ======
      
      // List artifacts
      if (url.pathname === "/api/artifacts" && req.method === "GET") {
        return new Response(JSON.stringify({
          artifacts: Object.values(artifactStore.artifacts),
          activeArtifact: artifactStore.activeArtifact,
        }), {
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders(origin),
          },
        });
      }
      
      // Create new artifact
      if (url.pathname === "/api/artifacts" && req.method === "POST") {
        try {
          const body = await req.json() as { name: string; source?: string; fromComponent?: string };
          
          const id = generateArtifactId();
          let source = body.source || `<style>\n.container {\n  padding: 2rem;\n  background: #1a1a2e;\n  border-radius: 12px;\n  color: white;\n}\n</style>\n<div class="container">\n  <h1>${body.name}</h1>\n  <p>Start editing...</p>\n</div>`;
          
          // Clone from existing component if specified
          if (body.fromComponent) {
            const componentPath = body.fromComponent.startsWith("/") 
              ? body.fromComponent 
              : join(resolve(config.watchDir), body.fromComponent);
            const file = Bun.file(componentPath);
            if (await file.exists()) {
              source = await file.text();
            }
          }
          
          const artifact: Artifact = {
            id,
            name: body.name,
            source,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sourceComponent: body.fromComponent,
          };
          
          artifactStore.artifacts[id] = artifact;
          artifactStore.activeArtifact = id;
          await saveArtifacts();
          
          // Save artifact source file
          await Bun.write(join(ARTIFACTS_PATH, `${id}.html`), source);
          
          // Render and broadcast
          if (wasmRender) {
            const resultJson = wasmRender(source, "svelte", undefined);
            const result: RenderResult = JSON.parse(resultJson);
            const message = JSON.stringify({
              type: "render",
              artifactId: id,
              ...result,
              timestamp: Date.now(),
            });
            for (const client of clients) {
              client.send(message);
            }
          }
          
          return new Response(JSON.stringify(artifact), {
            headers: { 
              "Content-Type": "application/json",
              ...corsHeaders(origin),
            },
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: String(e) }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
          });
        }
      }
      
      // Get artifact
      if (url.pathname.startsWith("/api/artifacts/") && req.method === "GET") {
        const id = url.pathname.split("/").pop();
        const artifact = artifactStore.artifacts[id!];
        
        if (!artifact) {
          return new Response(JSON.stringify({ error: "Artifact not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
          });
        }
        
        return new Response(JSON.stringify(artifact), {
          headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
        });
      }
      
      // Update artifact (AI edits here)
      if (url.pathname.startsWith("/api/artifacts/") && req.method === "PUT") {
        try {
          const id = url.pathname.split("/").pop();
          const artifact = artifactStore.artifacts[id!];
          
          if (!artifact) {
            return new Response(JSON.stringify({ error: "Artifact not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
            });
          }
          
          const body = await req.json() as { source: string };
          const previous = artifact.source;
          
          artifact.source = body.source;
          artifact.updatedAt = new Date().toISOString();
          await saveArtifacts();
          
          // Save artifact source file
          await Bun.write(join(ARTIFACTS_PATH, `${id}.html`), body.source);
          
          // Render with animations and broadcast
          if (wasmRender) {
            const resultJson = wasmRender(body.source, "svelte", previous);
            const result: RenderResult = JSON.parse(resultJson);
            const message = JSON.stringify({
              type: "render",
              artifactId: id,
              ...result,
              timestamp: Date.now(),
            });
            for (const client of clients) {
              client.send(message);
            }
            console.log(`→ Artifact update: ${artifact.name} (${result.animations.length} animations)`);
          }
          
          return new Response(JSON.stringify(artifact), {
            headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: String(e) }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
          });
        }
      }
      
      // Promote artifact to production component
      if (url.pathname === "/api/artifacts/promote" && req.method === "POST") {
        try {
          const body = await req.json() as { artifactId: string; targetPath: string };
          const artifact = artifactStore.artifacts[body.artifactId];
          
          if (!artifact) {
            return new Response(JSON.stringify({ error: "Artifact not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
            });
          }
          
          // Write to target component file
          const targetPath = body.targetPath.startsWith("/")
            ? body.targetPath
            : join(resolve(config.watchDir), body.targetPath);
          
          await Bun.write(targetPath, artifact.source);
          
          return new Response(JSON.stringify({ 
            success: true, 
            promotedTo: targetPath,
            artifact: artifact.name,
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: String(e) }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
          });
        }
      }
      
      // ====== V2 AI-NATIVE API ======
      
      // List v2 artifacts
      if (url.pathname === "/api/v2/artifacts" && req.method === "GET") {
        const result = listV2Artifacts();
        return new Response(JSON.stringify(result.body), {
          status: result.status,
          headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
        });
      }
      
      // Create v2 artifact
      if (url.pathname === "/api/v2/artifacts" && req.method === "POST") {
        const body = await req.json();
        const result = await createV2Artifact(body);
        return new Response(JSON.stringify(result.body), {
          status: result.status,
          headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
        });
      }
      
      // Get v2 artifact
      if (url.pathname.match(/^\/api\/v2\/artifacts\/[\w-]+$/) && req.method === "GET") {
        const id = url.pathname.split("/").pop()!;
        const withRender = url.searchParams.get("render") === "true";
        const result = withRender ? getArtifactRendered(id) : getV2Artifact(id);
        return new Response(JSON.stringify(result.body), {
          status: result.status,
          headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
        });
      }
      
      // Patch v2 artifact (AI-native)
      if (url.pathname.match(/^\/api\/v2\/artifacts\/[\w-]+$/) && req.method === "PATCH") {
        const id = url.pathname.split("/").pop()!;
        const body = await req.json();
        const result = await patchArtifact(id, body);
        return new Response(JSON.stringify(result.body), {
          status: result.status,
          headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
        });
      }
      
      // Replace v2 artifact
      if (url.pathname.match(/^\/api\/v2\/artifacts\/[\w-]+$/) && req.method === "PUT") {
        const id = url.pathname.split("/").pop()!;
        const body = await req.json();
        const result = await replaceArtifact(id, body);
        return new Response(JSON.stringify(result.body), {
          status: result.status,
          headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
        });
      }
      
      // Delete v2 artifact
      if (url.pathname.match(/^\/api\/v2\/artifacts\/[\w-]+$/) && req.method === "DELETE") {
        const id = url.pathname.split("/").pop()!;
        const result = await deleteV2Artifact(id);
        return new Response(JSON.stringify(result.body), {
          status: result.status,
          headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
        });
      }
      
      // Get version history
      if (url.pathname.match(/^\/api\/v2\/artifacts\/[\w-]+\/history$/) && req.method === "GET") {
        const id = url.pathname.split("/")[4];
        const result = getHistory(id);
        return new Response(JSON.stringify(result.body), {
          status: result.status,
          headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
        });
      }
      
      // Restore version
      if (url.pathname.match(/^\/api\/v2\/artifacts\/[\w-]+\/restore$/) && req.method === "POST") {
        const id = url.pathname.split("/")[4];
        const body = await req.json();
        const result = await restoreVersion(id, body.version);
        return new Response(JSON.stringify(result.body), {
          status: result.status,
          headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
        });
      }
      
      // Render/broadcast artifact (for URL refresh)
      if (url.pathname.match(/^\/api\/v2\/artifacts\/[\w-]+\/render$/) && req.method === "POST") {
        const id = url.pathname.split("/")[4];
        const result = renderArtifactById(id);
        return new Response(JSON.stringify(result.body), {
          status: result.status,
          headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
        });
      }
      
      // Info page
      if (url.pathname === "/") {
        return new Response(`
          UI Bridge Server
          
          WebSocket: ws://localhost:${config.port}
          Health: http://localhost:${config.port}/health
          
          === V2 AI-Native API (NEW) ===
          
          POST   /api/v2/artifacts              Create artifact (structured JSON)
          GET    /api/v2/artifacts              List all artifacts
          GET    /api/v2/artifacts/:id          Get artifact
          PATCH  /api/v2/artifacts/:id          Patch artifact (AI-native!)
          PUT    /api/v2/artifacts/:id          Replace artifact
          DELETE /api/v2/artifacts/:id          Delete artifact
          GET    /api/v2/artifacts/:id/history  Version history
          POST   /api/v2/artifacts/:id/restore  Restore version
          POST   /api/v2/artifacts/:id/render   Re-render & broadcast
          
          Example PATCH (minimal tokens):
            curl -X PATCH /api/v2/artifacts/:id -d '{"set": {"content.icon": "🚀"}}'
          
          === V1 Legacy API ===
          
          Artifact API:
            GET  /api/artifacts         - List all artifacts
            POST /api/artifacts         - Create new artifact
            GET  /api/artifacts/:id     - Get artifact
            PUT  /api/artifacts/:id     - Update artifact (full source)
          
          Watching: ${config.watchDir}
          V2 Artifacts: ${Object.keys(listV2Artifacts().body).length}
        `.trim(), {
          headers: { 
            "Content-Type": "text/plain",
            ...corsHeaders(origin),
          },
        });
      }
      
      return new Response("Not Found", { status: 404 });
    },
    
    websocket: {
      open(ws) {
        clients.add(ws);
        subscriptions.set(ws, new Set());
        console.log(`+ Client connected (${clients.size} total)`);
        
        // Send welcome message
        ws.send(JSON.stringify({
          type: "connected",
          watching: config.watchDir,
          extensions: config.extensions,
        }));
      },
      
      close(ws) {
        clients.delete(ws);
        subscriptions.delete(ws);
        console.log(`- Client disconnected (${clients.size} total)`);
      },
      
      message(ws, message) {
        try {
          const data: ViewerMessage = JSON.parse(message.toString());
          
          switch (data.type) {
            case "subscribe":
              // Update subscription patterns
              const patterns = subscriptions.get(ws) || new Set();
              for (const pattern of data.patterns || []) {
                patterns.add(pattern);
              }
              subscriptions.set(ws, patterns);
              console.log(`  Subscribed to: ${data.patterns?.join(", ")}`);
              break;
              
            case "unsubscribe":
              subscriptions.set(ws, new Set());
              break;
              
            case "ping":
              ws.send(JSON.stringify({ type: "pong" }));
              break;
          }
        } catch (e) {
          console.error("Invalid message:", e);
        }
      },
    },
  });
}

// Main
async function main() {
  console.log(`
╔═══════════════════════════════════════╗
║         UI Bridge Server              ║
║   AI-Native Design Canvas             ║
╚═══════════════════════════════════════╝
`);
  
  await loadWasm();
  await loadArtifacts();
  await loadV2Store();
  
  // Set up V2 broadcast function
  setBroadcast((msg: object) => {
    const message = JSON.stringify(msg);
    for (const client of clients) {
      client.send(message);
    }
  });
  
  const server = startServer();
  console.log(`⚡ Server: http://localhost:${config.port}`);
  console.log(`⚡ WebSocket: ws://localhost:${config.port}`);
  console.log(`⚡ V2 API: http://localhost:${config.port}/api/v2/artifacts`);
  
  // Start watcher
  startWatcher();
  
  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n\nShutting down...");
    server.stop();
    process.exit(0);
  });
}

main();
