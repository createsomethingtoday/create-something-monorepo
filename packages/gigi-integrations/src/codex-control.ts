import { createServer, type Server } from 'node:net';
import { chmod, lstat } from 'node:fs/promises';
import { dirname, isAbsolute } from 'node:path';

// Native creates a private directory and passes its socket path to this owned child.
// Only cancellation is admitted; ordinary operations retain their serial stdin path.
export async function cancellationControl(path: string, cancel: (input: Record<string, unknown>) => Promise<unknown>): Promise<Server> {
  if (!isAbsolute(path)) throw new Error('invalid_control_path');
  const parent = await lstat(dirname(path));
  if (!parent.isDirectory() || parent.isSymbolicLink() || (parent.mode & 0o777) !== 0o700 || parent.uid !== process.getuid?.()) throw new Error('invalid_control_path');
  const server = createServer(socket => {
    let buffer = '', consumed = false;
    socket.setEncoding('utf8'); socket.setTimeout(60_000, () => socket.destroy());
    socket.on('error', () => {});
    socket.on('data', chunk => {
      if (consumed) return;
      buffer += chunk;
      if (Buffer.byteLength(buffer) > 65_536) { consumed = true; socket.destroy(); return; }
      const end = buffer.indexOf('\n'); if (end < 0) return;
      consumed = true;
      void (async () => {
        let id: unknown = null;
        try {
          const request = JSON.parse(buffer.slice(0, end)); id = request.id;
          if (request.operation !== 'agent.chat.cancel' || !request.input || typeof request.input !== 'object' || Array.isArray(request.input)) throw new Error('invalid_request');
          const value = await cancel(request.input);
          socket.end(JSON.stringify({ id, ok: true, value }) + '\n');
        } catch (error) {
          const reason = error instanceof Error && ['session_not_found', 'invalid_request', 'turn_in_progress'].includes(error.message) ? error.message : 'unavailable';
          socket.end(JSON.stringify({ id, ok: false, error: { reason } }) + '\n');
        }
      })();
    });
  });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(path, () => { server.removeListener('error', reject); resolve(); }); });
  await chmod(path, 0o600);
  return server;
}
