#!/usr/bin/env node

const { execSync } = require('child_process');
const { existsSync, mkdirSync, copyFileSync, chmodSync } = require('fs');
const { join } = require('path');
const os = require('os');

const platform = os.platform();
const arch = os.arch();

// Map Node arch to Rust target
const archMap = {
  'x64': 'x86_64',
  'arm64': 'aarch64'
};

const platformMap = {
  'darwin': 'apple-darwin',
  'linux': 'unknown-linux-gnu',
  'win32': 'pc-windows-msvc'
};

const rustArch = archMap[arch] || arch;
const rustPlatform = platformMap[platform] || platform;
const target = `${rustArch}-${rustPlatform}`;

const binDir = join(__dirname, 'bin');
const ext = platform === 'win32' ? '.exe' : '';

// Try to find pre-built binary
const prebuiltPath = join(__dirname, '..', 'target', 'release', `lm${ext}`);
const prebuiltMcpPath = join(__dirname, '..', 'target', 'release', `loom-mcp${ext}`);

if (!existsSync(binDir)) {
  mkdirSync(binDir, { recursive: true });
}

// Check for pre-built binaries
if (existsSync(prebuiltPath)) {
  console.log('Using pre-built loom binary');
  copyFileSync(prebuiltPath, join(binDir, `lm${ext}`));
  copyFileSync(prebuiltMcpPath, join(binDir, `loom-mcp${ext}`));
  
  if (platform !== 'win32') {
    chmodSync(join(binDir, `lm${ext}`), 0o755);
    chmodSync(join(binDir, `loom-mcp${ext}`), 0o755);
  }
} else {
  // Build from source
  console.log('Building loom from source...');
  console.log(`Target: ${target}`);
  
  try {
    // Check for Rust
    execSync('rustc --version', { stdio: 'inherit' });
    
    // Build
    execSync('cargo build --release', {
      cwd: join(__dirname, '..'),
      stdio: 'inherit'
    });
    
    // Copy binaries
    const builtPath = join(__dirname, '..', 'target', 'release', `lm${ext}`);
    const builtMcpPath = join(__dirname, '..', 'target', 'release', `loom-mcp${ext}`);
    
    copyFileSync(builtPath, join(binDir, `lm${ext}`));
    copyFileSync(builtMcpPath, join(binDir, `loom-mcp${ext}`));
    
    if (platform !== 'win32') {
      chmodSync(join(binDir, `lm${ext}`), 0o755);
      chmodSync(join(binDir, `loom-mcp${ext}`), 0o755);
    }
    
    console.log('Loom installed successfully!');
  } catch (e) {
    console.error('Failed to build loom from source.');
    console.error('Please ensure Rust is installed: https://rustup.rs');
    process.exit(1);
  }
}
