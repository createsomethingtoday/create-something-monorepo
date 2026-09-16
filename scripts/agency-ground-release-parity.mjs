import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// The npm files allowlist excludes pilot/. The repository README is also not
// the shipped npm README. All other Ground paths must match the release.
export function verifyGroundReleaseParity(releaseSha, sourceSha, cwd = process.cwd()) {
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' });
  git('merge-base', '--is-ancestor', releaseSha, sourceSha);
  const changed = git('diff', '--no-renames', '--name-only', '-z', releaseSha, sourceSha,
    '--', 'packages/ground').split('\0').filter(Boolean);
  const blocked = changed.filter(file =>
    file !== 'packages/ground/README.md' && !file.startsWith('packages/ground/npm/pilot/'));
  if (blocked.length) throw new Error(`Unreleased Ground source: ${blocked.join(', ')}`);
  return changed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [releaseSha, sourceSha] = process.argv.slice(2);
  if (!releaseSha || !sourceSha) throw new Error('Usage: agency-ground-release-parity.mjs RELEASE_SHA SOURCE_SHA');
  const changes = verifyGroundReleaseParity(releaseSha, sourceSha);
  console.log(`Ground release parity passed; ${changes.length} repository-only documentation or pilot changes.`);
}
