/** Future asynchronous host port. No Artifacts backend is provisioned or implemented. */
export type RepositoryAuthority =
  | "synthetic"
  | "proposal-workspace"
  | "canonical";
export interface SourceVersion {
  repositoryKey: string;
  commit: string;
  contentHash: string;
  deploymentCommit: string;
  kvContentHash: string;
}
export interface ReviewedChange {
  tenant: string; // Supplied by server membership policy, never raw tool arguments.
  proposalId: string;
  digest: string;
  expected: SourceVersion;
  field: "hero.title";
  before: string;
  after: string;
  approvalReceiptId: string; // Resolved and checked by the judgment service.
}
export interface RepositoryReceipt {
  operationId: string;
  proposalId: string;
  digest: string;
  repositoryKey: string;
  commit: string;
  authority: RepositoryAuthority;
  deploymentAuthorized: false;
}
export interface ProposalRepositoryPort {
  readonly authority: RepositoryAuthority;
  readVersion(): Promise<SourceVersion>;
  /** Requires expected-ref CAS. Unsupported backends must fail, never overwrite. */
  applyReviewed(
    change: ReviewedChange,
    operationId: string,
  ): Promise<RepositoryReceipt>;
  /** Reconcile uncertain writes before retry. Does not create approval. */
  findReceipt(operationId: string): Promise<RepositoryReceipt | null>;
}
/** An agent workspace commit must never masquerade as canonical source promotion. */
export function isCanonicalSourceApplication(
  receipt: RepositoryReceipt,
): boolean {
  return receipt.authority === "canonical";
}
