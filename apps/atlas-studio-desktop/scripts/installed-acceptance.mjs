import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(appRoot, '../..');
const bundleRoot = join(appRoot, 'src-tauri', 'target', 'release', 'bundle');
const outputRoot = join(repoRoot, 'output', 'atlas-studio-desktop');
const runId = new Date().toISOString().replaceAll(/[:.]/g, '-');
const temporaryRoot = mkdtempSync(join(tmpdir(), 'atlas-installed-acceptance-'));
const mountPath = join(temporaryRoot, 'mounted');
const installPath = join(temporaryRoot, 'installed');
const atlasHome = join(temporaryRoot, 'atlas-home');
const negativeHome = join(temporaryRoot, 'negative-home');
const bundleIdentifier = 'agency.createsomething.atlas-studio';
let attached = false;

function command(commandName, args, options = {}) {
  const result = spawnSync(commandName, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(
      `${commandName} ${args.join(' ')} failed (${result.status}):\n${result.stderr || result.stdout}`,
    );
  }
  return {
    status: result.status,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function listFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(path));
    else files.push(path);
  }
  return files;
}

function hashDirectory(directory) {
  const hash = createHash('sha256');
  for (const path of listFiles(directory).sort()) {
    hash.update(relative(directory, path).split(sep).join('/'));
    hash.update('\0');
    hash.update(readFileSync(path));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

async function waitForJson(path, predicate = () => true, timeout = 30_000) {
  const deadline = Date.now() + timeout;
  let latestError;
  while (Date.now() < deadline) {
    try {
      if (existsSync(path)) {
        const value = JSON.parse(readFileSync(path, 'utf8'));
        if (predicate(value)) return value;
      }
    } catch (error) {
      latestError = error;
    }
    await delay(200);
  }
  throw new Error(`Timed out waiting for ${path}${latestError ? `: ${latestError}` : ''}`);
}

async function waitForHttp(url, timeout = 30_000) {
  const deadline = Date.now() + timeout;
  let latestError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      latestError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      latestError = error;
    }
    await delay(200);
  }
  throw new Error(`Timed out waiting for ${url}: ${latestError}`);
}

function launch(appPath, home) {
  rmSync(join(home, 'runtime.json'), { force: true });
  rmSync(join(home, 'runtime-error.json'), { force: true });
  mkdirSync(home, { recursive: true });
  execFileSync(
    'open',
    [
      '-n',
      '-g',
      '--env',
      `CREATE_SOMETHING_ATLAS_HOME=${home}`,
      '--env',
      'PATH=/usr/bin:/bin',
      appPath,
    ],
    { stdio: 'inherit' },
  );
}

async function quit(runtime) {
  command('osascript', ['-e', `tell application id "${bundleIdentifier}" to quit`], {
    allowFailure: true,
  });
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      process.kill(runtime.pid, 0);
      await delay(200);
    } catch {
      return;
    }
  }
  try {
    process.kill(runtime.pid, 'SIGTERM');
  } catch {
    return;
  }
}

function newestDmg() {
  const directory = join(bundleRoot, 'dmg');
  const candidates = readdirSync(directory)
    .filter((name) => name.endsWith('.dmg'))
    .map((name) => join(directory, name))
    .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs);
  if (!candidates[0]) throw new Error(`No Atlas Studio DMG exists under ${directory}.`);
  return candidates[0];
}

async function main() {
  if (process.env.ATLAS_INSTALLED_SKIP_BUILD !== '1') {
    execFileSync('pnpm', ['--filter', '@create-something/atlas-studio-desktop', 'build:dmg'], {
      cwd: repoRoot,
      stdio: 'inherit',
    });
  }

  const dmgPath = newestDmg();
  const dmgVerification = command('hdiutil', ['verify', dmgPath]);
  mkdirSync(mountPath);
  command('hdiutil', [
    'attach',
    '-readonly',
    '-nobrowse',
    '-mountpoint',
    mountPath,
    dmgPath,
  ]);
  attached = true;

  const mountedApp = join(mountPath, 'Atlas Studio.app');
  if (!existsSync(mountedApp)) throw new Error('Verified DMG does not contain Atlas Studio.app.');
  mkdirSync(installPath);
  const installedApp = join(installPath, 'Atlas Studio.app');
  cpSync(mountedApp, installedApp, { recursive: true, preserveTimestamps: true });
  const canonicalInstalledApp = realpathSync(installedApp);

  const signingIdentity = process.env.APPLE_SIGNING_IDENTITY;
  const signing = signingIdentity
    ? {
        status: 'performed',
        identity: signingIdentity,
        verification: command('codesign', ['--verify', '--deep', '--strict', installedApp]),
      }
    : {
        status: 'unperformed',
        reason: 'APPLE_SIGNING_IDENTITY is unavailable; the local bundle is not distribution proof.',
      };

  launch(installedApp, atlasHome);
  const firstRuntime = await waitForJson(join(atlasHome, 'runtime.json'));
  const firstHealth = await waitForHttp(`${firstRuntime.url}api/sessions`);
  const runtimeCommand = command('ps', ['-p', String(firstRuntime.pid), '-o', 'command=']).stdout;
  if (!realpathSync(firstRuntime.runtimeRoot).startsWith(canonicalInstalledApp)) {
    throw new Error(`Runtime escaped the copied app bundle: ${firstRuntime.runtimeRoot}`);
  }
  if (
    !runtimeCommand.startsWith(
      join(canonicalInstalledApp, 'Contents', 'Resources', 'runtime', 'bun'),
    )
  ) {
    throw new Error(`Installed server did not launch packaged Bun: ${runtimeCommand}`);
  }
  if (/node|pnpm/.test(runtimeCommand.replace(firstRuntime.serverEntry, ''))) {
    throw new Error(`Installed server command depends on Node or pnpm: ${runtimeCommand}`);
  }

  const interactionResponse = await fetch(`${firstRuntime.url}api/governed-interaction`);
  if (!interactionResponse.ok) {
    throw new Error(`Installed interaction readback failed: ${interactionResponse.status}`);
  }
  const interaction = await interactionResponse.json();
  if (!interaction.compatibility.compatible || interaction.authority !== 'read_only') {
    throw new Error(`Installed interaction was not read-only compatible: ${JSON.stringify(interaction)}`);
  }
  const createResponse = await fetch(`${firstRuntime.url}api/sessions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client: 'Installed acceptance',
      workflow: 'Governed interaction restoration',
      owner: 'CRE-1476 verifier',
    }),
  });
  if (createResponse.status !== 201) {
    throw new Error(`Installed session creation failed: ${createResponse.status}`);
  }
  const createdSession = await createResponse.json();
  await quit(firstRuntime);

  launch(installedApp, atlasHome);
  const secondRuntime = await waitForJson(
    join(atlasHome, 'runtime.json'),
    (runtime) => runtime.pid !== firstRuntime.pid,
  );
  await waitForHttp(`${secondRuntime.url}api/sessions`);
  const restoredResponse = await fetch(
    `${secondRuntime.url}api/sessions/${encodeURIComponent(createdSession.id)}`,
  );
  if (!restoredResponse.ok) {
    throw new Error(`Installed session restoration failed: ${restoredResponse.status}`);
  }
  const restoredSession = await restoredResponse.json();
  if (restoredSession.workflow !== 'Governed interaction restoration') {
    throw new Error('Relaunch did not restore the accepted Atlas session.');
  }
  await quit(secondRuntime);

  const tamperedApp = join(installPath, 'Tampered Atlas Studio.app');
  cpSync(installedApp, tamperedApp, { recursive: true, preserveTimestamps: true });
  appendFileSync(join(tamperedApp, 'Contents', 'Resources', 'server', 'cli.js'), '\n// tamper\n');
  launch(tamperedApp, negativeHome);
  const negative = await waitForJson(join(negativeHome, 'runtime-error.json'));
  if (negative.code !== 'PACKAGED_RUNTIME_INVALID' || !/integrity failed/.test(negative.error)) {
    throw new Error(`Tampered runtime did not fail closed: ${JSON.stringify(negative)}`);
  }
  command('osascript', ['-e', `tell application id "${bundleIdentifier}" to quit`], {
    allowFailure: true,
  });

  const manifestPath = join(
    installedApp,
    'Contents',
    'Resources',
    'runtime-build.json',
  );
  const bundleManifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const receipt = {
    schema: 'create-something/atlas-studio-installed-acceptance@1',
    ok: true,
    runId,
    artifacts: {
      dmg: { name: basename(dmgPath), sha256: sha256File(dmgPath) },
      app: { sha256: hashDirectory(installedApp) },
      runtimeManifest: { sha256: sha256File(manifestPath) },
      interaction: {
        sha256: sha256File(firstRuntime.interactionPath),
        definitionHash: interaction.bundle.definitionHash,
      },
    },
    runtime: {
      language: interaction.bundle.language,
      runtimeVersion: interaction.bundle.runtimeVersion,
      workflowId: interaction.bundle.workflowId,
      capabilities: interaction.bundle.capabilities,
      authority: interaction.authority,
      hostCompatibility: interaction.compatibility,
      processCommand: runtimeCommand,
      resourcesInsideCopiedApp: true,
      localNodeRequired: false,
      localPnpmRequired: false,
      packagedFileCount: bundleManifest.files.length,
    },
    evidence: {
      hdiutilVerify: dmgVerification.status === 0,
      readonlyMount: true,
      launchServices: true,
      apiReadback: firstHealth.status === 200,
      relaunchRestoredSessionId: restoredSession.id,
      tamperRejected: negative,
    },
    gates: {
      compilerAcceptance: 'performed',
      hostCompatibility: 'performed',
      appBuild: 'performed',
      dmgVerification: 'performed',
      installedLaunch: 'performed',
      signing,
      notarization: {
        status: 'unperformed',
        reason: 'Notarization credentials and an explicit distribution promotion are unavailable.',
      },
      publicHosting: 'unperformed',
      clientInvitation: 'unperformed',
      liveProductionMutation: 'unperformed',
      humanProductAcceptance: 'unperformed',
    },
  };

  mkdirSync(outputRoot, { recursive: true });
  const historicalReceipt = join(outputRoot, `installed-acceptance-${runId}.json`);
  const latestReceipt = join(outputRoot, 'installed-acceptance.json');
  const serialized = `${JSON.stringify(receipt, null, 2)}\n`;
  writeFileSync(historicalReceipt, serialized);
  writeFileSync(latestReceipt, serialized);
  console.log(JSON.stringify({ ok: true, receipt: latestReceipt, runId }, null, 2));
}

try {
  await main();
} finally {
  command('osascript', ['-e', `tell application id "${bundleIdentifier}" to quit`], {
    allowFailure: true,
  });
  if (attached) command('hdiutil', ['detach', mountPath], { allowFailure: true });
  rmSync(temporaryRoot, { recursive: true, force: true });
}
