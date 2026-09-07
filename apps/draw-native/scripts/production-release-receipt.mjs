import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const receiptPath = join(appRoot, 'output', 'installed-acceptance', 'installed-acceptance.json');
const outputPath = join(appRoot, 'output', 'production-release.json');
const version = process.env.DRAW_RELEASE_VERSION;
const buildNumber = process.env.DRAW_BUILD_NUMBER;
const sourceSha = process.env.GITHUB_SHA;

if (!version || !buildNumber || !sourceSha)
  throw new Error('DRAW_RELEASE_VERSION, DRAW_BUILD_NUMBER, and GITHUB_SHA are required');
if (!existsSync(receiptPath))
  throw new Error(`Installed acceptance receipt is missing: ${receiptPath}`);

const installed = JSON.parse(readFileSync(receiptPath, 'utf8'));
for (const gate of ['signing', 'notarization', 'gatekeeper']) {
  if (installed.gates?.[gate]?.status !== 'performed')
    throw new Error(`Installed acceptance gate is not performed: ${gate}`);
}

const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const newest = (directory, suffix) =>
  readdirSync(directory)
    .filter((name) => name.endsWith(suffix))
    .sort()
    .at(-1);
const dmgDirectory = join(appRoot, 'src-tauri', 'target', 'release', 'bundle', 'dmg');
const ipaDirectory = join(appRoot, 'src-tauri', 'gen', 'apple', 'build', 'arm64');
const dmgName = newest(dmgDirectory, '.dmg');
const ipaName = newest(ipaDirectory, '.ipa');
if (!dmgName || !ipaName) throw new Error('Signed DMG and iPhone IPA must both exist');
const dmgPath = join(dmgDirectory, dmgName);
const ipaPath = join(ipaDirectory, ipaName);
if (sha256(dmgPath) !== installed.artifact.sha256)
  throw new Error('DMG differs from the installed acceptance artifact');

const receipt = {
  schema: 'create-something/draw-production-release@1',
  source: { sha: sourceSha, version, buildNumber },
  artifacts: {
    macos: { name: basename(dmgPath), sha256: sha256(dmgPath) },
    ios: { name: basename(ipaPath), sha256: sha256(ipaPath) },
    icon: { name: 'icon.icns', sha256: sha256(join(appRoot, 'src-tauri', 'icons', 'icon.icns')) }
  },
  apple: {
    signing: installed.gates.signing,
    notarization: installed.gates.notarization,
    gatekeeper: installed.gates.gatekeeper
  },
  physicalAcceptance: 'pending-two-clean-runs',
  publication: 'draft-release-pending-physical-acceptance'
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(
  JSON.stringify({ ok: true, receipt: outputPath, artifacts: receipt.artifacts }, null, 2)
);
