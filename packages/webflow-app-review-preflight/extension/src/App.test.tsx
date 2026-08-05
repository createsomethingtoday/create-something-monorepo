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
  listRuntimeTestPackages: async () => [],
  createRuntimeTestPackage: async () => Promise.reject(new Error('not used')),
  requestRuntimeObservationRun: async () => Promise.reject(new Error('not used')),
  createReviewerHandoff: async () => Promise.reject(new Error('not used'))
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
    fireEvent.click(screen.getByRole('button', { name: 'Run preflight' }));

    expect(await screen.findByRole('heading', { name: 'Consent Pro by Finsweet' })).toBeVisible();
    expect(screen.getByText('Designer Extension reviewed')).toBeVisible();
    expect(screen.getByText('Production runtime not yet verified')).toBeVisible();
    expect(screen.getByText('Checkpoint saved')).toBeVisible();
    expect(screen.getByText('Security blockers')).toBeVisible();
    expect(screen.getByText('Runtime-created scripts')).toBeVisible();
    expect(screen.getByText('Upload revision')).toBeVisible();
    expect(screen.queryByText('Share')).not.toBeInTheDocument();
    expect(uploadApi.createReview).toHaveBeenCalledWith(file, undefined);
  });

  test('submits the bundle and private source-map artifact as one review checkpoint', async () => {
    const created = consentProReview();
    const createReview = vi.fn(async () => created);
    const uploadApi: PreflightApi = {
      ...api,
      createReview
    };
    render(<App api={uploadApi} />);
    const bundle = new File(['zip-bytes'], 'consent-pro.zip', { type: 'application/zip' });
    const sourceMaps = new File(['map-bytes'], 'consent-pro-source-maps.zip', {
      type: 'application/zip'
    });

    fireEvent.change(await screen.findByLabelText('App bundle'), {
      target: { files: [bundle] }
    });
    fireEvent.change(screen.getByLabelText('Source maps for review'), {
      target: { files: [sourceMaps] }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run preflight' }));

    await waitFor(() => expect(createReview).toHaveBeenCalledWith(bundle, sourceMaps));
  });

  test('shows the private artifact receipt without exposing storage coordinates', async () => {
    const review = consentProReview();
    review.latestVersion.receipt = {
      schemaVersion: 'preflight_artifact_receipt.v1',
      id: 'receipt-123',
      reviewId: review.id,
      reviewVersionId: review.latestVersion.id,
      artifactSetVersion: 1,
      artifactSetSha256: 'a'.repeat(64),
      bundleSha256: 'b'.repeat(64),
      sourceMapArtifactSha256: 'c'.repeat(64),
      policyVersion: 'source_maps.v1',
      scanStatus: 'passed',
      reconciliationStatus: 'not_checked',
      createdAt: review.createdAt
    };
    const receiptApi: PreflightApi = {
      ...api,
      listReviews: async () => [{
        id: review.id,
        name: review.name,
        updatedAt: review.updatedAt,
        latestSequence: 1,
        readiness: 'changes_required',
        appName: 'Consent Pro by Finsweet',
        coverage: review.latestVersion.result.coverage
      }],
      getReview: async () => review
    };

    render(<App api={receiptApi} />);
    fireEvent.click(await screen.findByRole('button', { name: /Consent Pro preflight/i }));

    expect(await screen.findByRole('heading', { name: 'Artifact receipt' })).toBeVisible();
    expect(screen.getByText('Not reconciled')).toBeVisible();
    expect(screen.getByText(/bbbbbbbbbbbb/)).toBeVisible();
    expect(screen.getByText(/cccccccccccc/)).toBeVisible();
    expect(screen.queryByText(/object_key|source-maps\/sha256/i)).not.toBeInTheDocument();
  });

  test('gives reviewers a one-time handoff into the server-owned workspace', async () => {
    const review = consentProReview();
    const testPackage = {
      schemaVersion: 'runtime_test_package.v1' as const,
      id: 'reviewer-package-1',
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
        expiresAt: '2026-07-16T00:00:00.000Z'
      },
      runtimeArtifacts: [{
        url: 'https://api.consentpro.com/v2/cdn/runtime-v1.js',
        sha256: 'a'.repeat(64),
        integrity: 'sha256-runtime-v1'
      }],
      negativeProxyProbe: {
        method: 'GET' as const,
        urlTemplate: 'https://api.consentpro.com/v2/proxy?url={canaryUrl}'
      },
      lifecycle: { readySelector: '[data-runtime-ready]' },
      evidence: null,
      createdAt: '2026-07-15T23:00:00.000Z',
      observation: null
    };
    const createReviewerHandoff = vi.fn(async () => ({
      url: 'https://preflight.test/reviewer/connect?code=one-time-code',
      expiresAt: '2026-07-15T23:05:00.000Z'
    }));
    const reviewerApi: PreflightApi = {
      ...api,
      getIdentity: async () => ({
        id: 'local-webflow-reviewer',
        siteId: 'local-review-site',
        companionRole: 'reviewer'
      }),
      listReviews: async () => [{
        id: review.id,
        name: review.name,
        updatedAt: review.updatedAt,
        latestSequence: 1,
        readiness: 'changes_required',
        appName: 'Consent Pro by Finsweet',
        coverage: review.latestVersion.result.coverage
      }],
      getReview: async () => review,
      listRuntimeTestPackages: async () => [testPackage],
      createReviewerHandoff
    };

    render(<App api={reviewerApi} />);
    fireEvent.click(await screen.findByRole('button', { name: /Consent Pro preflight/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Create reviewer workspace' }));

    expect(createReviewerHandoff).toHaveBeenCalledWith(
      review.id,
      review.latestVersion.id,
      testPackage.id
    );
    const link = await screen.findByRole('link', { name: 'Open reviewer workspace' });
    expect(link).toHaveAttribute('href', 'https://preflight.test/reviewer/connect?code=one-time-code');
    expect(link).toHaveAttribute('target', '_blank');
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
    fireEvent.click(screen.getByRole('button', { name: 'Upload revision' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The bundle could not be read.');
    expect(screen.getByText('Upload revision')).toBeVisible();

    fireEvent.change(revisionInput, {
      target: { files: [new File(['fixed'], 'consent-pro-v2.zip', { type: 'application/zip' })] }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Upload revision' }));

    await waitFor(() => expect(addRevision).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Resolved')).toBeVisible();
    expect(screen.getByText('Remaining')).toBeVisible();
    expect(screen.getByText('New')).toBeVisible();
    expect(screen.getByText('Revision 2')).toBeVisible();
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
      .mockResolvedValue([completed]);
    const createRuntimeTestPackage = vi.fn(async () => prepared);
    const requestRuntimeObservationRun = vi
      .fn<PreflightApi['requestRuntimeObservationRun']>()
      .mockRejectedValueOnce(
        new Error('The runtime runner could not start inside the secure sandbox.')
      )
      .mockResolvedValue(prepared.observation);
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
      createRuntimeTestPackage,
      requestRuntimeObservationRun
    };
    render(<App api={runtimeApi} />);

    fireEvent.click(await screen.findByRole('button', { name: /Consent Pro preflight/i }));
    const runtimeHeading = await screen.findByRole('heading', {
      name: 'Webflow runtime observation'
    });
    expect(runtimeHeading).toBeVisible();
    const runtimeCard = runtimeHeading.closest('section')!;
    runtimeCard.scrollIntoView = vi.fn();
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
    expect(screen.getByText('Ready to run')).toBeVisible();
    expect(screen.getByText(/cannot become Webflow-observed evidence/i)).toBeVisible();
    expect(createRuntimeTestPackage).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Run test now' }));
    await waitFor(() => expect(requestRuntimeObservationRun).toHaveBeenCalledWith(prepared.id));
    const runtimeError = await screen.findByRole('alert');
    expect(runtimeCard).toContainElement(runtimeError);
    expect(runtimeError).toHaveTextContent(
      'The runtime runner could not start inside the secure sandbox.'
    );
    expect(runtimeCard).toHaveFocus();
    expect(runtimeCard.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center'
    });

    fireEvent.click(screen.getByRole('button', { name: 'Run test now' }));
    await waitFor(() => expect(requestRuntimeObservationRun).toHaveBeenCalledTimes(2));
    expect(await screen.findByLabelText('Current evidence: Webflow observed')).toBeVisible();
    expect(screen.getByText('Production runtime observed')).toBeVisible();
    expect(screen.queryByText('Production runtime not yet verified')).not.toBeInTheDocument();
    expect(screen.getByText(/Security blockers remain in the result below/i)).toBeVisible();
    expect(screen.getByText('Runtime security blocked')).toBeVisible();
    expect(screen.getByText('Proxy canary blocked')).toBeVisible();
    expect(screen.getByText('What the evidence labels mean')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Run test again' }));
    await waitFor(() => {
      expect(requestRuntimeObservationRun).toHaveBeenCalledTimes(3);
      expect(requestRuntimeObservationRun).toHaveBeenLastCalledWith(prepared.id);
    });
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

  test('prefills a new revision from the previous package without inheriting its evidence', async () => {
    const review = consentProReview(2);
    const previousPackage = {
      schemaVersion: 'runtime_test_package.v1' as const,
      id: 'runtime-package-version-1',
      reviewId: review.id,
      reviewVersionId: 'version-1',
      bundleSha256: 'previous-bundle-sha',
      status: 'expired' as const,
      trust: 'partner_supplied' as const,
      target: {
        url: 'https://consent-pro-test.webflow.io/',
        host: 'consent-pro-test.webflow.io'
      },
      sandboxInstallationId: 'consent-pro-test-site',
      license: {
        mode: 'installation_allowlist' as const,
        expiresAt: '2026-07-15T18:00:00.000Z'
      },
      runtimeArtifacts: [{
        url: 'https://api.consentpro.com/v2/cdn/runtime/immutable.js',
        sha256: 'd'.repeat(64),
        integrity: 'sha256-3d3d3d3d'
      }],
      negativeProxyProbe: {
        method: 'GET' as const,
        urlTemplate: 'https://api.consentpro.com/v2/proxy?url={canaryUrl}'
      },
      lifecycle: { readySelector: '[data-consent-pro-ready]' },
      evidence: null,
      createdAt: '2026-07-15T17:00:00.000Z',
      observation: {
        id: 'observation-version-1',
        status: 'complete' as const,
        trust: 'webflow_observed' as const,
        approvedAt: '2026-07-15T17:05:00.000Z',
        expiresAt: '2026-07-15T17:20:00.000Z',
        completedAt: '2026-07-15T17:10:00.000Z',
        evidence: {
          securityStatus: 'passed' as const,
          securityPredicates: {
            publishedTarget: true,
            runtimeReadyObserved: true,
            runtimeLoadedByPage: true,
            runtimeHashMatched: true,
            runtimeIntegrityMatched: true,
            noRuntimeCreatedScripts: true,
            noUnreviewedRuntimeScripts: true,
            negativeProxyBlocked: true
          },
          blockers: [],
          cleanupStatus: 'not_tested' as const,
          cleanupResidue: [],
          negativeProxyOutcome: 'blocked' as const,
          artifactCount: 8,
          artifacts: []
        }
      }
    };
    const runtimeApi: PreflightApi = {
      ...api,
      listReviews: async () => [{
        id: review.id,
        name: review.name,
        updatedAt: review.updatedAt,
        latestSequence: 2,
        readiness: 'changes_required',
        appName: 'Consent Pro by Finsweet',
        coverage: review.latestVersion.result.coverage
      }],
      getReview: async () => review,
      listRuntimeTestPackages: async () => [previousPackage]
    };

    render(<App api={runtimeApi} />);
    fireEvent.click(await screen.findByRole('button', { name: /Consent Pro preflight/i }));

    expect(await screen.findByText('Previous setup loaded')).toBeVisible();
    expect(screen.getByLabelText('Published Webflow test URL')).toHaveValue(
      'https://consent-pro-test.webflow.io/'
    );
    expect(screen.getByLabelText('Webflow installation or site ID')).toHaveValue(
      'consent-pro-test-site'
    );
    expect(screen.getByLabelText('Immutable runtime URL')).toHaveValue(
      'https://api.consentpro.com/v2/cdn/runtime/immutable.js'
    );
    expect(screen.getByLabelText('SHA-256')).toHaveValue('d'.repeat(64));
    expect(screen.getByLabelText('Script integrity (SRI)')).toHaveValue('sha256-3d3d3d3d');
    expect(screen.getByLabelText('Ready selector')).toHaveValue('[data-consent-pro-ready]');
    expect(screen.getByLabelText('Proxy probe URL template')).toHaveValue(
      'https://api.consentpro.com/v2/proxy?url={canaryUrl}'
    );
    expect(screen.getByLabelText('Current evidence: Not prepared')).toBeVisible();
    expect(screen.getByText('Production runtime not yet verified')).toBeVisible();
    expect(screen.queryByText('Production runtime observed')).not.toBeInTheDocument();
  });

  test('keeps production validation inside the Designer app without a browser companion', async () => {
    const review = consentProReview();
    const runtimeApi = {
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
      }]
    } as PreflightApi;

    render(<App api={runtimeApi} />);
    fireEvent.click(await screen.findByRole('button', { name: /Consent Pro preflight/i }));

    expect(await screen.findByRole('heading', { name: 'Consent Pro by Finsweet' })).toBeVisible();
    expect(screen.queryByText('Browser companion')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Connect browser companion' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve sandbox test' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run test now' })).toBeVisible();
    expect(screen.getByText('Ready to run')).toBeVisible();
  });
});
