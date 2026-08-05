import { useEffect, useId, useRef, useState } from 'react';
import type { ReviewGuidance } from '@create-something/webflow-app-review-preflight';
import type {
  PreflightIdentity,
  PreflightApi,
  CreateRuntimeReviewInput,
  ReviewComparison,
  ReviewSummary,
  RuntimeTestPackageInput,
  RuntimeTestPackageView,
  ReviewerHandoff,
  StoredReview
} from './types';

const SELECTED_REVIEW_KEY = 'app-review-preflight.selected-review';
type StartPath = 'choose' | 'bundle' | 'runtime';

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
  onSubmit
}: {
  busy: boolean;
  onSubmit: (bundle: File, sourceMaps?: File) => void;
}) {
  const bundleId = useId();
  const sourceMapsId = useId();
  const [bundle, setBundle] = useState<File | null>(null);
  const [sourceMaps, setSourceMaps] = useState<File | null>(null);
  return (
    <section className="upload-card" aria-labelledby={`${bundleId}-title`}>
      <div className="upload-icon" aria-hidden="true">↑</div>
      <h2 id={`${bundleId}-title`}>Upload your app bundle</h2>
      <p>
        Use the same private artifacts you will attach to the official submission form.
        Preflight validates them together and creates a receipt for reconciliation.
      </p>
      <div className="artifact-upload-fields">
        <label className="artifact-upload-field" htmlFor={bundleId}>
          <strong>App bundle</strong>
          <span>{bundle?.name ?? 'Choose bundle'}</span>
        </label>
        <input
          id={bundleId}
          aria-label="App bundle"
          className="visually-hidden"
          type="file"
          accept=".zip,application/zip"
          disabled={busy}
          onChange={(event) => setBundle(event.currentTarget.files?.[0] ?? null)}
        />
        <label className="artifact-upload-field" htmlFor={sourceMapsId}>
          <strong>Source maps for review</strong>
          <span>{sourceMaps?.name ?? 'Choose source maps (.zip or .map)'}</span>
        </label>
        <input
          id={sourceMapsId}
          aria-label="Source maps for review"
          className="visually-hidden"
          type="file"
          accept=".zip,.map,application/zip,application/json"
          disabled={busy}
          onChange={(event) => setSourceMaps(event.currentTarget.files?.[0] ?? null)}
        />
      </div>
      <p className="artifact-helper">
        Upload the same private source-map ZIP (or one .map file) you will submit through
        the official form. Required when the bundle is minified or generated. It is never published.
      </p>
      <button
        className="button button-primary"
        type="button"
        disabled={busy || !bundle}
        onClick={() => bundle && onSubmit(bundle, sourceMaps ?? undefined)}
      >
        {busy ? 'Running preflight…' : 'Run preflight'}
      </button>
      <span className="upload-note">Private artifacts up to 10 MB each · saved automatically</span>
    </section>
  );
}

function StartPathChoice({
  busy,
  onChoose
}: {
  busy: boolean;
  onChoose: (path: Exclude<StartPath, 'choose'>) => void;
}) {
  return (
    <section className="entry-choices" aria-labelledby="entry-choices-title">
      <div className="entry-choices-heading">
        <span className="eyebrow">Start here</span>
        <h2 id="entry-choices-title">What are you reviewing?</h2>
      </div>
      <div className="entry-choice-grid">
        <article className="entry-card">
          <span className="entry-icon" aria-hidden="true">↑</span>
          <h3>App bundle + source maps</h3>
          <p>Review the private submission artifacts and create a reconciliation receipt.</p>
          <button className="button button-secondary" disabled={busy} onClick={() => onChoose('bundle')}>
            Review app bundle
          </button>
        </article>
        <article className="entry-card">
          <span className="entry-icon" aria-hidden="true">↗</span>
          <h3>Hosted runtime / Data Client</h3>
          <p>Test browser-loaded JavaScript from public URLs without first uploading a bundle.</p>
          <button className="button button-secondary" disabled={busy} onClick={() => onChoose('runtime')}>
            Test hosted runtime
          </button>
        </article>
      </div>
    </section>
  );
}

function HostedRuntimeCard({
  busy,
  onBack,
  onSubmit
}: {
  busy: boolean;
  onBack: () => void;
  onSubmit: (input: CreateRuntimeReviewInput) => void;
}) {
  const titleId = useId();
  const [appName, setAppName] = useState('');
  const [runtimeUrls, setRuntimeUrls] = useState('');

  return (
    <section className="runtime-start-card" aria-labelledby={titleId}>
      <button className="back-button" type="button" onClick={onBack}>← Choose another path</button>
      <div className="runtime-start-heading">
        <span className="eyebrow">Hosted runtime / Data Client</span>
        <h2 id={titleId}>Add hosted runtime</h2>
        <p>
          Use this for a Data Client or another app whose JavaScript runs from public URLs.
          You will pin each file before Webflow runs its browser observation.
        </p>
      </div>
      <form
        className="runtime-start-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({
            appName: appName.trim(),
            runtimeUrls: runtimeUrls
              .split(/\r?\n/)
              .map((value) => value.trim())
              .filter(Boolean)
          });
        }}
      >
        <label>
          App name
          <input
            aria-label="App name"
            required
            maxLength={120}
            value={appName}
            onChange={(event) => setAppName(event.target.value)}
            placeholder="Your app name"
          />
        </label>
        <label>
          Hosted runtime URLs
          <textarea
            aria-label="Hosted runtime URLs"
            required
            rows={4}
            value={runtimeUrls}
            onChange={(event) => setRuntimeUrls(event.target.value)}
            placeholder={'https://cdn.example.com/runtime-v1.js\nhttps://cdn.example.com/child-v1.js'}
          />
          <small>Enter one public HTTPS URL per line. Do not include credentials.</small>
        </label>
        <button className="button button-primary" disabled={busy} type="submit">
          {busy ? 'Saving runtime…' : 'Continue to runtime test'}
        </button>
      </form>
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

function Coverage({
  review,
  testPackages
}: {
  review: StoredReview;
  testPackages: RuntimeTestPackageView[];
}) {
  const observed = testPackages.find(
    (testPackage) =>
      testPackage.reviewVersionId === review.latestVersion.id &&
      testPackage.observation?.trust === 'webflow_observed'
  )?.observation?.evidence;
  const coverage = review.latestVersion.result.coverage.map((item) => {
    if (item.surface !== 'production_runtime' || !observed) return item;
    return {
      ...item,
      status: 'reviewed' as const,
      label: 'Production runtime observed',
      detail: observed.securityStatus === 'passed'
        ? 'Webflow captured the published runtime and its pinned security checks passed.'
        : 'Webflow captured the published runtime. Security blockers remain in the result below.'
    };
  });

  return (
    <section className="coverage-grid" aria-label="Review coverage">
      {coverage.map((item) => (
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

function ArtifactReceiptCard({ review }: { review: StoredReview }) {
  const receipt = review.latestVersion.receipt;
  if (!receipt) return null;
  const reconciliationLabel = receipt.reconciliationStatus === 'matched'
    ? 'Canonical submission matched'
    : receipt.reconciliationStatus === 'mismatch'
      ? 'Submission mismatch'
      : 'Not reconciled';

  return (
    <section className="receipt-card" aria-labelledby="receipt-title">
      <div className="runtime-heading">
        <div>
          <span className="eyebrow">Private review evidence</span>
          <h2 id="receipt-title">Artifact receipt</h2>
        </div>
        <span className={`receipt-state ${receipt.reconciliationStatus}`}>
          {reconciliationLabel}
        </span>
      </div>
      <p>
        Include receipt <code>{receipt.id}</code> with the official submission so Webflow can
        confirm that the submitted artifacts match this preflight checkpoint.
      </p>
      <dl className="receipt-details">
        <div><dt>Artifact set</dt><dd>Version {receipt.artifactSetVersion}</dd></div>
        <div><dt>Bundle SHA-256</dt><dd><code>{receipt.bundleSha256}</code></dd></div>
        {receipt.sourceMapArtifactSha256 ? (
          <div><dt>Source maps SHA-256</dt><dd><code>{receipt.sourceMapArtifactSha256}</code></dd></div>
        ) : null}
        <div><dt>Policy</dt><dd>{receipt.policyVersion} · {receipt.scanStatus}</dd></div>
      </dl>
    </section>
  );
}

function RuntimeObservationCard({
  review,
  testPackages,
  busy,
  runtimeError,
  onPrepare,
  onRun,
  onRefresh
}: {
  review: StoredReview;
  testPackages: RuntimeTestPackageView[];
  busy: boolean;
  runtimeError: string | null;
  onPrepare: (input: RuntimeTestPackageInput) => void;
  onRun: (testPackageId: string) => void;
  onRefresh: () => void;
}) {
  const latest = testPackages.find(
    (testPackage) => testPackage.reviewVersionId === review.latestVersion.id
  ) ?? null;
  const previous = testPackages.find(
    (testPackage) => testPackage.reviewVersionId !== review.latestVersion.id
  ) ?? null;
  const discoveredRuntimeArtifacts = review.latestVersion.result.runtime.references
    .filter((value) => !value.includes('{'))
    .map((url) => ({ url, sha256: '', integrity: '' }));
  const emptyRuntimeArtifact = () => ({ url: '', sha256: '', integrity: '' });
  const dialogTitle = useId();
  const [confirm, setConfirm] = useState(false);
  const [targetUrl, setTargetUrl] = useState('');
  const [sandboxInstallationId, setSandboxInstallationId] = useState('');
  const [runtimeArtifacts, setRuntimeArtifacts] = useState<RuntimeTestPackageInput['runtimeArtifacts']>(
    discoveredRuntimeArtifacts.length > 0 ? discoveredRuntimeArtifacts : [emptyRuntimeArtifact()]
  );
  const [readySelector, setReadySelector] = useState('[data-runtime-ready]');
  const [proxyTemplate, setProxyTemplate] = useState('');
  const [showNewPackage, setShowNewPackage] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const trustLabel = latest?.observation?.trust === 'webflow_observed'
    ? 'Webflow observed'
    : latest
      ? 'Partner supplied'
      : 'Not prepared';
  const canRequestRun =
    !latest?.observation ||
    latest.observation.status === 'complete' ||
    latest.observation.status === 'failed' ||
    latest.observation.status === 'expired' ||
    latest.observation.status === 'revoked';

  useEffect(() => {
    setShowNewPackage(false);
  }, [latest?.id]);

  const fillFromPackage = (source: RuntimeTestPackageView | null) => {
    setTargetUrl(source?.target.url ?? '');
    setSandboxInstallationId(source?.sandboxInstallationId ?? '');
    setRuntimeArtifacts(
      source?.runtimeArtifacts.length
        ? source.runtimeArtifacts.map((artifact) => ({ ...artifact }))
        : discoveredRuntimeArtifacts.length > 0
          ? discoveredRuntimeArtifacts
          : [emptyRuntimeArtifact()]
    );
    setReadySelector(source?.lifecycle.readySelector ?? '[data-runtime-ready]');
    setProxyTemplate(source?.negativeProxyProbe.urlTemplate ?? '');
  };

  useEffect(() => {
    if (latest) return;
    fillFromPackage(previous);
  }, [review.latestVersion.id, previous?.id]);

  useEffect(() => {
    if (!runtimeError || !cardRef.current) return;
    cardRef.current.focus();
    cardRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  }, [runtimeError]);

  const submit = () => {
    onPrepare({
      targetUrl,
      sandboxInstallationId,
      sandboxOwnershipConfirmed: true,
      license: {
        mode: 'installation_allowlist',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      runtimeArtifacts,
      negativeProxyProbe: {
        method: 'GET',
        urlTemplate: proxyTemplate
      },
      lifecycle: {
        readySelector
      }
    });
  };

  const updateRuntimeArtifact = (
    index: number,
    field: 'url' | 'sha256' | 'integrity',
    value: string
  ) => {
    setRuntimeArtifacts((current) => current.map((artifact, artifactIndex) =>
      artifactIndex === index ? { ...artifact, [field]: value } : artifact
    ));
  };

  const addRuntimeArtifact = () => {
    setRuntimeArtifacts((current) => current.length < 8
      ? [...current, emptyRuntimeArtifact()]
      : current);
  };

  const removeRuntimeArtifact = (index: number) => {
    setRuntimeArtifacts((current) => current.length > 1
      ? current.filter((_, artifactIndex) => artifactIndex !== index)
      : current);
  };
  const reviewedIdentityLabel = review.latestVersion.result.reviewType === 'runtime_manifest'
    ? 'runtime manifest'
    : 'bundle';

  return (
    <section
      ref={cardRef}
      className="runtime-card observation-card"
      aria-labelledby="observation-title"
      tabIndex={-1}
    >
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
      {runtimeError ? <div className="error-banner" role="alert">{runtimeError}</div> : null}

      {latest && !showNewPackage ? (
        <div className="observation-status" role="status">
          <div className="checkpoint-row">
            <span className="checkpoint-number">1</span>
            <div>
              <strong>Test package ready</strong>
              <p>{latest.target.url}</p>
              <small>Bound to {reviewedIdentityLabel} {latest.bundleSha256.slice(0, 12)}…</small>
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
                <div className={latest.observation.evidence.securityStatus === 'passed' ? 'pass' : 'fail'}>
                  <strong>
                    {latest.observation.evidence.securityStatus === 'passed'
                      ? 'Runtime security passed'
                      : 'Runtime security blocked'}
                  </strong>
                  <span>
                    {latest.observation.evidence.securityStatus === 'passed'
                      ? 'Published code matched its reviewed hash and SRI requirements.'
                      : latest.observation.evidence.blockers.join(' ')}
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
              <div>
                <strong>Ready to run</strong>
                <p>Start a fresh Webflow-controlled browser test when this installation is ready.</p>
              </div>
            </div>
          )}
          {canRequestRun ? (
            <button
              className="button button-primary"
              disabled={busy}
              onClick={() => onRun(latest.id)}
            >
              {busy
                ? 'Starting Webflow run…'
                : latest.observation
                  ? 'Run test again'
                  : 'Run test now'}
            </button>
          ) : null}
          <button className="button button-secondary" disabled={busy} onClick={onRefresh}>
            Check run status
          </button>
          <button
            className="button button-tertiary"
            disabled={busy}
            onClick={() => {
              fillFromPackage(latest);
              setShowNewPackage(true);
            }}
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
          {previous ? (
            <div className="prefill-note" role="status">
              <strong>Previous setup loaded</strong>
              <p>
                We reused the last test site, runtime pin, selector, and proxy check. Review the
                values before continuing; Webflow will verify the runtime bytes and SRI again for
                this {reviewedIdentityLabel}.
              </p>
            </div>
          ) : null}
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
            <legend><span>2</span> Pin every reviewed runtime</legend>
            <p className="runtime-set-intro">
              Each JavaScript file that runs on the published test site needs its own immutable URL,
              SHA-256, and matching SRI value.
            </p>
            {runtimeArtifacts.map((artifact, index) => (
              <div className="runtime-artifact-input" key={`${index}:${artifact.url}`}>
                <div className="runtime-artifact-heading">
                  <strong>Runtime {index + 1}</strong>
                  {runtimeArtifacts.length > 1 ? (
                    <button
                      className="button button-tertiary"
                      type="button"
                      onClick={() => removeRuntimeArtifact(index)}
                    >
                      Remove runtime {index + 1}
                    </button>
                  ) : null}
                </div>
                <label>
                  Runtime {index + 1} URL
                  <input
                    required
                    type="url"
                    value={artifact.url}
                    onChange={(event) => updateRuntimeArtifact(index, 'url', event.target.value)}
                  />
                </label>
                <label>
                  Runtime {index + 1} SHA-256
                  <input
                    required
                    pattern="[a-f0-9]{64}"
                    value={artifact.sha256}
                    onChange={(event) => updateRuntimeArtifact(index, 'sha256', event.target.value)}
                    placeholder="64 lowercase hex characters"
                  />
                </label>
                <label>
                  Runtime {index + 1} SRI
                  <input
                    required
                    value={artifact.integrity}
                    onChange={(event) => updateRuntimeArtifact(index, 'integrity', event.target.value)}
                    placeholder="sha256-…"
                  />
                </label>
              </div>
            ))}
            <button
              className="button button-secondary"
              disabled={runtimeArtifacts.length >= 8}
              type="button"
              onClick={addRuntimeArtifact}
            >
              Add another runtime
            </button>
          </fieldset>
          <details className="advanced-settings">
            <summary>Runtime-ready selector and proxy check</summary>
            <label>
              Ready selector
              <input required value={readySelector} onChange={(event) => setReadySelector(event.target.value)} />
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
              and that its license is allowlisted for the next 24 hours. Webflow—not this browser—will run the test.
            </p>
            <ul>
              <li>Runtime bytes are pinned to this {reviewedIdentityLabel} version</li>
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
  runtimeTestPackages,
  busy,
  runtimeError,
  onRevision,
  onPrepareRuntimePackage,
  onRunRuntimeObservation,
  onRefreshRuntimePackages,
  reviewerHandoff,
  reviewerMode,
  onCreateReviewerHandoff,
  onBack
}: {
  review: StoredReview;
  comparison: ReviewComparison | null;
  runtimeTestPackages: RuntimeTestPackageView[];
  busy: boolean;
  runtimeError: string | null;
  onRevision: (bundle: File, sourceMaps?: File) => void;
  onPrepareRuntimePackage: (input: RuntimeTestPackageInput) => void;
  onRunRuntimeObservation: (testPackageId: string) => void;
  onRefreshRuntimePackages: () => void;
  reviewerHandoff: ReviewerHandoff | null;
  reviewerMode: boolean;
  onCreateReviewerHandoff: (testPackageId: string) => void;
  onBack: () => void;
}) {
  const result = review.latestVersion.result;
  const revisionId = useId();
  const revisionSourceMapsId = useId();
  const [revisionBundle, setRevisionBundle] = useState<File | null>(null);
  const [revisionSourceMaps, setRevisionSourceMaps] = useState<File | null>(null);
  const runtimeOnly = result.reviewType === 'runtime_manifest';
  const blockerText = result.summary.securityBlockers === 1 ? 'blocker' : 'blockers';

  return (
    <main className="review-view">
      <button className="back-button" onClick={onBack}>← All runs</button>
      <header className="review-header">
        <div className="eyebrow">Revision {review.latestVersion.sequence}</div>
        <h2>{result.artifactScope.appName ?? review.name}</h2>
        <p>
          {runtimeOnly
            ? 'Runtime manifest saved. Pin each public file, then run the Webflow browser test.'
            : result.summary.securityBlockers > 0
            ? `${result.summary.securityBlockers} ${blockerText} before you are ready`
            : 'No deterministic security blockers found'}
        </p>
        <div className="saved-state"><span>✓</span> Checkpoint saved</div>
      </header>

      {comparison ? <Comparison comparison={comparison} /> : null}
      <Coverage review={review} testPackages={runtimeTestPackages} />
      <ArtifactReceiptCard review={review} />

      {runtimeOnly ? (
        <section className="success-card">
          <strong>Runtime manifest ready</strong>
          <p>Pin every hosted JavaScript file, then use the Webflow runtime observation below.</p>
        </section>
      ) : (
        <>
          <section className="summary-grid" aria-label="Finding summary">
            <div><strong>{result.summary.securityBlockers}</strong><span>Security blockers</span></div>
            <div><strong>{result.summary.requiredUpdates}</strong><span>Required updates</span></div>
            <div><strong>{result.summary.suggestedUpdates}</strong><span>Suggested updates</span></div>
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
        </>
      )}

      <RuntimeObservationCard
        review={review}
        testPackages={runtimeTestPackages}
        busy={busy}
        runtimeError={runtimeError}
        onPrepare={onPrepareRuntimePackage}
        onRun={onRunRuntimeObservation}
        onRefresh={onRefreshRuntimePackages}
      />

      {reviewerMode && runtimeTestPackages[0]?.status === 'ready' ? (
        <section className="revision-card">
          <div>
            <span className="eyebrow">Reviewer workspace</span>
            <h2>Inspect and replay this exact package</h2>
            <p>Open the server-owned review surface to compare prior observations and request an independent runtime replay.</p>
          </div>
          {reviewerHandoff ? (
            <a
              className="button button-primary"
              href={reviewerHandoff.url}
              target="_blank"
              rel="noreferrer noopener"
            >
              Open reviewer workspace
            </a>
          ) : (
            <button
              className="button button-primary"
              disabled={busy}
              onClick={() => onCreateReviewerHandoff(runtimeTestPackages[0]!.id)}
            >
              {busy ? 'Preparing…' : 'Create reviewer workspace'}
            </button>
          )}
        </section>
      ) : null}

      {!runtimeOnly ? (
        <section className="revision-card">
          <div>
            <span className="eyebrow">Next move</span>
            <h2>Upload a revised bundle</h2>
            <p>Upload the revised bundle and its matching private source maps. We will compare them with this checkpoint and show exactly what changed.</p>
          </div>
          <div className="revision-upload-actions">
            <label className="artifact-upload-field" htmlFor={revisionId}>
              <strong>Revised app bundle</strong>
              <span>{revisionBundle?.name ?? 'Choose bundle (.zip)'}</span>
            </label>
            <input
              id={revisionId}
              aria-label="Revised app bundle"
              className="visually-hidden"
              type="file"
              accept=".zip,application/zip"
              disabled={busy}
              onChange={(event) => setRevisionBundle(event.currentTarget.files?.[0] ?? null)}
            />
            <label className="artifact-upload-field" htmlFor={revisionSourceMapsId}>
              <strong>Revised source maps</strong>
              <span>{revisionSourceMaps?.name ?? 'Choose source maps (.zip or .map)'}</span>
            </label>
            <input
              id={revisionSourceMapsId}
              aria-label="Revised source maps"
              className="visually-hidden"
              type="file"
              accept=".zip,.map,application/zip,application/json"
              disabled={busy}
              onChange={(event) => setRevisionSourceMaps(event.currentTarget.files?.[0] ?? null)}
            />
            <button
              className="button button-primary"
              type="button"
              disabled={busy || !revisionBundle}
              onClick={() => revisionBundle && onRevision(revisionBundle, revisionSourceMaps ?? undefined)}
            >
              {busy ? 'Comparing…' : 'Upload revision'}
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}

export function App({ api }: { api: PreflightApi }) {
  const [history, setHistory] = useState<ReviewSummary[]>([]);
  const [review, setReview] = useState<StoredReview | null>(null);
  const [startPath, setStartPath] = useState<StartPath>('choose');
  const [comparison, setComparison] = useState<ReviewComparison | null>(null);
  const [runtimeTestPackages, setRuntimeTestPackages] = useState<RuntimeTestPackageView[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [identity, setIdentity] = useState<PreflightIdentity | null>(null);
  const [reviewerHandoff, setReviewerHandoff] = useState<ReviewerHandoff | null>(null);

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

  const run = async (
    action: () => Promise<void>,
    onError: (message: string) => void = setError
  ) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : 'That step could not be completed.');
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
          runtimeTestPackages={runtimeTestPackages}
          busy={busy}
          runtimeError={runtimeError}
          reviewerMode={identity?.companionRole === 'reviewer'}
          reviewerHandoff={reviewerHandoff}
          onBack={() => {
            setReview(null);
            setStartPath('choose');
            setComparison(null);
            setRuntimeTestPackages([]);
            setReviewerHandoff(null);
            rememberReview(null);
          }}
          onRevision={(file, sourceMaps) => run(async () => {
            const revised = await api.addRevision(review.id, file, sourceMaps);
            setReview(revised.review);
            setComparison(revised.comparison);
            setReviewerHandoff(null);
            await refreshRuntimePackages(review.id);
            await refreshHistory();
          })}
          onPrepareRuntimePackage={(input) => run(async () => {
            const prepared = await api.createRuntimeTestPackage(review.id, input);
            setRuntimeTestPackages([prepared]);
          })}
          onRunRuntimeObservation={(testPackageId) => {
            setRuntimeError(null);
            void run(async () => {
              await api.requestRuntimeObservationRun(testPackageId);
              await refreshRuntimePackages(review.id);
            }, setRuntimeError);
          }}
          onRefreshRuntimePackages={() => run(async () => {
            await refreshRuntimePackages(review.id);
          })}
          onCreateReviewerHandoff={(testPackageId) => run(async () => {
            const handoff = await api.createReviewerHandoff(
              review.id,
              review.latestVersion.id,
              testPackageId
            );
            setReviewerHandoff(handoff);
          })}
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
          {startPath === 'choose' ? (
            <StartPathChoice busy={busy} onChoose={setStartPath} />
          ) : null}
          {startPath === 'bundle' ? (
            <>
              <button className="back-button" type="button" onClick={() => setStartPath('choose')}>
                ← Choose another path
              </button>
              <UploadCard
                busy={busy}
                onSubmit={(file, sourceMaps) => run(async () => {
                  const created = await api.createReview(file, sourceMaps);
                  setReview(created);
                  setComparison(null);
                  setRuntimeTestPackages([]);
                  setReviewerHandoff(null);
                  rememberReview(created.id);
                  await refreshHistory();
                })}
              />
            </>
          ) : null}
          {startPath === 'runtime' ? (
            <HostedRuntimeCard
              busy={busy}
              onBack={() => setStartPath('choose')}
              onSubmit={(input) => run(async () => {
                const created = await api.createRuntimeReview(input);
                setReview(created);
                setComparison(null);
                setRuntimeTestPackages([]);
                setReviewerHandoff(null);
                rememberReview(created.id);
                await refreshHistory();
              })}
            />
          ) : null}
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
              setReviewerHandoff(null);
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
