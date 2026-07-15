import { env, exports } from 'cloudflare:workers';
import JSZip from 'jszip';
import { describe, expect, test, vi } from 'vitest';
import { evaluateRuntimeSecurity } from '../src/runtime-observations';

const TEST_RUNTIME_INTEGRITY = 'sha256-qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqo=';

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
    source.push(
      'const script = document.createElement("script");',
      'script.src = runtime;'
    );
  }
  zip.file('assets/index.js', source.join('\n'));
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
        sandboxInstallationId: 'webflow-sandbox-site-123',
        sandboxOwnershipConfirmed: true,
        license: {
          mode: 'installation_allowlist',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
        },
        runtimeArtifacts: [{
          url: 'http://127.0.0.1:4173/runtime-v1.js',
          sha256: 'a'.repeat(64),
          integrity: TEST_RUNTIME_INTEGRITY
        }],
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
      runtimeArtifacts: [{
        url: 'https://api.consentpro.com/v2/cdn/runtime.js',
        sha256: 'a'.repeat(64),
        integrity: 'sha256-reviewed-runtime'
      }]
    } as any;
    const result = evaluateRuntimeSecurity({
      runtimeReadyObserved: false,
      runtimeArtifacts: [{
        url: contract.runtimeArtifacts[0].url,
        observedSha256: 'b'.repeat(64),
        loadedByPage: false,
        domIntegrity: null
      }],
      runtimeCreatedScripts: ['https://api.consentpro.com/v2/cdn/debugger.js'],
      unreviewedRuntimeScripts: ['https://api.consentpro.com/v2/cdn/debugger.js'],
      negativeProxyCanary: { outcome: 'exposed' }
    }, contract);

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
      new Request(
        `https://preflight.test/v1/reviews/${created.review.id}/companion-pairings`,
        {
          method: 'POST',
          headers: {
            authorization: 'Bearer test-token',
            origin: 'http://localhost:1337',
            'content-type': 'application/json'
          },
          body: JSON.stringify({ reviewVersionId: created.review.latestVersion.id })
        }
      )
    );
    expect(missingPackageResponse.status).toBe(400);
    expect(await missingPackageResponse.json()).toMatchObject({
      error: 'invalid_companion_pairing',
      message: expect.stringMatching(/runtime test package/i)
    });
    const runtimeTestPackageId = await createReadyRuntimePackage(created.review.id);

    const pairingResponse = await exports.default.fetch(
      new Request(
        `https://preflight.test/v1/reviews/${created.review.id}/companion-pairings`,
        {
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
        }
      )
    );
    expect(pairingResponse.status).toBe(201);
    const paired = await pairingResponse.json<{
      pairing: { code: string; expiresAt: string };
    }>();
    expect(paired.pairing.code.length).toBeGreaterThanOrEqual(32);
    expect(Date.parse(paired.pairing.expiresAt)).toBeGreaterThan(Date.now());

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
      new Request(
        `https://preflight.test/v1/reviews/${created.review.id}/companion-runs`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${session.session.token}`,
            origin: 'http://localhost:1337',
            'content-type': 'application/json'
          },
          body: JSON.stringify({ reviewVersionId: 'another-version', runtimeTestPackageId })
        }
      )
    );
    expect(versionEscapeAttempt.status).toBe(404);

    const runResponse = await exports.default.fetch(
      new Request(
        `https://preflight.test/v1/reviews/${created.review.id}/companion-runs`,
        {
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
        }
      )
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
      new Request(
        `https://preflight.test/v1/reviews/${created.review.id}/companion-pairings`,
        {
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
        }
      )
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
      new Request(
        `https://preflight.test/v1/reviews/${created.review.id}/companion-pairings`,
        {
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
        }
      )
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
      new Request(
        `https://preflight.test/v1/reviews/${created.review.id}/companion-runs`,
        {
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
        }
      )
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
    expect(createdRun.run.missions.map((mission) => mission.id)).toEqual([
      'production_runtime'
    ]);

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
      new Request(
        `https://preflight.test/v1/companion-runs/${createdRun.run.id}/replay`,
        {
          method: 'POST',
          headers: {
            authorization: 'Bearer reviewer-test-token',
            origin: 'http://localhost:1337'
          }
        }
      )
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
    initialForm.set(
      'bundle',
      new File([bundle], 'consent-pro.zip', { type: 'application/zip' })
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
      new Request(
        `https://preflight.test/v1/reviews/${created.review.id}/runtime-test-packages`,
        {
          method: 'POST',
          headers: {
            authorization: 'Bearer test-token',
            origin: 'http://localhost:1337',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            targetUrl: 'https://68821e9ad5797a48cfc68499.webflow-ext.com/6a552d5baa59e9a3a1ebba5d/',
            sandboxInstallationId: 'webflow-sandbox-site-123',
            sandboxOwnershipConfirmed: true,
            license: {
              mode: 'installation_allowlist',
              expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
            },
            runtimeArtifacts: [{
              url: 'https://api.consentpro.com/v2/cdn/runtime.js',
              sha256: 'a'.repeat(64),
              integrity: TEST_RUNTIME_INTEGRITY
            }],
            negativeProxyProbe: {
              method: 'GET',
              urlTemplate: 'https://api.consentpro.com/v2/proxy?url={canaryUrl}'
            },
            lifecycle: { readySelector: '[data-runtime-ready]' }
          })
        }
      )
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: 'invalid_runtime_test_package',
      message: expect.stringMatching(/published-site origin/i)
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
      new Request(
        `https://preflight.test/v1/reviews/${created.review.id}/runtime-test-packages`,
        {
          method: 'POST',
          headers: {
            authorization: 'Bearer test-token',
            origin: 'http://localhost:1337',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            targetUrl: 'http://127.0.0.1:4173/runtime-fixture',
            sandboxInstallationId: 'webflow-sandbox-site-123',
            sandboxOwnershipConfirmed: true,
            license: {
              mode: 'installation_allowlist',
              expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
            },
            runtimeArtifacts: [{
              url: 'http://127.0.0.1:4173/runtime-v1.js',
              sha256: 'a'.repeat(64),
              integrity: 'sha256-mismatched-runtime-bytes'
            }],
            negativeProxyProbe: {
              method: 'GET',
              urlTemplate: 'http://127.0.0.1:4173/proxy?url={canaryUrl}'
            },
            lifecycle: { readySelector: '[data-runtime-ready]' }
          })
        }
      )
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
      new Request(
        `https://preflight.test/v1/reviews/${created.review.id}/runtime-test-packages`,
        {
          method: 'POST',
          headers: {
            authorization: 'Bearer test-token',
            'content-type': 'application/json',
            origin: 'http://localhost:1337'
          },
          body: JSON.stringify({
            targetUrl: 'http://127.0.0.1:4173/runtime-fixture',
            sandboxInstallationId: 'webflow-sandbox-site-123',
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
              urlTemplate:
                'http://127.0.0.1:4173/proxy?url={canaryUrl}'
            },
            lifecycle: {
              readySelector: '[data-runtime-ready]'
            }
          })
        }
      )
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
      sandboxInstallationId: 'webflow-sandbox-site-123',
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
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x00
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
      const response = await exports.default.fetch(
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
      expect(response.status).toBe(201);
      const body = await response.json<{
        observationJob: { id: string; capability: string };
      }>();
      return body.observationJob;
    }

    const expiredJob = await createExtraObservationJob();
    await env.DB.prepare(
      `UPDATE runtime_observation_jobs SET expires_at = ? WHERE id = ?`
    )
      .bind('2000-01-01T00:00:00.000Z', expiredJob.id)
      .run();
    const expiredResponse = await exports.default.fetch(
      new Request(`https://preflight.test/v1/runtime-observation-jobs/${expiredJob.id}`, {
        headers: { authorization: `Bearer ${expiredJob.capability}` }
      })
    );
    expect(expiredResponse.status).toBe(410);

    const revokedJob = await createExtraObservationJob();
    await env.DB.prepare(
      `UPDATE runtime_observation_jobs SET status = 'revoked' WHERE id = ?`
    )
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
      `SELECT status, consumed_at, evidence_trust, evidence_manifest_json
         FROM runtime_observation_jobs
        WHERE id = ?`
    )
      .bind(approvedBody.observationJob.id)
      .first<{
        status: string;
        consumed_at: string;
        evidence_trust: string;
        evidence_manifest_json: string;
      }>();
    expect(completed).toMatchObject({
      status: 'complete',
      consumed_at: expect.any(String),
      evidence_trust: 'webflow_observed'
    });
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
    const storedArtifact = await env.ARTIFACTS.get(
      acceptedBody.artifacts[0]!.objectKey
    );
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

  test('lets the package owner request a server-dispatched runtime run without exposing its capability', async () => {
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
    let dispatched: { authorization: string | null; body: unknown } | null = null;
    const dispatch = vi.fn(async (request: Request) => {
      dispatched = {
        authorization: request.headers.get('authorization'),
        body: await request.json()
      };
      return new Response(null, { status: 202 });
    });
    vi.stubGlobal('fetch', dispatch);

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
      expect(dispatch).toHaveBeenCalledOnce();
      expect(dispatched).toEqual({
        authorization: 'Bearer runtime-dispatcher-test-token',
        body: {
        observationJobId: body.observationJob.id,
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
      new Request(
        `https://preflight.test/v1/reviews/${created.review.id}/runtime-jobs`,
        {
          method: 'POST',
          headers: {
            authorization: 'Bearer test-token',
            'content-type': 'application/json',
            origin: 'http://localhost:1337'
          },
          body: JSON.stringify({ approved: true })
        }
      )
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
    const stillDraft = await env.DB.prepare(
      'SELECT status FROM pattern_candidates WHERE id = ?'
    )
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
