#!/usr/bin/env node
/**
 * UI Preview MCP Server
 * 
 * Provides visual feedback tools for AI agents working on UI components.
 * 
 * Tools:
 *   - ui_preview_start: Start watching a directory for component changes
 *   - ui_preview_stop: Stop the preview server
 *   - ui_preview_status: Check if preview is running and get URLs
 *   - ui_preview_open: Open the viewer in browser
 * 
 * Resources:
 *   - ui://status: Current preview status
 *   - ui://viewer: Viewer URL
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn, spawnSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import { join, resolve } from "path";
import { homedir } from "os";

const STATE_FILE = join(homedir(), ".ui-preview.json");
const LIBRARY_DIR = join(homedir(), ".ui-preview-library");
const LIBRARY_FILE = join(LIBRARY_DIR, "library.json");

interface PreviewState {
  bridgePid?: number;
  viewerPid?: number;
  watchDir: string;
  bridgePort: number;
  viewerPort: number;
  startedAt: string;
}

interface LibraryComponent {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  tree: unknown;
  sourcePath?: string;
  savedAt: string;
  updatedAt: string;
}

interface ComponentLibrary {
  version: string;
  components: LibraryComponent[];
}

function ensureLibraryDir(): void {
  if (!existsSync(LIBRARY_DIR)) {
    require("fs").mkdirSync(LIBRARY_DIR, { recursive: true });
  }
}

function readLibrary(): ComponentLibrary {
  ensureLibraryDir();
  if (!existsSync(LIBRARY_FILE)) {
    return { version: "1.0", components: [] };
  }
  try {
    return JSON.parse(readFileSync(LIBRARY_FILE, "utf-8"));
  } catch {
    return { version: "1.0", components: [] };
  }
}

function readState(): PreviewState | null {
  if (!existsSync(STATE_FILE)) return null;
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return null;
  }
}

function writeState(state: PreviewState): void {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function clearState(): void {
  if (existsSync(STATE_FILE)) unlinkSync(STATE_FILE);
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Open URL in browser and bring to front (macOS)
 */
function openAndFocus(url: string): void {
  if (process.platform === "darwin") {
    // macOS: open URL and bring browser to front
    spawnSync("open", [url]);
  } else if (process.platform === "win32") {
    spawnSync("start", [url], { shell: true });
  } else {
    spawnSync("xdg-open", [url]);
  }
}

/**
 * Focus existing browser tab with canvas (macOS only)
 */
function focusCanvasTab(): void {
  if (process.platform !== "darwin") return;
  
  // AppleScript to focus Chrome/Safari tab containing canvas
  const script = `
    tell application "System Events"
      set frontApp to name of first application process whose frontmost is true
    end tell
    
    -- Try Chrome first
    if application "Google Chrome" is running then
      tell application "Google Chrome"
        repeat with w in windows
          repeat with t in tabs of w
            if URL of t contains "localhost:4200/canvas" then
              set active tab index of w to (index of t)
              set index of w to 1
              activate
              return "focused"
            end if
          end repeat
        end repeat
      end tell
    end if
    
    -- Try Safari
    if application "Safari" is running then
      tell application "Safari"
        repeat with w in windows
          repeat with t in tabs of w
            if URL of t contains "localhost:4200/canvas" then
              set current tab of w to t
              set index of w to 1
              activate
              return "focused"
            end if
          end repeat
        end repeat
      end tell
    end if
    
    return "not found"
  `;
  
  try {
    spawnSync("osascript", ["-e", script], { timeout: 2000 });
  } catch {
    // Silently fail - focus is nice-to-have
  }
}

function findMonorepoRoot(startDir: string): string {
  let dir = startDir;
  while (dir !== "/") {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    dir = resolve(dir, "..");
  }
  return startDir;
}

/**
 * Check if the bridge is reachable
 */
async function isBridgeReachable(port: number = 4201): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}/api/v2/artifacts`, {
      method: "GET",
      signal: AbortSignal.timeout(1000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Auto-start the bridge if not running. Returns status.
 */
async function ensureBridgeRunning(): Promise<{ 
  running: boolean; 
  autoStarted: boolean; 
  error?: string;
  port: number;
}> {
  const state = readState();
  const port = state?.bridgePort || 4201;
  
  // Check if already running
  if (await isBridgeReachable(port)) {
    return { running: true, autoStarted: false, port };
  }
  
  // Try to auto-start
  const monorepoRoot = findMonorepoRoot(process.cwd());
  const bridgePath = join(monorepoRoot, "packages/ui-bridge");
  
  if (!existsSync(bridgePath)) {
    return { 
      running: false, 
      autoStarted: false, 
      error: `Bridge not found at ${bridgePath}. Run from monorepo root.`,
      port 
    };
  }
  
  // Start bridge
  const bridge = spawn("bun", ["run", "src/index.ts"], {
    cwd: bridgePath,
    env: {
      ...process.env,
      UI_BRIDGE_PORT: String(port),
    },
    detached: true,
    stdio: "ignore",
  });
  bridge.unref();
  
  // Update state
  writeState({
    bridgePid: bridge.pid,
    watchDir: bridgePath,
    bridgePort: port,
    viewerPort: 4200,
    startedAt: new Date().toISOString(),
  });
  
  // Wait for bridge to be ready (up to 5 seconds)
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 500));
    if (await isBridgeReachable(port)) {
      return { running: true, autoStarted: true, port };
    }
  }
  
  return { 
    running: false, 
    autoStarted: false, 
    error: "Bridge started but not responding. Check logs.",
    port 
  };
}

// Create MCP server
const server = new Server(
  {
    name: "ui-preview",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Define tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "ui_preview_start",
      description: "Start the UI preview server to watch component files for changes. Opens a viewer window showing live updates as you edit.",
      inputSchema: {
        type: "object",
        properties: {
          watchDir: {
            type: "string",
            description: "Directory to watch for component changes (default: current directory)",
          },
        },
      },
    },
    {
      name: "ui_preview_stop",
      description: "Stop the UI preview server",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "ui_preview_status",
      description: "Check if UI preview is running and get connection details",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "ui_preview_open",
      description: "Open the UI preview viewer in the default browser",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "ui_library_list",
      description: "List all saved components in the design library",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "ui_library_get",
      description: "Get a saved component from the library by ID",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Component ID",
          },
        },
        required: ["id"],
      },
    },
    {
      name: "ui_preview_simulate",
      description: "Simulate a component change in the viewer without modifying files. Use this to preview what a UI change will look like before applying it, or to demonstrate the result of an automation.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Virtual file path (e.g., 'Component.svelte')",
          },
          before: {
            type: "string",
            description: "HTML/Svelte content before the change",
          },
          after: {
            type: "string",
            description: "HTML/Svelte content after the change",
          },
        },
        required: ["path", "before", "after"],
      },
    },
    {
      name: "ui_preview_reset",
      description: "Reset the UI viewer to empty state",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    // V2 AI-Native Tools
    {
      name: "ui_artifact_create_v2",
      description: "Create a V2 structured artifact. Auto-starts bridge and opens canvas in browser. Uses schema-based format with real Svelte rendering and Lucide icons.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Artifact name" },
          type: { type: "string", enum: ["card", "hero", "button", "section"] },
          content: {
            type: "object",
            properties: {
              icon: { description: "Emoji string or {name, library} for Lucide" },
              title: { type: "string" },
              subtitle: { type: "string" },
              body: { type: "string" },
              badge: { type: "string" },
              cta: { type: "object", properties: { label: { type: "string" }, href: { type: "string" } } },
              items: { type: "array", items: { type: "string" } },
            },
          },
          style: {
            type: "object",
            properties: {
              theme: { type: "string", enum: ["glass-dark", "glass-light", "solid-dark", "solid-light"] },
              accent: { type: "string", description: "Hex color" },
              radius: { type: "string", enum: ["sm", "md", "lg", "xl", "2xl", "3xl"] },
              padding: { type: "string", enum: ["sm", "md", "lg", "xl", "2xl"] },
              animation: { type: "string", enum: ["none", "float", "pulse", "glow"] },
            },
          },
          focus: { type: "boolean", description: "Open canvas and bring browser to front (default: true)" },
        },
        required: ["name"],
      },
    },
    {
      name: "ui_artifact_patch",
      description: "Patch a V2 artifact with minimal changes. Auto-starts bridge and focuses canvas. Send only what changed using dot notation (e.g., 'content.icon', 'style.accent').",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Artifact ID" },
          set: { type: "object", description: "Properties to set (dot notation paths)" },
          delete: { type: "array", items: { type: "string" }, description: "Properties to delete" },
          focus: { type: "boolean", description: "Bring canvas browser tab to front (default: true)" },
        },
        required: ["id"],
      },
    },
    {
      name: "ui_artifact_list_v2",
      description: "List all V2 structured artifacts. Auto-starts bridge if needed.",
      inputSchema: { type: "object", properties: {} },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "ui_preview_start": {
      const state = readState();
      
      if (state?.bridgePid && isProcessRunning(state.bridgePid)) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                alreadyRunning: true,
                watchDir: state.watchDir,
                viewerUrl: `http://localhost:${state.viewerPort}`,
                bridgeWs: `ws://localhost:${state.bridgePort}`,
              }),
            },
          ],
        };
      }

      const watchDir = resolve((args as any)?.watchDir || process.cwd());
      
      if (!existsSync(watchDir)) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: `Directory not found: ${watchDir}`,
              }),
            },
          ],
          isError: true,
        };
      }

      const monorepoRoot = findMonorepoRoot(watchDir);
      const bridgePath = join(monorepoRoot, "packages/ui-bridge");
      const viewerPath = join(monorepoRoot, "packages/ui-viewer");

      // Start bridge
      const bridge = spawn("bun", ["run", "src/index.ts"], {
        cwd: bridgePath,
        env: {
          ...process.env,
          UI_BRIDGE_WATCH_DIR: watchDir,
          UI_BRIDGE_PORT: "4201",
        },
        detached: true,
        stdio: "ignore",
      });
      bridge.unref();

      // Start viewer
      const viewer = spawn("pnpm", ["dev"], {
        cwd: viewerPath,
        detached: true,
        stdio: "ignore",
      });
      viewer.unref();

      const newState: PreviewState = {
        bridgePid: bridge.pid,
        viewerPid: viewer.pid,
        watchDir,
        bridgePort: 4201,
        viewerPort: 4200,
        startedAt: new Date().toISOString(),
      };

      writeState(newState);

      // Wait for servers
      await new Promise((resolve) => setTimeout(resolve, 2500));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              watchDir,
              viewerUrl: `http://localhost:${newState.viewerPort}`,
              bridgeWs: `ws://localhost:${newState.bridgePort}`,
              message: "UI Preview started. Edit files in the watched directory to see live updates.",
            }),
          },
        ],
      };
    }

    case "ui_preview_stop": {
      const state = readState();

      if (!state) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: true, message: "Not running" }),
            },
          ],
        };
      }

      const killed: string[] = [];

      if (state.bridgePid && isProcessRunning(state.bridgePid)) {
        try {
          process.kill(state.bridgePid, "SIGTERM");
          killed.push(`bridge (${state.bridgePid})`);
        } catch {}
      }

      if (state.viewerPid && isProcessRunning(state.viewerPid)) {
        try {
          process.kill(state.viewerPid, "SIGTERM");
          killed.push(`viewer (${state.viewerPid})`);
        } catch {}
      }

      clearState();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              stopped: killed,
              message: killed.length > 0 ? "UI Preview stopped" : "No processes were running",
            }),
          },
        ],
      };
    }

    case "ui_preview_status": {
      const state = readState();

      if (!state) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ running: false }),
            },
          ],
        };
      }

      const bridgeRunning = state.bridgePid ? isProcessRunning(state.bridgePid) : false;
      const viewerRunning = state.viewerPid ? isProcessRunning(state.viewerPid) : false;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              running: bridgeRunning && viewerRunning,
              watchDir: state.watchDir,
              viewerUrl: `http://localhost:${state.viewerPort}`,
              bridgeWs: `ws://localhost:${state.bridgePort}`,
              startedAt: state.startedAt,
            }),
          },
        ],
      };
    }

    case "ui_preview_open": {
      const state = readState();

      if (!state) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: "UI Preview not running. Start with ui_preview_start first.",
              }),
            },
          ],
          isError: true,
        };
      }

      const url = `http://localhost:${state.viewerPort}`;
      const cmd = process.platform === "darwin" ? "open" :
                  process.platform === "win32" ? "start" : "xdg-open";

      spawnSync(cmd, [url]);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              url,
              message: `Opened ${url} in browser`,
            }),
          },
        ],
      };
    }

    case "ui_library_list": {
      const lib = readLibrary();
      
      const components = lib.components.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        tags: c.tags,
        savedAt: c.savedAt,
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ components, count: components.length }),
          },
        ],
      };
    }

    case "ui_library_get": {
      const lib = readLibrary();
      const id = (args as any)?.id;
      const comp = lib.components.find((c) => c.id === id);

      if (!comp) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: `Component not found: ${id}` }),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(comp),
          },
        ],
      };
    }

    case "ui_preview_simulate": {
      const state = readState();
      const bridgePort = state?.bridgePort || 4201;
      
      const { path: filePath, before, after } = args as { path: string; before: string; after: string };
      
      if (!filePath || before === undefined || after === undefined) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: "path, before, and after are required" }),
            },
          ],
          isError: true,
        };
      }

      try {
        const response = await fetch(`http://localhost:${bridgePort}/api/simulate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: filePath, before, after }),
        });
        
        if (!response.ok) {
          throw new Error(`Bridge returned ${response.status}`);
        }
        
        const result = await response.json() as { operations?: number };
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                operations: result.operations || 0,
                message: `Simulated change to ${filePath}`,
              }),
            },
          ],
        };
      } catch (e) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: `Failed to simulate: ${e}. Is UI Preview running? (ui_preview_start)`,
              }),
            },
          ],
          isError: true,
        };
      }
    }

    case "ui_preview_reset": {
      const state = readState();
      const bridgePort = state?.bridgePort || 4201;
      
      try {
        await fetch(`http://localhost:${bridgePort}/api/reset`, { method: "POST" });
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: true, message: "Viewer reset" }),
            },
          ],
        };
      } catch (e) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: false, error: String(e) }),
            },
          ],
          isError: true,
        };
      }
    }

    // V2 AI-Native Tool Handlers
    case "ui_artifact_create_v2": {
      // Auto-start bridge if needed
      const bridgeStatus = await ensureBridgeRunning();
      
      if (!bridgeStatus.running) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: bridgeStatus.error || "Bridge not running",
                hint: "Try: ui_preview_start or run 'pnpm ui:bridge' manually",
              }),
            },
          ],
          isError: true,
        };
      }
      
      const { focus = true, ...createArgs } = args as { focus?: boolean; [key: string]: unknown };
      
      try {
        const response = await fetch(`http://localhost:${bridgeStatus.port}/api/v2/artifacts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createArgs),
        });
        
        if (!response.ok) {
          throw new Error(`Bridge returned ${response.status}`);
        }
        
        const result = await response.json() as { id: string; name: string; version: number };
        const canvasUrl = `http://localhost:4200/canvas?artifact=${result.id}`;
        
        // Auto-open and focus browser
        if (focus) {
          openAndFocus(canvasUrl);
        }
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                ...result,
                autoStarted: bridgeStatus.autoStarted,
                canvasUrl,
                focused: focus,
                message: bridgeStatus.autoStarted 
                  ? `Auto-started bridge. Created "${result.name}" and opened canvas.`
                  : `Created "${result.name}"${focus ? " and opened canvas." : "."}`,
              }),
            },
          ],
        };
      } catch (e) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: false, error: String(e) }),
            },
          ],
          isError: true,
        };
      }
    }

    case "ui_artifact_patch": {
      const { id, set, delete: del, focus = true } = args as { 
        id: string; 
        set?: object; 
        delete?: string[];
        focus?: boolean;
      };
      
      if (!id) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "id is required" }) }],
          isError: true,
        };
      }
      
      // Auto-start bridge if needed
      const bridgeStatus = await ensureBridgeRunning();
      
      if (!bridgeStatus.running) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: bridgeStatus.error || "Bridge not running",
                hint: "Try: ui_preview_start or run 'pnpm ui:bridge' manually",
              }),
            },
          ],
          isError: true,
        };
      }
      
      try {
        const response = await fetch(`http://localhost:${bridgeStatus.port}/api/v2/artifacts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ set, delete: del }),
        });
        
        if (!response.ok) {
          throw new Error(`Bridge returned ${response.status}`);
        }
        
        const result = await response.json() as { previousVersion: number; newVersion: number };
        
        // Focus existing canvas tab
        if (focus) {
          focusCanvasTab();
        }
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                ...result,
                autoStarted: bridgeStatus.autoStarted,
                focused: focus,
                canvasUrl: `http://localhost:4200/canvas?artifact=${id}`,
                message: `Patched: v${result.previousVersion} → v${result.newVersion}${focus ? " (canvas focused)" : ""}`,
              }),
            },
          ],
        };
      } catch (e) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: false, error: String(e) }),
            },
          ],
          isError: true,
        };
      }
    }

    case "ui_artifact_list_v2": {
      // Auto-start bridge if needed
      const bridgeStatus = await ensureBridgeRunning();
      
      if (!bridgeStatus.running) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: bridgeStatus.error || "Bridge not running",
                hint: "Try: ui_preview_start or run 'pnpm ui:bridge' manually",
                artifacts: [],
              }),
            },
          ],
          isError: true,
        };
      }
      
      try {
        const response = await fetch(`http://localhost:${bridgeStatus.port}/api/v2/artifacts`);
        
        if (!response.ok) {
          throw new Error(`Bridge returned ${response.status}`);
        }
        
        const result = await response.json();
        
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({
              ...result,
              autoStarted: bridgeStatus.autoStarted,
            }) 
          }],
        };
      } catch (e) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: false, error: String(e) }),
            },
          ],
          isError: true,
        };
      }
    }

    default:
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: `Unknown tool: ${name}` }),
          },
        ],
        isError: true,
      };
  }
});

// Define resources
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: "ui://status",
      name: "UI Preview Status",
      description: "Current status of the UI preview server",
      mimeType: "application/json",
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === "ui://status") {
    const state = readState();

    if (!state) {
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify({ running: false }),
          },
        ],
      };
    }

    const bridgeRunning = state.bridgePid ? isProcessRunning(state.bridgePid) : false;
    const viewerRunning = state.viewerPid ? isProcessRunning(state.viewerPid) : false;

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify({
            running: bridgeRunning && viewerRunning,
            watchDir: state.watchDir,
            viewerUrl: `http://localhost:${state.viewerPort}`,
            startedAt: state.startedAt,
          }),
        },
      ],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("UI Preview MCP server running");
}

main().catch(console.error);
