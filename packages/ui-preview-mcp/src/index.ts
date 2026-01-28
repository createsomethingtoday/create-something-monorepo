#!/usr/bin/env node
/**
 * UI Dev MCP Server
 * 
 * Simple dev server launcher for SvelteKit packages.
 * 
 * Tools:
 *   - ui_dev: Start a package's dev server and open browser
 *   - ui_dev_status: Check which dev servers are running
 *   - ui_dev_stop: Stop a running dev server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn, spawnSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { homedir } from "os";

const DEV_SERVERS_FILE = join(homedir(), ".ui-dev-servers.json");

// SvelteKit package config: short name → full package name + port
const PACKAGE_CONFIG: Record<string, { name: string; port: number }> = {
  "agency": { name: "@create-something/agency", port: 5173 },
  "space": { name: "@create-something/space", port: 5174 },
  "io": { name: "@create-something/io", port: 5175 },
  "ltd": { name: "@create-something/ltd", port: 5176 },
  "components": { name: "@create-something/canon", port: 5177 },
  "webflow-dashboard": { name: "@create-something/webflow-dashboard", port: 5178 },
  "lms": { name: "@create-something/lms", port: 5179 },
};

interface DevServerState {
  [pkg: string]: {
    pid: number;
    port: number;
    startedAt: string;
  };
}

function readDevServers(): DevServerState {
  if (!existsSync(DEV_SERVERS_FILE)) return {};
  try {
    return JSON.parse(readFileSync(DEV_SERVERS_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function writeDevServers(state: DevServerState): void {
  writeFileSync(DEV_SERVERS_FILE, JSON.stringify(state, null, 2));
}

async function isPortResponding(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}`, {
      signal: AbortSignal.timeout(1000),
    });
    return response.ok || response.status === 404;
  } catch {
    return false;
  }
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function getMonorepoRoot(): string {
  const thisFile = decodeURIComponent(new URL(import.meta.url).pathname);
  return resolve(thisFile, "../../../../");
}

function openUrl(url: string): void {
  const cmd = process.platform === "darwin" ? "open" :
              process.platform === "win32" ? "start" : "xdg-open";
  spawnSync(cmd, [url]);
}

// Create MCP server
const server = new Server(
  { name: "ui-dev", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Define tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "ui_dev",
      description: "Start a SvelteKit package's dev server and open the browser. Tracks running servers to avoid duplicates.",
      inputSchema: {
        type: "object",
        properties: {
          package: { 
            type: "string", 
            enum: Object.keys(PACKAGE_CONFIG),
            description: "Package to start dev server for" 
          },
          route: {
            type: "string",
            description: "Route to open (e.g., '/pricing'). Default: '/'"
          },
        },
        required: ["package"],
      },
    },
    {
      name: "ui_dev_status",
      description: "Check which SvelteKit dev servers are running and their ports.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "ui_dev_stop",
      description: "Stop a running SvelteKit dev server.",
      inputSchema: {
        type: "object",
        properties: {
          package: { type: "string", description: "Package to stop" },
        },
        required: ["package"],
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "ui_dev": {
      const { package: pkg, route = "/" } = args as { package: string; route?: string };
      
      const config = PACKAGE_CONFIG[pkg];
      if (!config) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              error: `Unknown package: ${pkg}`,
              available: Object.keys(PACKAGE_CONFIG),
            }),
          }],
          isError: true,
        };
      }
      
      const { name: fullPackageName, port } = config;
      const devServers = readDevServers();
      
      // Check if already running
      if (await isPortResponding(port)) {
        const url = `http://localhost:${port}${route}`;
        openUrl(url);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              alreadyRunning: true,
              package: pkg,
              port,
              url,
              message: `Dev server already running. Opened ${url}`,
            }),
          }],
        };
      }
      
      // Start dev server
      const monorepoRoot = getMonorepoRoot();
      
      try {
        const devProcess = spawn("pnpm", [
          "--filter", fullPackageName, 
          "dev",
          "--",
          "--port", String(port)
        ], {
          cwd: monorepoRoot,
          detached: true,
          stdio: "ignore",
          env: { ...process.env },
        });
        devProcess.unref();
        
        // Save state
        devServers[pkg] = {
          pid: devProcess.pid!,
          port,
          startedAt: new Date().toISOString(),
        };
        writeDevServers(devServers);
        
        // Wait for server to be ready (up to 45 seconds)
        let ready = false;
        for (let i = 0; i < 90; i++) {
          await new Promise(r => setTimeout(r, 500));
          if (await isPortResponding(port)) {
            ready = true;
            break;
          }
        }
        
        if (!ready) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                success: false,
                package: pkg,
                port,
                error: "Server started but not responding after 45s.",
                hint: `Try manually: pnpm --filter ${fullPackageName} dev`,
              }),
            }],
            isError: true,
          };
        }
        
        const url = `http://localhost:${port}${route}`;
        openUrl(url);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              package: pkg,
              port,
              url,
              message: `Started ${pkg} dev server. Opened ${url}`,
            }),
          }],
        };
      } catch (e) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              error: String(e),
            }),
          }],
          isError: true,
        };
      }
    }

    case "ui_dev_status": {
      const devServers = readDevServers();
      const status: Record<string, { running: boolean; port: number; url: string }> = {};
      
      for (const [pkg, port] of Object.entries(PACKAGE_CONFIG).map(([k, v]) => [k, v.port] as const)) {
        const running = await isPortResponding(port);
        if (running) {
          status[pkg] = { running: true, port, url: `http://localhost:${port}` };
        }
      }
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            running: status,
            available: Object.keys(PACKAGE_CONFIG),
          }),
        }],
      };
    }

    case "ui_dev_stop": {
      const { package: pkg } = args as { package: string };
      const config = PACKAGE_CONFIG[pkg];
      
      if (!config) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ success: false, error: `Unknown package: ${pkg}` }),
          }],
          isError: true,
        };
      }
      
      const { port } = config;
      const devServers = readDevServers();
      
      // Kill by PID if we have it
      if (devServers[pkg]?.pid && isProcessRunning(devServers[pkg].pid)) {
        try {
          process.kill(devServers[pkg].pid, "SIGTERM");
        } catch {}
      }
      
      // Also kill by port
      try {
        const { execSync } = await import("child_process");
        execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null`);
      } catch {}
      
      delete devServers[pkg];
      writeDevServers(devServers);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            package: pkg,
            message: `Stopped ${pkg} dev server`,
          }),
        }],
      };
    }

    default:
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ error: `Unknown tool: ${name}` }),
        }],
        isError: true,
      };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("UI Dev MCP server running");
}

main().catch(console.error);
