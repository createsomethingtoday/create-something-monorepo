#!/usr/bin/env node

/**
 * Loom MCP - Binary installer
 * 
 * Downloads the appropriate pre-built binary for the current platform.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const https = require('https');
const path = require('path');

const REPO = 'createsomethingtoday/create-something-monorepo';
const VERSION = require('./package.json').version;

// Platform mapping
// Note: macOS Intel uses arm64 binary via Rosetta 2
const PLATFORMS = {
  'darwin-arm64': 'darwin-arm64',
  'darwin-x64': 'darwin-arm64',  // Rosetta 2 compatibility
  'linux-arm64': 'linux-arm64',
  'linux-x64': 'linux-x64',
  'win32-x64': 'win32-x64',
};

function getPlatformKey() {
  const platform = process.platform;
  const arch = process.arch;
  return `${platform}-${arch}`;
}

function getBinaryName() {
  const key = getPlatformKey();
  const name = PLATFORMS[key];
  
  if (!name) {
    console.error(`Unsupported platform: ${key}`);
    console.error(`Supported platforms: ${Object.keys(PLATFORMS).join(', ')}`);
    process.exit(1);
  }
  
  return name;
}

function getDownloadUrl(binaryName) {
  const ext = process.platform === 'win32' ? 'zip' : 'tar.gz';
  // Tag format: loom-v0.1.0
  return `https://github.com/${REPO}/releases/download/loom-v${VERSION}/loom-${binaryName}.${ext}`;
}

async function download(url) {
  return new Promise((resolve, reject) => {
    const request = (url) => {
      https.get(url, { headers: { 'User-Agent': 'loom-mcp-installer' } }, (response) => {
        // Handle redirects
        if (response.statusCode === 302 || response.statusCode === 301) {
          request(response.headers.location);
          return;
        }
        
        if (response.statusCode !== 200) {
          reject(new Error(`Download failed: HTTP ${response.statusCode}`));
          return;
        }
        
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      }).on('error', reject);
    };
    
    request(url);
  });
}

async function extractTarGz(buffer, destDir) {
  const tmpFile = path.join(destDir, 'archive.tar.gz');
  
  fs.writeFileSync(tmpFile, buffer);
  execSync(`tar -xzf "${tmpFile}" -C "${destDir}"`, { stdio: 'inherit' });
  fs.unlinkSync(tmpFile);
}

async function extractZip(buffer, destDir) {
  // Fallback: use PowerShell on Windows
  const tmpFile = path.join(destDir, 'archive.zip');
  fs.writeFileSync(tmpFile, buffer);
  execSync(`powershell -Command "Expand-Archive -Path '${tmpFile}' -DestinationPath '${destDir}' -Force"`, { stdio: 'inherit' });
  fs.unlinkSync(tmpFile);
}

async function install() {
  console.log('Loom MCP: Installing binary...');
  
  const binaryName = getBinaryName();
  const url = getDownloadUrl(binaryName);
  const binDir = path.join(__dirname, 'bin');
  
  console.log(`Platform: ${getPlatformKey()}`);
  console.log(`Downloading: ${url}`);
  
  try {
    // Create bin directory
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }
    
    // Download archive
    const buffer = await download(url);
    console.log(`Downloaded ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
    
    // Extract based on platform
    if (process.platform === 'win32') {
      await extractZip(buffer, binDir);
    } else {
      await extractTarGz(buffer, binDir);
    }
    
    // Make binaries executable (Unix)
    if (process.platform !== 'win32') {
      const loomMcp = path.join(binDir, 'loom-mcp');
      const lm = path.join(binDir, 'lm');
      
      if (fs.existsSync(loomMcp)) {
        fs.chmodSync(loomMcp, 0o755);
      }
      if (fs.existsSync(lm)) {
        fs.chmodSync(lm, 0o755);
      }
    }
    
    console.log('Loom MCP: Installation complete!');
    console.log('');
    console.log('Add to your .cursor/mcp.json:');
    console.log('');
    console.log('  {');
    console.log('    "mcpServers": {');
    console.log('      "loom": {');
    console.log('        "command": "loom-mcp",');
    console.log('        "args": ["--path", "."]');
    console.log('      }');
    console.log('    }');
    console.log('  }');
    console.log('');
    
  } catch (error) {
    console.error('Loom MCP: Installation failed');
    console.error(error.message);
    console.error('');
    console.error('You can manually download from:');
    console.error(`https://github.com/${REPO}/releases`);
    console.error('');
    console.error('Or build from source (requires Rust):');
    console.error('  cargo install --git https://github.com/' + REPO + ' --path packages/loom');
    process.exit(1);
  }
}

// Run installer
install();
