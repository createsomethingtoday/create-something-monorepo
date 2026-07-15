import { useEffect, useId, useState } from 'react';
import type { ReviewGuidance } from '@create-something/webflow-app-review-preflight';
import type {
  CompanionPairing,
  PreflightIdentity,
  PreflightApi,
  ReviewComparison,
  ReviewSummary,
  RuntimeJob,
  RuntimeTestPackageInput,
  RuntimeTestPackageView,
  StoredReview
} from './types';
import { PREFLIGHT_COMPANION_EXTENSION_ID } from './config';

interface ExternalChromeRuntime {
  lastError?: { message?: string };
  sendMessage(
    extensionId: string,
    message: unknown,
    callback: (response: { ok?: boolean; error?: string } | undefined) => void
  ): void;
}

export async function deliverCompanionPairing(pairing: CompanionPairing): Promise<void> {
  const runtime = (globalThis as typeof globalThis & {
    chrome?: { runtime?: ExternalChromeRuntime };
  }).chrome?.runtime;
  if (!runtime?.sendMessage) {
    throw new Error('Install the App Review Companion browser extension, then try again.');
  }
  await new Promise<void>((resolve, reject) => {
    runtime.sendMessage(
      PREFLIGHT_COMPANION_EXTENSION_ID,
      { type: 'COMPANION_PAIR', code: pairing.code },
      (response) => {
        if (runtime.lastError) {
          reject(new Error(runtime.lastError.message ?? 'The browser companion is unavailable.'));
          return;
        }
        if (!response?.ok) {
          reject(new Error(response?.error ?? 'The browser companion could not connect.'));
          return;
        }
        resolve();
      }
    );
  });
}

const SELECTED_REVIEW_KEY = 'app-review-preflight.selected-review';

function rememberedReviewId(): string | null {
  try {
    return localStorage.getItem(SELECTED_REVIEW_KEY);
  } catch {
    return null;
  }
}

function rememberReview(id: string | null): void {
  try {
    if (id) localStorage.setItem(SELECTED_REVIEW_KEY, id);
    else localStorage.removeItem(SELECTED_REVIEW_KEY);
  } catch {
    // Durable review history still lives in D1 when iframe storage is unavailable.
  }
}

function statusLabel(item: ReviewGuidance): string {
  if (item.label === 'Security blocker') return 'Blocker';
  if (item.label === 'Required update') return 'Required';
  return 'Suggested';
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

function UploadCard({
  busy,
  onFile
}: {
  busy: boolean;
  onFile: (file: File) => void;
}) {
  const id = useId();
  return (
    <section className="upload-card" aria-labelledby={`${id}-title`}>
      <div className="upload-icon" aria-hidden="true">↑</div>
      <h2 id={`${id}-title`}>Upload your app bundle</h2>
      <p>
        Start with the exact zip you plan to submit. We will map what is included,
        what still needs verification, and your next move.
      </p>
      <label className="button button-primary" htmlFor={id}>
        {busy ? 'Running preflight…' : 'Choose bundle'}
      </label>
      <input
        id={id}
        className="visually-hidden"
        type="file"
        accept=".zip,application/zip"
        disabled={busy}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) onFile(file);
          event.currentTarget.value = '';
        }}
      />
      <span className="upload-note">Zip bundles up to 10 MB · saved automatically</span>
    </section>
  );
}

function History({
  items,
  busy,
  onSelect
}: {
  items: ReviewSummary[];
  busy: boolean;
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section className="history" aria-labelledby="history-title">
      <div className="section-heading">
        <h2 id="history-title">Your review runs</h2>
        <span>{items.length}</span>
      </div>
      <div className="history-list">
        {items.map((item) => (
          <button
            className="history-row"
            key={item.id}
            disabled={busy}
            onClick={() => onSelect(item.id)}
          >
            <span>
              <strong>{item.name}</strong>
              <small>Revision {item.latestSequence} · {formatDate(item.updatedAt)}</small>
            </span>
            <span className={`readiness-dot ${item.readiness}`} aria-label={item.readiness} />
          </button>
        ))}
      </div>
    </section>
  );
}

function Coverage({ review }: { review: StoredReview }) {
  return (
    <section className="coverage-grid" aria-label="Review coverage">
      {review.latestVersion.result.coverage.map((item) => (
        <article className={`coverage-card ${item.status}`} key={item.surface}>
          <div className="coverage-mark" aria-hidden="true">
            {item.status === 'reviewed' ? '✓' : '!'}
          </div>
          <div>
            <h3>{item.label}</h3>
            <p>{item.detail}</p>
          </div>
        </article>
      ))}
    </section>
  );
}

function GuidanceCard({ item }: { item: ReviewGuidance }) {
  return (
    <details className={`finding-card ${item.label.toLowerCase().replaceAll(' ', '-')}`}>
      <summary>
        <span className="finding-state">{statusLabel(item)}</span>
        <span className="finding-title">
          <strong>{item.title}</strong>
          <small>{item.evidence.length} evidence location{item.evidence.length === 1 ? '' : 's'}</small>
        </span>
        <span className="chevron" aria-hidden="true">⌄</span>
      </summary>
      <div className="finding-body">
        <p>{item.explanation}</p>
        <div className="next-move">
          <span>Next move</span>
          <p>{item.nextMove}</p>
        </div>
        {item.evidence.map((evidence, index) => (
          <div className="evidence" key={`${evidence.filePath}:${evidence.line}:${index}`}>
            <code>{evidence.filePath}:{evidence.line}</code>
            <pre>{evidence.snippet}</pre>
          </div>
        ))}
      </div>
    </details>
  );
}

function Comparison({ comparison }: { comparison: ReviewComparison }) {
  return (
    <section className="comparison" aria-label="Revision progress">
      <div><strong>{comparison.resolved.length}</strong><span>Resolved</span></div>
      <div><strong>{comparison.remaining.length}</strong><span>Remaining</span></div>
      <div><strong>{comparison.added.length}</strong><span>New</span></div>
    </section>
  );
}

function RuntimeObservationCard({
  review,
  testPackages,
  busy,
  onPrepare,
  onRefresh
}: {
  review: StoredReview;
  testPackages: RuntimeTestPackageView[];
  busy: boolean;
  onPrepare: (input: RuntimeTestPackageInput) => void;
  onRefresh: () => void;
}) {
  const latest = testPackages[0] ?? null;
  const dialogTitle = useId();
  const [confirm, setConfirm] = useState(false);
  const [targetUrl, setTargetUrl] = useState('');
  const [sandboxInstallationId, setSandboxInstallationId] = useState('');
  const [artifactUrl, setArtifactUrl] = useState(
    review.latestVersion.result.runtime.references.find((value) => !value.includes('{')) ?? ''
  );
  const [artifactSha256, setArtifactSha256] = useState('');
  const [integrity, setIntegrity] = useState('');
  const [readySelector, setReadySelector] = useState('[data-runtime-ready]');
  const [cleanupSelector, setCleanupSelector] = useState('[data-runtime-uninstall]');
  const [proxyTemplate, setProxyTemplate] = useState('');
  const [showNewPackage, setShowNewPackage] = useState(false);
  const trustLabel = latest?.observation?.trust === 'webflow_observed'
    ? 'Webflow observed'
    : latest
      ? 'Partner supplied'
      : 'Not prepared';

  useEffect(() => {
    setShowNewPackage(false);
  }, [latest?.id]);

  const submit = () => {
    onPrepare({
      targetUrl,
      sandboxInstallationId,
      sandboxOwnershipConfirmed: true,
      license: {
        mode: 'installation_allowlist',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      },
      runtimeArtifacts: [
        { url: artifactUrl, sha256: artifactSha256, integrity }
      ],
      negativeProxyProbe: {
        method: 'GET',
        urlTemplate: proxyTemplate
      },
      lifecycle: {
        readySelector,
        cleanupTrigger: { type: 'click', selector: cleanupSelector }
      }
    });
  };

  return (
    <section className="runtime-card observation-card" aria-labelledby="observation-title">
      <div className="runtime-heading">
        <div>
          <span className="eyebrow">Complete behavior test</span>
          <h2 id="observation-title">Webflow runtime observation</h2>
        </div>
        <span
          className={`manual-pill ${latest?.observation?.trust ? 'approved' : ''}`}
          aria-label={`Current evidence: ${trustLabel}`}
        >
          {trustLabel}
        </span>
      </div>
      <p>
        Make a dedicated Webflow test installation available. Webflow runs the browser
        in E2B and captures the evidence automatically; output from your computer is not
        used as review evidence.
      </p>

      {latest && !showNewPackage ? (
        <div className="observation-status" role="status">
          <div className="checkpoint-row">
            <span className="checkpoint-number">1</span>
            <div>
              <strong>Test package ready</strong>
              <p>{latest.target.url}</p>
              <small>Bound to bundle {latest.bundleSha256.slice(0, 12)}…</small>
            </div>
          </div>
          {latest.observation?.trust === 'webflow_observed' && latest.observation.evidence ? (
            <>
              <div className="checkpoint-row complete">
                <span className="checkpoint-number">2</span>
                <div>
                  <strong>Evidence captured by Webflow</strong>
                  <p>{latest.observation.evidence.artifactCount} immutable artifacts</p>
                </div>
              </div>
              <div className="observation-results">
                <div className={latest.observation.evidence.cleanupStatus === 'clean' ? 'pass' : 'fail'}>
                  <strong>
                    {latest.observation.evidence.cleanupStatus === 'clean'
                      ? 'Cleanup passed'
                      : 'Cleanup residue found'}
                  </strong>
                  <span>
                    {latest.observation.evidence.cleanupStatus === 'clean'
                      ? 'No tracked runtime state remained.'
                      : `${latest.observation.evidence.cleanupResidue.length} tracked item${latest.observation.evidence.cleanupResidue.length === 1 ? '' : 's'} remained.`}
                  </span>
                </div>
                <div className={latest.observation.evidence.negativeProxyOutcome === 'blocked' ? 'pass' : 'fail'}>
                  <strong>
                    {latest.observation.evidence.negativeProxyOutcome === 'blocked'
                      ? 'Proxy canary blocked'
                      : latest.observation.evidence.negativeProxyOutcome === 'exposed'
                        ? 'Proxy canary exposed'
                        : 'Proxy canary inconclusive'}
                  </strong>
                  <span>This is observed evidence, not an approval decision.</span>
                </div>
              </div>
              <details className="artifact-details">
                <summary>Evidence artifact details</summary>
                <ul>
                  {latest.observation.evidence.artifacts.map((artifact) => (
                    <li key={`${artifact.kind}:${artifact.sha256}`}>
                      <span>{artifact.kind.replaceAll('_', ' ')}</span>
                      <code>{artifact.sha256.slice(0, 12)}… · {artifact.bytes} bytes</code>
                    </li>
                  ))}
                </ul>
              </details>
            </>
          ) : latest.observation ? (
            <div className="checkpoint-row active">
              <span className="checkpoint-number">2</span>
              <div>
                <strong>Webflow test {latest.observation.status}</strong>
                <p>E2B owns the browser and will return sanitized evidence.</p>
              </div>
            </div>
          ) : (
            <div className="checkpoint-row pending">
              <span className="checkpoint-number">2</span>
              <div>
                <strong>Ready for Webflow run</strong>
                <p>Keep the named installation allowlisted while the review team runs it.</p>
              </div>
            </div>
          )}
          <button className="button button-secondary" disabled={busy} onClick={onRefresh}>
            Check run status
          </button>
          <button
            className="button button-tertiary"
            disabled={busy}
            onClick={() => setShowNewPackage(true)}
          >
            Prepare another test package
          </button>
          <small>Partner-supplied settings cannot become Webflow-observed evidence by themselves.</small>
        </div>
      ) : (
        <form
          className="observation-form"
          onSubmit={(event) => {
            event.preventDefault();
            setConfirm(true);
          }}
        >
          <fieldset>
            <legend><span>1</span> Dedicated test installation</legend>
            <label>
              Published Webflow test URL
              <input required type="url" value={targetUrl} onChange={(event) => setTargetUrl(event.target.value)} placeholder="https://app-review-sandbox.webflow.io" />
            </label>
            <label>
              Webflow installation or site ID
              <input required value={sandboxInstallationId} onChange={(event) => setSandboxInstallationId(event.target.value)} placeholder="webflow-sandbox-site-123" />
            </label>
          </fieldset>
          <fieldset>
            <legend><span>2</span> Pin the reviewed runtime</legend>
            <label>
              Immutable runtime URL
              <input required type="url" value={artifactUrl} onChange={(event) => setArtifactUrl(event.target.value)} />
            </label>
            <label>
              SHA-256
              <input required pattern="[a-f0-9]{64}" value={artifactSha256} onChange={(event) => setArtifactSha256(event.target.value)} placeholder="64 lowercase hex characters" />
            </label>
            <label>
              Script integrity (SRI)
              <input required value={integrity} onChange={(event) => setIntegrity(event.target.value)} placeholder="sha256-…" />
            </label>
          </fieldset>
          <details className="advanced-settings">
            <summary>Lifecycle selectors and proxy check</summary>
            <label>
              Ready selector
              <input required value={readySelector} onChange={(event) => setReadySelector(event.target.value)} />
            </label>
            <label>
              Uninstall selector
              <input required value={cleanupSelector} onChange={(event) => setCleanupSelector(event.target.value)} />
            </label>
            <label>
              Proxy probe URL template
              <input required value={proxyTemplate} onChange={(event) => setProxyTemplate(event.target.value)} placeholder="https://api.example.com/proxy?url={canaryUrl}" />
            </label>
          </details>
          <button className="button button-primary" disabled={busy} type="submit">
            Prepare Webflow run
          </button>
          <small>No customer sites, account passwords, session exports, or license secrets.</small>
        </form>
      )}

      <details className="trust-details">
        <summary>What the evidence labels mean</summary>
        <dl>
          <div><dt>Partner supplied</dt><dd>Test settings only. Not review evidence.</dd></div>
          <div><dt>Webflow observed</dt><dd>Captured automatically in a Webflow-controlled browser.</dd></div>
          <div><dt>Human verified</dt><dd>A reviewer separately confirmed the evidence and conclusion.</dd></div>
        </dl>
      </details>

      {confirm ? (
        <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby={dialogTitle}>
          <div className="dialog-card">
            <span className="eyebrow">Partner checkpoint</span>
            <h2 id={dialogTitle}>Confirm dedicated test access</h2>
            <p>
              Confirm this is a Webflow-controlled test installation with no customer data,
              and that its license is allowlisted for the next hour. Webflow—not this browser—will run the test.
            </p>
            <ul>
              <li>Runtime bytes are pinned to this bundle version</li>
              <li>Evidence is captured in a fresh Webflow browser</li>
              <li>The result cannot approve or reject the app</li>
            </ul>
            <div className="dialog-actions">
              <button className="button button-secondary" onClick={() => setConfirm(false)}>Cancel</button>
              <button
                className="button button-primary"
                onClick={() => {
                  setConfirm(false);
                  submit();
                }}
              >
                Confirm test package
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ReviewDetail({
  review,
  comparison,
  runtimeJob,
  runtimeTestPackages,
  busy,
  onRevision,
  onApproveRuntime,
  onPrepareRuntimePackage,
  onRefreshRuntimePackages,
  onPairCompanion,
  onBack
}: {
  review: StoredReview;
  comparison: ReviewComparison | null;
  runtimeJob: RuntimeJob | null;
  runtimeTestPackages: RuntimeTestPackageView[];
  busy: boolean;
  onRevision: (file: File) => void;
  onApproveRuntime: () => void;
  onPrepareRuntimePackage: (input: RuntimeTestPackageInput) => void;
  onRefreshRuntimePackages: () => void;
  onPairCompanion: () => Promise<void>;
  onBack: () => void;
}) {
  const result = review.latestVersion.result;
  const revisionId = useId();
  const runtimeDialogTitle = useId();
  const [confirmRuntime, setConfirmRuntime] = useState(false);
  const [companionStatus, setCompanionStatus] = useState<
    'idle' | 'connecting' | 'connected' | 'error'
  >('idle');
  const blockerText = result.summary.securityBlockers === 1 ? 'blocker' : 'blockers';

  return (
    <main className="review-view">
      <button className="back-button" onClick={onBack}>← All runs</button>
      <header className="review-header">
        <div className="eyebrow">Revision {review.latestVersion.sequence}</div>
        <h2>{result.artifactScope.appName ?? review.name}</h2>
        <p>
          {result.summary.securityBlockers > 0
            ? `${result.summary.securityBlockers} ${blockerText} before you are ready`
            : 'No deterministic security blockers found'}
        </p>
        <div className="saved-state"><span>✓</span> Checkpoint saved</div>
      </header>

      {comparison ? <Comparison comparison={comparison} /> : null}
      <Coverage review={review} />

      <section className="summary-grid" aria-label="Finding summary">
        <div><strong>{result.summary.securityBlockers}</strong><span>Security blockers</span></div>
        <div><strong>{result.summary.requiredUpdates}</strong><span>Required updates</span></div>
        <div><strong>{result.summary.suggestedUpdates}</strong><span>Suggested updates</span></div>
      </section>

      <section className="runtime-card companion-card" aria-labelledby="companion-title">
        <div className="runtime-heading">
          <div>
            <span className="eyebrow">Guided validation</span>
            <h2 id="companion-title">Browser companion</h2>
          </div>
          <span className={`manual-pill ${companionStatus === 'connected' ? 'approved' : ''}`}>
            {companionStatus === 'connected' ? 'Connected' : 'Not connected'}
          </span>
        </div>
        <p>
          Connect this exact revision, then complete four runtime-focused missions in Designer
          and on the published site. External authorization is a setup prerequisite, not a scored check.
        </p>
        <button
          className="button button-primary"
          disabled={busy || companionStatus === 'connecting' || companionStatus === 'connected'}
          onClick={async () => {
            setCompanionStatus('connecting');
            try {
              await onPairCompanion();
              setCompanionStatus('connected');
            } catch {
              setCompanionStatus('error');
            }
          }}
        >
          {companionStatus === 'connecting'
            ? 'Connecting…'
            : companionStatus === 'connected'
              ? 'Browser companion connected'
              : 'Connect browser companion'}
        </button>
        {companionStatus === 'error' ? (
          <small role="alert">Install or reopen the browser companion, then try again.</small>
        ) : (
          <small>The one-time connection expires in five minutes and cannot be reused.</small>
        )}
      </section>

      <section className="findings" aria-labelledby="findings-title">
        <div className="section-heading">
          <h2 id="findings-title">Review feedback</h2>
          <span>{result.guidance.length}</span>
        </div>
        {result.guidance.length > 0 ? (
          result.guidance.map((item) => <GuidanceCard item={item} key={item.id} />)
        ) : (
          <div className="success-card">
            <strong>Ready for teammate review</strong>
            <p>The bundle scan has no remaining deterministic findings.</p>
          </div>
        )}
      </section>

      <section className="runtime-card" aria-labelledby="runtime-title">
        <div className="runtime-heading">
          <div>
            <span className="eyebrow">Production runtime</span>
            <h2 id="runtime-title">Sandbox verification</h2>
          </div>
          <span className={`manual-pill ${runtimeJob ? 'approved' : ''}`}>
            {runtimeJob
              ? 'Job approved'
              : result.runtime.references.length > 0
                ? 'Approval required'
                : 'Manual check'}
          </span>
        </div>
        {result.runtime.references.length > 0 ? (
          <p>
            We found {result.runtime.references.length} runtime reference{result.runtime.references.length === 1 ? '' : 's'}.
            Code will not run until you approve the bounded test.
          </p>
        ) : (
          <p>
            No public runtime target was discovered in this revision. Production behavior still needs a human check.
          </p>
        )}
        {result.runtime.references.length > 0 ? (
          <ul className="runtime-list">
            {result.runtime.references.map((reference) => (
              <li key={reference}>
                <span>{reference}</span>
                <em>{reference.includes('{') ? 'Test ID needed' : 'Public target'}</em>
              </li>
            ))}
          </ul>
        ) : null}
        {runtimeJob ? (
          <div className="runtime-approved" role="status">
            <strong>Sandbox job approved</strong>
            <p>
              Allowed host{runtimeJob.contract.controls.allowedHosts.length === 1 ? '' : 's'}:{' '}
              {runtimeJob.contract.controls.allowedHosts.join(', ') || 'none'}
            </p>
            <small>This evidence helps a reviewer. It does not approve or reject your app.</small>
            {runtimeJob.contract.manualVerification.length > 0 ? (
              <div className="manual-gaps">
                <span>Still needs a human</span>
                <ul>
                  {runtimeJob.contract.manualVerification.map((gap) => <li key={gap}>{gap}</li>)}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <button
              className="button button-secondary"
              disabled={busy || result.runtime.references.length === 0}
              onClick={() => setConfirmRuntime(true)}
            >
              Approve sandbox test
            </button>
            <small>
              {result.runtime.references.length > 0
                ? 'Nothing runs until you review and approve the bounded job.'
                : 'Provide a concrete public runtime URL or a disposable test installation to automate this step.'}
            </small>
          </>
        )}
        {confirmRuntime ? (
          <div
            className="dialog-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby={runtimeDialogTitle}
          >
            <div className="dialog-card">
              <span className="eyebrow">One approval</span>
              <h2 id={runtimeDialogTitle}>Confirm sandbox evidence test</h2>
              <p>
                The sandbox may request only the discovered public runtime hosts. No credentials are sent,
                and the job cannot write to App Governance or make a review decision.
              </p>
              <ul>
                <li>At most 20 requests</li>
                <li>60-second total timeout</li>
                <li>Desktop and mobile evidence</li>
              </ul>
              <div className="dialog-actions">
                <button
                  className="button button-secondary"
                  onClick={() => setConfirmRuntime(false)}
                >
                  Cancel
                </button>
                <button
                  className="button button-primary"
                  onClick={() => {
                    setConfirmRuntime(false);
                    onApproveRuntime();
                  }}
                >
                  Approve bounded test
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <RuntimeObservationCard
        review={review}
        testPackages={runtimeTestPackages}
        busy={busy}
        onPrepare={onPrepareRuntimePackage}
        onRefresh={onRefreshRuntimePackages}
      />

      <section className="revision-card">
        <div>
          <span className="eyebrow">Next move</span>
          <h2>Upload a revised bundle</h2>
          <p>We will compare it with this checkpoint and show exactly what changed.</p>
        </div>
        <label className="button button-primary" htmlFor={revisionId}>
          {busy ? 'Comparing…' : 'Upload revision'}
        </label>
        <input
          id={revisionId}
          className="visually-hidden"
          type="file"
          accept=".zip,application/zip"
          disabled={busy}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) onRevision(file);
            event.currentTarget.value = '';
          }}
        />
      </section>
    </main>
  );
}

export function App({
  api,
  pairCompanion = deliverCompanionPairing
}: {
  api: PreflightApi;
  pairCompanion?: (pairing: CompanionPairing) => Promise<void>;
}) {
  const [history, setHistory] = useState<ReviewSummary[]>([]);
  const [review, setReview] = useState<StoredReview | null>(null);
  const [comparison, setComparison] = useState<ReviewComparison | null>(null);
  const [runtimeJob, setRuntimeJob] = useState<RuntimeJob | null>(null);
  const [runtimeTestPackages, setRuntimeTestPackages] = useState<RuntimeTestPackageView[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identity, setIdentity] = useState<PreflightIdentity | null>(null);

  const refreshHistory = async () => {
    const items = await api.listReviews();
    setHistory(items);
    return items;
  };

  const refreshRuntimePackages = async (reviewId: string) => {
    const items = await api.listRuntimeTestPackages(reviewId);
    setRuntimeTestPackages(items);
    return items;
  };

  useEffect(() => {
    (async () => {
      const items = await refreshHistory();
      const selectedId = rememberedReviewId();
      if (!selectedId) return;
      if (!items.some((item) => item.id === selectedId)) {
        rememberReview(null);
        return;
      }
      try {
        const [selectedReview] = await Promise.all([
          api.getReview(selectedId),
          refreshRuntimePackages(selectedId)
        ]);
        setReview(selectedReview);
      } catch {
        rememberReview(null);
      }
    })().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'Saved runs are unavailable.');
    });
  }, []);

  useEffect(() => {
    api.getIdentity().then(setIdentity).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'Webflow identity is unavailable.');
    });
  }, []);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That step could not be completed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-shell">
      {error ? <div className="error-banner" role="alert">{error}</div> : null}

      {review ? (
        <ReviewDetail
          review={review}
          comparison={comparison}
          runtimeJob={runtimeJob}
          runtimeTestPackages={runtimeTestPackages}
          busy={busy}
          onBack={() => {
            setReview(null);
            setComparison(null);
            setRuntimeJob(null);
            setRuntimeTestPackages([]);
            rememberReview(null);
          }}
          onRevision={(file) => run(async () => {
            const revised = await api.addRevision(review.id, file);
            setReview(revised.review);
            setComparison(revised.comparison);
            setRuntimeJob(null);
            setRuntimeTestPackages([]);
            await refreshHistory();
          })}
          onApproveRuntime={() => run(async () => {
            setRuntimeJob(await api.approveRuntimeJob(review.id));
          })}
          onPrepareRuntimePackage={(input) => run(async () => {
            const prepared = await api.createRuntimeTestPackage(review.id, input);
            setRuntimeTestPackages([prepared]);
          })}
          onRefreshRuntimePackages={() => run(async () => {
            await refreshRuntimePackages(review.id);
          })}
          onPairCompanion={async () => {
            const pairing = await api.createCompanionPairing(
              review.id,
              review.latestVersion.id
            );
            await pairCompanion(pairing);
          }}
        />
      ) : (
        <main className="start-view">
          <div className="intro">
            <div className="intro-meta">
              <span className="eyebrow">Review run</span>
              {identity ? (
                <div className="identity-state">
                  <strong>{identity.companionRole === 'reviewer' ? 'Reviewer identity' : 'Developer identity'}</strong>
                  <code>{identity.id}</code>
                </div>
              ) : null}
            </div>
            <h2>Make the next review easier.</h2>
            <p>See what is blocking, what is recommended, and which parts still need a human check.</p>
          </div>
          <UploadCard
            busy={busy}
            onFile={(file) => run(async () => {
              const created = await api.createReview(file);
              setReview(created);
              setComparison(null);
              setRuntimeJob(null);
              setRuntimeTestPackages([]);
              rememberReview(created.id);
              await refreshHistory();
            })}
          />
          <History
            items={history}
            busy={busy}
            onSelect={(id) => run(async () => {
              const [selectedReview] = await Promise.all([
                api.getReview(id),
                refreshRuntimePackages(id)
              ]);
              setReview(selectedReview);
              setComparison(null);
              setRuntimeJob(null);
              rememberReview(id);
            })}
          />
          <p className="privacy-note">
            Bundles are private review evidence. Cross-app learning is anonymized and requires human approval.
          </p>
        </main>
      )}
    </div>
  );
}
