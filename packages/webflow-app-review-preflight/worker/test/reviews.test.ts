import { env, exports } from 'cloudflare:workers';
import JSZip from 'jszip';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { evaluateRuntimeSecurity } from '../src/runtime-observations';
import worker from '../src/index';
import type { Env } from '../src/types';

const TEST_RUNTIME_INTEGRITY = 'sha256-qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqo=';

afterEach(() => {
  vi.unstubAllGlobals();
});

async function createBundle(options: { injectScript?: boolean } = {}): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    'webflow.json',
    JSON.stringify({ name: 'Consent Pro', apiVersion: '2', publicDir: 'dist' })
  );
  const source = [
    'const API = "https://api.consentpro.com";',
    'const runtime = "/v2/cdn/runtime.js";'
  ];
  if (options.injectScript !== false) {
    source.push('const script = document.createElement("script");', 'script.src = runtime;');
  }
  zip.file('assets/index.js', source.join('\n'));
  return zip.generateAsync({ type: 'uint8array' });
}

async function createMinifiedBundle(): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    'webflow.json',
    JSON.stringify({ name: 'Consent Pro', apiVersion: '2', publicDir: 'dist' })
  );
  zip.file('dist/app.min.js', 'function app(){return 1}');
  return zip.generateAsync({ type: 'uint8array' });
}

async function createSourceMapArtifact(source = '../src/app.ts'): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    'dist/app.min.js.map',
    JSON.stringify({
      version: 3,
      file: 'app.min.js',
      sources: [source],
      mappings: 'AAAA'
    })
  );
  return zip.generateAsync({ type: 'uint8array' });
}

async function sha256Hex(value: ArrayBuffer | Uint8Array | string): Promise<string> {
  const bytes =
    typeof value === 'string'
      ? new TextEncoder().encode(value)
      : value instanceof Uint8Array
        ? value
        : new Uint8Array(value);
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function createReadyRuntimePackage(reviewId: string): Promise<string> {
  const response = await exports.default.fetch(
    new Request(`https://preflight.test/v1/reviews/${reviewId}/runtime-test-packages`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer test-token',
        origin: 'http://localhost:1337',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        targetUrl: 'http://127.0.0.1:4173/runtime-fixture',
        sandboxInstallationId: 'local-webflow-site',
        sandboxOwnershipConfirmed: true,
        license: {
          mode: 'installation_allowlist',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
        },
        runtimeArtifacts: [
          {
          url: 'http://127.0.0.1:4173/runtime-v1.js',
          sha256: 'a'.repeat(64),
          integrity: TEST_RUNTIME_INTEGRITY
          }
        ],
        negativeProxyProbe: {
          method: 'GET',
          urlTemplate: 'http://127.0.0.1:4173/proxy?url={canaryUrl}'
        },
        lifecycle: { readySelector: '[data-runtime-ready]' }
      })
    })
  );
  expect(response.status).toBe(201);
  const body = await response.json<{ testPackage: { id: string } }>();
  return body.testPackage.id;
}

describe('review API', () => {
  test('derives a blocked security verdict from click-only or substituted runtime evidence', () => {
    const contract = {
      target: { url: 'https://consent-pro-test.webflow.io/', host: 'consent-pro-test.webflow.io' },
      runtimeArtifacts: [
        {
        url: 'https://api.consentpro.com/v2/cdn/runtime.js',
        sha256: 'a'.repeat(64),
        integrity: 'sha256-reviewed-runtime'
        }
      ]
    } as any;
    const result = evaluateRuntimeSecurity(
      {
      runtimeReadyObserved: false,
        runtimeArtifacts: [
          {
        url: contract.runtimeArtifacts[0].url,
        observedSha256: 'b'.repeat(64),
        loadedByPage: false,
        domIntegrity: null
          }
        ],
      runtimeCreatedScripts: ['https://api.consentpro.com/v2/cdn/debugger.js'],
      unreviewedRuntimeScripts: ['https://api.consentpro.com/v2/cdn/debugger.js'],
      negativeProxyCanary: { outcome: 'exposed' }
      },
      contract
    );

    expect(result.status).toBe('blocked');
    expect(result.predicates).toEqual({
      publishedTarget: true,
      runtimeReadyObserved: false,
      runtimeLoadedByPage: false,
      runtimeHashMatched: false,
      runtimeIntegrityMatched: false,
      noRuntimeCreatedScripts: false,
      noUnreviewedRuntimeScripts: false,
      negativeProxyBlocked: false
    });
    expect(result.blockers).toHaveLength(7);
  });

  test('returns the resolved Webflow identity and server-owned companion role', async () => {
    const developer = await exports.default.fetch(
      new Request('https://preflight.test/v1/me', {
        headers: {
          authorization: 'Bearer test-token',
          origin: 'http://localhost:1337'
        }
      })
    );
    expect(developer.status).toBe(200);
    expect(await developer.json()).toEqual({
      user: {
        id: 'local-webflow-user',
        siteId: 'local-webflow-site',
        companionRole: 'developer'
      }
    });

    const reviewer = await exports.default.fetch(
      new Request('https://preflight.test/v1/me', {
        headers: {
          authorization: 'Bearer reviewer-test-token',
          origin: 'http://localhost:1337'
        }
      })
    );
    expect(reviewer.status).toBe(200);
    expect(await reviewer.json()).toEqual({
      user: {
        id: 'local-webflow-reviewer',
        siteId: 'local-webflow-review-site',
        companionRole: 'reviewer'
      }
    });
  });

  test('retires legacy runtime and companion mutations in production', async () => {
    const productionEnv = {
      DB: env.DB,
      ARTIFACTS: env.ARTIFACTS,
      ENVIRONMENT: 'production',
      ALLOWED_ORIGINS: '',
      E2B_COORDINATOR_TOKEN: 'coordinator-test-token'
    } as Env;
    const routes = [
      '/v1/runtime-jobs/legacy-job/evidence',
      '/v1/runtime-test-packages/legacy-package/observation-jobs',
      '/v1/reviews/legacy-review/runtime-jobs',
      '/v1/reviews/legacy-review/companion-runs',
      '/v1/companion-runs/legacy-run/complete',
      '/v1/companion-runs/legacy-run/replay',
      '/v1/companion-runs/legacy-run/missions/production_runtime'
    ];
    for (const path of routes) {
      const response = await worker.fetch(
        new Request(`https://preflight.test${path}`, {
          method: 'POST',
          headers: {
            authorization: 'Bearer coordinator-test-token',
            'content-type': 'application/json'
          },
          body: '{}'
        }),
        productionEnv
      );
      expect(response.status, path).toBe(410);
      await expect(response.json()).resolves.toMatchObject({
        error: 'legacy_runtime_mutation_retired'
      });
    }
  });

  test('pairs the browser companion once and scopes its short-lived session to the exact review version', async () => {
    const form = new FormData();
    form.set(
      'bundle',
      new File([await createBundle()], 'consent-pro.zip', { type: 'application/zip' })
    );
    const createReviewResponse = await exports.default.fetch(
      new Request('https://preflight.test/v1/reviews', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          origin: 'http://localhost:1337'
        },
        body: form
      })
    );
    const created = await createReviewResponse.json<{
      review: { id: string; latestVersion: { id: string } };
    }>();

    const missingPackageResponse = await exports.default.fetch(
      new Request(`https://preflight.test/v1/reviews/${created.review.id}/companion-pairings`, {
          method: 'POST',
          headers: {
            authorization: 'Bearer test-token',
            origin: 'http://localhost:1337',
            'content-type': 'application/json'
          },
          body: JSON.stringify({ reviewVersionId: created.review.latestVersion.id })
      })
    );
    expect(missingPackageResponse.status).toBe(400);
    expect(await missingPackageResponse.json()).toMatchObject({
      error: 'invalid_companion_pairing',
      message: expect.stringMatching(/runtime test package/i)
    });
    const runtimeTestPackageId = await createReadyRuntimePackage(created.review.id);

    const pairingResponse = await exports.default.fetch(
      new Request(`https://preflight.test/v1/reviews/${created.review.id}/companion-pairings`, {
          method: 'POST',
          headers: {
            authorization: 'Bearer test-token',
            origin: 'http://localhost:1337',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            reviewVersionId: created.review.latestVersion.id,
            runtimeTestPackageId
          })
      })
    );
    expect(pairingResponse.status).toBe(201);
    const paired = await pairingResponse.json<{
      pairing: { code: string; expiresAt: string };
    }>();
    expect(paired.pairing.code.length).toBeGreaterThanOrEqual(32);
    expect(Date.parse(paired.pairing.expiresAt)).toBeGreaterThan(Date.now());

    const wrongSurface = await exports.default.fetch(
      new Request(
        `https://preflight.test/reviewer/connect?code=${encodeURIComponent(paired.pairing.code)}`,
        { redirect: 'manual' }
      )
    );
    expect(wrongSurface.status).toBe(403);
    const unconsumed = await env.DB.prepare(
      `SELECT redeemed_at
         FROM companion_pairings
        ORDER BY created_at DESC
        LIMIT 1`
    ).first<{ redeemed_at: string | null }>();
    expect(unconsumed?.redeemed_at).toBeNull();

    const redeem = () =>
      exports.default.fetch(
        new Request('https://preflight.test/v1/companion-pairings/redeem', {
          method: 'POST',
          headers: {
            origin: 'http://localhost:1337',
            'content-type': 'application/json'
          },
          body: JSON.stringify({ code: paired.pairing.code })
        })
      );
    const redeemResponse = await redeem();
    expect(redeemResponse.status).toBe(200);
    const session = await redeemResponse.json<{
      session: {
        token: string;
        expiresAt: string;
        reviewId: string;
        reviewVersionId: string;
        actorRole: string;
        evidenceTrust: string;
        runtimeTestPackageId: string;
      };
    }>();
    expect(session.session).toMatchObject({
      reviewId: created.review.id,
      reviewVersionId: created.review.latestVersion.id,
      actorRole: 'developer',
      evidenceTrust: 'partner_supplied',
      runtimeTestPackageId
    });

    const genericApiAttempt = await exports.default.fetch(
      new Request('https://preflight.test/v1/reviews', {
        headers: {
          authorization: `Bearer ${session.session.token}`,
          origin: 'http://localhost:1337'
        }
      })
    );
    expect(genericApiAttempt.status).toBe(401);

    const versionEscapeAttempt = await exports.default.fetch(
      new Request(`https://preflight.test/v1/reviews/${created.review.id}/companion-runs`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${session.session.token}`,
            origin: 'http://localhost:1337',
            'content-type': 'application/json'
          },
          body: JSON.stringify({ reviewVersionId: 'another-version', runtimeTestPackageId })
      })
    );
    expect(versionEscapeAttempt.status).toBe(404);

    const runResponse = await exports.default.fetch(
      new Request(`https://preflight.test/v1/reviews/${created.review.id}/companion-runs`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${session.session.token}`,
            origin: 'http://localhost:1337',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            reviewVersionId: created.review.latestVersion.id,
            runtimeTestPackageId
          })
      })
    );
    expect(runResponse.status).toBe(201);

    const secondRedeem = await redeem();
    expect(secondRedeem.status).toBe(409);
    expect(await secondRedeem.json()).toEqual({
      error: 'companion_pairing_unavailable'
    });
  });

  test('rejects an expired pairing without issuing a companion session', async () => {
    const form = new FormData();
    form.set(
      'bundle',
      new File([await createBundle()], 'expired-pairing.zip', { type: 'application/zip' })
    );
    const createdResponse = await exports.default.fetch(
      new Request('https://preflight.test/v1/reviews', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          origin: 'http://localhost:1337'
        },
        body: form
      })
    );
    const created = await createdResponse.json<{
      review: { id: string; latestVersion: { id: string } };
    }>();
    const runtimeTestPackageId = await createReadyRuntimePackage(created.review.id);
    const pairingResponse = await exports.default.fetch(
      new Request(`https://preflight.test/v1/reviews/${created.review.id}/companion-pairings`, {
          method: 'POST',
          headers: {
            authorization: 'Bearer test-token',
            origin: 'http://localhost:1337',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            reviewVersionId: created.review.latestVersion.id,
            runtimeTestPackageId
          })
      })
    );
    const pairing = await pairingResponse.json<{ pairing: { code: string } }>();
    await env.DB.prepare(
      `UPDATE companion_pairings SET expires_at = '2000-01-01T00:00:00.000Z'
        WHERE id = (SELECT id FROM companion_pairings ORDER BY created_at DESC LIMIT 1)`
    ).run();

    const expired = await exports.default.fetch(
      new Request('https://preflight.test/v1/companion-pairings/redeem', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:1337',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ code: pairing.pairing.code })
      })
    );
    expect(expired.status).toBe(409);
    expect(await expired.json()).toEqual({ error: 'companion_pairing_unavailable' });
    const sessionCount = await env.DB.prepare(
      `SELECT COUNT(*) AS count FROM companion_sessions
        WHERE review_id = ? AND review_version_id = ?`
    )
      .bind(created.review.id, created.review.latestVersion.id)
      .first<{ count: number }>();
    expect(sessionCount?.count).toBe(0);
  });

  test('preserves reviewer authority from Webflow identity through pairing redemption', async () => {
    const form = new FormData();
    form.set(
      'bundle',
      new File([await createBundle()], 'reviewer-pairing.zip', { type: 'application/zip' })
    );
    const createdResponse = await exports.default.fetch(
      new Request('https://preflight.test/v1/reviews', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          origin: 'http://localhost:1337'
        },
        body: form
      })
    );
    const created = await createdResponse.json<{
      review: { id: string; latestVersion: { id: string } };
    }>();
    const runtimeTestPackageId = await createReadyRuntimePackage(created.review.id);
    const pairingResponse = await exports.default.fetch(
      new Request(`https://preflight.test/v1/reviews/${created.review.id}/companion-pairings`, {
          method: 'POST',
          headers: {
            authorization: 'Bearer reviewer-test-token',
            origin: 'http://localhost:1337',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            reviewVersionId: created.review.latestVersion.id,
            runtimeTestPackageId
          })
      })
    );
    const pairing = await pairingResponse.json<{ pairing: { code: string } }>();
    const redeemed = await exports.default.fetch(
      new Request('https://preflight.test/v1/companion-pairings/redeem', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:1337',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ code: pairing.pairing.code })
      })
    );
    expect(redeemed.status).toBe(200);
    expect(await redeemed.json()).toMatchObject({
      session: {
        reviewId: created.review.id,
        reviewVersionId: created.review.latestVersion.id,
        actorRole: 'reviewer',
        evidenceTrust: 'webflow_observed'
      }
    });
  });

  test('creates a version-bound developer companion run without trusting client authority', async () => {
    const form = new FormData();
    form.set(
      'bundle',
      new File([await createBundle()], 'consent-pro.zip', { type: 'application/zip' })
    );
    const createReviewResponse = await exports.default.fetch(
      new Request('https://preflight.test/v1/reviews', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          origin: 'http://localhost:1337'
        },
        body: form
      })
    );
    const created = await createReviewResponse.json<{
      review: {
        id: string;
        latestVersion: { id: string; result: { artifact: { sha256: string } } };
      };
    }>();
    const runtimeTestPackageId = await createReadyRuntimePackage(created.review.id);

    const createRunResponse = await exports.default.fetch(
      new Request(`https://preflight.test/v1/reviews/${created.review.id}/companion-runs`, {
          method: 'POST',
          headers: {
            authorization: 'Bearer test-token',
            origin: 'http://localhost:1337',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            reviewVersionId: created.review.latestVersion.id,
            runtimeTestPackageId,
            actorRole: 'reviewer',
            evidenceTrust: 'webflow_observed',
            status: 'validated'
          })
      })
    );

    expect(createRunResponse.status).toBe(201);
    const createdRun = await createRunResponse.json<{
      run: {
        id: string;
        reviewVersionId: string;
        bundleSha256: string;
        actorRole: string;
        evidenceTrust: string;
        policyVersion: string;
        status: string;
        missions: Array<{ id: string; status: string }>;
      };
    }>();
    expect(createdRun.run).toMatchObject({
      reviewVersionId: created.review.latestVersion.id,
      bundleSha256: created.review.latestVersion.result.artifact.sha256,
      actorRole: 'developer',
      evidenceTrust: 'partner_supplied',
      runtimeTestPackageId,
      policyVersion: 'companion-policy.v3',
      status: 'ready'
    });
    expect(createdRun.run.missions.map((mission) => mission.id)).toEqual(['production_runtime']);

    const elevatedMission = await exports.default.fetch(
      new Request(
        `https://preflight.test/v1/companion-runs/${createdRun.run.id}/missions/configure`,
        {
          method: 'POST',
          headers: {
            authorization: 'Bearer test-token',
            origin: 'http://localhost:1337',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            reviewVersionId: created.review.latestVersion.id,
            evidenceTrust: 'webflow_observed',
            status: 'passed',
            evidenceDigest: 'b'.repeat(64),
            eventCount: 4,
            artifactCount: 1,
            observedAt: '2026-07-14T20:01:00.000Z'
          })
        }
      )
    );

    expect(elevatedMission.status).toBe(403);
    expect(await elevatedMission.json()).toEqual({
      error: 'companion_trust_escalation',
      message: expect.stringMatching(/trust level/i)
    });

    const persisted = await env.DB.prepare(
      'SELECT actor_role, evidence_trust, status FROM companion_runs WHERE id = ?'
    )
      .bind(createdRun.run.id)
      .first<{ actor_role: string; evidence_trust: string; status: string }>();
    expect(persisted).toEqual({
      actor_role: 'developer',
      evidence_trust: 'partner_supplied',
      status: 'ready'
    });

    const replayResponse = await exports.default.fetch(
      new Request(`https://preflight.test/v1/companion-runs/${createdRun.run.id}/replay`, {
          method: 'POST',
          headers: {
            authorization: 'Bearer reviewer-test-token',
            origin: 'http://localhost:1337'
          }
      })
    );
    expect(replayResponse.status).toBe(201);
    const replay = await replayResponse.json<{ run: any }>();
    expect(replay.run).toMatchObject({
      reviewVersionId: createdRun.run.reviewVersionId,
      bundleSha256: createdRun.run.bundleSha256,
      actorRole: 'reviewer',
      evidenceTrust: 'webflow_observed',
      replayOfRunId: createdRun.run.id,
      status: 'ready'
    });
    expect(replay.run.id).not.toBe(createdRun.run.id);
  });

  test('fails closed for missing identity and untrusted origins', async () => {
    const missingIdentity = await exports.default.fetch(
      new Request('https://preflight.test/v1/reviews', {
        headers: { origin: 'http://localhost:1337' }
      })
    );
    expect(missingIdentity.status).toBe(401);

    const untrustedOrigin = await exports.default.fetch(
      new Request('https://preflight.test/v1/reviews', {
        headers: {
          authorization: 'Bearer test-token',
          origin: 'https://attacker.example'
        }
      })
    );
    expect(untrustedOrigin.status).toBe(403);
  });

  test('creates and retrieves a durable review with immutable artifact bytes', async () => {
    const bundle = await createBundle();
    const form = new FormData();
    form.set('name', 'Consent Pro preflight');
    form.set('bundle', new File([bundle], 'consent-pro.zip', { type: 'application/zip' }));

    const createResponse = await exports.default.fetch(
      new Request('https://preflight.test/v1/reviews', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          origin: 'http://localhost:1337'
        },
        body: form
      })
    );

    expect(createResponse.status).toBe(201);
    const created = await createResponse.json<{
      review: {
        id: string;
        latestVersion: {
          id: string;
          result: { artifact: { sha256: string } };
        };
      };
    }>();

    const getResponse = await exports.default.fetch(
      new Request(`https://preflight.test/v1/reviews/${created.review.id}`, {
        headers: {
          authorization: 'Bearer test-token',
          origin: 'http://localhost:1337'
        }
      })
    );

    expect(getResponse.status).toBe(200);
    const loaded = await getResponse.json<typeof created>();
    expect(loaded.review).toEqual(created.review);

    const row = await env.DB.prepare(
      'SELECT artifact_key, artifact_sha256 FROM review_versions WHERE id = ?'
    )
      .bind(created.review.latestVersion.id)
      .first<{ artifact_key: string; artifact_sha256: string }>();

    expect(row?.artifact_sha256).toBe(created.review.latestVersion.result.artifact.sha256);
    const object = await env.ARTIFACTS.get(row!.artifact_key);
    expect(object).not.toBeNull();
    expect(new Uint8Array(await object!.arrayBuffer())).toEqual(bundle);
  });

  test('stores a private source-map artifact and issues a server-owned artifact receipt', async () => {
    const bundle = await createMinifiedBundle();
    const sourceMaps = await createSourceMapArtifact();
    const form = new FormData();
    form.set('bundle', new File([bundle], 'consent-pro.zip', { type: 'application/zip' }));
    form.set(
      'sourceMaps',
      new File([sourceMaps], 'consent-pro-source-maps.zip', { type: 'application/zip' })
    );

    const response = await exports.default.fetch(
      new Request('https://preflight.test/v1/reviews', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          origin: 'http://localhost:1337'
        },
        body: form
      })
    );

    expect(response.status).toBe(201);
    const created = await response.json<{
      review: {
        latestVersion: {
          id: string;
          receipt: {
            schemaVersion: string;
            id: string;
            artifactSetSha256: string;
            bundleSha256: string;
            sourceMapArtifactSha256: string | null;
            policyVersion: string;
            scanStatus: string;
            reconciliationStatus: string;
          };
        };
      };
    }>();
    const receipt = created.review.latestVersion.receipt;
    expect(receipt).toMatchObject({
      schemaVersion: 'preflight_artifact_receipt.v1',
      id: expect.any(String),
      artifactSetSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      bundleSha256: await sha256Hex(bundle),
      sourceMapArtifactSha256: await sha256Hex(sourceMaps),
      policyVersion: 'source_maps.v1',
      scanStatus: 'passed',
      reconciliationStatus: 'not_checked'
    });
    expect(JSON.stringify(receipt)).not.toMatch(/objectKey|artifactKey|sourcesContent/);

    const artifacts = await env.DB.prepare(
      `SELECT kind, sha256, object_key
         FROM review_version_artifacts
        WHERE review_version_id = ?
        ORDER BY kind`
    )
      .bind(created.review.latestVersion.id)
      .all<{ kind: string; sha256: string; object_key: string }>();
    expect(artifacts.results.map(({ kind, sha256 }) => ({ kind, sha256 }))).toEqual([
      { kind: 'bundle', sha256: await sha256Hex(bundle) },
      { kind: 'source_maps', sha256: await sha256Hex(sourceMaps) }
    ]);
    const storedSourceMaps = await env.ARTIFACTS.get(
      artifacts.results.find((artifact) => artifact.kind === 'source_maps')!.object_key
    );
    expect(new Uint8Array(await storedSourceMaps!.arrayBuffer())).toEqual(sourceMaps);
  });

  test('requires private source maps for a minified bundle before storing a review', async () => {
    const countBefore = await env.DB.prepare('SELECT COUNT(*) AS count FROM reviews').first<{
      count: number;
    }>();
    const form = new FormData();
    form.set(
      'bundle',
      new File([await createMinifiedBundle()], 'consent-pro.zip', { type: 'application/zip' })
    );

    const response = await exports.default.fetch(
      new Request('https://preflight.test/v1/reviews', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          origin: 'http://localhost:1337'
        },
        body: form
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'invalid_source_maps',
      code: 'source_map_required'
    });
    const countAfter = await env.DB.prepare('SELECT COUNT(*) AS count FROM reviews').first<{
      count: number;
    }>();
    expect(countAfter?.count).toBe(countBefore?.count);
  });

  test('reconciles canonical submission hashes and fails open only when no receipt is supplied', async () => {
    const bundle = await createMinifiedBundle();
    const sourceMaps = await createSourceMapArtifact();
    const form = new FormData();
    form.set('bundle', new File([bundle], 'consent-pro.zip', { type: 'application/zip' }));
    form.set(
      'sourceMaps',
      new File([sourceMaps], 'consent-pro-source-maps.zip', { type: 'application/zip' })
    );
    const createdResponse = await exports.default.fetch(
      new Request('https://preflight.test/v1/reviews', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          origin: 'http://localhost:1337'
        },
        body: form
      })
    );
    const created = await createdResponse.json<{
      review: { id: string; latestVersion: { receipt: { id: string } } };
    }>();

    const reconcile = (body: object) =>
      worker.fetch(
        new Request('https://preflight.test/v1/submission-artifacts/reconcile', {
          method: 'POST',
          headers: {
            authorization: 'Bearer submission-reconciliation-test-token',
            'content-type': 'application/json'
          },
          body: JSON.stringify(body)
        }),
        env
      );

    const unauthorized = await worker.fetch(
      new Request('https://preflight.test/v1/submission-artifacts/reconcile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          submissionId: 'unauthorized-form',
          bundleSha256: await sha256Hex(bundle),
          sourceMapArtifactSha256: await sha256Hex(sourceMaps)
        })
      }),
      env
    );
    expect(unauthorized.status).toBe(401);

    const missingReceipt = await reconcile({
      submissionId: 'form-without-receipt',
      bundleSha256: await sha256Hex(bundle),
      sourceMapArtifactSha256: await sha256Hex(sourceMaps)
    });
    expect(missingReceipt.status).toBe(200);
    await expect(missingReceipt.json()).resolves.toMatchObject({
      reconciliation: {
        status: 'receipt_not_provided',
        receiptValid: null,
        enforcement: 'fail_open'
      }
    });

    const matched = await reconcile({
      submissionId: 'form-matched',
      receiptId: created.review.latestVersion.receipt.id,
      bundleSha256: await sha256Hex(bundle),
      sourceMapArtifactSha256: await sha256Hex(sourceMaps)
    });
    expect(matched.status).toBe(200);
    await expect(matched.json()).resolves.toMatchObject({
      reconciliation: {
        status: 'matched',
        receiptValid: true,
        enforcement: 'verified'
      }
    });

    const unknownReceipt = await reconcile({
      submissionId: 'form-unknown-receipt',
      receiptId: 'receipt-does-not-exist',
      bundleSha256: await sha256Hex(bundle),
      sourceMapArtifactSha256: await sha256Hex(sourceMaps)
    });
    expect(unknownReceipt.status).toBe(200);
    await expect(unknownReceipt.json()).resolves.toMatchObject({
      reconciliation: {
        status: 'receipt_not_found',
        receiptValid: false,
        enforcement: 'invalid'
      }
    });

    const mismatched = await reconcile({
      submissionId: 'form-mismatched',
      receiptId: created.review.latestVersion.receipt.id,
      bundleSha256: 'f'.repeat(64),
      sourceMapArtifactSha256: await sha256Hex(sourceMaps)
    });
    expect(mismatched.status).toBe(200);
    await expect(mismatched.json()).resolves.toMatchObject({
      reconciliation: {
        status: 'mismatch',
        receiptValid: false,
        enforcement: 'invalid',
        mismatches: ['bundle']
      }
    });

    const refreshed = await exports.default.fetch(
      new Request(`https://preflight.test/v1/reviews/${created.review.id}`, {
        headers: {
          authorization: 'Bearer test-token',
          origin: 'http://localhost:1337'
        }
      })
    );
    expect(refreshed.status).toBe(200);
    await expect(refreshed.json()).resolves.toMatchObject({
      review: {
        latestVersion: {
          receipt: { reconciliationStatus: 'mismatch' }
        }
      }
    });
  });

  test('versions corrected source maps without creating a false bundle revision', async () => {
    const bundle = await createMinifiedBundle();
    const initialMaps = await createSourceMapArtifact('../src/app.ts');
    const correctedMaps = await createSourceMapArtifact('../src/app-corrected.ts');
    const initialForm = new FormData();
    initialForm.set('bundle', new File([bundle], 'consent-pro.zip', { type: 'application/zip' }));
    initialForm.set('sourceMaps', new File([initialMaps], 'source-maps.zip', {
      type: 'application/zip'
    }));
    const initialResponse = await exports.default.fetch(
      new Request('https://preflight.test/v1/reviews', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          origin: 'http://localhost:1337'
        },
        body: initialForm
      })
    );
    const initial = await initialResponse.json<{
      review: { id: string; latestVersion: { id: string } };
    }>();

    const correctionForm = new FormData();
    correctionForm.set('bundle', new File([bundle], 'consent-pro-renamed.zip', {
      type: 'application/zip'
    }));
    correctionForm.set('sourceMaps', new File([correctedMaps], 'corrected-source-maps.zip', {
      type: 'application/zip'
    }));
    const correctionResponse = await exports.default.fetch(
      new Request(`https://preflight.test/v1/reviews/${initial.review.id}/revisions`, {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          origin: 'http://localhost:1337'
        },
        body: correctionForm
      })
    );

    expect(correctionResponse.status).toBe(201);
    const correction = await correctionResponse.json<{
      deduplicated: boolean;
      review: {
        latestVersion: {
          id: string;
          sequence: number;
          receipt: { artifactSetVersion: number; sourceMapArtifactSha256: string };
        };
      };
    }>();
    expect(correction.deduplicated).toBe(false);
    expect(correction.review.latestVersion.id).toBe(initial.review.latestVersion.id);
    expect(correction.review.latestVersion.sequence).toBe(1);
    expect(correction.review.latestVersion.receipt).toMatchObject({
      artifactSetVersion: 2,
      sourceMapArtifactSha256: await sha256Hex(correctedMaps)
    });

    const versionCount = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM review_versions WHERE review_id = ?'
    ).bind(initial.review.id).first<{ count: number }>();
    const artifactSetCount = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM review_artifact_sets WHERE review_version_id = ?'
    ).bind(initial.review.latestVersion.id).first<{ count: number }>();
    expect(versionCount?.count).toBe(1);
    expect(artifactSetCount?.count).toBe(2);
  });

  test('adds a revision and reports deterministic progress', async () => {
    const initialForm = new FormData();
    initialForm.set(
      'bundle',
      new File([await createBundle()], 'consent-pro.zip', { type: 'application/zip' })
    );
    const initialResponse = await exports.default.fetch(
      new Request('https://preflight.test/v1/reviews', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          origin: 'http://localhost:1337'
        },
        body: initialForm
      })
    );
    const initial = await initialResponse.json<{ review: { id: string } }>();

    const revisionForm = new FormData();
    revisionForm.set(
      'bundle',
      new File([await createBundle({ injectScript: false })], 'consent-pro-v2.zip', {
        type: 'application/zip'
      })
    );
    const revisionResponse = await exports.default.fetch(
      new Request(`https://preflight.test/v1/reviews/${initial.review.id}/revisions`, {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          origin: 'http://localhost:1337'
        },
        body: revisionForm
      })
    );

    expect(revisionResponse.status).toBe(201);
    const revised = await revisionResponse.json<{
      review: { latestVersion: { sequence: number } };
      comparison: {
        resolved: string[];
        remaining: string[];
        added: string[];
      };
      deduplicated: boolean;
    }>();

    expect(revised.review.latestVersion.sequence).toBe(2);
    expect(revised.comparison.resolved).toContain('SEC-SCRIPT-INJECTION');
    expect(revised.comparison.added).toEqual([]);
    expect(revised.deduplicated).toBe(false);

    const versionCount = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM review_versions WHERE review_id = ?'
    )
      .bind(initial.review.id)
      .first<{ count: number }>();
    expect(versionCount?.count).toBe(2);
  });

  test('treats a repeated artifact as an idempotent checkpoint', async () => {
    const bundle = await createBundle();
    const initialForm = new FormData();
    initialForm.set('bundle', new File([bundle], 'consent-pro.zip', { type: 'application/zip' }));
    const initialResponse = await exports.default.fetch(
      new Request('https://preflight.test/v1/reviews', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          origin: 'http://localhost:1337'
        },
        body: initialForm
      })
    );
    const initial = await initialResponse.json<{
      review: { id: string; latestVersion: { sequence: number } };
    }>();

    const retryForm = new FormData();
    retryForm.set(
      'bundle',
      new File([bundle], 'consent-pro-retry.zip', { type: 'application/zip' })
    );
    const retryResponse = await exports.default.fetch(
      new Request(`https://preflight.test/v1/reviews/${initial.review.id}/revisions`, {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          origin: 'http://localhost:1337'
        },
        body: retryForm
      })
    );

    expect(retryResponse.status).toBe(200);
    const retry = await retryResponse.json<{
      deduplicated: boolean;
      review: { latestVersion: { sequence: number } };
    }>();
    expect(retry.deduplicated).toBe(true);
    expect(retry.review.latestVersion.sequence).toBe(1);

    const versionCount = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM review_versions WHERE review_id = ?'
    )
      .bind(initial.review.id)
      .first<{ count: number }>();
    expect(versionCount?.count).toBe(1);
  });

  test('rejects corrupt zip content without storing review evidence', async () => {
    const countBefore = await env.DB.prepare('SELECT COUNT(*) AS count FROM reviews').first<{
      count: number;
    }>();
    const form = new FormData();
    form.set(
      'bundle',
      new File([new TextEncoder().encode('not a zip')], 'broken.zip', {
        type: 'application/zip'
      })
    );

    const response = await exports.default.fetch(
      new Request('https://preflight.test/v1/reviews', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          origin: 'http://localhost:1337'
        },
        body: form
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'invalid_bundle',
      message: 'We could not read this zip. Re-export the bundle and try again.'
    });

    const reviewCount = await env.DB.prepare('SELECT COUNT(*) AS count FROM reviews').first<{
      count: number;
    }>();
    expect(reviewCount?.count).toBe(countBefore?.count);
  });

  test('lists the current users saved review checkpoints', async () => {
    const form = new FormData();
    form.set('name', 'Saved Consent Pro run');
    form.set(
      'bundle',
      new File([await createBundle()], 'consent-pro.zip', { type: 'application/zip' })
    );
    const createResponse = await exports.default.fetch(
      new Request('https://preflight.test/v1/reviews', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          origin: 'http://localhost:1337'
        },
        body: form
      })
    );
    const created = await createResponse.json<{ review: { id: string } }>();

    const listResponse = await exports.default.fetch(
      new Request('https://preflight.test/v1/reviews', {
        headers: {
          authorization: 'Bearer test-token',
          origin: 'http://localhost:1337'
        }
      })
    );

    expect(listResponse.status).toBe(200);
    const listed = await listResponse.json<{
      reviews: Array<{
        id: string;
        name: string;
        latestSequence: number;
        readiness: string;
      }>;
    }>();
    expect(listed.reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: created.review.id,
          name: 'Saved Consent Pro run',
          latestSequence: 1,
          readiness: 'changes_required'
        })
      ])
    );
  });

  test('rejects Designer Extension URLs as production-runtime targets', async () => {
    const form = new FormData();
    form.set(
      'bundle',
      new File([await createBundle()], 'consent-pro.zip', { type: 'application/zip' })
    );
    const createdResponse = await exports.default.fetch(
      new Request('https://preflight.test/v1/reviews', {
        method: 'POST',
        headers: { authorization: 'Bearer test-token', origin: 'http://localhost:1337' },
        body: form
      })
    );
    const created = await createdResponse.json<{ review: { id: string } }>();
    const response = await exports.default.fetch(
      new Request(`https://preflight.test/v1/reviews/${created.review.id}/runtime-test-packages`, {
          method: 'POST',
          headers: {
            authorization: 'Bearer test-token',
            origin: 'http://localhost:1337',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            targetUrl: 'https://68821e9ad5797a48cfc68499.webflow-ext.com/6a552d5baa59e9a3a1ebba5d/',
          sandboxInstallationId: 'local-webflow-site',
            sandboxOwnershipConfirmed: true,
            license: {
              mode: 'installation_allowlist',
              expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
            },
          runtimeArtifacts: [
            {
              url: 'https://api.consentpro.com/v2/cdn/runtime.js',
              sha256: 'a'.repeat(64),
              integrity: TEST_RUNTIME_INTEGRITY
            }
          ],
            negativeProxyProbe: {
              method: 'GET',
              urlTemplate: 'https://api.consentpro.com/v2/proxy?url={canaryUrl}'
            },
            lifecycle: { readySelector: '[data-runtime-ready]' }
          })
      })
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: 'invalid_runtime_test_package',
      message: expect.stringMatching(/published-site origin/i)
    });
  });

  test('rejects a runtime package for a site other than the authenticated Webflow site', async () => {
    const form = new FormData();
    form.set(
      'bundle',
      new File([await createBundle()], 'consent-pro.zip', { type: 'application/zip' })
    );
    const createdResponse = await exports.default.fetch(
      new Request('https://preflight.test/v1/reviews', {
        method: 'POST',
        headers: { authorization: 'Bearer test-token', origin: 'http://localhost:1337' },
        body: form
      })
    );
    const created = await createdResponse.json<{ review: { id: string } }>();
    const response = await exports.default.fetch(
      new Request(`https://preflight.test/v1/reviews/${created.review.id}/runtime-test-packages`, {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          origin: 'http://localhost:1337',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          targetUrl: 'http://127.0.0.1:4173/runtime-fixture',
          sandboxInstallationId: 'another-webflow-site',
          sandboxOwnershipConfirmed: true,
          license: {
            mode: 'installation_allowlist',
            expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
          },
          runtimeArtifacts: [
            {
              url: 'http://127.0.0.1:4173/runtime-v1.js',
              sha256: 'a'.repeat(64),
              integrity: TEST_RUNTIME_INTEGRITY
            }
          ],
          negativeProxyProbe: {
            method: 'GET',
            urlTemplate: 'http://127.0.0.1:4173/proxy?url={canaryUrl}'
          },
          lifecycle: { readySelector: '[data-runtime-ready]' }
        })
      })
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: 'invalid_runtime_test_package',
      message: expect.stringMatching(/authenticated Webflow site/i)
    });
  });

  test('verifies the published Webflow page belongs to the authenticated site', async () => {
    const form = new FormData();
    form.set(
      'bundle',
      new File([await createBundle()], 'consent-pro.zip', { type: 'application/zip' })
    );
    const createdResponse = await exports.default.fetch(
      new Request('https://preflight.test/v1/reviews', {
        method: 'POST',
        headers: { authorization: 'Bearer test-token', origin: 'http://localhost:1337' },
        body: form
      })
    );
    const created = await createdResponse.json<{ review: { id: string } }>();
    const productionEnv = {
      DB: env.DB,
      ARTIFACTS: env.ARTIFACTS,
      ENVIRONMENT: 'production',
      ALLOWED_ORIGINS: '',
      WEBFLOW_APP_ACCESS_TOKEN: 'app-token'
    } as Env;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const request = input instanceof Request ? input : new Request(input);
        if (request.url === 'https://api.webflow.com/beta/token/resolve') {
          return Response.json({ id: 'local-webflow-user', siteId: 'local-webflow-site' });
        }
        if (request.url === 'https://foreign-site.webflow.io/') {
          return new Response(
            '<!doctype html><html data-wf-site="another-webflow-site"><body></body></html>',
            { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }
          );
        }
        return Response.json({ error: 'unexpected_request' }, { status: 500 });
      })
    );

    const response = await worker.fetch(
      new Request(`https://preflight.test/v1/reviews/${created.review.id}/runtime-test-packages`, {
        method: 'POST',
        headers: {
          authorization: 'Bearer designer-id-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          targetUrl: 'https://foreign-site.webflow.io/',
          sandboxInstallationId: 'local-webflow-site',
          sandboxOwnershipConfirmed: true,
          license: {
            mode: 'installation_allowlist',
            expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
          },
          runtimeArtifacts: [
            {
              url: 'https://api.consentpro.com/v2/cdn/runtime.js',
              sha256: 'a'.repeat(64),
              integrity: TEST_RUNTIME_INTEGRITY
            }
          ],
          negativeProxyProbe: {
            method: 'GET',
            urlTemplate: 'https://api.consentpro.com/v2/proxy?url={canaryUrl}'
          },
          lifecycle: { readySelector: '[data-runtime-ready]' }
        })
      }),
      productionEnv
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'invalid_runtime_test_package',
      message: expect.stringMatching(/published Webflow site/i)
    });
  });

  test('rejects a runtime package whose SRI does not describe the pinned SHA-256 bytes', async () => {
    const form = new FormData();
    form.set(
      'bundle',
      new File([await createBundle()], 'consent-pro.zip', { type: 'application/zip' })
    );
    const createdResponse = await exports.default.fetch(
      new Request('https://preflight.test/v1/reviews', {
        method: 'POST',
        headers: { authorization: 'Bearer test-token', origin: 'http://localhost:1337' },
        body: form
      })
    );
    const created = await createdResponse.json<{ review: { id: string } }>();

    const response = await exports.default.fetch(
      new Request(`https://preflight.test/v1/reviews/${created.review.id}/runtime-test-packages`, {
          method: 'POST',
          headers: {
            authorization: 'Bearer test-token',
            origin: 'http://localhost:1337',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            targetUrl: 'http://127.0.0.1:4173/runtime-fixture',
          sandboxInstallationId: 'local-webflow-site',
            sandboxOwnershipConfirmed: true,
            license: {
              mode: 'installation_allowlist',
              expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
            },
          runtimeArtifacts: [
            {
              url: 'http://127.0.0.1:4173/runtime-v1.js',
              sha256: 'a'.repeat(64),
              integrity: 'sha256-mismatched-runtime-bytes'
            }
          ],
            negativeProxyProbe: {
              method: 'GET',
              urlTemplate: 'http://127.0.0.1:4173/proxy?url={canaryUrl}'
            },
            lifecycle: { readySelector: '[data-runtime-ready]' }
          })
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: 'invalid_runtime_test_package',
      message: expect.stringMatching(/same SHA-256 bytes/i)
    });
  });

  test('accepts partner test input but only lets the Webflow coordinator issue an observation job', async () => {
    const form = new FormData();
    form.set(
      'bundle',
      new File([await createBundle()], 'consent-pro.zip', { type: 'application/zip' })
    );
    const createResponse = await exports.default.fetch(
      new Request('https://preflight.test/v1/reviews', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          origin: 'http://localhost:1337'
        },
        body: form
      })
    );
    const created = await createResponse.json<{
      review: {
        id: string;
        latestVersion: {
          id: string;
          result: { artifact: { sha256: string }; officialDecision: null };
        };
      };
    }>();

    const licenseExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const packageResponse = await exports.default.fetch(
      new Request(`https://preflight.test/v1/reviews/${created.review.id}/runtime-test-packages`, {
          method: 'POST',
          headers: {
            authorization: 'Bearer test-token',
            'content-type': 'application/json',
            origin: 'http://localhost:1337'
          },
          body: JSON.stringify({
            targetUrl: 'http://127.0.0.1:4173/runtime-fixture',
          sandboxInstallationId: 'local-webflow-site',
            sandboxOwnershipConfirmed: true,
            license: {
              mode: 'installation_allowlist',
              expiresAt: licenseExpiresAt
            },
            runtimeArtifacts: [
              {
                url: 'http://127.0.0.1:4173/runtime-v1.js',
                sha256: 'a'.repeat(64),
                integrity: TEST_RUNTIME_INTEGRITY
              }
            ],
            negativeProxyProbe: {
              method: 'GET',
            urlTemplate: 'http://127.0.0.1:4173/proxy?url={canaryUrl}'
            },
            lifecycle: {
              readySelector: '[data-runtime-ready]'
            }
          })
      })
    );

    expect(packageResponse.status).toBe(201);
    const packageBody = await packageResponse.json<{
      testPackage: {
        id: string;
        status: string;
        trust: string;
        reviewVersionId: string;
        bundleSha256: string;
        target: { url: string; host: string };
        sandboxInstallationId: string;
        evidence: null;
      };
    }>();
    expect(packageBody.testPackage).toMatchObject({
      status: 'ready',
      trust: 'partner_supplied',
      reviewVersionId: created.review.latestVersion.id,
      bundleSha256: created.review.latestVersion.result.artifact.sha256,
      target: {
        url: 'http://127.0.0.1:4173/runtime-fixture',
        host: '127.0.0.1'
      },
      sandboxInstallationId: 'local-webflow-site',
      evidence: null
    });
    expect(created.review.latestVersion.result.officialDecision).toBeNull();

    const jobEndpoint = `https://preflight.test/v1/runtime-test-packages/${packageBody.testPackage.id}/observation-jobs`;
    const partnerAttempt = await exports.default.fetch(
      new Request(jobEndpoint, {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ approved: true })
      })
    );
    expect(partnerAttempt.status).toBe(401);

    const unapproved = await exports.default.fetch(
      new Request(jobEndpoint, {
        method: 'POST',
        headers: {
          authorization: 'Bearer coordinator-test-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          approved: false,
          sandboxOwnershipVerified: false
        })
      })
    );
    expect(unapproved.status).toBe(403);
    const countBeforeApproval = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM runtime_observation_jobs'
    ).first<{ count: number }>();
    expect(countBeforeApproval?.count).toBe(0);

    const approved = await exports.default.fetch(
      new Request(jobEndpoint, {
        method: 'POST',
        headers: {
          authorization: 'Bearer coordinator-test-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          approved: true,
          sandboxOwnershipVerified: true
        })
      })
    );
    expect(approved.status).toBe(201);
    const approvedBody = await approved.json<{
      observationJob: {
        id: string;
        status: string;
        capability: string;
        contract: {
          schemaVersion: string;
          purpose: string;
          testPackageId: string;
          reviewVersionId: string;
          bundleSha256: string;
          nonce: string;
          target: { url: string; host: string };
          controls: {
            allowedHosts: string[];
            evidenceTrust: string;
          };
          boundaries: {
            partnerCanSubmitEvidence: boolean;
            officialDecision: null;
            canWriteGovernance: boolean;
          };
        };
      };
    }>();
    expect(approvedBody.observationJob.capability.length).toBeGreaterThanOrEqual(32);
    expect(approvedBody.observationJob).toMatchObject({
      status: 'approved',
      contract: {
        schemaVersion: 'runtime_observation_job.v1',
        purpose: 'webflow_observation',
        testPackageId: packageBody.testPackage.id,
        reviewVersionId: created.review.latestVersion.id,
        bundleSha256: created.review.latestVersion.result.artifact.sha256,
        nonce: expect.any(String),
        target: {
          url: 'http://127.0.0.1:4173/runtime-fixture',
          host: '127.0.0.1'
        },
        controls: {
          allowedHosts: ['127.0.0.1'],
          evidenceTrust: 'webflow_observed'
        },
        boundaries: {
          partnerCanSubmitEvidence: false,
          officialDecision: null,
          canWriteGovernance: false
        }
      }
    });

    const stored = await env.DB.prepare(
      `SELECT capability_sha256, contract_json, status
         FROM runtime_observation_jobs
        WHERE id = ?`
    )
      .bind(approvedBody.observationJob.id)
      .first<{
        capability_sha256: string;
        contract_json: string;
        status: string;
      }>();
    const capabilitySha256 = await sha256Hex(approvedBody.observationJob.capability);
    expect(stored?.status).toBe('approved');
    expect(stored?.capability_sha256).toBe(capabilitySha256);
    expect(stored?.contract_json).not.toContain(approvedBody.observationJob.capability);

    const fetchEndpoint = `https://preflight.test/v1/runtime-observation-jobs/${approvedBody.observationJob.id}`;
    const partnerFetch = await exports.default.fetch(
      new Request(fetchEndpoint, {
        headers: { authorization: 'Bearer test-token' }
      })
    );
    expect(partnerFetch.status).toBe(401);

    const jobFetch = await exports.default.fetch(
      new Request(`${fetchEndpoint}?targetUrl=https://attacker.example`, {
        headers: {
          authorization: `Bearer ${approvedBody.observationJob.capability}`
        }
      })
    );
    expect(jobFetch.status).toBe(200);
    const fetched = await jobFetch.json<{
      observationJob: {
        id: string;
        status: string;
        contract: typeof approvedBody.observationJob.contract;
        capability?: string;
      };
    }>();
    expect(fetched.observationJob).toEqual({
      id: approvedBody.observationJob.id,
      status: 'running',
      contract: approvedBody.observationJob.contract
    });
    expect(fetched.observationJob.contract.target.url).toBe(
      'http://127.0.0.1:4173/runtime-fixture'
    );
    expect(fetched.observationJob.capability).toBeUndefined();

    const screenshot = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00
    ]);
    const screenshotSha256 = await sha256Hex(screenshot);
    const baseManifest = {
      schemaVersion: 'runtime_observation_evidence.v1',
      observationJobId: approvedBody.observationJob.id,
      testPackageId: packageBody.testPackage.id,
      reviewVersionId: created.review.latestVersion.id,
      bundleSha256: created.review.latestVersion.result.artifact.sha256,
      nonce: approvedBody.observationJob.contract.nonce,
      targetUrl: approvedBody.observationJob.contract.target.url,
      trust: 'webflow_observed',
      executionEvidence: 'chromium_cdp_v1',
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      redaction: {
        applied: true,
        headersRemoved: true,
        cookiesRemoved: true,
        formValuesMasked: true
      },
      runtimeReadyObserved: true,
      runtimeArtifacts: [
        {
          url: 'http://127.0.0.1:4173/runtime-v1.js',
          expectedSha256: 'a'.repeat(64),
          observedSha256: 'a'.repeat(64),
          integrity: TEST_RUNTIME_INTEGRITY,
          domIntegrity: TEST_RUNTIME_INTEGRITY,
          domCrossOrigin: 'anonymous',
          loadedByPage: true,
          sourceMap: { available: false }
        }
      ],
      runtimeCreatedScripts: [],
      unreviewedRuntimeScripts: [],
      cleanup: {
        status: 'not_tested',
        residue: []
      },
      negativeProxyCanary: {
        url: 'http://127.0.0.1:4174/webflow-runtime-canary',
        outcome: 'blocked',
        statusCode: 403
      },
      artifacts: [
        {
          field: 'screenshot_after_cleanup',
          kind: 'screenshot_after_cleanup',
          fileName: 'after-cleanup.png',
          contentType: 'image/png',
          bytes: screenshot.byteLength,
          sha256: screenshotSha256
        }
      ]
    };
    const evidenceEndpoint = `${fetchEndpoint}/evidence`;

    const substitutedEvidence = new FormData();
    substitutedEvidence.set(
      'manifest',
      JSON.stringify({ ...baseManifest, targetUrl: 'https://attacker.example/runtime' })
    );
    substitutedEvidence.set(
      'screenshot_after_cleanup',
      new File([screenshot], 'after-cleanup.png', { type: 'image/png' })
    );
    const substitutedResponse = await exports.default.fetch(
      new Request(evidenceEndpoint, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${approvedBody.observationJob.capability}`
        },
        body: substitutedEvidence
      })
    );
    expect(substitutedResponse.status).toBe(400);

    const mismatchedEvidence = new FormData();
    mismatchedEvidence.set(
      'manifest',
      JSON.stringify({
        ...baseManifest,
        artifacts: [
          {
            ...baseManifest.artifacts[0],
            sha256: 'b'.repeat(64)
          }
        ]
      })
    );
    mismatchedEvidence.set(
      'screenshot_after_cleanup',
      new File([screenshot], 'after-cleanup.png', { type: 'image/png' })
    );
    const mismatchedResponse = await exports.default.fetch(
      new Request(evidenceEndpoint, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${approvedBody.observationJob.capability}`
        },
        body: mismatchedEvidence
      })
    );
    expect(mismatchedResponse.status).toBe(400);

    const unknownArtifactEvidence = new FormData();
    unknownArtifactEvidence.set('manifest', JSON.stringify(baseManifest));
    unknownArtifactEvidence.set(
      'screenshot_after_cleanup',
      new File([screenshot], 'after-cleanup.png', { type: 'image/png' })
    );
    unknownArtifactEvidence.set(
      'raw_browser_profile',
      new File([new Uint8Array([1, 2, 3])], 'profile.bin', {
        type: 'application/octet-stream'
      })
    );
    const unknownArtifactResponse = await exports.default.fetch(
      new Request(evidenceEndpoint, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${approvedBody.observationJob.capability}`
        },
        body: unknownArtifactEvidence
      })
    );
    expect(unknownArtifactResponse.status).toBe(400);

    const oversizedScreenshot = new Uint8Array(2 * 1024 * 1024 + 1);
    oversizedScreenshot.set(screenshot.slice(0, 8));
    const oversizedEvidence = new FormData();
    oversizedEvidence.set(
      'manifest',
      JSON.stringify({
        ...baseManifest,
        artifacts: [
          {
            ...baseManifest.artifacts[0],
            bytes: oversizedScreenshot.byteLength,
            sha256: await sha256Hex(oversizedScreenshot)
          }
        ]
      })
    );
    oversizedEvidence.set(
      'screenshot_after_cleanup',
      new File([oversizedScreenshot], 'after-cleanup.png', { type: 'image/png' })
    );
    const oversizedResponse = await exports.default.fetch(
      new Request(evidenceEndpoint, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${approvedBody.observationJob.capability}`
        },
        body: oversizedEvidence
      })
    );
    expect(oversizedResponse.status).toBe(400);

    const partnerEvidence = new FormData();
    partnerEvidence.set('manifest', JSON.stringify(baseManifest));
    partnerEvidence.set(
      'screenshot_after_cleanup',
      new File([screenshot], 'after-cleanup.png', { type: 'image/png' })
    );
    const partnerEvidenceResponse = await exports.default.fetch(
      new Request(evidenceEndpoint, {
        method: 'POST',
        headers: { authorization: 'Bearer test-token' },
        body: partnerEvidence
      })
    );
    expect(partnerEvidenceResponse.status).toBe(401);

    async function createExtraObservationJob(): Promise<{
      id: string;
      capability: string;
    }> {
      const extraPackageId = await createReadyRuntimePackage(created.review.id);
      const response = await exports.default.fetch(
        new Request(
          `https://preflight.test/v1/runtime-test-packages/${extraPackageId}/observation-jobs`,
          {
          method: 'POST',
          headers: {
            authorization: 'Bearer coordinator-test-token',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            approved: true,
            sandboxOwnershipVerified: true
          })
          }
        )
      );
      expect(response.status).toBe(201);
      const body = await response.json<{
        observationJob: { id: string; capability: string };
      }>();
      return body.observationJob;
    }

    const expiredJob = await createExtraObservationJob();
    await env.DB.prepare(`UPDATE runtime_observation_jobs SET expires_at = ? WHERE id = ?`)
      .bind('2000-01-01T00:00:00.000Z', expiredJob.id)
      .run();
    const expiredResponse = await exports.default.fetch(
      new Request(`https://preflight.test/v1/runtime-observation-jobs/${expiredJob.id}`, {
        headers: { authorization: `Bearer ${expiredJob.capability}` }
      })
    );
    expect(expiredResponse.status).toBe(410);

    const revokedJob = await createExtraObservationJob();
    await env.DB.prepare(`UPDATE runtime_observation_jobs SET status = 'revoked' WHERE id = ?`)
      .bind(revokedJob.id)
      .run();
    const revokedResponse = await exports.default.fetch(
      new Request(`https://preflight.test/v1/runtime-observation-jobs/${revokedJob.id}`, {
        headers: { authorization: `Bearer ${revokedJob.capability}` }
      })
    );
    expect(revokedResponse.status).toBe(410);

    const forbiddenEvidence = new FormData();
    forbiddenEvidence.set(
      'manifest',
      JSON.stringify({ ...baseManifest, authorization: 'Bearer leaked-secret' })
    );
    forbiddenEvidence.set(
      'screenshot_after_cleanup',
      new File([screenshot], 'after-cleanup.png', { type: 'image/png' })
    );
    const forbiddenResponse = await exports.default.fetch(
      new Request(evidenceEndpoint, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${approvedBody.observationJob.capability}`
        },
        body: forbiddenEvidence
      })
    );
    expect(forbiddenResponse.status).toBe(400);
    const artifactsBeforeAcceptance = await env.ARTIFACTS.list({
      prefix: 'runtime-observations/'
    });
    expect(artifactsBeforeAcceptance.objects).toHaveLength(0);
    await env.DB.prepare(
      `UPDATE runtime_observation_jobs
          SET sandbox_id = 'sandbox-evidence-123',
              sandbox_started_at = ?, sandbox_termination_status = 'pending'
        WHERE id = ?`
    )
      .bind(new Date().toISOString(), approvedBody.observationJob.id)
      .run();
    const terminateSandbox = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init);
      if (
        request.url === 'https://api.e2b.app/sandboxes/sandbox-evidence-123' &&
        request.method === 'DELETE'
      ) {
        return new Response(null, { status: 204 });
      }
      if (request.url === 'https://api.e2b.app/sandboxes/sandbox-evidence-123') {
        return Response.json({ error: 'not_found' }, { status: 404 });
      }
      return Response.json({ error: 'unexpected_request' }, { status: 500 });
    });
    vi.stubGlobal('fetch', terminateSandbox);

    const evidence = new FormData();
    evidence.set('manifest', JSON.stringify(baseManifest));
    evidence.set(
      'screenshot_after_cleanup',
      new File([screenshot], 'after-cleanup.png', { type: 'image/png' })
    );
    const acceptedEvidence = await exports.default.fetch(
      new Request(evidenceEndpoint, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${approvedBody.observationJob.capability}`
        },
        body: evidence
      })
    );
    expect(acceptedEvidence.status).toBe(200);
    const acceptedBody = await acceptedEvidence.json<{
      observationJobId: string;
      status: string;
      trust: string;
      security: { status: string; blockers: string[] };
      artifacts: Array<{ kind: string; sha256: string; objectKey: string }>;
    }>();
    expect(acceptedBody).toMatchObject({
      observationJobId: approvedBody.observationJob.id,
      status: 'complete',
      trust: 'webflow_observed',
      security: { status: 'passed', blockers: [] },
      artifacts: [
        {
          kind: 'screenshot_after_cleanup',
          sha256: screenshotSha256
        }
      ]
    });

    const replay = new FormData();
    replay.set('manifest', JSON.stringify(baseManifest));
    replay.set(
      'screenshot_after_cleanup',
      new File([screenshot], 'after-cleanup.png', { type: 'image/png' })
    );
    const replayResponse = await exports.default.fetch(
      new Request(evidenceEndpoint, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${approvedBody.observationJob.capability}`
        },
        body: replay
      })
    );
    expect(replayResponse.status).toBe(410);

    const completed = await env.DB.prepare(
      `SELECT status, consumed_at, evidence_trust, evidence_manifest_json,
              sandbox_terminated_at, sandbox_termination_status
         FROM runtime_observation_jobs
        WHERE id = ?`
    )
      .bind(approvedBody.observationJob.id)
      .first<{
        status: string;
        consumed_at: string;
        evidence_trust: string;
        evidence_manifest_json: string;
        sandbox_terminated_at: string;
        sandbox_termination_status: string;
      }>();
    expect(completed).toMatchObject({
      status: 'complete',
      consumed_at: expect.any(String),
      evidence_trust: 'webflow_observed',
      sandbox_terminated_at: expect.any(String),
      sandbox_termination_status: 'verified'
    });
    expect(terminateSandbox).toHaveBeenCalledTimes(2);
    expect(JSON.parse(completed!.evidence_manifest_json)).toEqual({
      ...baseManifest,
      securityEvaluation: {
        status: 'passed',
        predicates: {
          publishedTarget: true,
          runtimeReadyObserved: true,
          runtimeLoadedByPage: true,
          runtimeHashMatched: true,
          runtimeIntegrityMatched: true,
          noRuntimeCreatedScripts: true,
          noUnreviewedRuntimeScripts: true,
          negativeProxyBlocked: true
        },
        blockers: []
      }
    });
    const storedArtifact = await env.ARTIFACTS.get(acceptedBody.artifacts[0]!.objectKey);
    expect(storedArtifact).not.toBeNull();
    expect(new Uint8Array(await storedArtifact!.arrayBuffer())).toEqual(screenshot);

    const reviewAfterEvidence = await exports.default.fetch(
      new Request(`https://preflight.test/v1/reviews/${created.review.id}`, {
        headers: {
          authorization: 'Bearer test-token',
          origin: 'http://localhost:1337'
        }
      })
    );
    const reviewAfterBody = await reviewAfterEvidence.json<{
      review: { latestVersion: { result: { officialDecision: null } } };
    }>();
    expect(reviewAfterBody.review.latestVersion.result.officialDecision).toBeNull();
  });

  test('lets the package owner launch the pinned E2B runtime without exposing its capability', async () => {
    const reviewForm = new FormData();
    reviewForm.set(
      'bundle',
      new File([await createBundle()], 'consent-pro.zip', { type: 'application/zip' })
    );
    const reviewResponse = await exports.default.fetch(
      new Request('https://preflight.test/v1/reviews', {
        method: 'POST',
        headers: { authorization: 'Bearer test-token', origin: 'http://localhost:1337' },
        body: reviewForm
      })
    );
    const review = await reviewResponse.json<{ review: { id: string } }>();
    const testPackageId = await createReadyRuntimePackage(review.review.id);
    const nonOwnerResponse = await exports.default.fetch(
      new Request(
        `https://preflight.test/v1/runtime-test-packages/${testPackageId}/observation-runs`,
        {
          method: 'POST',
          headers: {
            authorization: 'Bearer reviewer-test-token',
            origin: 'http://localhost:1337'
          }
        }
      )
    );
    expect(nonOwnerResponse.status).toBe(404);
    const launched: Array<{ url: string; headers: Headers; body: unknown }> = [];
    let terminationShouldFail = false;
    const e2b = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init);
      launched.push({
        url: request.url,
        headers: new Headers(request.headers),
        body: request.body ? await request.clone().json() : null
      });
      if (request.url === 'https://api.e2b.app/sandboxes') {
        return new Response(
          JSON.stringify({
          templateID: 'template-runtime-test',
          sandboxID: 'sandbox-test-123',
          clientID: 'client-test',
          envdVersion: '0.5.7',
          envdAccessToken: 'envd-access-token',
          trafficAccessToken: 'traffic-access-token'
          }),
          {
          status: 201,
          headers: { 'content-type': 'application/json' }
          }
        );
      }
      if (
        request.url === 'https://api.e2b.app/sandboxes/sandbox-test-123' &&
        request.method === 'DELETE'
      ) {
        if (terminationShouldFail) {
          return Response.json({ error: 'provider_unavailable' }, { status: 503 });
        }
        return new Response(null, { status: 204 });
      }
      if (request.url === 'https://api.e2b.app/sandboxes/sandbox-test-123') {
        return Response.json({ error: 'not_found' }, { status: 404 });
      }
      return new Response(JSON.stringify({ accepted: true }), {
        status: 202,
        headers: { 'content-type': 'application/json' }
      });
    });
    vi.stubGlobal('fetch', e2b);

    try {
      const response = await exports.default.fetch(
        new Request(
          `https://preflight.test/v1/runtime-test-packages/${testPackageId}/observation-runs`,
          {
            method: 'POST',
            headers: { authorization: 'Bearer test-token', origin: 'http://localhost:1337' }
          }
        )
      );
      expect(response.status).toBe(201);
      const body = await response.json<{
        observationJob: { id: string; status: string; capability?: string };
      }>();
      expect(body.observationJob).toMatchObject({ status: 'approved' });
      expect(body.observationJob.capability).toBeUndefined();
      expect(e2b).toHaveBeenCalledTimes(2);
      expect(launched[0]).toMatchObject({
        url: 'https://api.e2b.app/sandboxes',
        body: {
          templateID: 'app-review-companion-runtime:f47ac10b-58cc-4372-a567-0e02b2c3d479',
          timeout: 900,
          secure: true,
          allow_internet_access: true,
          network: { allowPublicTraffic: false },
          metadata: {
            lane: 'app_review_runtime_observation',
            observation_job_id: body.observationJob.id,
            coordinator: 'webflow-app-review-preflight'
          }
        }
      });
      expect(launched[0]!.headers.get('x-api-key')).toBe('e2b-test-key');
      expect(launched[1]).toMatchObject({
        url: 'https://3000-sandbox-test-123.e2b.app/run',
        body: {
          observationJobId: body.observationJob.id,
          apiBaseUrl: 'https://preflight.test',
          capability: expect.any(String)
        }
      });
      expect(launched[1]!.headers.get('e2b-traffic-access-token')).toBe('traffic-access-token');
      const launchedLifecycle = await env.DB.prepare(
        `SELECT sandbox_id, sandbox_started_at, sandbox_termination_status
           FROM runtime_observation_jobs
          WHERE id = ?`
      )
        .bind(body.observationJob.id)
        .first<{
          sandbox_id: string;
          sandbox_started_at: string;
          sandbox_termination_status: string;
        }>();
      expect(launchedLifecycle).toMatchObject({
        sandbox_id: 'sandbox-test-123',
        sandbox_started_at: expect.any(String),
        sandbox_termination_status: 'pending'
      });

      const duplicateResponse = await exports.default.fetch(
        new Request(
          `https://preflight.test/v1/runtime-test-packages/${testPackageId}/observation-runs`,
          {
            method: 'POST',
            headers: { authorization: 'Bearer test-token', origin: 'http://localhost:1337' }
          }
        )
      );
      expect(duplicateResponse.status).toBe(200);
      const duplicateBody = await duplicateResponse.json<{
        observationJob: { id: string; status: string; deduplicated: boolean };
      }>();
      expect(duplicateBody.observationJob).toMatchObject({
        id: body.observationJob.id,
        status: 'approved',
        deduplicated: true
      });
      expect(e2b).toHaveBeenCalledTimes(2);

      await env.DB.prepare(
        `UPDATE runtime_observation_jobs
            SET expires_at = '2000-01-01T00:00:00.000Z'
          WHERE id = ?`
      )
        .bind(body.observationJob.id)
        .run();
      const expiredReadback = await exports.default.fetch(
        new Request(`https://preflight.test/v1/reviews/${review.review.id}/runtime-test-packages`, {
          headers: { authorization: 'Bearer test-token', origin: 'http://localhost:1337' }
        })
      );
      const expiredBody = await expiredReadback.json<{
        testPackages: Array<{ observation: { status: string } | null }>;
      }>();
      expect(expiredBody.testPackages[0]?.observation?.status).toBe('expired');

      terminationShouldFail = true;
      const blockedRelaunch = await exports.default.fetch(
        new Request(
          `https://preflight.test/v1/runtime-test-packages/${testPackageId}/observation-runs`,
          {
            method: 'POST',
            headers: { authorization: 'Bearer test-token', origin: 'http://localhost:1337' }
          }
        )
      );
      expect(blockedRelaunch.status).toBe(403);
      expect(await blockedRelaunch.json()).toMatchObject({
        error: 'runtime_observation_approval_required',
        message: 'The previous runtime sandbox could not be terminated safely.'
      });
      expect(e2b).toHaveBeenCalledTimes(3);

      const stillBlockedRelaunch = await exports.default.fetch(
        new Request(
          `https://preflight.test/v1/runtime-test-packages/${testPackageId}/observation-runs`,
          {
            method: 'POST',
            headers: { authorization: 'Bearer test-token', origin: 'http://localhost:1337' }
          }
        )
      );
      expect(stillBlockedRelaunch.status).toBe(403);
      expect(e2b).toHaveBeenCalledTimes(4);

      terminationShouldFail = false;
      const relaunchedResponse = await exports.default.fetch(
        new Request(
          `https://preflight.test/v1/runtime-test-packages/${testPackageId}/observation-runs`,
          {
            method: 'POST',
            headers: { authorization: 'Bearer test-token', origin: 'http://localhost:1337' }
          }
        )
      );
      expect(relaunchedResponse.status).toBe(201);
      const relaunchedBody = await relaunchedResponse.json<{
        observationJob: { id: string; deduplicated: boolean };
      }>();
      expect(relaunchedBody.observationJob).toMatchObject({ deduplicated: false });
      expect(relaunchedBody.observationJob.id).not.toBe(body.observationJob.id);
      expect(e2b).toHaveBeenCalledTimes(8);
      const expiredLifecycle = await env.DB.prepare(
        `SELECT status, sandbox_terminated_at, sandbox_termination_status
           FROM runtime_observation_jobs
          WHERE id = ?`
      )
        .bind(body.observationJob.id)
        .first<{
          status: string;
          sandbox_terminated_at: string;
          sandbox_termination_status: string;
        }>();
      expect(expiredLifecycle).toMatchObject({
        status: 'expired',
        sandbox_terminated_at: expect.any(String),
        sandbox_termination_status: 'verified'
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test('reports an expired test package as an actionable precondition failure', async () => {
    const reviewForm = new FormData();
    reviewForm.set(
      'bundle',
      new File([await createBundle()], 'expired-runtime.zip', { type: 'application/zip' })
    );
    const reviewResponse = await exports.default.fetch(
      new Request('https://preflight.test/v1/reviews', {
        method: 'POST',
        headers: { authorization: 'Bearer test-token', origin: 'http://localhost:1337' },
        body: reviewForm
      })
    );
    const review = await reviewResponse.json<{ review: { id: string } }>();
    const testPackageId = await createReadyRuntimePackage(review.review.id);
    await env.DB.prepare(
      "UPDATE runtime_test_packages SET license_expires_at = '2000-01-01T00:00:00.000Z' WHERE id = ?"
    )
      .bind(testPackageId)
      .run();

    const response = await exports.default.fetch(
      new Request(
        `https://preflight.test/v1/runtime-test-packages/${testPackageId}/observation-runs`,
        {
          method: 'POST',
          headers: { authorization: 'Bearer test-token', origin: 'http://localhost:1337' }
        }
      )
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: 'runtime_observation_approval_required',
      message: 'The runtime test package is expired or no longer available.'
    });
  });

  test('maps E2B create failures to a safe in-card launch stage without provider detail', async () => {
    const reviewForm = new FormData();
    reviewForm.set(
      'bundle',
      new File([await createBundle()], 'safe-launch-error.zip', { type: 'application/zip' })
    );
    const reviewResponse = await exports.default.fetch(
      new Request('https://preflight.test/v1/reviews', {
        method: 'POST',
        headers: { authorization: 'Bearer test-token', origin: 'http://localhost:1337' },
        body: reviewForm
      })
    );
    const review = await reviewResponse.json<{ review: { id: string } }>();
    const testPackageId = await createReadyRuntimePackage(review.review.id);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('provider-internal-detail e2b-test-key', { status: 500 }))
    );

    try {
      const response = await exports.default.fetch(
        new Request(
          `https://preflight.test/v1/runtime-test-packages/${testPackageId}/observation-runs`,
          {
            method: 'POST',
            headers: { authorization: 'Bearer test-token', origin: 'http://localhost:1337' }
          }
        )
      );
      const text = await response.text();
      expect(response.status).toBe(503);
      expect(JSON.parse(text)).toEqual({
        error: 'runtime_observation_dispatch_unavailable',
        message: 'The runtime runner could not create a secure sandbox.'
      });
      expect(text).not.toContain('provider-internal-detail');
      expect(text).not.toContain('e2b-test-key');

      const event = await env.DB.prepare(
        `SELECT payload_json FROM review_events
          WHERE review_id = ? AND event_type = 'runtime_observation_dispatch_failed'
          ORDER BY created_at DESC LIMIT 1`
      )
        .bind(review.review.id)
        .first<{ payload_json: string }>();
      expect(JSON.parse(event!.payload_json)).toMatchObject({
        testPackageId,
        stage: 'sandbox_create',
        message: 'The runtime runner could not create a secure sandbox.'
      });
      expect(event!.payload_json).not.toContain('provider-internal-detail');
      expect(event!.payload_json).not.toContain('e2b-test-key');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test('persists and verifies cleanup when a created E2B sandbox cannot start its runner', async () => {
    const reviewForm = new FormData();
    reviewForm.set(
      'bundle',
      new File([await createBundle()], 'partial-launch.zip', { type: 'application/zip' })
    );
    const reviewResponse = await exports.default.fetch(
      new Request('https://preflight.test/v1/reviews', {
        method: 'POST',
        headers: { authorization: 'Bearer test-token', origin: 'http://localhost:1337' },
        body: reviewForm
      })
    );
    const review = await reviewResponse.json<{ review: { id: string } }>();
    const testPackageId = await createReadyRuntimePackage(review.review.id);
    let e2bCall = 0;
    const e2b = vi.fn<typeof fetch>(async () => {
      e2bCall += 1;
      if (e2bCall === 1) {
        return Response.json(
          {
            templateID: 'template-runtime-test',
            sandboxID: 'sandbox-partial-123',
            trafficAccessToken: 'traffic-access-token'
          },
          { status: 201 }
        );
      }
      if (e2bCall === 2) {
        return Response.json({ error: 'runner_unavailable' }, { status: 500 });
      }
      if (e2bCall === 3) return new Response(null, { status: 204 });
      return Response.json({ error: 'not_found' }, { status: 404 });
    });
    vi.stubGlobal('fetch', e2b);

    try {
      const response = await exports.default.fetch(
        new Request(
          `https://preflight.test/v1/runtime-test-packages/${testPackageId}/observation-runs`,
          {
            method: 'POST',
            headers: { authorization: 'Bearer test-token', origin: 'http://localhost:1337' }
          }
        )
      );
      expect(response.status).toBe(503);
      expect(
        e2b.mock.calls.map(([input]) => (input instanceof Request ? input.url : String(input)))
      ).toEqual([
        'https://api.e2b.app/sandboxes',
        'https://3000-sandbox-partial-123.e2b.app/run',
        'https://api.e2b.app/sandboxes/sandbox-partial-123',
        'https://api.e2b.app/sandboxes/sandbox-partial-123'
      ]);
      expect(e2b).toHaveBeenCalledTimes(4);
      await expect(response.json()).resolves.toEqual({
        error: 'runtime_observation_dispatch_unavailable',
        message: 'The runtime runner could not start inside the secure sandbox.'
      });
      const lifecycle = await env.DB.prepare(
        `SELECT status, sandbox_id, sandbox_started_at,
                sandbox_terminated_at, sandbox_termination_status
           FROM runtime_observation_jobs
          WHERE test_package_id = ?
          ORDER BY created_at DESC LIMIT 1`
      )
        .bind(testPackageId)
        .first<{
          status: string;
          sandbox_id: string;
          sandbox_started_at: string;
          sandbox_terminated_at: string;
          sandbox_termination_status: string;
        }>();
      expect(lifecycle).toMatchObject({
        status: 'failed',
        sandbox_id: 'sandbox-partial-123',
        sandbox_started_at: expect.any(String),
        sandbox_terminated_at: expect.any(String),
        sandbox_termination_status: 'verified'
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test('lets an authenticated reviewer open the web workspace and request an independent replay', async () => {
    const reviewForm = new FormData();
    reviewForm.set(
      'bundle',
      new File([await createBundle()], 'reviewer-runtime.zip', { type: 'application/zip' })
    );
    const reviewResponse = await exports.default.fetch(
      new Request('https://preflight.test/v1/reviews', {
        method: 'POST',
        headers: { authorization: 'Bearer test-token', origin: 'http://localhost:1337' },
        body: reviewForm
      })
    );
    const review = await reviewResponse.json<{
      review: { id: string; latestVersion: { id: string } };
    }>();
    const testPackageId = await createReadyRuntimePackage(review.review.id);

    const handoffResponse = await exports.default.fetch(
      new Request(`https://preflight.test/v1/reviews/${review.review.id}/reviewer-handoffs`, {
          method: 'POST',
          headers: {
            authorization: 'Bearer reviewer-test-token',
            origin: 'http://localhost:1337',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            reviewVersionId: review.review.latestVersion.id,
            runtimeTestPackageId: testPackageId
          })
      })
    );
    expect(handoffResponse.status).toBe(201);
    const handoff = await handoffResponse.json<{ handoff: { url: string } }>();
    expect(handoff.handoff.url).toMatch(/^https:\/\/preflight\.test\/reviewer\/connect\?code=/);

    const connectResponse = await exports.default.fetch(
      new Request(handoff.handoff.url, { redirect: 'manual' })
    );
    expect(connectResponse.status).toBe(303);
    expect(connectResponse.headers.get('location')).toBe('/reviewer');
    const sessionCookie = connectResponse.headers.get('set-cookie');
    expect(sessionCookie).toContain('app_review_reviewer_session=');
    expect(sessionCookie).toContain('HttpOnly');
    expect(sessionCookie).toContain('SameSite=Strict');

    const workspaceResponse = await exports.default.fetch(
      new Request('https://preflight.test/reviewer', {
        headers: { cookie: sessionCookie!.split(';')[0]! }
      })
    );
    expect(workspaceResponse.status).toBe(200);
    expect(workspaceResponse.headers.get('content-type')).toContain('text/html');
    const workspaceHtml = await workspaceResponse.text();
    expect(workspaceHtml).toContain('Reviewer workspace');
    expect(workspaceHtml).toContain('Run independent replay');
    expect(workspaceHtml).toContain(testPackageId);

    const replayLaunches: Array<{ url: string; body: unknown }> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init);
      replayLaunches.push({
        url: request.url,
        body: request.body ? await request.clone().json() : null
      });
      if (request.url === 'https://api.e2b.app/sandboxes') {
        const createBody = replayLaunches[0]!.body as {
          templateID: string;
          metadata: { observation_job_id: string };
        };
          return new Response(
            JSON.stringify({
          templateID: createBody.templateID,
          sandboxID: 'reviewer-sandbox-test',
          clientID: 'reviewer-client-test',
          envdVersion: '0.5.7',
          envdAccessToken: 'reviewer-envd-token',
          trafficAccessToken: 'reviewer-traffic-token'
            }),
            {
          status: 201,
          headers: { 'content-type': 'application/json' }
            }
          );
      }
      return new Response(JSON.stringify({ accepted: true }), { status: 202 });
      })
    );
    try {
      const replayResponse = await exports.default.fetch(
        new Request(
          `https://preflight.test/reviewer/runtime-test-packages/${testPackageId}/replay`,
          {
            method: 'POST',
            redirect: 'manual',
            headers: { cookie: sessionCookie!.split(';')[0]! }
          }
        )
      );
      expect(replayResponse.status).toBe(303);
      expect(replayResponse.headers.get('location')).toMatch(/^\/reviewer\?started=/);
      expect(replayLaunches).toHaveLength(2);
      expect(replayLaunches[0]).toMatchObject({
        url: 'https://api.e2b.app/sandboxes',
        body: {
          templateID: 'app-review-companion-runtime:f47ac10b-58cc-4372-a567-0e02b2c3d479',
          metadata: { observation_job_id: expect.any(String) }
        }
      });
      expect(replayLaunches[1]).toEqual({
        url: 'https://3000-reviewer-sandbox-test.e2b.app/run',
        body: {
          observationJobId: expect.any(String),
          apiBaseUrl: 'https://preflight.test',
          capability: expect.any(String)
        }
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test('fails closed until a developer explicitly approves a bounded runtime job', async () => {
    const form = new FormData();
    form.set(
      'bundle',
      new File([await createBundle()], 'consent-pro.zip', { type: 'application/zip' })
    );
    const createResponse = await exports.default.fetch(
      new Request('https://preflight.test/v1/reviews', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          origin: 'http://localhost:1337'
        },
        body: form
      })
    );
    const created = await createResponse.json<{ review: { id: string } }>();
    const endpoint = `https://preflight.test/v1/reviews/${created.review.id}/runtime-jobs`;

    const unapproved = await exports.default.fetch(
      new Request(endpoint, {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          'content-type': 'application/json',
          origin: 'http://localhost:1337'
        },
        body: JSON.stringify({ approved: false })
      })
    );

    expect(unapproved.status).toBe(403);
    expect(await unapproved.json()).toEqual({
      error: 'runtime_approval_required',
      message: 'Approve the bounded sandbox test before a runtime job is prepared.'
    });
    const countBeforeApproval = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM runtime_jobs'
    ).first<{ count: number }>();
    expect(countBeforeApproval?.count).toBe(0);

    const approved = await exports.default.fetch(
      new Request(endpoint, {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          'content-type': 'application/json',
          origin: 'http://localhost:1337'
        },
        body: JSON.stringify({ approved: true })
      })
    );

    expect(approved.status).toBe(201);
    const body = await approved.json<{
      runtimeJob: {
        id: string;
        status: string;
        contract: {
          schemaVersion: string;
          purpose: string;
          targets: Array<{ url: string; host: string }>;
          manualVerification: string[];
          controls: {
            allowedHosts: string[];
            maxRequests: number;
            requestTimeoutMs: number;
            totalTimeoutMs: number;
            networkMode: string;
            credentials: string;
            viewports: Array<{ width: number; height: number }>;
          };
          boundaries: {
            officialDecision: null;
            canWriteGovernance: boolean;
            acceptsSecrets: boolean;
          };
        };
      };
    }>();
    expect(body.runtimeJob.status).toBe('approved');
    expect(body.runtimeJob.contract).toMatchObject({
      schemaVersion: 'app_runtime_evidence_job.v1',
      purpose: 'evidence_only',
      targets: [
        {
          url: 'https://api.consentpro.com/v2/cdn/runtime.js',
          host: 'api.consentpro.com'
        }
      ],
      controls: {
        allowedHosts: ['api.consentpro.com'],
        maxRequests: 20,
        requestTimeoutMs: 10_000,
        totalTimeoutMs: 60_000,
        networkMode: 'exact_host_allowlist',
        credentials: 'none',
        viewports: [
          { width: 1280, height: 720 },
          { width: 390, height: 844 }
        ]
      },
      boundaries: {
        officialDecision: null,
        canWriteGovernance: false,
        acceptsSecrets: false
      }
    });
    expect(body.runtimeJob.contract.manualVerification).toEqual([
      'Licensed, account-gated, and end-to-end installation behavior remains a human verification step.'
    ]);

    const stored = await env.DB.prepare(
      'SELECT status, approved_by_user_id, evidence_json, job_json FROM runtime_jobs WHERE id = ?'
    )
      .bind(body.runtimeJob.id)
      .first<{
        status: string;
        approved_by_user_id: string;
        evidence_json: string | null;
        job_json: string;
      }>();
    expect(stored).toMatchObject({
      status: 'approved',
      approved_by_user_id: 'local-webflow-user',
      evidence_json: null
    });
    expect(JSON.parse(stored!.job_json)).toEqual(body.runtimeJob.contract);
  });

  test('accepts only normalized, credential-free evidence from the coordinator', async () => {
    const form = new FormData();
    form.set(
      'bundle',
      new File([await createBundle()], 'consent-pro.zip', { type: 'application/zip' })
    );
    const createResponse = await exports.default.fetch(
      new Request('https://preflight.test/v1/reviews', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          origin: 'http://localhost:1337'
        },
        body: form
      })
    );
    const created = await createResponse.json<{ review: { id: string } }>();
    const approveResponse = await exports.default.fetch(
      new Request(`https://preflight.test/v1/reviews/${created.review.id}/runtime-jobs`, {
          method: 'POST',
          headers: {
            authorization: 'Bearer test-token',
            'content-type': 'application/json',
            origin: 'http://localhost:1337'
          },
          body: JSON.stringify({ approved: true })
      })
    );
    const approved = await approveResponse.json<{ runtimeJob: { id: string } }>();
    const endpoint = `https://preflight.test/v1/runtime-jobs/${approved.runtimeJob.id}/evidence`;
    const evidence = {
      schemaVersion: 'app_runtime_evidence.v1',
      status: 'complete',
      startedAt: '2026-07-14T22:15:00.000Z',
      finishedAt: '2026-07-14T22:15:02.000Z',
      requestCount: 1,
      targetResults: [
        {
          url: 'https://api.consentpro.com/v2/cdn/runtime.js',
          statusCode: 200,
          contentType: 'application/javascript',
          bytes: 12345,
          sha256: 'f'.repeat(64),
          consoleMessages: []
        }
      ],
      screenshots: []
    };

    const unauthorized = await exports.default.fetch(
      new Request(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(evidence)
      })
    );
    expect(unauthorized.status).toBe(401);

    const credentialLeak = await exports.default.fetch(
      new Request(endpoint, {
        method: 'POST',
        headers: {
          authorization: 'Bearer coordinator-test-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ ...evidence, authorization: 'Bearer leaked-secret' })
      })
    );
    expect(credentialLeak.status).toBe(400);
    expect(await credentialLeak.json()).toEqual({
      error: 'invalid_runtime_evidence',
      message: 'Runtime evidence contains a forbidden secret or decision field.'
    });

    const accepted = await exports.default.fetch(
      new Request(endpoint, {
        method: 'POST',
        headers: {
          authorization: 'Bearer coordinator-test-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify(evidence)
      })
    );
    expect(accepted.status).toBe(200);
    expect(await accepted.json()).toEqual({
      runtimeJobId: approved.runtimeJob.id,
      status: 'complete',
      evidence
    });

    const stored = await env.DB.prepare(
      'SELECT status, evidence_json FROM runtime_jobs WHERE id = ?'
    )
      .bind(approved.runtimeJob.id)
      .first<{ status: string; evidence_json: string }>();
    expect(stored?.status).toBe('complete');
    expect(JSON.parse(stored!.evidence_json)).toEqual(evidence);
  });

  test('derives anonymized pattern proposals and requires human approval for handoff', async () => {
    for (const privateName of ['Private Partner Alpha', 'Private Partner Beta']) {
      const form = new FormData();
      form.set('name', privateName);
      form.set(
        'bundle',
        new File([await createBundle()], `${privateName}.zip`, { type: 'application/zip' })
      );
      const response = await exports.default.fetch(
        new Request('https://preflight.test/v1/reviews', {
          method: 'POST',
          headers: {
            authorization: 'Bearer test-token',
            origin: 'http://localhost:1337'
          },
          body: form
        })
      );
      expect(response.status).toBe(201);
    }

    const deriveResponse = await exports.default.fetch(
      new Request('https://preflight.test/v1/pattern-candidates/derive', {
        method: 'POST',
        headers: { authorization: 'Bearer pattern-coordinator-test-token' }
      })
    );
    expect(deriveResponse.status).toBe(200);
    const derived = await deriveResponse.json<{
      candidates: Array<{
        id: string;
        status: string;
        evidence: {
          ruleId: string;
          occurrenceCount: number;
          reviewCount: number;
          versionCount: number;
        };
        proposal: {
          ruleId: string;
          humanApprovalRequired: boolean;
          writesPerformed: boolean;
        };
      }>;
    }>();
    const candidate = derived.candidates.find(
      (item) => item.evidence.ruleId === 'SEC-SCRIPT-INJECTION'
    );
    expect(candidate).toMatchObject({
      status: 'draft',
      evidence: {
        ruleId: 'SEC-SCRIPT-INJECTION',
        occurrenceCount: expect.any(Number),
        reviewCount: expect.any(Number),
        versionCount: expect.any(Number)
      },
      proposal: {
        ruleId: 'SEC-SCRIPT-INJECTION',
        humanApprovalRequired: true,
        writesPerformed: false
      }
    });
    expect(candidate!.evidence.reviewCount).toBeGreaterThanOrEqual(2);
    const serialized = JSON.stringify(derived);
    expect(serialized).not.toContain('Private Partner Alpha');
    expect(serialized).not.toContain('Private Partner Beta');
    expect(serialized).not.toContain('assets/index.js');
    expect(serialized).not.toContain('api.consentpro.com');

    const handoffEndpoint = `https://preflight.test/v1/pattern-candidates/${candidate!.id}/handoff`;
    const unapproved = await exports.default.fetch(
      new Request(handoffEndpoint, {
        method: 'POST',
        headers: {
          authorization: 'Bearer governance-approver-test-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ approved: false })
      })
    );
    expect(unapproved.status).toBe(403);
    const stillDraft = await env.DB.prepare('SELECT status FROM pattern_candidates WHERE id = ?')
      .bind(candidate!.id)
      .first<{ status: string }>();
    expect(stillDraft?.status).toBe('draft');

    const approved = await exports.default.fetch(
      new Request(handoffEndpoint, {
        method: 'POST',
        headers: {
          authorization: 'Bearer governance-approver-test-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ approved: true })
      })
    );
    expect(approved.status).toBe(200);
    const handoff = await approved.json<{
      artifact: {
        schemaVersion: string;
        mutationPerformed: boolean;
        destinations: string[];
        evidence: unknown;
        proposal: unknown;
      };
    }>();
    expect(handoff.artifact).toMatchObject({
      schemaVersion: 'app_governance_guidance_handoff.v1',
      mutationPerformed: false,
      destinations: ['App Governance', 'webflow/openapi-internal']
    });
    expect(JSON.stringify(handoff)).not.toContain('Private Partner');
    const handedOff = await env.DB.prepare(
      'SELECT status, approved_by_user_id, approved_at FROM pattern_candidates WHERE id = ?'
    )
      .bind(candidate!.id)
      .first<{ status: string; approved_by_user_id: string; approved_at: string }>();
    expect(handedOff).toMatchObject({
      status: 'handed_off',
      approved_by_user_id: 'authorized-governance-reviewer'
    });
    expect(handedOff?.approved_at).toEqual(expect.any(String));
  });
});
