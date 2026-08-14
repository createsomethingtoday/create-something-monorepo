const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runNative(binaryName) {
  const extension = process.platform === 'win32' ? '.exe' : '';
  const binary = path.join(__dirname, 'native', `${binaryName}${extension}`);

  if (!fs.existsSync(binary)) {
    console.error(
      `Ground MCP native binary is unavailable at ${binary}. Reinstall @createsomething/ground-mcp to complete the verified release-asset download.`
    );
    process.exitCode = 1;
    return;
  }

  const result = spawnSync(binary, process.argv.slice(2), { stdio: 'inherit' });
  if (result.error) {
    console.error(`Ground MCP could not start ${binaryName}: ${result.error.message}`);
    process.exitCode = 1;
    return;
  }

  process.exitCode = result.status ?? 1;
}

module.exports = { runNative };
