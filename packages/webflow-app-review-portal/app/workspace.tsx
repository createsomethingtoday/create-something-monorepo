'use client';
import { useEffect, useState, type FormEvent } from 'react';
import {
  Inbox,
  Package,
  MessageSquare,
  Settings,
  History,
  ArrowLeft,
  ArrowUpRight,
  RefreshCw,
  ShieldCheck,
  Upload,
  FlaskConical,
  Menu,
  X,
  LogOut,
  Check,
  Search
} from 'lucide-react';
import { rejectionReasons } from '@/lib/review-contract';

type View = 'queue' | 'bundles' | 'activity' | 'settings';
type Session = {
  verificationFixture?: boolean;
  user: { name: string | null; email: string; accountId: string };
  capabilities: Record<string, boolean>;
  analysisReady: boolean;
  model: string;
};
type Bundle = {
  id: string;
  filename: string;
  appName: string;
  versionLabel: string;
  sha256: string;
  sizeBytes: number;
  fileCount: number;
};
type Action = 'approve' | 'reject' | 'changes' | 'message';
const labels = {
  approve: 'Approve version',
  reject: 'Reject version',
  changes: 'Request changes',
  message: 'Send developer message'
};
async function api(path: string, init?: RequestInit): Promise<any> {
  const response = await fetch(`/api/${path}`, init);
  if (response.status === 204) return {};
  const data: any = await response.json();
  if (!response.ok)
    throw Object.assign(new Error(data.error?.message || 'The request could not be completed.'), {
      status: response.status
    });
  return data;
}
const post = (value: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(value)
});
const date = (value: string) => new Date(value).toLocaleString();
const statusLabel = (value: string) => value.replace(/^[^\p{L}\p{N}]+(?=[\p{L}\p{N}])/u, '').trim();
function Status({ children }: { children: React.ReactNode }) {
  return (
    <span className="portal-status">
      {typeof children === 'string' ? statusLabel(children) : children}
    </span>
  );
}
function Empty({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Inbox size={23} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

export default function Workspace() {
  const [session, setSession] = useState<Session | null>(null),
    [ready, setReady] = useState(false),
    [view, setView] = useState<View>('queue'),
    [nav, setNav] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [query, setQuery] = useState('');
  const [queue, setQueue] = useState<any[]>([]),
    [asset, setAsset] = useState<any>(null),
    [version, setVersion] = useState<any>(null),
    [thread, setThread] = useState<any>(null),
    [activity, setActivity] = useState<any[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]),
    [bundle, setBundle] = useState<any>(null),
    [job, setJob] = useState<any>(null);
  const [dialog, setDialog] = useState<Action | null>(null),
    [text, setText] = useState(''),
    [reason, setReason] = useState<string>('App issue'),
    [confirmed, setConfirmed] = useState(false),
    [requestId, setRequestId] = useState('');
  const [file, setFile] = useState<File | null>(null),
    [appName, setAppName] = useState(''),
    [versionLabel, setVersionLabel] = useState(''),
    [testConfirmed, setTestConfirmed] = useState(false);
  const [reconciliation, setReconciliation] = useState<any>(null),
    [resolutionNote, setResolutionNote] = useState(''),
    [resolutionOutcome, setResolutionOutcome] = useState('observed_completed'),
    [resolutionConfirmed, setResolutionConfirmed] = useState(false);
  const [recoveryResponseId, setRecoveryResponseId] = useState('');
  const [signInReady, setSignInReady] = useState(false);
  useEffect(() => {
    if (!dialog && !reconciliation) return;
    const modal = document.querySelector<HTMLElement>('.portal-modal');
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const background = Array.from(
      document.querySelectorAll<HTMLElement>('.workspace > aside, .workspace > main')
    );
    background.forEach((node) => {
      node.inert = true;
    });
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () =>
      Array.from(
        modal.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]'
        )
      );
    focusable()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setDialog(null);
        setReconciliation(null);
      }
      if (event.key === 'Tab') {
        const items = focusable();
        const first = items[0],
          last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      document.body.style.overflow = oldOverflow;
      background.forEach((node) => {
        node.inert = false;
      });
      previous?.focus();
    };
  }, [dialog, reconciliation]);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }
  async function refresh(next: View = view, details = true) {
    if (next === 'queue') {
      setQueue((await api('queue')).records || []);
      if (details && asset) {
        const data = await api(`assets/${asset.assetId}`);
        setAsset({ ...data.asset, versions: data.versions });
        setVersion(
          data.versions.find((v: any) => v.versionId === version?.versionId) ||
            data.versions[0] ||
            null
        );
      }
    }
    if (next === 'bundles') {
      setBundles((await api('bundles')).bundles || []);
      if (details && bundle) {
        const detail = await api(`bundles/${bundle.bundle.id}`);
        setBundle(detail);
        const activeId = job?.id || detail.jobs?.[0]?.id;
        if (activeId) setJob(await api(`analysis/${activeId}`));
      }
    }
    if (next === 'activity') setActivity(await api('activity'));
  }
  useEffect(() => {
    api('status')
      .then((s) => setSignInReady(s.signInReady === true))
      .catch(() => setSignInReady(false));
    api('session')
      .then((s) => {
        setSession(s);
        return api('queue');
      })
      .then((d) => setQueue(d.records || []))
      .catch((e) => {
        if (e.status !== 401) setError(e.message);
      })
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (!job || !['queued', 'in_progress'].includes(job.status)) return;
    let stopped = false,
      timer: ReturnType<typeof setTimeout>,
      failures = 0;
    const poll = async () => {
      try {
        const result = await api(`analysis/${job.id}`);
        if (stopped) return;
        setJob(result);
        setError('');
      } catch (e) {
        if (stopped) return;
        failures++;
        setError(
          `${e instanceof Error ? e.message : 'Status check failed.'} ${failures < 5 ? 'Retrying status check…' : 'Use Refresh to check this run again.'}`
        );
        if (failures < 5) timer = setTimeout(poll, Math.min(30000, 4000 * 2 ** failures));
      }
    };
    timer = setTimeout(poll, 4000);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [job]);
  function go(next: View) {
    setView(next);
    setNav(false);
    setAsset(null);
    setVersion(null);
    setBundle(null);
    setJob(null);
    setQuery('');
    if (session) void run(() => refresh(next, false));
  }
  async function openAsset(id: string) {
    await run(async () => {
      const data = await api(`assets/${id}`);
      setAsset({ ...data.asset, versions: data.versions });
      setVersion(data.versions?.[0] || null);
      setThread(null);
      setDialog(null);
    });
  }
  function openDialog(action: Action) {
    setDialog(action);
    setText('');
    setConfirmed(false);
    setRequestId(crypto.randomUUID());
  }
  async function submitAction(e: FormEvent) {
    e.preventDefault();
    if (!dialog || !version) return;
    await run(async () => {
      const receipt = await api(
        'actions',
        post({
          id: requestId,
          action: dialog,
          versionId: version.versionId,
          confirmed,
          expectedStatus: version.reviewStatus ?? null,
          expectedTicketId: version.zendeskTicketId ?? null,
          text,
          ...(dialog === 'reject' ? { reason } : {})
        })
      );
      if (receipt.status === 'completed' || receipt.receipt?.status === 'completed') {
        setNotice('Action recorded. Reload the submission to see its current state.');
        setDialog(null);
      } else {
        setNotice(
          `Receipt ${requestId}: ${receipt.receipt?.status || receipt.status}. Check activity before retrying.`
        );
      }
      await refresh('queue');
    });
  }
  async function openBundle(id: string) {
    await run(async () => {
      const detail = await api(`bundles/${id}`);
      setBundle(detail);
      setJob(detail.jobs?.[0] || null);
      setTestConfirmed(false);
    });
  }
  async function upload(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    await run(async () => {
      const data = await api('bundles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/zip',
          'X-Bundle-Name': encodeURIComponent(file.name),
          'X-App-Name': encodeURIComponent(appName),
          'X-Version-Label': encodeURIComponent(versionLabel)
        },
        body: file
      });
      setFile(null);
      await refresh('bundles');
      setBundle(await api(`bundles/${data.bundle.id}`));
      setJob(null);
    });
  }
  const visibleQueue = queue.filter((a) =>
    JSON.stringify([a.name, a.appName, a.latestReviewStatus, a.reviewer])
      .toLowerCase()
      .includes(query.toLowerCase())
  );
  return (
    <div className="workspace">
      {nav && (
        <button className="nav-shade" aria-label="Close navigation" onClick={() => setNav(false)} />
      )}
      <aside className={`sidebar ${nav ? 'open' : ''}`}>
        <a className="portal-brand" href="/" aria-label="Webflow App Review home">
          <span className="portal-w">W</span>
          <strong>Webflow</strong>
        </a>
        <div className="portal-workspace-label">
          <span>Marketplace</span>
          <small>App Review workspace</small>
        </div>
        <div className="nav-label">WORKSPACE</div>
        {(
          [
            ['queue', 'Review queue', Inbox],
            ['bundles', 'Bundle testing', Package],
            ['activity', 'Activity', History],
            ['settings', 'Connections', Settings]
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            className={`nav-link ${view === key ? 'active' : ''}`}
            onClick={() => go(key)}
          >
            <Icon size={17} />
            {label}
            {key === 'queue' && session && <span className="nav-count">{queue.length}</span>}
          </button>
        ))}
        <div className="portal-sidebar-footer">
          <ShieldCheck size={17} />
          <span>{session ? 'Individual MCP access' : 'Work account required'}</span>
        </div>
        <div className="portal-user">
          <span className="portal-avatar">{session?.user.name?.[0] || 'M'}</span>
          <div>
            <strong>{session?.user.name || 'Reviewer workspace'}</strong>
            <small>{session?.user.email || 'Sign in to continue'}</small>
          </div>
        </div>
      </aside>
      <main className="main-shell">
        <header className="portal-topbar">
          <button className="portal-menu" aria-label="Open navigation" onClick={() => setNav(!nav)}>
            <Menu size={20} />
          </button>
          <span>
            Marketplace <span className="muted">/</span> App Review
          </span>
          <span className="portal-topbar-right">
            {session ? (
              <>
                <span className="status-dot" /> MCP connected
              </>
            ) : (
              'Private workspace'
            )}
          </span>
        </header>
        <div className="portal-content">
          {session?.verificationFixture && (
            <div className="portal-notice" role="status">
              Local QA fixture · All review actions are simulated.
            </div>
          )}
          <div className="page-heading">
            <div>
              <h1>
                {asset
                  ? asset.name || asset.appName || 'App submission'
                  : bundle
                    ? bundle.bundle.appName
                    : {
                        queue: 'Review queue',
                        bundles: 'Bundle testing',
                        activity: 'Review activity',
                        settings: 'Connections'
                      }[view]}
              </h1>
              <p>
                {view === 'queue'
                  ? 'Review submissions, inspect evidence, and communicate clear decisions.'
                  : view === 'bundles'
                    ? 'Inspect source and run isolated tests with GPT-6 Astra.'
                    : view === 'activity'
                      ? 'Your decisions, developer messages, and execution receipts.'
                      : 'Your work identity and the services available to it.'}
              </p>
            </div>
            {session && (
              <div className="portal-utilities">
                {((view === 'queue' && asset) || (view === 'bundles' && bundle)) && (
                  <button
                    className="button"
                    onClick={() => {
                      if (view === 'queue') {
                        setAsset(null);
                        setVersion(null);
                        setThread(null);
                      } else {
                        setBundle(null);
                        setJob(null);
                      }
                    }}
                  >
                    <ArrowLeft size={14} />
                    {view === 'queue' ? 'All submissions' : 'Your bundles'}
                  </button>
                )}
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => void run(() => refresh())}
                >
                  <RefreshCw size={14} />
                  Refresh
                </button>
              </div>
            )}
          </div>
          {error && (
            <div className="portal-alert" role="alert">
              <strong>Action needed</strong>
              <span>{error}</span>
              <button aria-label="Dismiss error" onClick={() => setError('')}>
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="portal-notice" role="status">
              <Check size={16} />
              {notice}
            </div>
          )}
          {!ready ? (
            <Empty title="Loading your workspace">Checking your reviewer connection…</Empty>
          ) : !session ? (
            <section className="portal-signin panel">
              <span className="portal-signin-icon">
                <ShieldCheck size={29} />
              </span>
              <h2>Your review workspace</h2>
              <p>
                Sign in through App Review with your Webflow work account. Your MCP access
                determines the submissions and actions available here.
              </p>
              {signInReady ? (
                <a className="button primary" href="/api/auth/login">
                  Continue with Webflow <ArrowUpRight size={16} />
                </a>
              ) : (
                <div className="portal-stack">
                  <Status>Reviewer sign-in is being configured</Status>
                  <p>
                    This workspace will be available after its work-account connection is enabled.
                  </p>
                </div>
              )}
              <small>Individual access · Private bundles · Auditable decisions</small>
            </section>
          ) : (
            <>
              {view === 'queue' && !asset && (
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>App submissions</h2>
                      <p>The latest 100 submissions available through your connection.</p>
                    </div>
                    <Status>
                      {queue.length} {queue.length === 1 ? 'submission' : 'submissions'}
                    </Status>
                  </div>
                  <div className="portal-search">
                    <Search size={16} />
                    <input
                      aria-label="Search submissions"
                      placeholder="Search apps, status, or reviewer…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                  {visibleQueue.length ? (
                    <div className="table-scroll">
                      <table className="portal-table">
                        <thead>
                          <tr>
                            <th>App</th>
                            <th>Review status</th>
                            <th>Version</th>
                            <th>Reviewer</th>
                            <th>Submitted</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {visibleQueue.map((a, i) => (
                            <tr key={a.assetId || i}>
                              <td>
                                <button
                                  className="portal-app-name"
                                  onClick={() => void openAsset(a.assetId)}
                                >
                                  <span className="portal-app-icon">
                                    {(a.appName || 'A').slice(0, 2)}
                                  </span>
                                  {a.name || a.appName || a.assetId}
                                </button>
                              </td>
                              <td data-label="Review status">
                                <Status>{a.latestReviewStatus || 'Not set'}</Status>
                              </td>
                              <td data-label="Version">{a.versionNumber ?? '—'}</td>
                              <td data-label="Reviewer">
                                {a.reviewer?.name || a.reviewer?.email || 'Unassigned'}
                              </td>
                              <td data-label="Submitted">
                                {a.submissionDatetime ? date(a.submissionDatetime) : '—'}
                              </td>
                              <td>
                                <button
                                  className="button"
                                  onClick={() => void openAsset(a.assetId)}
                                >
                                  Review <ArrowUpRight size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <Empty title="No matching submissions">
                      Try another search or refresh the queue.
                    </Empty>
                  )}
                </section>
              )}
              {view === 'queue' && asset && (
                <>
                  <div className="portal-detail-grid">
                    <section className="panel">
                      <div className="panel-heading">
                        <h2>Submission</h2>
                        <Status>{version?.reviewStatus || 'No version'}</Status>
                      </div>
                      <div className="panel-body portal-stack">
                        <label>
                          Version
                          <select
                            value={version?.versionId || ''}
                            onChange={(e) => {
                              setVersion(
                                asset.versions.find((v: any) => v.versionId === e.target.value)
                              );
                              setDialog(null);
                              setThread(null);
                            }}
                          >
                            {(asset.versions || []).map((v: any) => (
                              <option value={v.versionId} key={v.versionId}>
                                {v.versionNumber ?? v.versionId} ·{' '}
                                {statusLabel(v.reviewStatus || 'Not set')}
                              </option>
                            ))}
                          </select>
                        </label>
                        <p>{asset.descriptionShort || 'No short description provided.'}</p>
                        <dl className="portal-facts">
                          <dt>App ID</dt>
                          <dd>{asset.appId || '—'}</dd>
                          <dt>Reviewer</dt>
                          <dd>{version?.reviewer?.name || 'Unassigned'}</dd>
                          <dt>Submitted</dt>
                          <dd>
                            {version?.submissionDatetime ? date(version.submissionDatetime) : '—'}
                          </dd>
                          <dt>Ticket</dt>
                          <dd>{version?.zendeskTicketId || 'No linked ticket'}</dd>
                        </dl>
                        <h3>Review feedback</h3>
                        <p className="portal-pre">
                          {version?.reviewFeedback || 'No review feedback recorded.'}
                        </p>
                        <h3>Rejection feedback</h3>
                        <p className="portal-pre">
                          {version?.rejectionFeedback || 'No rejection feedback recorded.'}
                        </p>
                        <details>
                          <summary>Full submission data</summary>
                          <pre>
                            {JSON.stringify(
                              { asset: { ...asset, versions: undefined }, version },
                              null,
                              2
                            )}
                          </pre>
                        </details>
                      </div>
                    </section>
                    <div className="portal-stack">
                      <section className="panel">
                        <div className="panel-heading">
                          <h2>Review decision</h2>
                        </div>
                        <div className="panel-body portal-stack">
                          <p>
                            Review all evidence before confirming. Decisions can notify the
                            developer through the existing review workflow.
                          </p>
                          {(['approve', 'changes', 'reject'] as Action[]).map((action) => (
                            <button
                              key={action}
                              className={`button portal-choice-${action}`}
                              disabled={busy || !version || !session.capabilities[action]}
                              onClick={() => openDialog(action)}
                            >
                              {labels[action]}
                            </button>
                          ))}
                        </div>
                      </section>
                      <section className="panel">
                        <div className="panel-heading">
                          <h2>Developer conversation</h2>
                          <MessageSquare size={16} />
                        </div>
                        <div className="panel-body portal-stack">
                          <button
                            className="button"
                            disabled={busy || !version?.zendeskTicketId}
                            onClick={() =>
                              void run(async () =>
                                setThread(await api(`thread/${version.versionId}`))
                              )
                            }
                          >
                            Read conversation
                          </button>
                          <button
                            className="button"
                            disabled={
                              busy || !version?.zendeskTicketId || !session.capabilities.message
                            }
                            onClick={() => openDialog('message')}
                          >
                            Write a message
                          </button>
                          <small>
                            Sent through the Zendesk support integration. Your reviewer identity is
                            recorded in this portal’s activity.
                          </small>
                          {thread && (
                            <div className="portal-stack">
                              <strong>{thread.thread?.subject || 'Developer conversation'}</strong>
                              {(thread.thread?.comments || []).map((comment: any) => (
                                <article className="portal-activity" key={comment.id}>
                                  <strong>{comment.author?.name || 'Participant'}</strong>
                                  <small>{comment.createdAt ? date(comment.createdAt) : ''}</small>
                                  <p className="portal-pre">{comment.body}</p>
                                  {comment.attachments?.length > 0 && (
                                    <small>
                                      {comment.attachments.length} attachments · Open the ticket to
                                      view them.
                                    </small>
                                  )}
                                </article>
                              ))}
                              {thread.thread?.hasOlderComments && (
                                <small>Older comments are available in Zendesk.</small>
                              )}
                            </div>
                          )}
                        </div>
                      </section>
                    </div>
                  </div>
                </>
              )}
              {view === 'bundles' && !bundle && (
                <>
                  <div className="portal-detail-grid">
                    <section className="panel">
                      <div className="panel-heading">
                        <h2>Your bundles</h2>
                        <Status>{bundles.length} uploaded</Status>
                      </div>
                      {bundles.length ? (
                        <div className="portal-bundle-list">
                          {bundles.map((b) => (
                            <button key={b.id} onClick={() => void openBundle(b.id)}>
                              <Package size={21} />
                              <span>
                                <strong>{b.appName}</strong>
                                <small>
                                  {b.versionLabel} · {b.fileCount} files ·{' '}
                                  {(b.sizeBytes / 1024).toFixed(1)} KB
                                </small>
                              </span>
                              <ArrowUpRight size={16} />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <Empty title="Upload your first bundle">
                          ZIP files stay private to your signed-in reviewer account.
                        </Empty>
                      )}
                    </section>
                    <form className="panel" onSubmit={upload}>
                      <div className="panel-heading">
                        <h2>Upload a bundle</h2>
                        <Upload size={17} />
                      </div>
                      <div className="panel-body portal-stack">
                        <label>
                          App name
                          <input
                            required
                            maxLength={120}
                            value={appName}
                            onChange={(e) => setAppName(e.target.value)}
                            placeholder="App name"
                          />
                        </label>
                        <label>
                          Version
                          <input
                            required
                            maxLength={80}
                            value={versionLabel}
                            onChange={(e) => setVersionLabel(e.target.value)}
                            placeholder="1.0.0"
                          />
                        </label>
                        <label className="portal-upload">
                          ZIP archive · Up to 20 MB
                          <input
                            required
                            type="file"
                            accept=".zip,application/zip"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                          />
                        </label>
                        <button className="button primary" disabled={busy || !file}>
                          Upload bundle
                        </button>
                      </div>
                    </form>
                  </div>
                  <p className="page-footnote">
                    Uploaded archives are validated before storage. Starting a test requires a
                    separate confirmation.
                  </p>
                </>
              )}
              {view === 'bundles' && bundle && (
                <>
                  <div className="portal-detail-grid">
                    <section className="panel">
                      <div className="panel-heading">
                        <h2>Bundle contents</h2>
                        <a className="button" href={`/api/bundles/${bundle.bundle.id}/download`}>
                          Download ZIP
                        </a>
                      </div>
                      <div className="panel-body portal-stack">
                        <p>
                          {bundle.bundle.filename} · {bundle.bundle.fileCount} files
                        </p>
                        <small>SHA-256</small>
                        <code className="portal-hash">{bundle.bundle.sha256}</code>
                        <div className="portal-files">
                          {bundle.files.map((f: any) => (
                            <div key={f.path}>
                              <code>{f.path}</code>
                              <small>
                                {f.sizeBytes} B{f.truncated ? ' · bounded extract' : ''}
                              </small>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                    <section className="panel">
                      <div className="panel-heading">
                        <h2>Run bundle review</h2>
                        <FlaskConical size={17} />
                      </div>
                      <div className="panel-body portal-stack">
                        <Status>GPT-6 Astra · OpenAI API</Status>
                        <p>
                          The archive is sent to an isolated OpenAI-hosted container. Network access
                          is disabled. The report includes static findings, commands, runtime
                          observations, and behaviors that could not be tested.
                        </p>
                        <label className="portal-check">
                          <input
                            type="checkbox"
                            checked={testConfirmed}
                            onChange={(e) => setTestConfirmed(e.target.checked)}
                          />
                          I authorize analysis and isolated execution of this bundle using the
                          workspace’s paid API account.
                        </label>
                        <button
                          className="button primary"
                          disabled={
                            busy ||
                            !testConfirmed ||
                            !session.analysisReady ||
                            ['starting', 'queued', 'in_progress', 'unknown'].includes(job?.status)
                          }
                          onClick={() =>
                            void run(async () =>
                              setJob(
                                await api(
                                  `bundles/${bundle.bundle.id}/analyze`,
                                  post({ id: crypto.randomUUID(), confirmed: true })
                                )
                              )
                            )
                          }
                        >
                          Start bundle review
                        </button>
                        {job && (
                          <>
                            <Status>{job.status}</Status>
                            {['unknown', 'starting'].includes(job.status) && (
                              <details>
                                <summary>Recover an interrupted run</summary>
                                <div className="portal-stack">
                                  <p>
                                    Find this run in the OpenAI project using its run ID. Paste its
                                    response ID to recover the existing result without starting
                                    another paid run.
                                  </p>
                                  <label>
                                    Provider response ID
                                    <input
                                      value={recoveryResponseId}
                                      onChange={(e) => setRecoveryResponseId(e.target.value)}
                                      placeholder="resp_…"
                                    />
                                  </label>
                                  <button
                                    className="button"
                                    disabled={busy || !recoveryResponseId}
                                    onClick={() =>
                                      void run(async () =>
                                        setJob(
                                          await api(
                                            `analysis/${job.id}/recover`,
                                            post({
                                              responseId: recoveryResponseId,
                                              confirmed: true
                                            })
                                          )
                                        )
                                      )
                                    }
                                  >
                                    Recover existing run
                                  </button>
                                </div>
                              </details>
                            )}
                            <small>Run {job.id}</small>
                            {['queued', 'in_progress'].includes(job.status) && (
                              <p role="status">
                                Testing continues in the hosted container. This page refreshes the
                                result automatically.
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </section>
                  </div>
                  {job?.result && (
                    <section className="panel portal-report">
                      <div className="panel-heading">
                        <h2>Review report</h2>
                        <Status>{job.result.model || session.model}</Status>
                      </div>
                      <div className="panel-body portal-stack">
                        <p className="portal-pre">
                          {job.result.report ||
                            (typeof job.result.error === 'string'
                              ? job.result.error
                              : job.result.error?.message) ||
                            'No report returned.'}
                        </p>
                        <details>
                          <summary>Execution evidence and provider receipt</summary>
                          <pre>{JSON.stringify(job.result, null, 2)}</pre>
                        </details>
                        <p className="panel-note">
                          Human review is required before any decision. This run did not change
                          review status or send a developer message.
                        </p>
                      </div>
                    </section>
                  )}
                </>
              )}
              {view === 'activity' && (
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Your action receipts</h2>
                  </div>
                  {activity.length ? (
                    <div className="portal-stack panel-body">
                      {activity.map((a) => (
                        <article className="portal-activity" key={a.id}>
                          <div>
                            <strong>{labels[a.action as Action] || a.action}</strong>
                            <Status>{a.status}</Status>
                          </div>
                          <p>
                            {a.target_id} · {date(a.created_at)}
                          </p>
                          <details>
                            <summary>Receipt {a.id}</summary>
                            <pre>
                              {JSON.stringify(
                                a.result_json ? JSON.parse(a.result_json) : {},
                                null,
                                2
                              )}
                            </pre>
                          </details>
                          {['unknown', 'pending'].includes(a.status) && (
                            <button
                              className="button"
                              disabled={busy}
                              onClick={() =>
                                void run(async () => {
                                  setReconciliation(await api(`actions/${a.id}`));
                                  setResolutionNote('');
                                  setResolutionConfirmed(false);
                                })
                              }
                            >
                              Inspect and reconcile
                            </button>
                          )}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <Empty title="No actions recorded">
                      Confirmed decisions and developer messages will appear here.
                    </Empty>
                  )}
                </section>
              )}
              {view === 'settings' && (
                <div className="portal-detail-grid">
                  <section className="panel">
                    <div className="panel-heading">
                      <h2>Your App Review connection</h2>
                      <ShieldCheck size={19} />
                    </div>
                    <div className="panel-body portal-stack">
                      <strong>{session.user.email}</strong>
                      <p>Webflow work sign-in · Individual MCP authorization</p>
                      <dl className="portal-facts">
                        {Object.entries(session.capabilities).map(([k, v]) => (
                          <div key={k}>
                            <dt>{k}</dt>
                            <dd>{v ? 'Available' : 'Not granted'}</dd>
                          </div>
                        ))}
                      </dl>
                      <p>
                        Available actions follow your MCP tool catalog. The MCP currently grants
                        allowed reviewers the same review workflow; assignment does not restrict
                        visibility.
                      </p>
                      <button
                        className="button"
                        onClick={() =>
                          void run(async () => {
                            await api('auth/logout', post({}));
                            setSession(null);
                            setQueue([]);
                            setAsset(null);
                            setBundles([]);
                            setBundle(null);
                            setActivity([]);
                            setJob(null);
                          })
                        }
                      >
                        <LogOut size={15} />
                        Sign out
                      </button>
                    </div>
                  </section>
                  <section className="panel">
                    <div className="panel-heading">
                      <h2>Bundle analysis</h2>
                    </div>
                    <div className="panel-body portal-stack">
                      <Status>
                        {session.analysisReady ? 'API configured' : 'API configuration needed'}
                      </Status>
                      <strong>GPT-6 Astra</strong>
                      <p>
                        Separately billed OpenAI API usage. Each run uses an isolated container with
                        no outbound network access and records the provider-reported model and
                        execution evidence.
                      </p>
                      <small>
                        Up to 10 reviews per reviewer per day. Containers expire after inactivity
                        and are deleted after results are saved.
                      </small>
                    </div>
                  </section>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      {reconciliation && (
        <div className="portal-modal-backdrop">
          <section
            className="portal-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reconciliation-title"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await api(
                    `actions/${reconciliation.receipt.id}/reconcile`,
                    post({
                      confirmed: resolutionConfirmed,
                      outcome: resolutionOutcome,
                      note: resolutionNote
                    })
                  );
                  setReconciliation(null);
                  await refresh('activity');
                  setNotice('Reconciliation recorded. No review decision or message was sent.');
                });
              }}
            >
              <div className="panel-heading">
                <h2 id="reconciliation-title">Reconcile uncertain action</h2>
                <button
                  type="button"
                  aria-label="Close reconciliation"
                  onClick={() => setReconciliation(null)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="panel-body portal-stack">
                <p>
                  Inspect the current submission and conversation before releasing this receipt.
                  This records your observation; it does not repeat the original action.
                </p>
                <pre>
                  {JSON.stringify(
                    { current: reconciliation.current, thread: reconciliation.thread },
                    null,
                    2
                  )}
                </pre>
                <label>
                  Observed outcome
                  <select
                    value={resolutionOutcome}
                    onChange={(e) => setResolutionOutcome(e.target.value)}
                  >
                    <option value="observed_completed">The original action completed</option>
                    <option value="observed_not_applied">
                      The original action was not applied
                    </option>
                  </select>
                </label>
                <label>
                  Evidence and explanation
                  <textarea
                    rows={4}
                    minLength={20}
                    maxLength={4000}
                    required
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                  />
                </label>
                <label className="portal-check">
                  <input
                    type="checkbox"
                    checked={resolutionConfirmed}
                    onChange={(e) => setResolutionConfirmed(e.target.checked)}
                  />
                  I verified the outcome in the current record or developer conversation.
                </label>
                <button className="button primary" disabled={busy || !resolutionConfirmed}>
                  Record reconciliation
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {dialog && version && (
        <div className="portal-modal-backdrop">
          <section
            className="portal-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="action-title"
          >
            <form onSubmit={submitAction}>
              <div className="panel-heading">
                <h2 id="action-title">{labels[dialog]}</h2>
                <button
                  type="button"
                  aria-label="Close confirmation"
                  onClick={() => setDialog(null)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="panel-body portal-stack">
                <p>
                  <strong>{asset?.appName}</strong> · Version{' '}
                  {version.versionNumber ?? version.versionId}
                </p>
                <p>Current status: {version.reviewStatus || 'Not set'}</p>
                {dialog === 'message' ? (
                  <p>
                    This sends the text below to the developer on linked Zendesk ticket{' '}
                    {version.zendeskTicketId}.
                  </p>
                ) : (
                  <p>
                    This updates Airtable and may notify the developer through the existing
                    automation.
                  </p>
                )}
                {dialog === 'reject' && (
                  <label>
                    Rejection reason
                    <select value={reason} onChange={(e) => setReason(e.target.value)}>
                      {rejectionReasons.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                )}
                <label>
                  {dialog === 'message' ? 'Message sent verbatim' : 'Review feedback'}
                  <textarea
                    rows={8}
                    required={dialog !== 'approve'}
                    maxLength={20000}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={
                      dialog === 'message'
                        ? 'Include a greeting and sign-off.'
                        : 'Explain your findings and next steps.'
                    }
                  />
                </label>
                <label className="portal-check">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  I have reviewed this exact submission and authorize this action.
                </label>
                <small>
                  Confirmation {requestId}. An uncertain outcome remains in activity for
                  reconciliation.
                </small>
                <button
                  className={`button ${dialog === 'reject' ? 'danger' : 'primary'}`}
                  disabled={busy || !confirmed}
                >
                  {busy ? 'Submitting…' : labels[dialog]}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
