import { verifyWorkflowRuntimeRun, type WorkflowRuntimeRun, type WorkflowRuntimeScope } from '@createsomething/workflow-runtime';
import type { WorkflowRuntimeManifestAuthority } from './workflow-runtime-manifest-authority.js';
import { D1VerifiedBuildWorkflowRuntimeProofReader } from './workflow-runtime-proof-projection.js';

/** D1 already commits immutable receipts with the checkpoint. Acknowledge only
 * after independent ledger readback; never introduce another receipt writer.
 */
export class D1VerifiedWorkflowRuntimeReceiptSink {
  private readonly scope: WorkflowRuntimeScope;
  private readonly proofs: D1VerifiedBuildWorkflowRuntimeProofReader;
  constructor(database: D1Database, private readonly manifests: WorkflowRuntimeManifestAuthority,
    scope: WorkflowRuntimeScope) {
    this.scope = structuredClone(scope);
    this.proofs = new D1VerifiedBuildWorkflowRuntimeProofReader(database, manifests);
  }

  async write(run: WorkflowRuntimeRun): Promise<void> {
    const snapshot = structuredClone(run);
    const manifest = await this.manifests.findByRuntimeManifestSha256(snapshot.runtimeManifestSha256);
    if (!manifest) throw new Error('runtime_receipt_manifest_unavailable');
    await verifyWorkflowRuntimeRun(manifest, snapshot);
    const proof = await this.proofs.find({ scope: this.scope, runId: snapshot.id });
    if (!proof || proof.run.version < snapshot.version ||
        proof.run.runtimeManifestSha256 !== snapshot.runtimeManifestSha256 ||
        proof.run.artifactManifestSha256 !== snapshot.artifactManifestSha256 ||
        snapshot.receipts.some((receipt, index) => proof.receipts[index]?.receiptSha256 !== receipt.receiptSha256))
      throw new Error('runtime_receipt_ledger_mismatch');
  }
}
