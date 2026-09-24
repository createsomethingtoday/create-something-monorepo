// Trusted streaming supervisor. No caller-selected command is exposed by the CLI.
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
export function supervise(command, args, { deadlineMs = 18000, outputBytes = 65536 } = {}) {
  return new Promise(resolve => {
    const child = spawn(command, args, { detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let bytes = 0, reason = null, stdout = Buffer.alloc(0), stderr = Buffer.alloc(0);
    const kill = why => {
      if (reason) return;
      reason = why;
      try { process.kill(-child.pid, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') reason = 'kill-failed'; }
    };
    const retain = (chunk, stream) => {
      bytes += chunk.length;
      const previous = stream === 'stdout' ? stdout : stderr;
      const limit = stream === 'stdout' ? 8192 : 1024;
      const next = Buffer.concat([previous, chunk.subarray(0, Math.max(0, limit - previous.length))]);
      if (stream === 'stdout') stdout = next; else stderr = next;
      if (bytes > outputBytes) kill('output-limit');
    };
    child.stdout.on('data', chunk => retain(chunk, 'stdout'));
    child.stderr.on('data', chunk => retain(chunk, 'stderr'));
    const timer = setTimeout(() => kill('deadline'), deadlineMs);
    child.on('error', () => { clearTimeout(timer); resolve({ exitCode: 126, reason: 'spawn-failed', bytes, stdout: '', stderr: '' }); });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ exitCode: reason === 'output-limit' ? 125 : code ?? (signal === 'SIGKILL' ? 137 : 126), reason, bytes, stdout: stdout.toString(), stderr: stderr.toString() });
    });
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2];
  if (!['isolation', 'memory', 'output'].includes(mode)) process.exit(64);
  const result = await supervise('/bin/sh', ['/opt/private-isolate.sh', mode]);
  // The SDK only sees this bounded trusted envelope, never fixture streams.
  process.stdout.write(JSON.stringify(result));
  process.exitCode = result.exitCode;
}
