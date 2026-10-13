import { requireValue } from "./common";
import type { Observation, PreviewTarget } from "./version";
type Deployment = {
  id: string;
  commit: string;
  branch: string;
  project: string;
};
type Manifest = {
  commit: string;
  repository: string;
  path: string;
  raw: string;
};
/** Bind these ports to one reviewed project only. Never accept URL/repo/namespace
 * selection from the client. Repeated reads detect observed drift but cannot make
 * external Git/Pages/KV transactional: a controlled versioned publisher remains
 * necessary before enabling automated execution. */
export function previewObservationReader(options: {
  project: string;
  repository: string;
  target: PreviewTarget;
  deployment: { read: () => Promise<Deployment> };
  git: { readManifest: (commit: string) => Promise<Manifest> };
  kv: Pick<KVNamespace, "get">;
  now?: () => number;
}) {
  const { project, repository, target, deployment, git, kv } = options;
  return async (): Promise<Observation> => {
    const first = await deployment.read();
    requireValue(
      first.project === target.project &&
        first.branch === target.branch &&
        /^[a-f0-9]{40}$/.test(first.commit),
      "deployment_scope_mismatch",
    );
    const [manifest, rawKV] = await Promise.all([
      git.readManifest(first.commit),
      kv.get("content:home", "text"),
    ]);
    requireValue(
      manifest.commit === first.commit &&
        manifest.repository === repository &&
        manifest.path === "content/home.json",
      "git_snapshot_mismatch",
    );
    requireValue(typeof rawKV === "string", "runtime_content_missing");
    const [last, confirmKV] = await Promise.all([
      deployment.read(),
      kv.get("content:home", "text"),
    ]);
    requireValue(
      JSON.stringify(first) === JSON.stringify(last) && rawKV === confirmKV,
      "observation_changed_retry",
    );
    return {
      project,
      repository,
      path: manifest.path,
      sourceCommit: manifest.commit,
      sourceRaw: manifest.raw,
      deploymentId: first.id,
      deploymentCommit: first.commit,
      rawKV,
      observedAt: (options.now ?? Date.now)(),
      target: structuredClone(target),
    };
  };
}
