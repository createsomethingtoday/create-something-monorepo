import { describe, expect, it } from 'vitest';

import {
  classifyWorkflowJob,
  createAppJwt,
  createInstallationToken,
  createJitConfiguration,
  parseAllowedRepositories,
  verifyWebhookSignature
} from '../src/broker';

const encoder = new TextEncoder();

async function sign(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  return `sha256=${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

describe('verifyWebhookSignature', () => {
  it('accepts the matching GitHub HMAC and rejects tampering', async () => {
    const body = JSON.stringify({ action: 'queued' });
    const signature = await sign('webhook-secret', body);

    await expect(verifyWebhookSignature(body, signature, 'webhook-secret')).resolves.toBe(true);
    await expect(verifyWebhookSignature(`${body} `, signature, 'webhook-secret')).resolves.toBe(
      false
    );
    await expect(verifyWebhookSignature(body, 'sha256=not-hex', 'webhook-secret')).resolves.toBe(
      false
    );
  });
});

describe('parseAllowedRepositories', () => {
  it('normalizes a comma-separated allowlist and drops empty values', () => {
    expect(
      parseAllowedRepositories(' createsomethingtoday/one,createsomethingtoday/two, ')
    ).toEqual(new Set(['createsomethingtoday/one', 'createsomethingtoday/two']));
  });
});

describe('classifyWorkflowJob', () => {
  const payload = {
    action: 'queued',
    installation: { id: 42 },
    repository: { id: 100, full_name: 'createsomethingtoday/one' },
    workflow_job: {
      id: 200,
      name: 'validate',
      workflow_name: 'CI',
      labels: ['self-hosted', 'Linux', 'X64', 'cloudflare-ephemeral']
    }
  };

  it('accepts only queued, installed, allowlisted jobs with the broker label', () => {
    expect(classifyWorkflowJob(payload, new Set(['createsomethingtoday/one']))).toEqual({
      kind: 'launch',
      installationId: 42,
      repositoryId: 100,
      repository: 'createsomethingtoday/one',
      jobId: 200,
      jobName: 'validate',
      workflowName: 'CI'
    });
  });

  it.each([
    [{ ...payload, action: 'completed' }, 'not-queued'],
    [{ ...payload, installation: undefined }, 'missing-installation'],
    [
      { ...payload, workflow_job: { ...payload.workflow_job, labels: ['ubuntu-latest'] } },
      'label-mismatch'
    ]
  ])('ignores invalid payloads', (candidate, reason) => {
    expect(classifyWorkflowJob(candidate, new Set(['createsomethingtoday/one']))).toEqual({
      kind: 'ignore',
      reason
    });
  });

  it('rejects repositories outside the explicit allowlist', () => {
    expect(classifyWorkflowJob(payload, new Set(['createsomethingtoday/two']))).toEqual({
      kind: 'ignore',
      reason: 'repository-not-allowed'
    });
  });
});

describe('createAppJwt', () => {
  it('creates a short-lived RS256 JWT with the expected issuer', async () => {
    const pair = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256'
      },
      true,
      ['sign', 'verify']
    );
    const pkcs8 = await crypto.subtle.exportKey('pkcs8', pair.privateKey);
    const pem = `-----BEGIN PRIVATE KEY-----\n${Buffer.from(pkcs8)
      .toString('base64')
      .match(/.{1,64}/g)
      ?.join('\n')}\n-----END PRIVATE KEY-----`;
    const nowSeconds = 1_785_000_000;

    const token = await createAppJwt('12345', pem, nowSeconds);
    const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
    const decode = (value: string) =>
      JSON.parse(
        Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
      );

    expect(decode(encodedHeader)).toEqual({ alg: 'RS256', typ: 'JWT' });
    expect(decode(encodedPayload)).toEqual({
      iat: nowSeconds - 60,
      exp: nowSeconds + 540,
      iss: '12345'
    });
    await expect(
      crypto.subtle.verify(
        'RSASSA-PKCS1-v1_5',
        pair.publicKey,
        Buffer.from(encodedSignature.replace(/-/g, '+').replace(/_/g, '/'), 'base64'),
        encoder.encode(`${encodedHeader}.${encodedPayload}`)
      )
    ).resolves.toBe(true);
  });
});

describe('GitHub runner API calls', () => {
  it('scopes an installation token to one repository and administration writes', async () => {
    const pair = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256'
      },
      true,
      ['sign', 'verify']
    );
    const pkcs8 = await crypto.subtle.exportKey('pkcs8', pair.privateKey);
    const pem = `-----BEGIN PRIVATE KEY-----\n${Buffer.from(pkcs8)
      .toString('base64')
      .match(/.{1,64}/g)
      ?.join('\n')}\n-----END PRIVATE KEY-----`;
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ url: String(input), init });
      return Response.json({ token: 'installation-token' }, { status: 201 });
    };

    await expect(
      createInstallationToken('123', pem, 42, 100, fetcher as typeof fetch)
    ).resolves.toBe('installation-token');
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('https://api.github.com/app/installations/42/access_tokens');
    expect(JSON.parse(String(requests[0].init?.body))).toEqual({
      repository_ids: [100],
      permissions: { administration: 'write' }
    });
    expect(new Headers(requests[0].init?.headers).get('Authorization')).toMatch(/^Bearer /);
  });

  it('requests a one-job JIT runner with the exact Cloudflare labels', async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ url: String(input), init });
      return Response.json(
        { encoded_jit_config: 'encoded-jit', runner: { id: 99, name: 'cf-200' } },
        { status: 201 }
      );
    };

    await expect(
      createJitConfiguration(
        'createsomethingtoday/one',
        200,
        'installation-token',
        fetcher as typeof fetch
      )
    ).resolves.toEqual({ encodedJitConfig: 'encoded-jit', runnerId: 99, runnerName: 'cf-200' });
    expect(requests[0].url).toBe(
      'https://api.github.com/repos/createsomethingtoday/one/actions/runners/generate-jitconfig'
    );
    expect(JSON.parse(String(requests[0].init?.body))).toEqual({
      name: 'cf-200',
      runner_group_id: 1,
      labels: ['self-hosted', 'Linux', 'X64', 'cloudflare-ephemeral'],
      work_folder: '_work'
    });
    expect(new Headers(requests[0].init?.headers).get('Authorization')).toBe(
      'Bearer installation-token'
    );
  });
});
