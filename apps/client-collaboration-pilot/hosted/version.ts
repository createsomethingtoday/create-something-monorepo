import { hash, requireValue, text } from "./common";
export type PreviewTarget = {
  project: string;
  origin: string;
  branch: string;
  contentBinding: string;
};
export type Observation = {
  project: string;
  repository: string;
  path: string;
  sourceCommit: string;
  sourceRaw: string;
  deploymentId: string;
  deploymentCommit: string;
  rawKV: string;
  contentKey?: string;
  observedAt: number;
  target: PreviewTarget;
};
export type Version = Awaited<ReturnType<typeof mapVersion>>;
// Input comes only from a trusted operator/server adapter, never a browser body.
export async function mapVersion(
  observation: Observation,
  expected: { project: string; repository: string; target: PreviewTarget },
  now = Date.now(),
) {
  const o = observation;
  const u = new URL(expected.target.origin);
  requireValue(
    u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.search &&
      !u.hash &&
      u.pathname === "/" &&
      !u.port,
    "invalid_preview_target",
  );
  requireValue(
    o.project === expected.project &&
      o.repository === expected.repository &&
      o.path === "content/home.json" &&
      JSON.stringify(o.target) === JSON.stringify(expected.target),
    "version_scope_mismatch",
  );
  requireValue(
    /^[a-f0-9]{40}$/.test(o.sourceCommit) &&
      /^[a-f0-9]{40}$/.test(o.deploymentCommit),
    "invalid_commit",
  );
  requireValue(
    Number.isFinite(o.observedAt) &&
      o.observedAt <= now &&
      now - o.observedAt <= 300000,
    "stale_observation",
  );
  text(o.deploymentId, 160);
  text(o.sourceRaw, 32768);
  text(o.rawKV, 32768);
  const source = JSON.parse(o.sourceRaw),
    runtime = JSON.parse(o.rawKV);
  text(source.hero?.title, 160);
  text(runtime.hero?.title, 160);
  requireValue(
    JSON.stringify(source) === JSON.stringify(runtime) &&
      source.hero.title === runtime.hero.title &&
      o.sourceCommit === o.deploymentCommit,
    "source_runtime_diverged",
  );
  const contentKey = o.contentKey ?? "content:home";
  requireValue(
    contentKey === "content:home" ||
      new RegExp(
        "^collaboration/" +
          expected.project +
          "/[a-f0-9-]{36}/[a-f0-9]{64}\\.json$",
      ).test(contentKey),
    "invalid_content_key",
  );
  const version = {
    project: o.project,
    repository: o.repository,
    path: o.path,
    page: "/",
    component: "hero.headline",
    field: "hero.title",
    sourceCommit: o.sourceCommit,
    sourceContentHash: await hash(o.sourceRaw),
    deploymentId: o.deploymentId,
    deploymentCommit: o.deploymentCommit,
    kvKey: contentKey,
    kvContentHash: await hash(o.rawKV),
    target: structuredClone(o.target),
    text: source.hero.title,
  };
  return { ...version, hash: await hash(version) };
}
export async function candidateManifest(raw: string, replacement: string) {
  text(replacement, 160);
  const content = JSON.parse(raw);
  requireValue(
    content.hero && typeof content.hero.title === "string",
    "manifest_required",
  );
  content.hero.title = replacement;
  const candidateRaw = JSON.stringify(content) + "\n";
  return { raw: candidateRaw, contentHash: await hash(candidateRaw) };
}
