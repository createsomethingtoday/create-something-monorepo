import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bundleRoot = join(appRoot, 'src-tauri', 'target', 'release', 'bundle');
const outputRoot = join(appRoot, 'output', 'installed-acceptance');
const runId = new Date().toISOString().replaceAll(/[:.]/g, '-');
const temporaryRoot = mkdtempSync(join(tmpdir(), 'draw-installed-acceptance-'));
const mountPath = join(temporaryRoot, 'mounted');
const installPath = join(temporaryRoot, 'installed');
const stateHome = join(temporaryRoot, 'state');
const bundleIdentifier = 'agency.createsomething.draw';
const requireProductionRelease = process.env.DRAW_REQUIRE_PRODUCTION_RELEASE === '1';
let attached = false;
const launchedProcesses = new Set();

function command(name, args, { allowFailure = false, env } = {}) {
  const result = spawnSync(name, args, {
    cwd: appRoot,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    env: env ? { ...process.env, ...env } : process.env
  });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(
      `${name} ${args.join(' ')} failed (${result.status}):\n${result.stderr || result.stdout}`
    );
  }
  return { status: result.status, stdout: result.stdout.trim(), stderr: result.stderr.trim() };
}

const sha256File = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}
function hashDirectory(directory) {
  const hash = createHash('sha256');
  for (const path of listFiles(directory).sort()) {
    hash.update(relative(directory, path).split(sep).join('/')).update('\0');
    hash.update(readFileSync(path)).update('\0');
  }
  return hash.digest('hex');
}
const delay = (milliseconds) =>
  new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
async function waitForFile(path, timeout = 20_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8'));
    await delay(200);
  }
  throw new Error(`Timed out waiting for ${path}`);
}
function newestDmg() {
  const directory = join(bundleRoot, 'dmg');
  const candidates = readdirSync(directory)
    .filter((name) => name.endsWith('.dmg'))
    .map((name) => join(directory, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  if (!candidates[0]) throw new Error(`No Draw DMG exists under ${directory}`);
  return candidates[0];
}
function launch(appPath, executable, profile = stateHome) {
  const binary = join(appPath, 'Contents', 'MacOS', executable);
  const child = spawn(binary, [], {
    cwd: appRoot,
    env: { ...process.env, CREATE_SOMETHING_DRAW_HOME: profile },
    stdio: 'ignore'
  });
  launchedProcesses.add(child);
  child.on('error', () => {});
  return child;
}
async function quit(child) {
  if (!child || !launchedProcesses.has(child)) return;
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGTERM');
    const deadline = Date.now() + 5000;
    while (child.exitCode === null && child.signalCode === null && Date.now() < deadline) await delay(100);
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL');
      const deadline = Date.now() + 5000;
      while (child.exitCode === null && child.signalCode === null && Date.now() < deadline) await delay(100);
      if (child.exitCode === null && child.signalCode === null) throw new Error(`Isolated Draw process ${child.pid} did not terminate`);
    }
  }
  launchedProcesses.delete(child);
}
const documentHash = (state) => createHash('sha256').update(JSON.stringify(state.document)).digest('hex');
async function persistenceRun(appPath, executable, profile, expected) {
  const statePath = join(profile, 'paired-session.json');
  const first = launch(appPath, executable, profile);
  let firstState;
  try {
    firstState = await waitForFile(statePath);
    await delay(1200);
    if (first.exitCode !== null || first.signalCode !== null || !first.pid) throw new Error('Packaged app exited during launch');
    if (expected && (firstState.sessionId !== expected.sessionId || firstState.revision !== expected.revision || documentHash(firstState) !== documentHash(expected))) throw new Error('Existing document changed during first launch');
  } finally { await quit(first); }
  const second = launch(appPath, executable, profile);
  let secondState;
  try {
    await delay(1200);
    if (second.exitCode !== null || second.signalCode !== null || !second.pid) throw new Error('Packaged app exited during relaunch');
    secondState = await waitForFile(statePath);
  } finally { await quit(second); }
  if (firstState.sessionId !== secondState.sessionId || firstState.revision !== secondState.revision || documentHash(firstState) !== documentHash(secondState)) throw new Error('Relaunch did not preserve the canonical session, revision, and document');
  return { sessionId: firstState.sessionId, revision: firstState.revision, documentHash: documentHash(firstState), relaunchExact: true, processIds: [first.pid, second.pid], state: firstState };
}
function populatedLegacyState(state) {
  const createdAt = '2026-08-01T12:00:00Z';
  const base = { createdAt };
  const content = { blocks: [
    { type: 'heading1', runs: [{ text: 'Decision map' }] },
    { type: 'paragraph', runs: [{ text: 'Preserve ', bold: true }, { text: 'formatted notes', italic: true }] },
    { type: 'bullet', runs: [{ text: 'Follow up', underline: true }] }
  ] };
  return { ...state, revision: 17, document: {
    version: 'create-something.mapping-canvas.v1', id: 'canvas-installed-upgrade-fixture',
    title: 'Existing mapping document', background: '#000000', createdAt, updatedAt: createdAt,
    viewport: { x: 25, y: -10, zoom: 0.85 }, objects: [
      { ...base, id: 'legacy-note', kind: 'note', x: 30, y: 30, width: 240, height: 170, text: 'Legacy plain note\n  Indented detail\nLong content remains readable after reopening.' },
      { ...base, id: 'rich-note', kind: 'note', x: 310, y: 30, width: 240, height: 210, text: 'Decision map\nPreserve formatted notes\n• Follow up', content },
      { ...base, id: 'shape', kind: 'rectangle', from: { x: 60, y: 250 }, to: { x: 220, y: 340 }, color: '#ffffff', name: 'Existing shape' },
      { ...base, id: 'connection', kind: 'connector', fromId: 'legacy-note', toId: 'rich-note', label: 'Next step' },
      { ...base, id: 'group', kind: 'group', x: 15, y: 15, width: 560, height: 350, label: 'Existing group', childIds: ['legacy-note', 'rich-note', 'shape'] }
    ]
  } };
}

async function main() {
  if (process.env.DRAW_INSTALLED_SKIP_BUILD !== '1') command('pnpm', ['build:dmg']);
  const dmgPath = newestDmg();
  const dmgVerification = command('hdiutil', ['verify', dmgPath]);
  mkdirSync(mountPath);
  command('hdiutil', ['attach', '-readonly', '-nobrowse', '-mountpoint', mountPath, dmgPath]);
  attached = true;
  const mountedApp = join(mountPath, 'CREATE SOMETHING Draw.app');
  if (!existsSync(mountedApp)) throw new Error('DMG does not contain CREATE SOMETHING Draw.app');
  mkdirSync(installPath);
  const installedApp = join(installPath, 'CREATE SOMETHING Draw.app');
  cpSync(mountedApp, installedApp, { recursive: true, preserveTimestamps: true });
  const canonicalApp = realpathSync(installedApp);
  const infoPath = join(canonicalApp, 'Contents', 'Info.plist');
  const identifier = command('/usr/libexec/PlistBuddy', [
    '-c',
    'Print :CFBundleIdentifier',
    infoPath
  ]).stdout;
  const version = command('/usr/libexec/PlistBuddy', [
    '-c',
    'Print :CFBundleShortVersionString',
    infoPath
  ]).stdout;
  const executable = command('/usr/libexec/PlistBuddy', [
    '-c',
    'Print :CFBundleExecutable',
    infoPath
  ]).stdout;
  if (identifier !== bundleIdentifier)
    throw new Error(`Unexpected bundle identifier: ${identifier}`);
  const dylibs = command('otool', [
    '-L',
    join(canonicalApp, 'Contents', 'MacOS', executable)
  ]).stdout;
  if (/\/usr\/local|\/opt\/homebrew|node_modules/.test(dylibs))
    throw new Error(`Unexpected external dependency:\n${dylibs}`);

  const binary = join(canonicalApp, 'Contents', 'MacOS', executable);
  const fresh = await persistenceRun(canonicalApp, executable, stateHome);
  const upgradeHome = join(temporaryRoot, 'existing-document-state');
  mkdirSync(upgradeHome);
  const seeded = populatedLegacyState(fresh.state);
  writeFileSync(join(upgradeHome, 'paired-session.json'), `${JSON.stringify(seeded, null, 2)}\n`);
  const upgrade = await persistenceRun(canonicalApp, executable, upgradeHome, seeded);
  const signingCheck = command('codesign', ['--verify', '--deep', '--strict', canonicalApp], {
    allowFailure: true
  });
  const signingDetails = command('codesign', ['-dv', '--verbose=4', canonicalApp], {
    allowFailure: true
  });
  const signingOutput = `${signingDetails.stdout}\n${signingDetails.stderr}`.trim();
  const signingAuthority = signingOutput.match(/^Authority=(.+)$/m)?.[1] || null;
  const teamIdentifier = signingOutput.match(/^TeamIdentifier=(.+)$/m)?.[1] || null;
  const productionSigned =
    signingCheck.status === 0 && signingAuthority?.startsWith('Developer ID Application:') === true;
  const signing =
    signingCheck.status === 0
      ? {
          status: productionSigned ? 'performed' : 'development-only',
          authority: signingAuthority,
          teamIdentifier,
          verification: signingCheck.stdout || signingCheck.stderr
        }
      : {
          status: 'unperformed',
          reason: 'No valid Apple distribution identity is available on this Mac.'
        };
  const appStapling = command('xcrun', ['stapler', 'validate', canonicalApp], {
    allowFailure: true
  });
  const dmgStapling = command('xcrun', ['stapler', 'validate', dmgPath], { allowFailure: true });
  const gatekeeper = command(
    'spctl',
    [
      '--assess',
      '--type',
      'open',
      '--context',
      'context:primary-signature',
      '--verbose=4',
      dmgPath
    ],
    { allowFailure: true }
  );
  const notarizationPerformed = appStapling.status === 0 && dmgStapling.status === 0;
  const gatekeeperPerformed = gatekeeper.status === 0;
  if (
    requireProductionRelease &&
    (!productionSigned || !notarizationPerformed || !gatekeeperPerformed)
  ) {
    throw new Error(
      `Production release gates failed: Developer ID=${productionSigned}, app stapling=${appStapling.status === 0}, DMG stapling=${dmgStapling.status === 0}, Gatekeeper=${gatekeeperPerformed}`
    );
  }
  const receipt = {
    schema: 'create-something/draw-installed-acceptance@1',
    ok: true,
    runId,
    artifact: {
      name: basename(dmgPath),
      sha256: sha256File(dmgPath),
      appSha256: hashDirectory(canonicalApp)
    },
    bundle: { identifier, version, binary, selfContained: true },
    state: {
      sessionId: fresh.sessionId,
      revision: fresh.revision,
      documentHash: fresh.documentHash,
      relaunchExact: true,
      existingDocument: { sessionId: upgrade.sessionId, revision: upgrade.revision, documentHash: upgrade.documentHash, relaunchExact: true, objectCount: seeded.document.objects.length, fixtureVersion: seeded.document.version }
    },
    evidence: {
      hdiutilVerify: dmgVerification.status === 0,
      readonlyMount: true,
      isolatedCopy: true,
      processIds: fresh.processIds,
      existingDocumentProcessIds: upgrade.processIds,
      termination: 'exact spawned child processes only',
      externalDylibCheck: true
    },
    gates: {
      installedLaunch: 'performed',
      persistenceRelaunch: 'performed',
      existingDocumentUpgrade: 'performed',
      signing,
      notarization: {
        status: notarizationPerformed ? 'performed' : 'unperformed',
        app: appStapling.stderr || appStapling.stdout,
        dmg: dmgStapling.stderr || dmgStapling.stdout
      },
      gatekeeper: {
        status: gatekeeperPerformed ? 'performed' : 'unperformed',
        assessment: gatekeeper.stderr || gatekeeper.stdout
      },
      physicalIPhoneAcceptance: 'unperformed'
    }
  };
  mkdirSync(outputRoot, { recursive: true });
  const receiptPath = join(outputRoot, 'installed-acceptance.json');
  writeFileSync(
    join(outputRoot, `installed-acceptance-${runId}.json`),
    `${JSON.stringify(receipt, null, 2)}\n`
  );
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, receipt: receiptPath, runId }, null, 2));
}

try {
  await main();
} finally {
  for (const child of [...launchedProcesses]) await quit(child);
  if (attached) command('hdiutil', ['detach', mountPath], { allowFailure: true });
  rmSync(temporaryRoot, { recursive: true, force: true });
}
