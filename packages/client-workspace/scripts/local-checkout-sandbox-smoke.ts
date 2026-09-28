// Manual, provider-backed macOS acceptance probe. Never runs in unit tests or CI.
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { connectCodexAppServer } from '../src/lib/server/codex/app-server.js';

const root = await mkdtemp(join(homedir(), '.client-checkout-sandbox-'));
const checkout = join(root, 'checkout');
const allowed = join(checkout, 'src', 'allowed.txt');
const blocked = join(checkout, 'blocked.txt');
const cwd = join(checkout, 'src');
let codex: Awaited<ReturnType<typeof connectCodexAppServer>> | undefined;

try {
  await mkdir(join(checkout, 'src'), { recursive: true });
  await writeFile(allowed, 'baseline\n');
  await writeFile(blocked, 'baseline\n');
  codex = await connectCodexAppServer();
  let approvalRequests = 0;
  let terminalResolve!: (status: string) => void;
  let terminal = new Promise<string>((resolve) => { terminalResolve = resolve; });
  codex.onMessage((message) => {
    if (message.id !== undefined && message.method?.includes('requestApproval')) {
      approvalRequests += 1;
      codex?.respond(message.id, { decision: 'decline' });
    }
    if (message.method === 'turn/completed') terminalResolve('completed');
    if (message.method === 'turn/failed') terminalResolve('failed');
  });
  const thread = await codex.startThread({
    cwd, approvalPolicy: 'on-request',
    developerInstructions: 'This is a synthetic macOS sandbox check. Run the requested command once, then report the OS result. Do not ask for approval.'
  });
  await codex.startTurn({
    threadId: thread.threadId,
    input: [{ type: 'text', text: `Run exactly this command once: printf probe > ${blocked}. Report the result.` }],
    approvalPolicy: 'on-request',
    sandboxPolicy: {
      type: 'workspaceWrite', writableRoots: [join(checkout, 'src')], networkAccess: false,
      excludeTmpdirEnvVar: true, excludeSlashTmp: true
    }
  });
  const deniedOutcome = await Promise.race([
    terminal,
    new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error('sandbox_smoke_timeout')), 180_000).unref();
    })
  ]);
  const blockedValue = await readFile(blocked, 'utf8');
  const deniedApprovalRequests = approvalRequests;
  terminal = new Promise<string>((resolve) => { terminalResolve = resolve; });
  await codex.startTurn({
    threadId: thread.threadId,
    input: [{ type: 'text', text: `Run exactly this command once: printf probe > ${allowed}. Report the result.` }],
    approvalPolicy: 'on-request',
    sandboxPolicy: {
      type: 'workspaceWrite', writableRoots: [join(checkout, 'src')], networkAccess: false,
      excludeTmpdirEnvVar: true, excludeSlashTmp: true
    }
  });
  const allowedOutcome = await Promise.race([
    terminal,
    new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error('sandbox_smoke_timeout')), 180_000).unref();
    })
  ]);
  const allowedValue = await readFile(allowed, 'utf8');
  console.log(JSON.stringify({ deniedOutcome, allowedOutcome, deniedApprovalRequests, approvalRequests,
    blockedUnchanged: blockedValue === 'baseline\n', allowedChanged: allowedValue === 'probe' }));
  if (deniedOutcome !== 'completed' || allowedOutcome !== 'completed' ||
    approvalRequests !== 0 ||
    blockedValue !== 'baseline\n' || allowedValue !== 'probe') {
    throw new Error('local_checkout_sandbox_failed');
  }
} finally {
  codex?.close();
  await rm(root, { recursive: true, force: true });
}
