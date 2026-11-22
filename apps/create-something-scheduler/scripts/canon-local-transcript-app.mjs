#!/usr/bin/env node
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  chmod,
  lstat,
  access,
  realpath
} from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { homedir } from 'node:os';
const exec = promisify(execFile);
const scripts = dirname(fileURLToPath(import.meta.url));
const defaultApp = join(
  homedir(),
  'Library/Application Support/CREATE SOMETHING/Canon Local Transcript/Canon Local Transcript.app'
);
const [command, ...args] = process.argv.slice(2);
if (process.platform !== 'darwin') throw Error('The bundled on-device transcriber requires macOS.');
if (!['build', 'run'].includes(command))
  throw Error(
    'Use build [--app /private/path/new.app] or run [--app /private/path/app.app] -- <transcriber arguments>.'
  );
let app = defaultApp;
if (args[0] === '--app') {
  app = resolve(args[1]);
  args.splice(0, 2);
}
if (!app.endsWith('.app')) throw Error('Select an .app path.');
async function privateDirectory(path) {
  const stat = await lstat(path);
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    stat.uid !== process.getuid() ||
    stat.mode & 0o077
  )
    throw Error('The selected app parent must be a private, owner-owned directory.');
  if ((await realpath(path)) !== path) throw Error('Symlink paths are not permitted.');
}
if (command === 'build') {
  if (args.length) throw Error('Unexpected build arguments.');
  if (app === defaultApp) await mkdir(dirname(app), { recursive: true, mode: 0o700 });
  await privateDirectory(dirname(app));
  // Never replace a previously built or running binary.
  try {
    await access(app);
    throw Error('App exists; choose a new private build path. Existing binaries are preserved.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await mkdir(join(app, 'Contents/MacOS'), { recursive: true, mode: 0o700 });
  const plist = await readFile(join(scripts, 'canon-local-transcript.Info.plist'), 'utf8');
  await writeFile(join(app, 'Contents/Info.plist'), plist, { mode: 0o600 });
  await exec('/usr/bin/swiftc', [
    join(scripts, 'canon-local-transcript.swift'),
    '-o',
    join(app, 'Contents/MacOS/canon-local-transcript')
  ]);
  const launcher = `#!/bin/zsh
if [[ "$1" != "--launch-log" || -z "$2" ]]; then exit 64; fi
log="$2"
shift 2
umask 077
"\${0:A:h}/canon-local-transcript" "$@" > "$log" 2>&1
result=$?
print -r -- "$result" > "$log.status.tmp"
/bin/mv "$log.status.tmp" "$log.status"
exit "$result"
`;
  await writeFile(join(app, 'Contents/MacOS/CanonLocalTranscript'), launcher, { mode: 0o700 });
  await chmod(join(app, 'Contents/MacOS/canon-local-transcript'), 0o700);
  await exec('/usr/bin/codesign', ['--force', '--deep', '--sign', '-', app]);
  await exec('/usr/bin/codesign', ['--verify', '--deep', '--strict', app]);
  console.log(`Built and ad-hoc signed ${app}`);
} else {
  if (args.shift() !== '--' || !args.length) throw Error('Pass transcriber arguments after --.');
  await privateDirectory(dirname(app));
  await exec('/usr/bin/codesign', ['--verify', '--deep', '--strict', app]);
  const runRoot = await mkdtemp(join(dirname(app), '.canon-transcript-run-'));
  await chmod(runRoot, 0o700);
  const log = join(runRoot, 'result.log');
  // LaunchServices owns the app launch and TCC identity. open's status alone is
  // insufficient: the app wrapper records the actual native process status.
  await exec('/usr/bin/open', ['-n', '-W', app, '--args', '--launch-log', log, ...args], {
    timeout: 4 * 60 * 60 * 1000
  });
  let status;
  try {
    status = (await readFile(log + '.status', 'utf8')).trim();
  } catch {
    throw Error(
      `The app did not complete normally. Inspect ${log} and macOS crash reports. No successful transcription is claimed.`
    );
  }
  const output = await readFile(log, 'utf8');
  process.stdout.write(output);
  if (status !== '0')
    throw Error(`Transcriber exited ${status}; diagnostic log retained at ${log}.`);
  const index = args.indexOf('--output');
  if (!args.includes('--help') && !args.includes('--validate-audio')) {
    if (index < 0 || !args[index + 1])
      throw Error('Successful transcription requires an explicit output.');
    const result = JSON.parse(await readFile(resolve(args[index + 1]), 'utf8'));
    if (result.provider !== 'macOS Speech on-device' || !result.segments?.length)
      throw Error('The expected final on-device transcript was not published.');
    console.log(`Verified final transcript: ${resolve(args[index + 1])}`);
  }
  console.log(`LaunchServices completed successfully; private diagnostic log: ${log}`);
}
