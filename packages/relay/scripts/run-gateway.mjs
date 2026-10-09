import { spawn } from 'node:child_process';
import { runBackups } from './backup-loop.mjs';
import { backupToMountedR2 } from './container-backup.mjs';

// Own exactly one backup loop for this gateway process. Container shutdown destroys
// both; gateway exit/signal cancels timers and kills in-flight rsync immediately.
const controller = new AbortController();
const gateway = spawn('clawdbot', process.argv.slice(2), { stdio: 'inherit' });
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    controller.abort();
    gateway.kill(signal);
  });
}
const backups = runBackups({ signal: controller.signal, backup: backupToMountedR2 });
gateway.on('error', error => {
  console.error('[gateway] Failed to start:', error.message);
  controller.abort();
  process.exitCode = 1;
});
gateway.on('exit', (code, signal) => {
  controller.abort();
  process.exitCode = code ?? (signal ? 1 : 0);
});
await backups;
