import { copyFile, mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { connectCodexAppServer } from '../src/lib/server/codex/app-server.js';
import {
  MemoryWorkspaceReceiptStore,
  WorkspaceSession,
  type WorkspaceActivityEvent
} from '../src/lib/server/sessions/workspace-session.js';
import { workspaceRegistry } from '../src/lib/server/workspaces/default-registry.js';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(packageRoot, '../..');
const stateRoot = await mkdtemp(join(tmpdir(), 'client-workspace-codex-smoke-'));
const uploadRoot = join(stateRoot, 'uploads');
const imagePath = join(uploadRoot, 'reference.png');

async function waitForTerminal(session: WorkspaceSession): Promise<WorkspaceActivityEvent> {
  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('codex_smoke_timeout')), 180_000);
    const unsubscribe = session.subscribe((event) => {
      if (event.type === 'turn.completed' || event.type === 'turn.failed') {
        clearTimeout(timer);
        unsubscribe();
        resolve(event);
      }
    });
  });
}

let session: WorkspaceSession | undefined;
try {
  await import('node:fs/promises').then(({ mkdir }) => mkdir(uploadRoot, { recursive: true }));
  await copyFile(join(repoRoot, 'gemini_share.png'), imagePath);
  const image = await stat(imagePath);
  const codex = await connectCodexAppServer();
  const receiptStore = new MemoryWorkspaceReceiptStore();
  session = new WorkspaceSession({
    id: `smoke-${crypto.randomUUID()}`,
    workspace: workspaceRegistry.resolve('demo-frontend'),
    codex,
    uploadRoot,
    receiptStore
  });
  const terminal = waitForTerminal(session);
  await session.open();
  await session.startTurn({
    text: [
      'Inspect the attached image as a multimodal capability check.',
      'Do not edit files, run commands, use network access, or call external tools.',
      'Reply with IMAGE_RECEIVED followed by one short visual observation.'
    ].join(' '),
    attachment: { path: imagePath, mimeType: 'image/png', sizeBytes: image.size }
  });
  const terminalEvent = await terminal;
  const receipt = session.receipt();
  const agentText = receipt.events
    .filter((event) => event.type === 'agent.message')
    .map((event) => event.message)
    .join('');

  if (terminalEvent.type !== 'turn.completed' || !agentText.includes('IMAGE_RECEIVED')) {
    console.error(
      JSON.stringify({
        terminalType: terminalEvent.type,
        status: receipt.status,
        markerReceived: agentText.includes('IMAGE_RECEIVED'),
        agentText: agentText.slice(0, 300),
        errors: receipt.events
          .filter((event) => event.type === 'runtime.error' || event.type === 'turn.failed')
          .map((event) => event.message),
        eventTypes: [...new Set(receipt.events.map((event) => event.type))]
      })
    );
    throw new Error('codex_multimodal_smoke_failed');
  }

  console.log(
    JSON.stringify({
      status: receipt.status,
      imageAccepted: true,
      markerReceived: true,
      eventTypes: [...new Set(receipt.events.map((event) => event.type))]
    })
  );
} finally {
  await session?.close();
  await rm(stateRoot, { recursive: true, force: true });
}
