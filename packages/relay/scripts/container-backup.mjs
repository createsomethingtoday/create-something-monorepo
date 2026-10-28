import { readFile, access, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execute = promisify(execFile);

/** Never mounts storage. Missing mount/config means no work, not a container wake. */
export async function backupToMountedR2(signal, io = { readFile, access, writeFile, execute }) {
  signal.throwIfAborted();
  const mounts = await io.readFile('/proc/mounts', 'utf8');
  if (!mounts.split('\n').some(line => {
    const fields = line.split(' ');
    return fields[1] === '/data/moltbot' && fields[2] === 'fuse.s3fs';
  })) return;
  signal.throwIfAborted();
  await io.access('/root/.clawdbot/clawdbot.json');
  const options = { timeout: 30000, killSignal: 'SIGKILL', signal, maxBuffer: 65536 };
  signal.throwIfAborted();
  await io.execute('rsync', ['-r', '--no-times', '--delete', '--exclude=*.lock', '--exclude=*.log', '--exclude=*.tmp', '/root/.clawdbot/', '/data/moltbot/clawdbot/'], options);
  signal.throwIfAborted();
  await io.execute('rsync', ['-r', '--no-times', '--delete', '/root/clawd/skills/', '/data/moltbot/skills/'], options);
  signal.throwIfAborted();
  await io.writeFile('/data/moltbot/.last-sync', new Date().toISOString());
}
