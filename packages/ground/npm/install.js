#!/usr/bin/env node

/**
 * Ground MCP - Binary installer
 * 
 * Downloads the appropriate pre-built binary for the current platform.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const https = require('https');
const path = require('path');
const zlib = require('zlib');

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
  // Tag format: ground-v0.1.0
  return `https://github.com/${REPO}/releases/download/ground-v${VERSION}/ground-${binaryName}.${ext}`;
}

async function download(url) {
  return new Promise((resolve, reject) => {
    const request = (url) => {
      https.get(url, { headers: { 'User-Agent': 'ground-mcp-installer' } }, (response) => {
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
  const { execSync } = require('child_process');
  const tmpFile = path.join(destDir, 'archive.tar.gz');
  
  fs.writeFileSync(tmpFile, buffer);
  execSync(`tar -xzf "${tmpFile}" -C "${destDir}"`, { stdio: 'inherit' });
  fs.unlinkSync(tmpFile);
}

async function extractZip(buffer, destDir) {
  const AdmZip = require('adm-zip');
  const zip = new AdmZip(buffer);
  zip.extractAllTo(destDir, true);
}

async function install() {
  console.log('Ground MCP: Installing binary...');
  
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
      // For Windows, we need adm-zip (optional dependency)
      try {
        await extractZip(buffer, binDir);
      } catch (e) {
        // Fallback: use PowerShell
        const tmpFile = path.join(binDir, 'archive.zip');
        fs.writeFileSync(tmpFile, buffer);
        execSync(`powershell -Command "Expand-Archive -Path '${tmpFile}' -DestinationPath '${binDir}' -Force"`, { stdio: 'inherit' });
        fs.unlinkSync(tmpFile);
      }
    } else {
      await extractTarGz(buffer, binDir);
    }
    
    // Make binaries executable (Unix)
    if (process.platform !== 'win32') {
      const groundMcp = path.join(binDir, 'ground-mcp');
      const ground = path.join(binDir, 'ground');
      
      if (fs.existsSync(groundMcp)) {
        fs.chmodSync(groundMcp, 0o755);
      }
      if (fs.existsSync(ground)) {
        fs.chmodSync(ground, 0o755);
      }
    }
    
    console.log('Ground MCP: Installation complete!');
    console.log('');
    console.log('Add to your .cursor/mcp.json:');
    console.log('');
    console.log('  {');
    console.log('    "mcpServers": {');
    console.log('      "ground": {');
    console.log('        "command": "ground-mcp"');
    console.log('      }');
    console.log('    }');
    console.log('  }');
    console.log('');
    
  } catch (error) {
    console.error('Ground MCP: Installation failed');
    console.error(error.message);
    console.error('');
    console.error('You can manually download from:');
    console.error(`https://github.com/${REPO}/releases`);
    console.error('');
    console.error('Or build from source:');
    console.error('  cargo install --git https://github.com/' + REPO + ' --path packages/ground');
    process.exit(1);
  }
}

// Run installer
install();
