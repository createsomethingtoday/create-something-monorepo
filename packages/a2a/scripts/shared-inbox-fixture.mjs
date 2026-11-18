/** Compatibility launcher for the local-only actual HTTP/SQLite fixture.
 * No mock response adapter is retained. This script launches tsx from the package.
 * See shared-inbox-fixture.ts for synthetic-session and loopback boundaries.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const child = spawn('pnpm', ['exec', 'tsx', 'scripts/shared-inbox-fixture.ts'], {
  cwd: fileURLToPath(new URL('..', import.meta.url)),
  stdio: 'inherit'
});
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => child.kill(signal));
child.once('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.once('exit', (code) => {
  process.exitCode = code ?? 0;
});
