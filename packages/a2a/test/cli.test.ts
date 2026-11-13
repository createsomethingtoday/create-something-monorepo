import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { createServer as createHttpServer } from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runCli } from '../src/cli.ts';

const directories: string[] = [];
afterEach(async () => { for (const path of directories.splice(0)) await rm(path, { recursive: true, force: true }); });
async function sessionFile() { const directory = await mkdtemp(join(tmpdir(), 'a2a-cli-')); directories.push(directory); return join(directory, 'session.json'); }
const config = { issuer: 'https://id.createsomething.space', resource: 'https://a2a.createsomething.agency/mcp', clientId: 'pilot-public-client', cliRedirectUri: 'http://127.0.0.1:42678/callback' };
async function assertCallbackClosed() {
	const server = createServer();
	await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(42678, '127.0.0.1', resolve); });
	await new Promise<void>(resolve => server.close(() => resolve()));
}

test('offline: CLI maps send arguments to the shared API and retains its reconciliation key', async () => {
	const calls: { url: string; init?: RequestInit }[] = [], output: string[] = [], errors: string[] = [];
	const code = await runCli(['send', '--from', 'a', '--to', 'b', '--text', 'A scoped request', '--thread', 'thread', '--key', 'stable-key'], {
		env: { A2A_TOKEN: 'test-token' }, out: value => output.push(value), err: value => errors.push(value),
		fetch: async (url, init) => { calls.push({ url: String(url), init }); return Response.json({ message: { id: 'm' }, duplicate: false, eventId: 'e' }); }
	});
	assert.equal(code, 0);
	assert.equal(calls.length, 1);
	assert.equal(calls[0].url, 'https://a2a.createsomething.agency/api/v1/messages');
	assert.equal(calls[0].init?.method, 'POST');
	assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { fromAgentId: 'a', toAgentId: 'b', text: 'A scoped request', threadId: 'thread', idempotencyKey: 'stable-key' });
	assert.equal(JSON.parse(output[0]).idempotencyKey, 'stable-key');
	assert.equal([...output, ...errors].join('').includes('test-token'), false);
});

test('offline: a stalled browser opener cannot keep the callback alive beyond the login deadline', async () => {
	const path = await sessionFile();
	let release!: () => void;
	const pending = runCli(['login'], {
		sessionPath: path, loginTimeoutMs: 10, out: () => {}, err: () => {},
		fetch: async () => Response.json(config),
		openBrowser: () => new Promise<void>(resolve => { release = resolve; })
	});
	const deadlineHonored = await Promise.race([pending.then(() => true), new Promise<false>(resolve => setTimeout(() => resolve(false), 100))]);
	release(); await pending;
	await assertCallbackClosed();
	assert.equal(deadlineHonored, true);
});

test('offline: command arguments map to REST operations without a second authorization implementation', async () => {
	const cases: { args: string[]; path: string; method?: string; body?: unknown }[] = [
		{ args: ['whoami'], path: '/me' },
		{ args: ['agents'], path: '/agents' },
		{ args: ['register', '--name', 'Canon'], path: '/agents', method: 'POST', body: { name: 'Canon' } },
		{ args: ['allow', '--agent', 'a', '--sender', 'b'], path: '/grants', method: 'POST', body: { agentId: 'a', senderAgentId: 'b' } },
		{ args: ['revoke', '--grant', 'g'], path: '/grants/g', method: 'DELETE' },
		{ args: ['pause', '--agent', 'a'], path: '/agents/a', method: 'PATCH', body: { paused: true } },
		{ args: ['resume', '--agent', 'a'], path: '/agents/a', method: 'PATCH', body: { paused: false } },
		{ args: ['inbox', '--agent', 'a', '--after', '17'], path: '/messages?agentId=a&after=17' },
		{ args: ['read', '--message', 'm/escaped'], path: '/messages/m%2Fescaped' },
		{ args: ['claim', '--message', 'm'], path: '/messages/m/claim', method: 'POST' },
		{ args: ['finish', '--message', 'm', '--claim-token', 'lease', '--state', 'approval_required'], path: '/messages/m/finish', method: 'POST', body: { claimToken: 'lease', state: 'approval_required' } },
		{ args: ['subscriptions', '--agent', 'a'], path: '/subscriptions?agentId=a' },
		{ args: ['unsubscribe', '--subscription', 's'], path: '/subscriptions/s', method: 'DELETE' },
		{ args: ['deliveries', '--agent', 'a'], path: '/deliveries?agentId=a' },
		{ args: ['replay', '--delivery', 'd'], path: '/deliveries/d/replay', method: 'POST' }
	];
	for (const item of cases) {
		let count = 0;
		const code = await runCli(item.args, { env: { A2A_TOKEN: 'fixture-only' }, out: () => {}, err: () => {}, fetch: async (url, init) => {
			count++; assert.equal(String(url), `https://a2a.createsomething.agency/api/v1${item.path}`);
			assert.equal(init?.method, item.method ?? 'GET');
			assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer fixture-only');
			assert.equal(init?.redirect, 'manual');
			assert.deepEqual(init?.body === undefined ? undefined : JSON.parse(String(init.body)), item.body);
			return Response.json({ ok: true });
		} });
		assert.equal(code, 0, item.args[0]); assert.equal(count, 1);
	}
});

test('offline: an unknown send outcome prints one stable generated key and performs no retry', async () => {
	const errors: string[] = [];
	let key = '', count = 0;
	const code = await runCli(['send', '--from', 'a', '--to', 'b', '--text', 'Private request'], {
		env: { A2A_TOKEN: 'fixture-token-never-print' }, out: () => assert.fail('No success output expected'), err: value => errors.push(value),
		fetch: async (_url, init) => { count++; key = JSON.parse(String(init?.body)).idempotencyKey; throw new Error('fixture-token-never-print Private request'); }
	});
	assert.equal(code, 1); assert.equal(count, 1);
	assert.match(key, /^[a-f0-9-]{36}$/);
	assert.ok(errors.some(value => value.includes(key)));
	assert.equal(errors.join('').includes('fixture-token-never-print'), false);
	assert.equal(errors.join('').includes('Private request'), false);
});

test('offline: help and invalid arguments do not read credentials or send requests', async () => {
	for (const args of [['--help'], ['send', '--from', 'a'], ['finish', '--message', 'm', '--claim-token', 'x', '--state', 'bogus'], ['inbox', '--agent', 'a', '--after', '-1'], ['agents', '--unknown', 'x'], ['agents', '--base-url', 'http://example.org'], ['agents', '--base-url', 'https://user:password@example.org'], ['agents', '--base-url', 'https://example.org/private']]) {
		let calls = 0;
		const code = await runCli(args, { sessionPath: '/nonexistent/a2a-test-session', out: () => {}, err: () => {}, fetch: async () => { calls++; return Response.json({}); } });
		assert.equal(calls, 0, args.join(' '));
		assert.equal(code, args.includes('--help') ? 0 : 1);
	}
});

test('offline: explicit loopback service is allowed and failed API authorization is preserved', async () => {
	const errors: string[] = [];
	let calls = 0;
	const code = await runCli(['agents', '--base-url', 'http://127.0.0.1:8787'], { env: { A2A_TOKEN: 'fixture' }, out: () => {}, err: value => errors.push(value), fetch: async url => {
		calls++; assert.equal(String(url), 'http://127.0.0.1:8787/api/v1/agents');
		return Response.json({ error: 'insufficient_scope', message: 'private fixture ignored' }, { status: 403 });
	} });
	assert.equal(code, 1); assert.equal(calls, 1);
	assert.match(errors[0], /403, insufficient_scope/);
	assert.equal(errors.join('').includes('private fixture'), false);
});

test('offline: login verifies state and PKCE, pins Identity, and atomically saves private credentials', async () => {
	const path = await sessionFile(), output: string[] = [];
	let authorization: URL | undefined;
	const code = await runCli(['login'], {
		sessionPath: path, now: () => 1000000, out: value => output.push(value), err: value => output.push(value),
		fetch: async (url, init) => {
			if (String(url).endsWith('/config')) return Response.json(config);
			assert.equal(String(url), `${config.issuer}/oauth/token`);
			assert.equal(init?.redirect, 'manual');
			const body = new URLSearchParams(String(init?.body));
			assert.equal(body.get('code'), 'fixture-authorization-code');
			assert.equal(body.get('client_id'), config.clientId);
			assert.equal(body.get('redirect_uri'), config.cliRedirectUri);
			assert.equal(body.get('resource'), config.resource);
			assert.equal(createHash('sha256').update(body.get('code_verifier')!).digest('base64url'), authorization!.searchParams.get('code_challenge'));
			return Response.json({ access_token: 'private-fixture-access', refresh_token: 'private-fixture-refresh', expires_in: 3600 });
		},
		openBrowser: async value => {
			authorization = new URL(value);
			assert.equal(authorization.origin, config.issuer);
			assert.equal(authorization.pathname, '/oauth/authorize');
			assert.equal(authorization.searchParams.get('code_challenge_method'), 'S256');
			assert.ok(authorization.searchParams.get('scope')!.split(' ').includes('a2a:admin'));
			assert.equal((await fetch(`${config.cliRedirectUri}?state=wrong&code=wrong`)).status, 400);
			const response = await fetch(`${config.cliRedirectUri}?${new URLSearchParams({ state: authorization.searchParams.get('state')!, code: 'fixture-authorization-code' })}`);
			assert.equal(response.status, 200);
		}
	});
	assert.equal(code, 0);
	const saved = JSON.parse(await readFile(path, 'utf8'));
	assert.equal(saved.accessToken, 'private-fixture-access'); assert.equal(saved.refreshToken, 'private-fixture-refresh');
	assert.equal(saved.expiresAt, 4600000);
	assert.equal((await stat(path)).mode & 0o777, 0o600);
	assert.deepEqual(await readdir(join(path, '..')), ['session.json']);
	assert.equal(output.join('').includes('private-fixture'), false);
	await assertCallbackClosed();
});

test('offline: login rejects arbitrary Identity configuration before opening a browser or sending tokens', async () => {
	let calls = 0;
	const code = await runCli(['login'], { sessionPath: await sessionFile(), out: () => {}, err: () => {}, fetch: async () => { calls++; return Response.json({ ...config, issuer: 'https://attacker.invalid' }); }, openBrowser: async () => assert.fail('Browser must not open') });
	assert.equal(code, 1); assert.equal(calls, 1);
});

test('offline: browser failure and token exchange failure close the loopback listener without saving credentials', async () => {
	for (const failure of ['browser', 'exchange']) {
		const path = await sessionFile();
		const code = await runCli(['login'], {
			sessionPath: path, out: () => {}, err: () => {},
			fetch: async url => String(url).endsWith('/config') ? Response.json(config) : Response.json({ error: 'invalid_grant' }, { status: 400 }),
			openBrowser: async url => {
				if (failure === 'browser') throw new Error('fixture failure');
				await fetch(`${config.cliRedirectUri}?${new URLSearchParams({ state: new URL(url).searchParams.get('state')!, code: 'fixture-code' })}`);
			}
		});
		assert.equal(code, 1);
		await assert.rejects(readFile(path), { code: 'ENOENT' });
		await assertCallbackClosed();
	}
});

test('offline: file session refresh is pinned, saved privately, and used for one API request', async () => {
	const path = await sessionFile(), output: string[] = [];
	await writeFile(path, JSON.stringify({ version: 1, baseUrl: 'https://a2a.createsomething.agency', ...config, accessToken: 'expired-private', refreshToken: 'refresh-private', expiresAt: 0 }), { mode: 0o600 });
	const calls: string[] = [];
	const code = await runCli(['whoami'], { sessionPath: path, env: {}, now: () => 1000, out: value => output.push(value), err: value => output.push(value), fetch: async (url, init) => {
		calls.push(String(url));
		if (String(url).endsWith('/oauth/token')) {
			const fields = new URLSearchParams(String(init?.body)); assert.equal(fields.get('refresh_token'), 'refresh-private'); assert.equal(fields.get('client_id'), config.clientId); assert.equal(fields.get('resource'), config.resource);
			return Response.json({ access_token: 'new-private', refresh_token: 'rotated-private', expires_in: 3600 });
		}
		assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer new-private');
		return Response.json({ subject: 'owner' });
	} });
	assert.equal(code, 0);
	assert.deepEqual(calls, [`${config.issuer}/oauth/token`, 'https://a2a.createsomething.agency/api/v1/me']);
	assert.equal(JSON.parse(await readFile(path, 'utf8')).refreshToken, 'rotated-private');
	assert.equal((await stat(path)).mode & 0o777, 0o600);
	assert.equal(output.join('').includes('private'), false);
});

test('regression: concurrent CLI processes exchange a shared one-use refresh token only once', {timeout:15000}, async () => {
	const path = await sessionFile();
	await writeFile(path, JSON.stringify({ version:1,baseUrl:'https://a2a.createsomething.agency',...config,accessToken:'expired-fixture',refreshToken:'one-use-fixture',expiresAt:0 }), {mode:0o600});
	const ready: import('node:http').ServerResponse[] = [];
	let refreshes = 0, revoked = false;
	const server = createHttpServer(async (request, response) => {
		response.setHeader('content-type','application/json');
		if(request.url==='/ready') { ready.push(response); if(ready.length===2)for(const pending of ready)pending.end('{}'); return; }
		if(request.url==='/oauth/token') {
			for await (const _chunk of request) { /* Consume the synthetic request. */ }
			refreshes++; if(refreshes>1){revoked=true;response.writeHead(400).end('{"error":"invalid_grant"}');return;}
			await new Promise(resolve=>setTimeout(resolve,100));
			response.end(JSON.stringify({access_token:'new-fixture',refresh_token:'rotated-fixture',expires_in:3600}));return;
		}
		if(revoked||request.headers.authorization!=='Bearer new-fixture') { response.writeHead(401).end('{}');return; }
		response.end('{"subject":"owner"}');
	});
	await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
	const children:ReturnType<typeof spawn>[]=[];
	try {
		const address=server.address() as import('node:net').AddressInfo;
		const target=`http://127.0.0.1:${address.port}`;
		const run=()=>new Promise<number|null>((resolve,reject)=>{
			const child=spawn(process.execPath,['--import','tsx',fileURLToPath(new URL('./fixtures/cli-concurrent.mjs',import.meta.url)),path,target],{stdio:'ignore'});
			children.push(child);const timer=setTimeout(()=>{child.kill();reject(new Error('CLI fixture process timed out'));},10000);
			child.once('error',error=>{clearTimeout(timer);reject(error);});child.once('exit',code=>{clearTimeout(timer);resolve(code);});
		});
		assert.deepEqual(await Promise.all([run(),run()]),[0,0]);
		assert.equal(refreshes,1,'A waiting process must reread the newly saved credential.');
		assert.equal(JSON.parse(await readFile(path,'utf8')).refreshToken,'rotated-fixture');
		assert.deepEqual(await readdir(join(path,'..')),['session.json']);
	} finally { for(const child of children)if(child.exitCode===null)child.kill();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve())); }
});

test('CLI refresh: an uncertain exchange is never retried with its consumed credential', async () => {
	const path=await sessionFile();
	await writeFile(path,JSON.stringify({version:1,baseUrl:'https://a2a.createsomething.agency',...config,accessToken:'expired-fixture',refreshToken:'one-use-fixture',expiresAt:0}),{mode:0o600});
	let exchanges=0;const errors:string[]=[];
	const options={sessionPath:path,env:{},out:()=>{},err:(value:string)=>errors.push(value),fetch:async()=>{exchanges++;throw new Error('lost response after grant consumption');}};
	assert.equal(await runCli(['whoami'],options),1);
	assert.equal(await runCli(['whoami'],options),1);
	assert.equal(exchanges,1);
	assert.equal(JSON.parse(await readFile(path,'utf8')).refreshToken,undefined);
	assert.match(errors.join(' '),/Run login again/);
	assert.deepEqual(await readdir(join(path,'..')),['session.json']);
});

test('CLI refresh: a held or interrupted session lock fails closed with bounded recovery guidance', async () => {
	const path=await sessionFile();const saved=JSON.stringify({version:1,baseUrl:'https://a2a.createsomething.agency',...config,accessToken:'expired-fixture',refreshToken:'one-use-fixture',expiresAt:0});
	await writeFile(path,saved,{mode:0o600});await writeFile(path+'.lock','{"pid":1}',{mode:0o600});
	const errors:string[]=[];let requests=0;
	assert.equal(await runCli(['whoami'],{sessionPath:path,sessionLockTimeoutMs:10,env:{},out:()=>{},err:value=>errors.push(value),fetch:async()=>{requests++;return Response.json({});}}),1);
	assert.equal(requests,0);assert.equal(await readFile(path,'utf8'),saved);
	assert.match(errors[0],/confirm no A2A command is running/);
	assert.ok(await stat(path+'.lock'));
});

test('offline: saved tokens cannot move to another API origin, and logout removes only its local session', async () => {
	const path = await sessionFile();
	await writeFile(path, JSON.stringify({ version: 1, baseUrl: 'https://a2a.createsomething.agency', ...config, accessToken: 'private-token', expiresAt: Date.now() + 3600000 }), { mode: 0o600 });
	let calls = 0;
	const fetcher: typeof fetch = async () => { calls++; return Response.json({}); };
	assert.equal(await runCli(['whoami', '--base-url', 'https://other.invalid'], { sessionPath: path, env: {}, out: () => {}, err: () => {}, fetch: fetcher }), 1);
	assert.equal(calls, 0);
	assert.equal(await runCli(['logout'], { sessionPath: path, env: {}, out: () => {}, err: () => {}, fetch: fetcher }), 0);
	assert.equal(calls, 0);
	await assert.rejects(readFile(path), { code: 'ENOENT' });
});

test('anonymous diagnose works without saved credentials and status uses the authenticated endpoint',async()=>{
 const outputs:string[]=[];const urls:string[]=[];
 const fetcher:typeof fetch=async input=>{urls.push(String(input));return Response.json({connectionId:'a2a-inbox',binding:{observed:'unknown'}});};
 assert.equal(await runCli(['diagnose'],{fetch:fetcher,env:{},sessionPath:'/nonexistent/cre2431-session',out:s=>outputs.push(s)}),0);
 assert.deepEqual(urls,['https://a2a.createsomething.agency/.well-known/a2a-connection']);
 urls.length=0;
 assert.equal(await runCli(['status'],{fetch:fetcher,env:{A2A_TOKEN:'synthetic-test-token'},out:s=>outputs.push(s)}),0);
 assert.deepEqual(urls,['https://a2a.createsomething.agency/api/v1/connection']);assert.ok(outputs.every(x=>!x.includes('synthetic-test-token')));
});


test('all CLI writes reconcile uncertain responses without automatic retries',async()=>{
 for(const failure of ['503','network','malformed'])for(const args of [['pause','--agent','agent'],['resume','--agent','agent'],['revoke','--grant','grant'],['unsubscribe','--subscription','subscription'],['claim','--message','message']]){
  let calls=0;const errors:string[]=[];
  assert.equal(await runCli(args,{env:{A2A_TOKEN:'synthetic-token'},out:()=>{},err:s=>errors.push(s),fetch:async()=>{calls++;if(failure==='network')throw new Error('synthetic network loss');if(failure==='malformed')return new Response('not-json');return Response.json({error:{code:'service_unavailable'}},{status:503});}}),1);
  assert.equal(calls,1);assert.match(errors.join(' '),/"action":"reconcile"/);assert.ok(!errors.join(' ').includes('synthetic-token'));
 }
});
