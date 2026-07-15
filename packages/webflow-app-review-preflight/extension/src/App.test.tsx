import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { App } from './App';
import type { PreflightApi, StoredReview } from './types';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const api: PreflightApi = {
  getIdentity: async () => ({
    id: 'local-webflow-user',
    siteId: 'local-webflow-site',
    companionRole: 'developer'
  }),
  listReviews: async () => [],
  getReview: async () => Promise.reject(new Error('not used')),
  createReview: async () => Promise.reject(new Error('not used')),
  addRevision: async () => Promise.reject(new Error('not used')),
  approveRuntimeJob: async () => Promise.reject(new Error('not used')),
  listRuntimeTestPackages: async () => [],
  createRuntimeTestPackage: async () => Promise.reject(new Error('not used')),
  createCompanionPairing: async () => Promise.reject(new Error('not used'))
};

function consentProReview(sequence = 1): StoredReview {
  const createdAt = '2026-07-14T22:00:00.000Z';
  return {
    id: 'review-consent-pro',
    name: 'Consent Pro preflight',
    createdAt,
    updatedAt: createdAt,
    latestVersion: {
      id: `version-${sequence}`,
      sequence,
      createdAt,
      result: {
        schemaVersion: 'app_review_preflight.v1',
        reviewId: 'review-consent-pro',
        createdAt,
        artifact: {
          fileName: 'consent-pro.zip',
          sha256: 'abc123',
          compressedBytes: 2048,
          fileCount: 4
        },
        artifactScope: {
          primary: 'designer_extension',
          appName: 'Consent Pro by Finsweet',
          manifestPath: 'webflow.json'
        },
        coverage: [
          {
            surface: 'designer_extension',
            status: 'reviewed',
            label: 'Designer Extension reviewed',
            detail: 'The uploaded Designer Extension bundle was scanned.'
          },
          {
            surface: 'production_runtime',
            status: 'needs_verification',
            label: 'Production runtime not yet verified',
            detail: 'Runtime references were discovered, but the production code has not run.'
          }
        ],
        runtime: {
          references: ['https://api.consentpro.com/v2/cdn/runtime.js'],
          status: 'discovered_unverified',
          manualVerificationRequired: true
        },
        summary: {
          readiness: 'changes_required',
          securityBlockers: 1,
          requiredUpdates: 1,
          suggestedUpdates: 0
        },
        guidance: [
          {
            id: 'SEC-SCRIPT-INJECTION',
            label: 'Security blocker',
            title: 'Runtime-created scripts',
            explanation: 'The runtime creates a script element and loads code dynamically.',
            nextMove: 'Bundle the reviewed runtime code and use the approved lifecycle.',
            severity: 'BLOCKER',
            confidence: 'HIGH',
            evidence: [
              {
                filePath: 'assets/index.js',
                line: 20,
                snippet: 'document.createElement("script")'
              }
            ]
          },
          {
            id: 'SEC-MUTABLE-DELIVERY',
            label: 'Required update',
            title: 'Mutable runtime delivery',
            explanation: 'The referenced runtime can change after review.',
            nextMove: 'Publish an immutable, versioned runtime artifact.',
            severity: 'HIGH',
            confidence: 'HIGH',
            evidence: [
              {
                filePath: 'assets/index.js',
                line: 8,
                snippet: '/v2/cdn/runtime.js'
              }
            ]
          }
        ],
        policySnapshot: {
          rulesetVersion: '1.3.0-checklist-complete',
          configVersion: '1.0.0'
        },
        evidence: {
          scanReportVersion: '1',
          scanRunId: 'scan-1'
        },
        officialDecision: null
      }
    }
  };
}

describe('App Review Preflight extension', () => {
  test('shows the server-resolved Webflow identity and companion role', async () => {
    render(<App api={api} />);

    expect(await screen.findByText('Developer identity')).toBeVisible();
    expect(screen.getByText('local-webflow-user')).toBeVisible();
    expect(screen.queryByText('Reviewer identity')).not.toBeInTheDocument();
  });

  test('uses the Designer wrapper title and starts with one clear upload action', async () => {
    render(<App api={api} />);

    expect(await screen.findByText('Upload your app bundle')).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'App Review Preflight' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Clear fixes before Marketplace review')
    ).not.toBeInTheDocument();
    expect(screen.getByText('Choose bundle')).toBeVisible();
    expect(screen.queryByText('Share')).not.toBeInTheDocument();
  });

  test('turns an uploaded bundle into plain-language, scope-aware feedback', async () => {
    const created = consentProReview();
    const uploadApi: PreflightApi = {
      ...api,
      listReviews: async () => [],
      createReview: vi.fn(async () => created)
    };
    const { container } = render(<App api={uploadApi} />);
    const file = new File(['zip-bytes'], 'consent-pro.zip', { type: 'application/zip' });

    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [file] }
    });

    expect(await screen.findByRole('heading', { name: 'Consent Pro by Finsweet' })).toBeVisible();
    expect(screen.getByText('Designer Extension reviewed')).toBeVisible();
    expect(screen.getByText('Production runtime not yet verified')).toBeVisible();
    expect(screen.getByText('Checkpoint saved')).toBeVisible();
    expect(screen.getByText('Security blockers')).toBeVisible();
    expect(screen.getByText('Runtime-created scripts')).toBeVisible();
    expect(screen.getByText('Upload revision')).toBeVisible();
    expect(screen.queryByText('Share')).not.toBeInTheDocument();
    expect(uploadApi.createReview).toHaveBeenCalledWith(file);
  });

  test('shows revision progress and keeps the review usable after an upload error', async () => {
    const initial = consentProReview();
    const revised = consentProReview(2);
    revised.latestVersion.result.summary.securityBlockers = 0;
    revised.latestVersion.result.guidance = revised.latestVersion.result.guidance.slice(1);

    const addRevision = vi
      .fn<PreflightApi['addRevision']>()
      .mockRejectedValueOnce(new Error('The bundle could not be read.'))
      .mockResolvedValueOnce({
        review: revised,
        comparison: {
          resolved: ['SEC-SCRIPT-INJECTION'],
          remaining: ['SEC-MUTABLE-DELIVERY'],
          added: []
        },
        deduplicated: false
      });
    const revisionApi: PreflightApi = {
      ...api,
      listReviews: async () => [
        {
          id: initial.id,
          name: initial.name,
          updatedAt: initial.updatedAt,
          latestSequence: 1,
          readiness: 'changes_required',
          appName: 'Consent Pro by Finsweet',
          coverage: initial.latestVersion.result.coverage
        }
      ],
      getReview: async () => initial,
      addRevision
    };
    const { container } = render(<App api={revisionApi} />);

    fireEvent.click(await screen.findByRole('button', { name: /Consent Pro preflight/i }));
    expect(await screen.findByText('Upload revision')).toBeVisible();

    const revisionInput = container.querySelector('input[type="file"]')!;
    fireEvent.change(revisionInput, {
      target: { files: [new File(['bad'], 'broken.zip', { type: 'application/zip' })] }
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('The bundle could not be read.');
    expect(screen.getByText('Upload revision')).toBeVisible();

    fireEvent.change(revisionInput, {
      target: { files: [new File(['fixed'], 'consent-pro-v2.zip', { type: 'application/zip' })] }
    });

    await waitFor(() => expect(addRevision).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Resolved')).toBeVisible();
    expect(screen.getByText('Remaining')).toBeVisible();
    expect(screen.getByText('New')).toBeVisible();
    expect(screen.getByText('Revision 2')).toBeVisible();
  });

  test('requires a clear confirmation before preparing the evidence-only sandbox job', async () => {
    const review = consentProReview();
    const approveRuntimeJob = vi.fn(async () => ({
      id: 'runtime-job-1',
      status: 'approved' as const,
      approvedAt: '2026-07-14T22:10:00.000Z',
      contract: {
        schemaVersion: 'app_runtime_evidence_job.v1' as const,
        purpose: 'evidence_only' as const,
        reviewVersionId: review.latestVersion.id,
        targets: [
          {
            url: 'https://api.consentpro.com/v2/cdn/runtime.js',
            host: 'api.consentpro.com'
          }
        ],
        manualVerification: ['Licensed behavior still requires a human check.'],
        controls: {
          allowedHosts: ['api.consentpro.com'],
          maxRequests: 20,
          requestTimeoutMs: 10_000,
          totalTimeoutMs: 60_000,
          networkMode: 'exact_host_allowlist' as const,
          credentials: 'none' as const,
          viewports: [{ width: 1280, height: 720 }]
        },
        evidenceOutputs: ['request_log'],
        boundaries: {
          officialDecision: null,
          canWriteGovernance: false as const,
          acceptsSecrets: false as const
        }
      }
    }));
    const runtimeApi: PreflightApi = {
      ...api,
      listReviews: async () => [
        {
          id: review.id,
          name: review.name,
          updatedAt: review.updatedAt,
          latestSequence: 1,
          readiness: 'changes_required',
          appName: 'Consent Pro by Finsweet',
          coverage: review.latestVersion.result.coverage
        }
      ],
      getReview: async () => review,
      approveRuntimeJob
    };
    render(<App api={runtimeApi} />);

    fireEvent.click(await screen.findByRole('button', { name: /Consent Pro preflight/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Approve sandbox test' }));

    expect(screen.getByRole('heading', { name: 'Confirm sandbox evidence test' })).toBeVisible();
    expect(screen.getByText(/No credentials are sent/i)).toBeVisible();
    expect(approveRuntimeJob).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Approve bounded test' }));

    expect(await screen.findByText('Sandbox job approved')).toBeVisible();
    expect(screen.getByText(/Allowed host: api\.consentpro\.com/)).toBeVisible();
    expect(screen.getByText(/does not approve or reject your app/i)).toBeVisible();
    expect(screen.getByText('Still needs a human')).toBeVisible();
    expect(screen.getByText('Licensed behavior still requires a human check.')).toBeVisible();
    expect(approveRuntimeJob).toHaveBeenCalledWith(review.id);
  });

  test('prepares partner test input but shows evidence only after a Webflow run', async () => {
    const review = consentProReview();
    const createdAt = '2026-07-14T23:00:00.000Z';
    const prepared = {
      schemaVersion: 'runtime_test_package.v1' as const,
      id: 'test-package-1',
      reviewId: review.id,
      reviewVersionId: review.latestVersion.id,
      bundleSha256: review.latestVersion.result.artifact.sha256,
      status: 'ready' as const,
      trust: 'partner_supplied' as const,
      target: {
        url: 'https://app-review-sandbox.webflow.io/',
        host: 'app-review-sandbox.webflow.io'
      },
      sandboxInstallationId: 'webflow-sandbox-site-123',
      license: {
        mode: 'installation_allowlist' as const,
        expiresAt: '2026-07-15T00:00:00.000Z'
      },
      runtimeArtifacts: [
        {
          url: 'https://api.consentpro.com/v2/cdn/runtime-v1.js',
          sha256: 'a'.repeat(64),
          integrity: 'sha256-runtime-v1'
        }
      ],
      negativeProxyProbe: {
        method: 'GET' as const,
        urlTemplate: 'https://api.consentpro.com/v2/proxy?url={canaryUrl}'
      },
      lifecycle: {
        readySelector: '[data-runtime-ready]'
      },
      evidence: null,
      createdAt,
      observation: null
    };
    const completed = {
      ...prepared,
      observation: {
        id: 'observation-1',
        status: 'complete' as const,
        trust: 'webflow_observed' as const,
        approvedAt: createdAt,
        expiresAt: '2026-07-14T23:15:00.000Z',
        completedAt: '2026-07-14T23:01:00.000Z',
        evidence: {
          securityStatus: 'blocked' as const,
          securityPredicates: {
            publishedTarget: true,
            runtimeReadyObserved: false,
            runtimeLoadedByPage: true,
            runtimeHashMatched: true,
            runtimeIntegrityMatched: true,
            noRuntimeCreatedScripts: true,
            noUnreviewedRuntimeScripts: true,
            negativeProxyBlocked: true
          },
          blockers: ['The runtime-ready signal was not observed on the published page.'],
          cleanupStatus: 'not_tested' as const,
          cleanupResidue: [],
          negativeProxyOutcome: 'blocked' as const,
          artifactCount: 8,
          artifacts: [
            {
              kind: 'screenshot_after_observation',
              contentType: 'image/png',
              bytes: 12000,
              sha256: 'c'.repeat(64)
            }
          ]
        }
      }
    };
    const listRuntimeTestPackages = vi
      .fn<PreflightApi['listRuntimeTestPackages']>()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([completed]);
    const createRuntimeTestPackage = vi.fn(async () => prepared);
    const runtimeApi: PreflightApi = {
      ...api,
      listReviews: async () => [
        {
          id: review.id,
          name: review.name,
          updatedAt: review.updatedAt,
          latestSequence: 1,
          readiness: 'changes_required',
          appName: 'Consent Pro by Finsweet',
          coverage: review.latestVersion.result.coverage
        }
      ],
      getReview: async () => review,
      listRuntimeTestPackages,
      createRuntimeTestPackage
    };
    render(<App api={runtimeApi} />);

    fireEvent.click(await screen.findByRole('button', { name: /Consent Pro preflight/i }));
    expect(await screen.findByRole('heading', { name: 'Webflow runtime observation' })).toBeVisible();
    fireEvent.change(screen.getByLabelText('Published Webflow test URL'), {
      target: { value: 'https://app-review-sandbox.webflow.io' }
    });
    fireEvent.change(screen.getByLabelText('Webflow installation or site ID'), {
      target: { value: 'webflow-sandbox-site-123' }
    });
    fireEvent.change(screen.getByLabelText('Immutable runtime URL'), {
      target: { value: 'https://api.consentpro.com/v2/cdn/runtime-v1.js' }
    });
    fireEvent.change(screen.getByLabelText('SHA-256'), {
      target: { value: 'a'.repeat(64) }
    });
    fireEvent.change(screen.getByLabelText('Script integrity (SRI)'), {
      target: { value: 'sha256-runtime-v1' }
    });
    fireEvent.click(screen.getByText('Runtime-ready selector and proxy check'));
    fireEvent.change(screen.getByLabelText('Proxy probe URL template'), {
      target: { value: 'https://api.consentpro.com/v2/proxy?url={canaryUrl}' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Prepare Webflow run' }));

    expect(screen.getByRole('heading', { name: 'Confirm dedicated test access' })).toBeVisible();
    expect(createRuntimeTestPackage).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm test package' }));

    expect(await screen.findByLabelText('Current evidence: Partner supplied')).toBeVisible();
    expect(screen.getByText('Ready for Webflow run')).toBeVisible();
    expect(screen.getByText(/cannot become Webflow-observed evidence/i)).toBeVisible();
    expect(createRuntimeTestPackage).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Check run status' }));
    expect(await screen.findByLabelText('Current evidence: Webflow observed')).toBeVisible();
    expect(screen.getByText('Runtime security blocked')).toBeVisible();
    expect(screen.getByText('Proxy canary blocked')).toBeVisible();
    expect(screen.getByText('What the evidence labels mean')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Prepare another test package' })).toBeVisible();
    expect(screen.queryByText('Share')).not.toBeInTheDocument();
  });

  test('reopens the selected saved run after the extension reloads', async () => {
    const review = consentProReview(2);
    localStorage.setItem('app-review-preflight.selected-review', review.id);
    const getReview = vi.fn(async () => review);
    const persistedApi: PreflightApi = {
      ...api,
      listReviews: async () => [
        {
          id: review.id,
          name: review.name,
          updatedAt: review.updatedAt,
          latestSequence: 2,
          readiness: 'changes_required',
          appName: 'Consent Pro by Finsweet',
          coverage: review.latestVersion.result.coverage
        }
      ],
      getReview
    };

    render(<App api={persistedApi} />);

    expect(await screen.findByText('Revision 2')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Consent Pro by Finsweet' })).toBeVisible();
    expect(getReview).toHaveBeenCalledWith(review.id);
  });

  test('pairs the browser companion to the selected version with one action', async () => {
    const review = consentProReview();
    const createCompanionPairing = vi.fn(async () => ({
      code: 'pairing-code-from-webflow-identity',
      expiresAt: '2026-07-15T14:05:00.000Z'
    }));
    const pairCompanion = vi.fn(async () => undefined);
    const pairingApi = {
      ...api,
      listReviews: async () => [
        {
          id: review.id,
          name: review.name,
          updatedAt: review.updatedAt,
          latestSequence: 1,
          readiness: 'changes_required' as const,
          appName: 'Consent Pro by Finsweet',
          coverage: review.latestVersion.result.coverage
        }
      ],
      getReview: async () => review,
      listRuntimeTestPackages: async () => [{
        schemaVersion: 'runtime_test_package.v1' as const,
        id: 'runtime-package-consent-pro',
        reviewId: review.id,
        reviewVersionId: review.latestVersion.id,
        bundleSha256: review.latestVersion.result.artifact.sha256,
        status: 'ready' as const,
        trust: 'partner_supplied' as const,
        target: { url: 'https://consent-pro-test.webflow.io/', host: 'consent-pro-test.webflow.io' },
        sandboxInstallationId: 'consent-pro-test-site',
        license: { mode: 'installation_allowlist' as const, expiresAt: new Date(Date.now() + 3_600_000).toISOString() },
        runtimeArtifacts: [{ url: 'https://api.consentpro.com/v2/cdn/runtime.js', sha256: 'a'.repeat(64), integrity: 'sha256-runtime' }],
        negativeProxyProbe: { method: 'GET' as const, urlTemplate: 'https://api.consentpro.com/v2/proxy?url={canaryUrl}' },
        lifecycle: { readySelector: '[data-runtime-ready]' },
        evidence: null,
        createdAt: new Date().toISOString(),
        observation: null
      }],
      createCompanionPairing
    } as PreflightApi;

    render(<App api={pairingApi} pairCompanion={pairCompanion} />);
    fireEvent.click(await screen.findByRole('button', { name: /Consent Pro preflight/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Connect browser companion' }));

    await waitFor(() => {
      expect(createCompanionPairing).toHaveBeenCalledWith(
        review.id,
        review.latestVersion.id,
        'runtime-package-consent-pro'
      );
      expect(pairCompanion).toHaveBeenCalledWith({
        code: 'pairing-code-from-webflow-identity',
        expiresAt: '2026-07-15T14:05:00.000Z'
      });
    });
    expect(screen.getByText('Browser companion connected')).toBeVisible();
    expect(screen.queryByText(/Session token/i)).not.toBeInTheDocument();
  });
});
