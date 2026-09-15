import { evaluateGovernedInteractionCompatibility, parseGovernedInteractionBundle, verifyWorkflowArtifactSnapshot } from '@createsomething/workflow-compiler';
import { parseWorkflowRuntimeManifest, type WorkflowRuntimeManifest } from '@createsomething/workflow-runtime';

/** Supplied by the owning immutable release registry, never by an HTTP caller. */
export interface RegisteredWorkflowArtifact {
  artifactManifestSha256: string;
  runtimeManifestSha256: string;
  workflowId: string;
  workflowVersion: string;
  definitionHash: string;
  compilerVersion: string;
  runtimeManifestSchema: string;
  attestationKeyId: string;
  attestationPublicKeyFingerprint: string;
}

/** Host policy is independent of the bundle and must be checked anew after revocation. */
export interface WorkflowArtifactAdmissionPolicy {
  signer: { keyId: string; publicKeyPem: string; fingerprint: string };
  compilerVersions: readonly string[];
  runtimeManifestSchemas: readonly string[];
  capabilities: readonly string[];
  interactionHost: Parameters<typeof evaluateGovernedInteractionCompatibility>[1];
}

export async function admitWorkflowArtifact(
  reader: { read(digest: string): Promise<ReadonlyMap<string, Uint8Array>> },
  registrationInput: RegisteredWorkflowArtifact,
  policyInput: WorkflowArtifactAdmissionPolicy
): Promise<WorkflowRuntimeManifest> {
  // Caller mutation while R2 is in flight cannot change the admitted identity.
  const registration = { ...registrationInput };
  const policy = structuredClone(policyInput);
  const reject = () => { throw new Error('workflow_artifact_not_admitted'); };
  if (registration.attestationKeyId !== policy.signer.keyId ||
      registration.attestationPublicKeyFingerprint !== policy.signer.fingerprint ||
      !policy.compilerVersions.includes(registration.compilerVersion) ||
      !policy.runtimeManifestSchemas.includes(registration.runtimeManifestSchema)) reject();
  const input = await reader.read(registration.artifactManifestSha256);
  const files = new Map([...input].map(([path, bytes]) => [path, Uint8Array.from(bytes)]));
  const receipt = await verifyWorkflowArtifactSnapshot(files, { publicKey: policy.signer.publicKeyPem });
  if (receipt.status !== 'verified' || receipt.attestation.status !== 'verified' ||
      receipt.attestation.keyId !== registration.attestationKeyId ||
      receipt.attestation.publicKeyFingerprint !== registration.attestationPublicKeyFingerprint ||
      receipt.manifestHash !== registration.artifactManifestSha256 ||
      receipt.workflowId !== registration.workflowId || receipt.workflowVersion !== registration.workflowVersion ||
      receipt.definitionHash !== registration.definitionHash || receipt.compilerVersion !== registration.compilerVersion) reject();
  const bytes = files.get('runtime-manifest.json');
  if (!bytes) return reject();
  const digestBytes = await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes));
  const digest = `sha256:${Array.from(new Uint8Array(digestBytes), byte => byte.toString(16).padStart(2, '0')).join('')}`;
  if (digest !== registration.runtimeManifestSha256) reject();
  const manifest = parseWorkflowRuntimeManifest(JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(bytes)));
  if (manifest.schemaVersion !== registration.runtimeManifestSchema ||
      manifest.workflow.id !== registration.workflowId || manifest.workflow.version !== registration.workflowVersion ||
      manifest.workflow.definitionHash !== registration.definitionHash || manifest.workflow.compilerVersion !== registration.compilerVersion ||
      manifest.steps.some(step => step.disposition === 'pass' && !policy.capabilities.includes(step.capability.id))) reject();
  const links = {
    governedInteractionSha256: 'governed-interaction.json',
    decisionInventorySha256: 'decision-inventory.json',
    approvalSurfacesSha256: 'approval-surfaces.json',
    toolContractsSha256: 'tool-contracts.json'
  } as const;
  for (const [field, path] of Object.entries(links)) {
    const artifact = files.get(path);
    if (!artifact) return reject();
    const hash = await crypto.subtle.digest('SHA-256', Uint8Array.from(artifact));
    const actual = `sha256:${Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')}`;
    if (manifest.artifacts[field as keyof typeof links] !== actual) reject();
  }
  if (!policy.interactionHost.schemaVersions?.length) reject();
  const interaction = parseGovernedInteractionBundle(JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(files.get('governed-interaction.json')!)));
  if (interaction.workflowId !== registration.workflowId ||
      interaction.workflowVersion !== registration.workflowVersion ||
      interaction.definitionHash !== registration.definitionHash) reject();
  if (!evaluateGovernedInteractionCompatibility(interaction, policy.interactionHost).compatible) reject();
  const freeze = (value: object): void => {
    for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
    Object.freeze(value);
  };
  freeze(manifest);
  return manifest;
}
