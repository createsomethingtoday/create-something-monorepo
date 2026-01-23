#!/usr/bin/env node
/**
 * Ground MCP - Node.js wrapper for Claude Desktop Extension
 * 
 * This wrapper spawns the native ground-mcp binary and proxies stdio.
 * Required because Claude Desktop extensions run with Node.js runtime.
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Determine binary name based on platform
function getBinaryName() {
  const platform = os.platform();
  const arch = os.arch();
  
  if (platform === 'win32') {
    return 'ground-mcp.exe';
  }
  return 'ground-mcp';
}

// Find the binary in the bundle
function findBinary() {
  const binaryName = getBinaryName();
  const bundleDir = __dirname;
  
  // Check in bin/ directory (bundled location)
  const binPath = path.join(bundleDir, 'bin', binaryName);
  if (fs.existsSync(binPath)) {
    return binPath;
  }
  
  // Fallback: check if globally installed via npm
  const globalPath = path.join(bundleDir, '..', 'node_modules', '.bin', binaryName);
  if (fs.existsSync(globalPath)) {
    return globalPath;
  }
  
  // Fallback: try to find in PATH
  return binaryName;
}

// Spawn the binary and proxy stdio
function main() {
  const binaryPath = findBinary();
  
  const child = spawn(binaryPath, [], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: process.env
  });
  
  // Proxy stdin to child
  process.stdin.pipe(child.stdin);
  
  // Proxy child stdout to process stdout
  child.stdout.pipe(process.stdout);
  
  // Proxy child stderr to process stderr
  child.stderr.pipe(process.stderr);
  
  // Handle child exit
  child.on('exit', (code) => {
    process.exit(code || 0);
  });
  
  // Handle errors
  child.on('error', (err) => {
    console.error(`Failed to start ground-mcp: ${err.message}`);
    console.error('Make sure the binary is installed correctly.');
    process.exit(1);
  });
  
  // Handle process signals
  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));
}

main();
