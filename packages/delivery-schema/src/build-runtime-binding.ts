/** Accepted Build artifact. It deliberately omits its containing Build manifest
 * hash to avoid a circular digest; Agency freezes that separate identity. */
export interface BuildRuntimeBinding {
  schema: 'create-something/build-runtime-binding@1';
  buildReleaseId: string;
  contractSha256: string;
  runtimePolicySha256: string;
  artifactManifestSha256: string;
  runtimeManifestSha256: string;
  workflowId: string;
  workflowVersion: string;
  definitionHash: string;
  compilerVersion: string;
  runtimeManifestSchema: 'workflow_runtime_manifest.v0.1' | 'workflow_runtime_manifest.v0.2';
  attestationKeyId: string;
  attestationPublicKeyFingerprint: string;
  artifactPrefix: string;
}

const digestFields = ['contractSha256','runtimePolicySha256','artifactManifestSha256',
  'runtimeManifestSha256','definitionHash','attestationPublicKeyFingerprint'] as const;
const textFields = ['buildReleaseId','workflowId','workflowVersion','compilerVersion','attestationKeyId'] as const;
const fields = ['schema','runtimeManifestSchema','artifactPrefix',...digestFields,...textFields];

export function parseBuildRuntimeBinding(input: unknown): Readonly<BuildRuntimeBinding> {
  const fail = (): never => { throw new Error('invalid_build_runtime_binding'); };
  if (!input || typeof input !== 'object' || Array.isArray(input)) return fail();
  const value = input as Record<string, unknown>;
  if (Object.keys(value).length !== fields.length || fields.some(field=>!Object.prototype.hasOwnProperty.call(value,field))) return fail();
  if (value.schema !== 'create-something/build-runtime-binding@1' ||
      typeof value.runtimeManifestSchema !== 'string' ||
      !['workflow_runtime_manifest.v0.1','workflow_runtime_manifest.v0.2'].includes(value.runtimeManifestSchema)) return fail();
  for (const field of digestFields)
    if (typeof value[field] !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(value[field] as string)) return fail();
  for (const field of textFields)
    if (typeof value[field] !== 'string' || !(value[field] as string).length ||
        (value[field] as string).length > 300 || value[field] !== (value[field] as string).trim()) return fail();
  if (value.artifactPrefix !== `workflow-artifacts/${(value.artifactManifestSha256 as string).slice(7)}/`) return fail();
  return Object.freeze({ ...value }) as unknown as Readonly<BuildRuntimeBinding>;
}
