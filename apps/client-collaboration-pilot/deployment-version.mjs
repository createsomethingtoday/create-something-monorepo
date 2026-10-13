import { createHash } from "node:crypto";
const hash = (value) => createHash("sha256").update(value).digest("hex");
/** Synchronous recorded-evidence adapter. It deliberately cannot fetch or write live KV. */
export function deploymentVersion(
  source,
  record,
  tenant,
  now = () => Date.now(),
) {
  if (
    !record ||
    record.tenant !== tenant ||
    record.page !== "/" ||
    record.kvKey !== "content:home" ||
    record.field !== "hero.title" ||
    !/^([a-f0-9]{40}|[a-f0-9]{64})$/.test(record.deploymentCommit) ||
    typeof record.rawKV !== "string" ||
    Buffer.byteLength(record.rawKV) > 32768
  )
    throw Error("invalid_deployment_evidence");
  if (
    !Number.isFinite(record.observedAt) ||
    record.observedAt > now() ||
    now() - record.observedAt > 300000
  )
    throw Error("stale_deployment_evidence");
  let content;
  try {
    content = JSON.parse(record.rawKV);
  } catch {
    throw Error("invalid_deployment_content");
  }
  if (typeof content.hero?.title !== "string")
    throw Error("missing_runtime_title");
  return {
    ...source,
    effectiveText: content.hero.title,
    mappingReady: source.text === content.hero.title,
    deploymentVersion: {
      deploymentCommit: record.deploymentCommit,
      kvKey: record.kvKey,
      field: record.field,
      kvContentHash: hash(record.rawKV),
    },
  };
}
