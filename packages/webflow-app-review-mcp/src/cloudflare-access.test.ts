import { readFileSync } from 'node:fs';

import {
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
} from 'jose';
import { describe, expect, it } from 'vitest';

import {
  cloudflareAccessServePath,
  isCloudflareAccessMcpPath,
  parseAllowedEmails,
  parseReviewerDirectory,
  resolveCloudflareAccessRequest,
} from './cloudflare-access.js';

const TEAM_DOMAIN = 'https://create-something.cloudflareaccess.com';
const POLICY_AUD = 'app-review-access-audience';
const KEY_ID = 'test-access-key';

const directory = parseReviewerDirectory(JSON.stringify({
  acct_wf_pablo: {
    airtableCollaboratorId: 'usrPablo',
    email: 'pablo.miranda@webflow.com',
    name: 'Pablo Miranda',
  },
}));

async function signer() {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = KEY_ID;
  publicJwk.alg = 'RS256';

  return {
    jwks: createLocalJWKSet({ keys: [publicJwk] }),
    sign: (input: {
      email?: string;
      issuer?: string;
      audience?: string;
      type?: string;
      expiration?: number | string;
    } = {}) => new SignJWT({
      email: input.email ?? 'pablo.miranda@webflow.com',
      type: input.type ?? 'app',
    })
      .setProtectedHeader({ alg: 'RS256', kid: KEY_ID })
      .setIssuer(input.issuer ?? TEAM_DOMAIN)
      .setAudience(input.audience ?? POLICY_AUD)
      .setSubject('access-user-pablo')
      .setIssuedAt()
      .setNotBefore(Math.floor(Date.now() / 1000) - 1)
      .setExpirationTime(input.expiration ?? '5m')
      .sign(privateKey),
  };
}

describe('Cloudflare Access boundary', () => {
  it('retains the provisioned Webflow Access audience across worker deploys', () => {
    const wranglerConfig = readFileSync(new URL('../worker/wrangler.toml', import.meta.url), 'utf8');

    expect(wranglerConfig).toMatch(/CF_ACCESS_TEAM_DOMAIN = "https:\/\/webflow\.cloudflareaccess\.com"/);
    expect(wranglerConfig).toMatch(
      /CF_ACCESS_AUD = "3b4a38c7c99ec7127bcbb99d9c8aae7b0011a51370bff31b7085385e1a2807ba"/,
    );
    expect(wranglerConfig).toMatch(/OAUTH_ALLOWED_EMAILS = "pablo\.miranda@webflow\.com,shea\.sisco@webflow\.com,micah@webflow\.com,micah@createsomething\.io"/);
  });

  it('uses a dedicated Access surface without changing the existing bearer endpoint', () => {
    expect(isCloudflareAccessMcpPath('/access/mcp')).toBe(true);
    expect(isCloudflareAccessMcpPath('/access/mcp/messages')).toBe(true);
    expect(isCloudflareAccessMcpPath('/access/sse')).toBe(true);
    expect(isCloudflareAccessMcpPath('/mcp')).toBe(false);
    expect(cloudflareAccessServePath('/access/mcp/messages')).toBe('/access/mcp');
    expect(cloudflareAccessServePath('/access/sse/messages')).toBe('/access/sse');
  });

  it('fails closed when Access configuration or the signed assertion is missing', async () => {
    const base = {
      request: new Request('https://app-review.example.test/access/mcp'),
      teamDomain: TEAM_DOMAIN,
      audience: POLICY_AUD,
      allowedDomain: 'webflow.com',
      allowedEmails: parseAllowedEmails('pablo.miranda@webflow.com'),
      directory,
    };

    await expect(resolveCloudflareAccessRequest({ ...base, teamDomain: '' })).resolves.toEqual({
      ok: false,
      status: 500,
      code: 'misconfigured',
      message: 'Cloudflare Access authentication is not configured.',
    });
    await expect(resolveCloudflareAccessRequest({
      ...base,
      teamDomain: 'https://attacker.example.com',
    })).resolves.toEqual({
      ok: false,
      status: 500,
      code: 'misconfigured',
      message: 'Cloudflare Access authentication is not configured.',
    });
    await expect(resolveCloudflareAccessRequest(base)).resolves.toEqual({
      ok: false,
      status: 401,
      code: 'unauthorized',
      message: 'Missing Cloudflare Access application assertion.',
    });
  });

  it('maps a valid signed assertion to the canonical app-review account', async () => {
    const { jwks, sign } = await signer();
    const assertion = await sign();

    await expect(resolveCloudflareAccessRequest({
      request: new Request('https://app-review.example.test/access/mcp', {
        headers: { 'Cf-Access-Jwt-Assertion': assertion },
      }),
      teamDomain: TEAM_DOMAIN,
      audience: POLICY_AUD,
      allowedDomain: 'webflow.com',
      allowedEmails: parseAllowedEmails('pablo.miranda@webflow.com'),
      directory,
      jwks,
    })).resolves.toEqual({
      ok: true,
      subject: 'access-user-pablo',
      accountId: 'acct_wf_pablo',
      email: 'pablo.miranda@webflow.com',
      name: 'Pablo Miranda',
    });
  });

  it('rejects assertions outside the exact issuer, audience, algorithm, lifetime, and app-token boundary', async () => {
    const { jwks, sign } = await signer();
    const now = Math.floor(Date.now() / 1000);
    const assertions = [
      await sign({ issuer: 'https://another-team.cloudflareaccess.com' }),
      await sign({ audience: 'another-access-application' }),
      await sign({ expiration: now - 1 }),
      await sign({ type: 'service' }),
    ];

    for (const assertion of assertions) {
      const result = await resolveCloudflareAccessRequest({
        request: new Request('https://app-review.example.test/access/mcp', {
          headers: { 'Cf-Access-Jwt-Assertion': assertion },
        }),
        teamDomain: TEAM_DOMAIN,
        audience: POLICY_AUD,
        allowedDomain: 'webflow.com',
        allowedEmails: parseAllowedEmails('pablo.miranda@webflow.com'),
        directory,
        jwks,
      });

      expect(result).toEqual({
        ok: false,
        status: 401,
        code: 'unauthorized',
        message: assertion === assertions[3]
          ? 'Cloudflare Access application assertion is missing required identity claims.'
          : 'Invalid Cloudflare Access application assertion.',
      });
    }
  });

  it('preserves the explicit app-review allowlist after signature verification', async () => {
    const { jwks, sign } = await signer();
    const assertion = await sign({ email: 'someone.else@webflow.com' });

    await expect(resolveCloudflareAccessRequest({
      request: new Request('https://app-review.example.test/access/mcp', {
        headers: { 'Cf-Access-Jwt-Assertion': assertion },
      }),
      teamDomain: TEAM_DOMAIN,
      audience: POLICY_AUD,
      allowedDomain: 'webflow.com',
      allowedEmails: parseAllowedEmails('pablo.miranda@webflow.com'),
      directory,
      jwks,
    })).resolves.toEqual({
      ok: false,
      status: 403,
      code: 'forbidden',
      message: 'You are not on the App Review access list. Ask the review team lead to add you.',
    });
  });
});
