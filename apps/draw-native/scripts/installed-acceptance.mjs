import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync,
  realpathSync, rmSync, statSync, writeFileSync,
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
let attached = false;

function command(name, args, { allowFailure = false, env } = {}) {
  const result = spawnSync(name, args, {
    cwd: appRoot, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
    env: env ? { ...process.env, ...env } : process.env,
  });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`${name} ${args.join(' ')} failed (${result.status}):\n${result.stderr || result.stdout}`);
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
const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
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
  const candidates = readdirSync(directory).filter((name) => name.endsWith('.dmg'))
    .map((name) => join(directory, name)).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  if (!candidates[0]) throw new Error(`No Draw DMG exists under ${directory}`);
  return candidates[0];
}
function launch(appPath, executable) {
  const binary = join(appPath, 'Contents', 'MacOS', executable);
  const result = command('open', ['-n', '-g', '--env', `CREATE_SOMETHING_DRAW_HOME=${stateHome}`, appPath]);
  if (result.status !== 0) throw new Error('Installed app failed to launch');
  return binary;
}
function quit() {
  command('osascript', ['-e', `tell application id "${bundleIdentifier}" to quit`], { allowFailure: true });
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
  const identifier = command('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleIdentifier', infoPath]).stdout;
  const version = command('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleShortVersionString', infoPath]).stdout;
  const executable = command('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleExecutable', infoPath]).stdout;
  if (identifier !== bundleIdentifier) throw new Error(`Unexpected bundle identifier: ${identifier}`);
  const dylibs = command('otool', ['-L', join(canonicalApp, 'Contents', 'MacOS', executable)]).stdout;
  if (/\/usr\/local|\/opt\/homebrew|node_modules/.test(dylibs)) throw new Error(`Unexpected external dependency:\n${dylibs}`);

  const binary = launch(canonicalApp, executable);
  const firstState = await waitForFile(join(stateHome, 'paired-session.json'));
  const firstDocumentHash = createHash('sha256').update(JSON.stringify(firstState.document)).digest('hex');
  const processEvidence = command('pgrep', ['-f', binary]);
  quit(); await delay(800);
  launch(canonicalApp, executable); await delay(1200);
  const secondState = await waitForFile(join(stateHome, 'paired-session.json'));
  const secondDocumentHash = createHash('sha256').update(JSON.stringify(secondState.document)).digest('hex');
  quit();
  if (firstState.sessionId !== secondState.sessionId || firstState.revision !== secondState.revision || firstDocumentHash !== secondDocumentHash) {
    throw new Error('Relaunch did not preserve the canonical session, revision, and document');
  }
  const signingCheck = command('codesign', ['--verify', '--deep', '--strict', canonicalApp], { allowFailure: true });
  const signing = signingCheck.status === 0
    ? { status: 'performed', verification: signingCheck.stdout || signingCheck.stderr }
    : { status: 'unperformed', reason: 'No valid Apple distribution identity is available on this Mac.' };
  const receipt = {
    schema: 'create-something/draw-installed-acceptance@1', ok: true, runId,
    artifact: { name: basename(dmgPath), sha256: sha256File(dmgPath), appSha256: hashDirectory(canonicalApp) },
    bundle: { identifier, version, binary, selfContained: true },
    state: { sessionId: firstState.sessionId, revision: firstState.revision, documentHash: firstDocumentHash, relaunchExact: true },
    evidence: { hdiutilVerify: dmgVerification.status === 0, readonlyMount: true, isolatedCopy: true, processIds: processEvidence.stdout.split('\n'), externalDylibCheck: true },
    gates: { installedLaunch: 'performed', persistenceRelaunch: 'performed', signing, notarization: { status: 'unperformed', reason: 'Notarization credentials are unavailable.' }, physicalIPhoneAcceptance: 'unperformed' },
  };
  mkdirSync(outputRoot, { recursive: true });
  const receiptPath = join(outputRoot, 'installed-acceptance.json');
  writeFileSync(join(outputRoot, `installed-acceptance-${runId}.json`), `${JSON.stringify(receipt, null, 2)}\n`);
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, receipt: receiptPath, runId }, null, 2));
}

try { await main(); }
finally {
  quit();
  if (attached) command('hdiutil', ['detach', mountPath], { allowFailure: true });
  rmSync(temporaryRoot, { recursive: true, force: true });
}
