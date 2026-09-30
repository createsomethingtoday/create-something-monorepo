import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { makeOperatorPorts, runOperatorCommand } from '../worker/linked-recovery-operator.ts';
import type { RecoveryPorts } from '../worker/linked-recovery.ts';
import { readRecoveryFenceDefinitions } from '../worker/linked-recovery-fence.ts';

test('adapter strips injected token and verifies ambient OAuth account before remote D1', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'gigi-linked-adapter-'));
  const bin = join(dir, 'wrangler');
  await writeFile(bin, `#!/usr/bin/env node
if (process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN) process.exit(12);
const args=process.argv.slice(2);
if (args[0]==='whoami') process.stdout.write(JSON.stringify({loggedIn:true,authType:'OAuth Token',accounts:[{id:'9645bd52e640b8a4f40a3a55ff1dd75a'}]}));
else if (args[0]==='d1') {
  if (!args.includes('--remote') || !args.includes('--json')) process.exit(13);
  const sql=args[args.indexOf('--command')+1];
  if (!sql.includes("subject = 'owner''quoted'")) process.exit(14);
  process.stdout.write(JSON.stringify([{success:true,results:[{subject:"owner'quoted",provider:'gmail',request_id:'request-old',status:'linked',connected_account_id:'ca_old',reconnectable:0,redirect_url:'https://connect.composio.dev/x',expires_at:'2026-09-30T15:00:00Z',created_at:'2026-09-30T14:50:00Z'}],meta:{changes:0}}]));
} else process.exit(15);
`);
  await chmod(bin, 0o700);
  const priorBin = process.env.GIGI_WRANGLER_BIN;
  const priorToken = process.env.CLOUDFLARE_API_TOKEN;
  process.env.GIGI_WRANGLER_BIN = bin;
  process.env.CLOUDFLARE_API_TOKEN = 'invalid-test-token';
  try {
    const row = await makeOperatorPorts('test-only-key').readAttempt("owner'quoted", 'gmail', 'request-old');
    assert.equal(row?.connected_account_id, 'ca_old');
  } finally {
    if (priorBin === undefined) delete process.env.GIGI_WRANGLER_BIN;
    else process.env.GIGI_WRANGLER_BIN = priorBin;
    if (priorToken === undefined) delete process.env.CLOUDFLARE_API_TOKEN;
    else process.env.CLOUDFLARE_API_TOKEN = priorToken;
    await rm(dir, { recursive: true, force: true });
  }
});
test('adapter paginates project scan and rejects malformed account data', async () => {
  const prior = globalThis.fetch;
  const requests: URL[] = [];
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    requests.push(url);
    assert.equal(init?.redirect, 'manual');
    assert.equal((init?.headers as Record<string, string>)['x-api-key'], 'test-only-key');
    if (!url.searchParams.has('cursor')) return Response.json({ items: [{ id: 'ca_one', user_id: 'other',
      auth_config: { id: 'ac_other' } }], next_cursor: 'next' });
    return Response.json({ items: [], next_cursor: null });
  };
  try {
    const scan = await makeOperatorPorts('test-only-key').scanAccounts('project', 'gigi_owner', 'ac_old');
    assert.equal(scan.complete, true);
    assert.equal(scan.pages, 2);
    assert.equal(scan.items.length, 1);
    assert.equal(requests[0]?.searchParams.has('user_ids'), false);
    assert.equal(requests[0]?.searchParams.has('auth_config_ids'), false);
    assert.equal(requests[1]?.searchParams.get('cursor'), 'next');
  } finally { globalThis.fetch = prior; }
});
test('operator receipt is exclusive, private, and records blocked observations without writes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'gigi-linked-command-'));
  const output = join(dir, 'receipt.json');
  let writes = 0;
  const ports = {
    now: () => Date.parse('2026-10-02T00:00:00Z'),
    wait: async () => undefined,
    readAttempt: async () => null,
    getAccount: async () => ({ status: 404 }),
    getAuthConfig: async () => ({ status: 404 }),
    scanAccounts: async () => ({ status: 200, items: [], pages: 1, complete: true }),
    readDeployment: async () => { throw new Error('should_not_call'); },
    conditionalUpdate: async () => { writes++; return { changes: 1 }; },
  } satisfies RecoveryPorts;
  const argv = ['--subject', 'owner', '--provider', 'gmail', '--request-id', 'request-old',
    '--account-id', 'ca_lb1WbyU07_b-', '--old-auth-config-id', 'ac_s2YEkh21bMT8',
    '--operator', 'Micah', '--reason', 'Expired consent', '--evidence', output];
  try {
    const result = await runOperatorCommand(argv, ports);
    assert.equal(result.reason, 'd1_not_exact_linked');
    assert.equal(writes, 0);
    const document = JSON.parse(await readFile(output, 'utf8'));
    assert.equal(document.state, 'finished');
    assert.equal(document.result.outcome, 'blocked');
    await assert.rejects(runOperatorCommand(argv, ports));
  } finally { process.exitCode = 0; await rm(dir, { recursive: true, force: true }); }
});
test('apply keeps a synced prewrite sidecar before conditional D1 write', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'gigi-linked-prewrite-'));
  const output = join(dir, 'apply.json');
  let time = Date.parse('2026-10-02T00:00:00Z');
  let writes = 0;
  const scopes = [
    'userinfo.profile', 'userinfo.email', 'contacts.readonly', 'contacts.other.readonly',
    'profile.language.read', 'user.addresses.read', 'user.birthday.read', 'user.emails.read',
    'user.phonenumbers.read', 'profile.emails.read',
  ].map((item) => 'https://www.googleapis.com/auth/' + item).concat('https://mail.google.com/');
  const ports: RecoveryPorts = {
    now: () => time,
    readRecoveryFence: async () => true,
    wait: async (ms) => { time += ms; },
    readReviewedTarget: async (accountId) => {
      assert.equal(accountId, 'ca_lb1WbyU07_b-');
      return { subject: 'owner', provider: 'gmail', request_id: 'request-old', status: 'linked',
        connected_account_id: accountId, reconnectable: 0,
        redirect_url: 'https://connect.composio.dev/session/old',
        expires_at: '2026-09-30T15:01:57.505Z', created_at: '2026-09-30T14:51:57.225Z' };
    },
    readAttempt: async () => ({
      subject: 'owner', provider: 'gmail', request_id: 'request-old', status: 'linked',
      connected_account_id: 'ca_lb1WbyU07_b-', reconnectable: 0,
      redirect_url: 'https://connect.composio.dev/session/old',
      expires_at: '2026-09-30T15:01:57.505Z', created_at: '2026-09-30T14:51:57.225Z',
    }),
    readDeployment: async () => ({
      accountId: '9645bd52e640b8a4f40a3a55ff1dd75a',
      deploymentId: '2c9066a0-b7a5-4f1d-a7c7-d1c3b420f027',
      deployedAt: '2026-09-30T12:33:59.563454Z',
      versionId: 'e6c10c86-94ae-44ae-9a2d-7fdd8fc9fc90', percentage: 100,
      gmailConfigId: 'ac_s2YEkh21bMT8',
      gmailScopes: 'https://www.googleapis.com/auth/gmail.readonly',
      databaseId: 'bcefe77e-d4b7-4d70-9002-1f969eef3457',
      completeHistory: true, coversAttemptCreation: true,
    }),
    getAuthConfig: async (id) => id === 'ac_s2YEkh21bMT8' ? { status: 404 } : {
      status: 200, id: 'ac_qXoEQURadG-h', toolkitSlug: 'gmail',
      authScheme: 'OAUTH2', isComposioManaged: true, state: 'ENABLED', scopes,
    },
    getAccount: async (id) => id === 'ca_BlstebUrbBn_' ? { status: 200,
      account: { id, user_id: 'playground', auth_config: { id: 'ac_qXoEQURadG-h' } } } : { status: 404 },
    scanAccounts: async () => ({ status: 200, items: [], pages: 1, complete: true }),
    conditionalUpdate: async () => {
      const sidecar = JSON.parse(await readFile(output + '.prewrite.json', 'utf8'));
      assert.equal(sidecar.state, 'prewrite_verified');
      assert.equal(sidecar.evidence.oldAuthConfigStatus, 404);
      writes++;
      return { changes: 1 };
    },
  };
  try {
    const result = await runOperatorCommand(['--reviewed-target', '--operator', 'Micah',
      '--reason', 'Expired consent', '--evidence', output, '--apply'], ports);
    assert.equal(result.outcome, 'released');
    assert.equal(writes, 1);
    assert.equal(JSON.parse(await readFile(output, 'utf8')).result.evidence.writeChanges, 1);
  } finally { process.exitCode = 0; await rm(dir, { recursive: true, force: true }); }
});

test('operator schema adapter rejects missing and altered live protection definitions', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'gigi-fence-adapter-'));
  const bin = join(dir, 'wrangler');
  const prior = process.env.GIGI_WRANGLER_BIN;
  const definitions = readRecoveryFenceDefinitions();
  try {
    process.env.GIGI_WRANGLER_BIN = bin;
    for (const [rows, valid] of [
      [definitions, true],
      [definitions.slice(0, 1), false],
      [definitions.map((entry) => ({ ...entry, sql: entry.sql.replace("OLD.status = 'attention'", "OLD.status = 'active'") })), false],
      [[definitions[0], definitions[0]], false],
    ] as const) {
      await writeFile(bin, `#!/usr/bin/env node
if (process.argv[2] === 'whoami') {
  console.log(JSON.stringify({loggedIn:true, authType:'OAuth Token', accounts:[{id:'9645bd52e640b8a4f40a3a55ff1dd75a'}]}));
} else {
  console.log(JSON.stringify([{success:true, results:${JSON.stringify(rows)}, meta:{changes:0}}]));
}
`);
      await chmod(bin, 0o700);
      assert.equal(await makeOperatorPorts('test-only-key').readRecoveryFence!(), valid);
    }
  } finally {
    if (prior === undefined) delete process.env.GIGI_WRANGLER_BIN;
    else process.env.GIGI_WRANGLER_BIN = prior;
    await rm(dir, { recursive: true, force: true });
  }
});
