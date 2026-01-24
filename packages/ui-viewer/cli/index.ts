#!/usr/bin/env bun
/**
 * UI Preview CLI - AI-native interface for Claude Code
 * 
 * Commands:
 *   ui start [dir]    - Start preview server watching directory
 *   ui stop           - Stop preview server
 *   ui status         - Check if preview is running
 *   ui open           - Open viewer in browser
 *   ui snapshot       - Capture current state as JSON
 *   ui library list   - List saved components
 *   ui library save   - Save current component (interactive)
 *   ui library export - Export library as JSON
 *   ui library import - Import library from JSON file
 * 
 * Usage from Claude Code:
 *   bunx @create-something/ui-viewer start ./src/lib/components
 */

import { spawn, spawnSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import { homedir } from "os";

const PID_FILE = join(homedir(), ".ui-preview.pid");
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
  if (existsSync(PID_FILE)) unlinkSync(PID_FILE);
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function findMonorepoRoot(): string {
  let dir = process.cwd();
  while (dir !== "/") {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    dir = resolve(dir, "..");
  }
  return process.cwd();
}

async function start(watchDir: string = "."): Promise<void> {
  const state = readState();
  
  // Check if already running
  if (state?.bridgePid && isProcessRunning(state.bridgePid)) {
    console.log(`⚠️  UI Preview already running (PID: ${state.bridgePid})`);
    console.log(`   Watching: ${state.watchDir}`);
    console.log(`   Viewer: http://localhost:${state.viewerPort}`);
    return;
  }
  
  const absoluteWatchDir = resolve(watchDir);
  if (!existsSync(absoluteWatchDir)) {
    console.error(`❌ Directory not found: ${absoluteWatchDir}`);
    process.exit(1);
  }
  
  const monorepoRoot = findMonorepoRoot();
  const bridgePath = join(monorepoRoot, "packages/ui-bridge");
  const viewerPath = join(monorepoRoot, "packages/ui-viewer");
  
  console.log("🚀 Starting UI Preview...");
  console.log(`   Watch: ${absoluteWatchDir}`);
  
  // Start bridge
  const bridgeEnv = {
    ...process.env,
    UI_BRIDGE_WATCH_DIR: absoluteWatchDir,
    UI_BRIDGE_PORT: "4201",
  };
  
  const bridge = spawn("bun", ["run", "src/index.ts"], {
    cwd: bridgePath,
    env: bridgeEnv,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  
  bridge.unref();
  
  // Start viewer
  const viewer = spawn("pnpm", ["dev"], {
    cwd: viewerPath,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  
  viewer.unref();
  
  // Wait for servers to start
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const newState: PreviewState = {
    bridgePid: bridge.pid,
    viewerPid: viewer.pid,
    watchDir: absoluteWatchDir,
    bridgePort: 4201,
    viewerPort: 4200,
    startedAt: new Date().toISOString(),
  };
  
  writeState(newState);
  
  console.log("✅ UI Preview started");
  console.log(`   Bridge: ws://localhost:${newState.bridgePort} (PID: ${bridge.pid})`);
  console.log(`   Viewer: http://localhost:${newState.viewerPort} (PID: ${viewer.pid})`);
  console.log("");
  console.log("📋 Agent instructions:");
  console.log("   - Edit files in the watched directory");
  console.log("   - Changes appear live in the viewer");
  console.log("   - Run 'ui stop' when done");
}

function stop(): void {
  const state = readState();
  
  if (!state) {
    console.log("ℹ️  UI Preview not running");
    return;
  }
  
  let stopped = false;
  
  if (state.bridgePid && isProcessRunning(state.bridgePid)) {
    try {
      process.kill(state.bridgePid, "SIGTERM");
      console.log(`⏹️  Stopped bridge (PID: ${state.bridgePid})`);
      stopped = true;
    } catch (e) {
      console.log(`⚠️  Could not stop bridge: ${e}`);
    }
  }
  
  if (state.viewerPid && isProcessRunning(state.viewerPid)) {
    try {
      process.kill(state.viewerPid, "SIGTERM");
      console.log(`⏹️  Stopped viewer (PID: ${state.viewerPid})`);
      stopped = true;
    } catch (e) {
      console.log(`⚠️  Could not stop viewer: ${e}`);
    }
  }
  
  clearState();
  
  if (stopped) {
    console.log("✅ UI Preview stopped");
  } else {
    console.log("ℹ️  No processes were running");
  }
}

function status(): void {
  const state = readState();
  
  if (!state) {
    console.log(JSON.stringify({ running: false }));
    return;
  }
  
  const bridgeRunning = state.bridgePid ? isProcessRunning(state.bridgePid) : false;
  const viewerRunning = state.viewerPid ? isProcessRunning(state.viewerPid) : false;
  
  const status = {
    running: bridgeRunning && viewerRunning,
    bridge: {
      pid: state.bridgePid,
      running: bridgeRunning,
      port: state.bridgePort,
    },
    viewer: {
      pid: state.viewerPid,
      running: viewerRunning,
      port: state.viewerPort,
      url: `http://localhost:${state.viewerPort}`,
    },
    watchDir: state.watchDir,
    startedAt: state.startedAt,
  };
  
  console.log(JSON.stringify(status, null, 2));
}

function open(): void {
  const state = readState();
  
  if (!state) {
    console.error("❌ UI Preview not running. Start with: ui start");
    process.exit(1);
  }
  
  const url = `http://localhost:${state.viewerPort}`;
  
  // Open in default browser
  const cmd = process.platform === "darwin" ? "open" :
              process.platform === "win32" ? "start" : "xdg-open";
  
  spawnSync(cmd, [url]);
  console.log(`🌐 Opened ${url}`);
}

function snapshot(): void {
  const state = readState();
  
  if (!state) {
    console.error(JSON.stringify({ error: "UI Preview not running" }));
    process.exit(1);
  }
  
  // Connect to bridge and get current tree
  // For now, just output the state
  console.log(JSON.stringify({
    watchDir: state.watchDir,
    viewerUrl: `http://localhost:${state.viewerPort}`,
    bridgeWs: `ws://localhost:${state.bridgePort}`,
  }));
}

// Library functions
function ensureLibraryDir(): void {
  if (!existsSync(LIBRARY_DIR)) {
    mkdirSync(LIBRARY_DIR, { recursive: true });
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

function writeLibrary(lib: ComponentLibrary): void {
  ensureLibraryDir();
  writeFileSync(LIBRARY_FILE, JSON.stringify(lib, null, 2));
}

function libraryList(): void {
  const lib = readLibrary();
  
  if (lib.components.length === 0) {
    console.log(JSON.stringify({ components: [], count: 0 }));
    return;
  }
  
  const components = lib.components.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    tags: c.tags,
    savedAt: c.savedAt,
  }));
  
  console.log(JSON.stringify({ components, count: components.length }));
}

function libraryExport(): void {
  const lib = readLibrary();
  console.log(JSON.stringify(lib, null, 2));
}

function libraryImport(filePath: string): void {
  if (!existsSync(filePath)) {
    console.error(JSON.stringify({ error: `File not found: ${filePath}` }));
    process.exit(1);
  }
  
  try {
    const imported: ComponentLibrary = JSON.parse(readFileSync(filePath, "utf-8"));
    const existing = readLibrary();
    
    // Merge, avoiding duplicates by ID
    const existingIds = new Set(existing.components.map((c) => c.id));
    const newComponents = imported.components.filter((c) => !existingIds.has(c.id));
    
    existing.components.push(...newComponents);
    writeLibrary(existing);
    
    console.log(JSON.stringify({
      success: true,
      imported: newComponents.length,
      total: existing.components.length,
    }));
  } catch (e) {
    console.error(JSON.stringify({ error: `Failed to import: ${e}` }));
    process.exit(1);
  }
}

function libraryGet(id: string): void {
  const lib = readLibrary();
  const comp = lib.components.find((c) => c.id === id);
  
  if (!comp) {
    console.error(JSON.stringify({ error: `Component not found: ${id}` }));
    process.exit(1);
  }
  
  console.log(JSON.stringify(comp, null, 2));
}

function libraryDelete(id: string): void {
  const lib = readLibrary();
  const index = lib.components.findIndex((c) => c.id === id);
  
  if (index === -1) {
    console.error(JSON.stringify({ error: `Component not found: ${id}` }));
    process.exit(1);
  }
  
  lib.components.splice(index, 1);
  writeLibrary(lib);
  
  console.log(JSON.stringify({ success: true, deleted: id }));
}

// CLI entry point
const [,, command, ...args] = process.argv;

switch (command) {
  case "start":
    start(args[0]);
    break;
  case "stop":
    stop();
    break;
  case "status":
    status();
    break;
  case "open":
    open();
    break;
  case "snapshot":
    snapshot();
    break;
  case "library":
    const [subCmd, ...subArgs] = args;
    switch (subCmd) {
      case "list":
        libraryList();
        break;
      case "export":
        libraryExport();
        break;
      case "import":
        if (!subArgs[0]) {
          console.error("Usage: ui library import <file.json>");
          process.exit(1);
        }
        libraryImport(subArgs[0]);
        break;
      case "get":
        if (!subArgs[0]) {
          console.error("Usage: ui library get <id>");
          process.exit(1);
        }
        libraryGet(subArgs[0]);
        break;
      case "delete":
        if (!subArgs[0]) {
          console.error("Usage: ui library delete <id>");
          process.exit(1);
        }
        libraryDelete(subArgs[0]);
        break;
      default:
        console.log(`
Library Commands:
  ui library list          List all saved components (JSON)
  ui library get <id>      Get component by ID (JSON)
  ui library export        Export entire library (JSON)
  ui library import <file> Import library from JSON file
  ui library delete <id>   Delete component by ID
`);
    }
    break;
  default:
    console.log(`
UI Preview - Visual feedback for CLI agents

Commands:
  ui start [dir]     Start preview, watching directory (default: .)
  ui stop            Stop preview server
  ui status          Check status (JSON output)
  ui open            Open viewer in browser
  ui snapshot        Get current state (JSON output)
  ui library <cmd>   Manage component library

Library Commands:
  ui library list          List saved components
  ui library get <id>      Get component by ID
  ui library export        Export library as JSON
  ui library import <file> Import from JSON file
  ui library delete <id>   Delete component

Examples:
  ui start ./src/lib/components
  ui library list
  ui stop
`);
}
