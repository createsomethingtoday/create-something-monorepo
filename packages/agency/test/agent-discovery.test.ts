import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { withAgentDiscoveryLinks } from '../src/lib/server/agent-discovery.ts';

function encodeBase64Url(value: string | ArrayBuffer): string {
	return Buffer.from(typeof value === 'string' ? value : new Uint8Array(value)).toString('base64url');
}

async function createAgencyDiscoveryAccessToken(kind: 'oauth_access_token' | 'agent_auth_access_token' = 'oauth_access_token') {
	const issuer = `https://${kind}.identity.example.test`;
	const keyPair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
		'sign',
		'verify'
	]);
	const publicJwk = (await crypto.subtle.exportKey('jwk', keyPair.publicKey)) as JsonWebKey & {
		kid: string;
		alg: string;
		use: string;
	};
	publicJwk.kid = 'agent-discovery-test-key';
	publicJwk.alg = 'ES256';
	publicJwk.use = 'sig';
	const now = Math.floor(Date.now() / 1000);
	const signingInput = [
		encodeBase64Url(JSON.stringify({ alg: 'ES256', typ: 'JWT', kid: publicJwk.kid })),
		encodeBase64Url(
			JSON.stringify({
				sub: 'usr_agent',
				email: 'agent@example.com',
				tier: 'free',
				source: 'space',
				iss: issuer,
				aud: ['https://createsomething.agency'],
				iat: now - 30,
				exp: now + 300,
				kind,
				client_id: 'oauth_agent',
				scope: 'openid mcp',
				resource: 'https://createsomething.agency'
			})
		)
	].join('.');
	const signature = await crypto.subtle.sign(
		{ name: 'ECDSA', hash: 'SHA-256' },
		keyPair.privateKey,
		new TextEncoder().encode(signingInput)
	);
	return {
		issuer,
		token: `${signingInput}.${encodeBase64Url(signature)}`,
		jwks: { keys: [publicJwk] }
	};
}

test('the public API catalog describes only real agent-facing interfaces', async () => {
	const { GET } = await import('../src/routes/.well-known/api-catalog/+server.ts');
	const response = await GET({} as never);

	assert.equal(response.status, 200);
	assert.match(response.headers.get('content-type') ?? '', /^application\/linkset\+json/);

	const body = (await response.json()) as {
		linkset: Array<{ anchor: string; href: string; rel: string[] }>;
	};
	assert.ok(
		body.linkset.some(
			(link) =>
				link.anchor === 'https://createsomething.agency' &&
				link.href === 'https://createsomething.agency/openapi-agent.yaml' &&
				link.rel.includes('service-desc')
		)
	);
	assert.ok(
		body.linkset.some(
			(link) =>
				link.href === 'https://createsomething.agency/agent-api.md' && link.rel.includes('service-doc')
		)
	);
});

test('robots tells AI crawlers to allow search and agent input, not model training', async () => {
	const robots = await readFile(new URL('../static/robots.txt', import.meta.url), 'utf8');

	assert.match(robots, /^Content-Signal: search=yes, ai-input=yes, ai-train=no, use=reference$/m);
});

test('homepage responses carry the catalog, API, docs, and manifest discovery links', async () => {
	const response = withAgentDiscoveryLinks(
		new Response('<!doctype html>', { headers: { 'content-type': 'text/html; charset=utf-8' } })
	);
	const linkText = response.headers.get('link') ?? '';

	assert.match(linkText, /rel="api-catalog"/);
	assert.match(linkText, /rel="service-desc"/);
	assert.match(linkText, /rel="service-doc"/);
	assert.match(linkText, /rel="describedby"/);
	assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');
});

test('the application hook applies the public discovery links around cache handling', async () => {
	const hooks = await readFile(new URL('../src/hooks.server.ts', import.meta.url), 'utf8');

	assert.match(hooks, /const agentDiscoveryHandle: Handle/);
	assert.match(hooks, /agentDiscoveryHandle,\s*publicHtmlCacheHandle/);
});

test('the published skills index includes an integrity digest for the public discovery skill', async () => {
	const { GET } = await import('../src/routes/.well-known/agent-skills/index.json/+server.ts');
	const response = await GET({} as never);
	const body = (await response.json()) as {
		$schema: string;
		skills: Array<{ name: string; type: string; description: string; url: string; digest: string }>;
	};
	const skill = body.skills.find((item) => item.name === 'create-something-public-discovery');

	assert.equal(response.status, 200);
	assert.equal(body.$schema, 'https://schemas.agentskills.io/discovery/0.2.0/schema.json');
	assert.equal(skill?.type, 'skill-md');
	assert.match(skill?.description ?? '', /bounded workflow mapping/i);
	assert.equal(skill?.url, 'https://createsomething.agency/agent-skills/create-something-public-discovery/SKILL.md');
	assert.equal(skill?.digest, 'sha256:1d4d71005e1fadb3c5df015e74c041ec1818a7220d2ca65625f1ddabefa7ce7c');
	const artifact = await readFile(
		new URL('../static/agent-skills/create-something-public-discovery/SKILL.md', import.meta.url)
	);
	assert.equal(skill?.digest, `sha256:${createHash('sha256').update(artifact).digest('hex')}`);
});

test('the MCP server card points to the live content MCP and keeps its runtime claims bounded', async () => {
	const { GET } = await import('../src/routes/.well-known/mcp/server-card.json/+server.ts');
	const response = await GET({} as never);
	const body = (await response.json()) as {
		name: string;
		serverInfo: { name: string; version: string };
		remotes: Array<{ type: string; url: string; supportedProtocolVersions?: string[] }>;
		capabilities: { tools: boolean; resources: boolean; prompts: boolean };
	};

	assert.equal(response.status, 200);
	assert.match(response.headers.get('content-type') ?? '', /^application\/mcp-server-card\+json/);
	assert.equal(body.name, 'createsomething.ltd/content');
	assert.deepEqual(body.serverInfo, { name: 'create-something', version: '1.0.0' });
	assert.equal(body.remotes[0]?.type, 'streamable-http');
	assert.equal(body.remotes[0]?.url, 'https://mcp.createsomething.ltd/mcp');
	assert.deepEqual(body.remotes[0]?.supportedProtocolVersions, ['2025-11-25']);
	assert.deepEqual(body.capabilities, { tools: true, resources: true, prompts: true });
});

test('the A2A endpoint delegates only a text mapping request to the bounded public map agent', async () => {
	const { POST } = await import('../src/routes/a2a/+server.ts');
	let forwarded: Request | undefined;
	const response = await POST({
		request: new Request('https://createsomething.agency/a2a', {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.11' },
			body: JSON.stringify({
				jsonrpc: '2.0',
				id: 'request-7',
				method: 'message/send',
				params: {
					message: {
						kind: 'message',
						messageId: 'message-7',
						role: 'user',
						parts: [{ kind: 'text', text: 'Map the lead handoff workflow.' }]
					}
				}
			})
		}),
		fetch: async (request: Request) => {
			forwarded = request;
			return Response.json({
				reply: 'I mapped the review gate.',
				canvas: { id: 'map_7', nodes: [], edges: [], agentMessages: 1, mutationCount: 1 },
				mutationCount: 1,
				suggestions: [],
				readiness: { score: 0, slug: 'starting', reason: 'Start with the owner.' },
				agentMode: 'fallback'
			});
		}
	} as never);

	const body = (await response.json()) as {
		jsonrpc: string;
		id: string;
		result: { kind: string; status: { state: string; message: { parts: Array<{ kind: string; text?: string }> } } };
	};
	assert.equal(response.status, 200);
	assert.equal(forwarded?.url, 'https://createsomething.agency/api/atlas/public-agent');
	assert.deepEqual(await forwarded?.json(), { message: 'Map the lead handoff workflow.' });
	assert.equal(body.jsonrpc, '2.0');
	assert.equal(body.id, 'request-7');
	assert.equal(body.result.kind, 'task');
	assert.equal(body.result.status.state, 'completed');
	assert.equal(body.result.status.message.parts[0]?.text, 'I mapped the review gate.');
});

test('the A2A endpoint returns a JSON-RPC invalid-request envelope for non-object JSON', async () => {
	const { POST } = await import('../src/routes/a2a/+server.ts');
	const response = await POST({
		request: new Request('https://createsomething.agency/a2a', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: 'null'
		}),
		fetch: async () => {
			throw new Error('non-object JSON must not call the workflow mapper');
		}
	} as never);

	assert.equal(response.status, 400);
	assert.deepEqual(await response.json(), {
		jsonrpc: '2.0',
		id: null,
		error: { code: -32600, message: 'Invalid Request' }
	});
});

test('the A2A agent card advertises only the implemented non-streaming mapping skill', async () => {
	const { GET } = await import('../src/routes/.well-known/agent-card.json/+server.ts');
	const response = await GET({} as never);
	const body = (await response.json()) as {
		version: string;
		supportedInterfaces: Array<{ url: string; protocolBinding: string; protocolVersion: string }>;
		capabilities: { streaming: boolean; pushNotifications: boolean };
		skills: Array<{ id: string }>;
	};

	assert.equal(response.status, 200);
	assert.equal(body.version, '1.0.0');
	assert.deepEqual(body.supportedInterfaces, [
		{
			url: 'https://createsomething.agency/a2a',
			protocolBinding: 'JSONRPC',
			protocolVersion: '1.0'
		}
	]);
	assert.deepEqual(body.capabilities, { streaming: false, pushNotifications: false });
	assert.deepEqual(body.skills.map((skill) => skill.id), ['bounded-workflow-mapping']);
});

test('auth.md and protected-resource metadata describe the same real OAuth resource', async () => {
	const { GET } = await import('../src/routes/.well-known/oauth-protected-resource/+server.ts');
	const response = await GET({} as never);
	const body = (await response.json()) as {
		resource: string;
		authorization_servers: string[];
		scopes_supported: string[];
		bearer_methods_supported: string[];
	};
	const auth = await readFile(new URL('../static/auth.md', import.meta.url), 'utf8');

	assert.equal(response.status, 200);
	assert.equal(body.resource, 'https://createsomething.agency');
	assert.deepEqual(body.authorization_servers, ['https://id.createsomething.space']);
	assert.deepEqual(body.scopes_supported, ['openid', 'profile', 'email', 'mcp']);
	assert.deepEqual(body.bearer_methods_supported, ['header']);
	assert.match(auth, /^# auth\.md$/m);
	assert.match(auth, /user authorization and PKCE/i);
	assert.match(auth, /anonymous agent registration/i);
	assert.match(auth, /POST https:\/\/id\.createsomething\.space\/agent\/auth/);
});

test('the OAuth-protected agent endpoint gives unauthenticated agents the resource metadata pointer', async () => {
	const { GET } = await import('../src/routes/api/agent-access/+server.ts');
	const response = await GET({
		request: new Request('https://createsomething.agency/api/agent-access')
	} as never);

	assert.equal(response.status, 401);
	assert.match(
		response.headers.get('www-authenticate') ?? '',
		/resource_metadata="https:\/\/createsomething\.agency\/.well-known\/oauth-protected-resource"/
	);
});

test('the OAuth-protected agent endpoint accepts a verified resource-bound discovery token only', async () => {
	const { GET } = await import('../src/routes/api/agent-access/+server.ts');
	const { issuer, token, jwks } = await createAgencyDiscoveryAccessToken();
	const response = await GET({
		request: new Request('https://createsomething.agency/api/agent-access', {
			headers: { authorization: `Bearer ${token}` }
		}),
		platform: {
			env: {
				CS_IDENTITY_ISSUER: issuer,
				CS_IDENTITY_JWKS_URL: `${issuer}/.well-known/jwks.json`
			}
		},
		fetch: async () => Response.json(jwks)
	} as never);
	const body = (await response.json()) as { authenticated: boolean; subject: string; allowed: string[] };

	assert.equal(response.status, 200);
	assert.equal(body.authenticated, true);
	assert.equal(body.subject, 'usr_agent');
	assert.deepEqual(body.allowed, ['read_agent_discovery']);
});

test('the OAuth-protected agent endpoint accepts the short-lived anonymous agent registration token', async () => {
	const { GET } = await import('../src/routes/api/agent-access/+server.ts');
	const { issuer, token, jwks } = await createAgencyDiscoveryAccessToken('agent_auth_access_token');
	const response = await GET({
		request: new Request('https://createsomething.agency/api/agent-access', {
			headers: { authorization: `Bearer ${token}` }
		}),
		platform: {
			env: {
				CS_IDENTITY_ISSUER: issuer,
				CS_IDENTITY_JWKS_URL: `${issuer}/.well-known/jwks.json`
			}
		},
		fetch: async () => Response.json(jwks)
	} as never);

	assert.equal(response.status, 200);
});
