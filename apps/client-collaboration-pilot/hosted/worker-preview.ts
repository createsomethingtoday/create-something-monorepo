import { exactKeys, hash, requireValue, type Member } from './common';
import type { persistence, State } from './persistence';
import { candidateManifest, mapVersion, type Observation, type PreviewTarget } from './version';

/** This target confers no Pages/Git/KV authority. Publication is an approved
 * content snapshot in the existing D1 aggregate, rendered by the same Worker. */
export function workerPreviewTarget(origin: string): PreviewTarget {
  return { project: 'maverickx', origin, branch: 'reviewed-worker-snapshot', contentBinding: 'DB:collaboration_projects' };
}
export function workerPreview(options: {
  store: ReturnType<typeof persistence>;
  project: string;
  repository: string;
  target: PreviewTarget;
  // Checked-in immutable source bundle; no user-selected URL or provider call.
  source: { commit: string; raw: string; repositoryPath: string };
}) {
  const { store, project, repository, target, source } = options;
  requireValue(target.contentBinding === 'DB:collaboration_projects', 'worker_target_required');
  async function observation(state: State): Promise<Observation> {
    const published = state.publication;
    if (published) {
      requireValue(published.project === project && published.sourceCommit === source.commit &&
        published.sourceContentHash === await hash(source.raw) &&
        published.targetHash === await hash(target), 'source_bundle_changed');
      requireValue(await hash(published.raw) === published.contentHash, 'preview_content_unavailable', 503);
    }
    return {
      project, repository, path: 'content/home.json', sourceCommit: source.commit, sourceRepositoryPath: source.repositoryPath,
      sourceRaw: source.raw, deploymentCommit: source.commit,
      deploymentId: published ? 'worker-preview:' + published.id : 'source-bundle:' + source.commit,
      rawKV: published?.raw ?? source.raw, observedAt: Date.now(), target,
      ...(published ? { previewPublication: published.id,
        contentKey: `collaboration/${project}/${published.id}/${published.contentHash}.json` } : {}),
    };
  }
  async function current(state: State) {
    const observed = await observation(state);
    return { observed, version: await mapVersion(observed, { project, repository, target }) };
  }
  return {
    async readObservation(p: Member) { return observation((await store.load(p)).state); },
    async publish(p: Member, args: Record<string, unknown>) {
      requireValue(p.project === project, 'project_membership_required', 403);
      exactKeys(args, ['requestId', 'jobId', 'digest', 'targetHash']);
      let reviewers: Pick<Member, 'issuer' | 'subject' | 'email' | 'revision'>[];
      return store.mutate(p, 'worker-preview.publish', args, async state => {
        const job = state.jobs.find(j => j.id === args.jobId && j.kind === 'preview');
        const q = state.proposals.find(q => q.id === job?.proposalId);
        requireValue(job && q?.status === 'approved' && q.digest === job.digest &&
          q.digest === args.digest && q.review?.digest === q.digest, 'approved_preview_required', 403);
        reviewers = [q.review, job.requestedBy];
        requireValue(job.project === project && job.targetHash === args.targetHash &&
          job.targetHash === await hash(target) && JSON.stringify(job.destination) === JSON.stringify(target), 'destination_changed');
        // Replaying an old published job never repoints the current publication.
        if (job.execution === 'worker-snapshot-published') return job.publication;
        requireValue(job.status === 'awaiting-executor', 'preview_job_unavailable');
        const { version } = await current(state);
        requireValue(job.base.hash === version.hash && q.content.base.hash === version.hash, 'stale_version');
        requireValue(q.digest === await hash(q.content) &&
          JSON.stringify(job.candidate) === JSON.stringify(q.content.candidate), 'candidate_tampered');
        const candidate = await candidateManifest(state.publication?.raw ?? source.raw, q.content.after);
        requireValue(candidate.raw === job.candidate.raw && candidate.contentHash === job.candidate.contentHash,
          'candidate_tampered');
        const publication = {
          id: job.id, project, sourceCommit: source.commit, sourceContentHash: await hash(source.raw),
          repositoryPath: source.repositoryPath, raw: candidate.raw, contentHash: candidate.contentHash,
          targetHash: job.targetHash, proposalDigest: q.digest, baseHash: version.hash,
          previousPublication: state.publication?.id ?? null, publishedBy: p.subject,
          reviewer: q.review.subject, sourceUnchanged: true,
          url: target.origin + '/collaboration/preview/' + job.id + '/',
        };
        state.publication = publication;
        const next = await current(state);
        job.status = 'verified'; job.execution = 'worker-snapshot-published'; job.publication = publication;
        job.evidence = { version: next.version, hash: await hash(next.version), verifiedAt: Date.now() };
        return publication;
      }, 'human', () => reviewers!);
    },
    async sourceProposal(p: Member, publicationId: string) {
      requireValue(p.project === project, 'project_membership_required', 403);
      const { state } = await store.load(p);
      const job = state.jobs.find(j => j.id === publicationId && j.execution === 'worker-snapshot-published');
      requireValue(job?.publication, 'preview_not_published', 404);
      state.publication = job.publication;
      await current(state); // Revalidate source pin and exact candidate bytes.
      return { kind: 'reviewed-source-proposal', repository, sourceCommit: source.commit,
        repositoryPath: source.repositoryPath, selector: { key: 'content:home', field: 'value' },
        expectedValue: source.raw, proposedValue: job.publication.raw,
        contentHash: job.publication.contentHash, proposalDigest: job.digest,
        previewUrl: job.publication.url, execution: 'not-applied',
        promotion: 'Requires source review and separate Micah production approval' };
    },
    async render(p: Member, publicationId?: string) {
      requireValue(p.project === project, 'project_membership_required', 403);
      const { state } = await store.load(p);
      if (publicationId) {
        requireValue(/^[a-f0-9-]{36}$/.test(publicationId), 'preview_not_published', 404);
        const job = state.jobs.find(j => j.id === publicationId && j.execution === 'worker-snapshot-published');
        state.publication = job?.publication;
      }
      requireValue(state.publication, 'preview_not_published', 404);
      const { version } = await current(state);
      const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]!));
      // Deliberately inert renderer: no scripts, remote assets, forms or user HTML.
      return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>MaverickX reviewed preview</title><style>:root{color-scheme:dark;--color-bg:#0b0b0b;--color-fg:#f5f5f3;--space:1.618rem}body{background:var(--color-bg);color:var(--color-fg);font-family:system-ui;margin:0;padding:var(--space)}main{max-width:70rem;margin:10vh auto}h1{font-size:clamp(2rem,7vw,6rem);line-height:1.08;overflow-wrap:anywhere}code{overflow-wrap:anywhere}p{line-height:1.6}</style><main><p>CREATE SOMETHING / MAVERICKX · Reviewed component preview</p><h1>${escape(version.text)}</h1><p>Approved snapshot of the home-page headline. Source and deployed site are unchanged.</p><p>Source <code>${escape(source.commit)}</code><br>Content <code>${escape(version.kvContentHash)}</code></p><a href="/collaboration/">Return to review</a></main></html>`, { headers: {
        'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, no-store',
        'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'; sandbox",
        'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer',
      } });
    },
  };
}
