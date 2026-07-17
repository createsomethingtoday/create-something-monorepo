import { homedir } from 'node:os';
import { join } from 'node:path';

import { startPresenceServer } from './service';
import { createEvenTerminalExecutor } from './terminal';

const token = process.env.CODEX_PRESENCE_TOKEN?.trim();
if (!token) throw new Error('CODEX_PRESENCE_TOKEN is required.');

const service = await startPresenceServer({
  token,
  codexHome: process.env.CODEX_HOME?.trim() || join(homedir(), '.codex'),
  port: Number(process.env.CODEX_PRESENCE_PORT || 4782),
  allowedOrigin: process.env.CODEX_PRESENCE_ORIGIN?.trim() || 'http://127.0.0.1:5173',
  staticDir: process.env.CODEX_PRESENCE_STATIC_DIR?.trim() || undefined,
  actionExecutor: createEvenTerminalExecutor({
    instancesDir:
      process.env.EVEN_TERMINAL_INSTANCES?.trim() || join(homedir(), '.even-terminal', 'instances')
  })
});

console.log(`Codex Presence listening at ${service.origin}`);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void service.close().finally(() => process.exit(0));
  });
}
