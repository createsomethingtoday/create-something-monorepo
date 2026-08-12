import type {
  AgentCommercialAuthorizationReceipt,
  AgentCommercialAuthorizationStore
} from './agent-commercial-contract.js';

type D1BoundStatement = unknown;

export type AgentCommercialD1Database = {
  prepare(sql: string): {
    bind(...values: unknown[]): D1BoundStatement;
  };
  batch(statements: D1BoundStatement[]): Promise<
    Array<{
      success: boolean;
      results?: unknown[];
      meta?: { changes?: number };
    }>
  >;
};

type AuthorizationReceiptRow = {
  receipt_id: string;
  decision_id: string;
  contract_id: string;
  capability_id: string;
  principal_id: string;
  decision: AgentCommercialAuthorizationReceipt['decision'];
  reason: string;
  entitlement_or_payment_ref: string | null;
  approval_receipt_id: string | null;
  outcome: AgentCommercialAuthorizationReceipt['outcome'];
  environment: AgentCommercialAuthorizationReceipt['environment'];
  occurred_at: string;
};

const INSERT_RECEIPT = `INSERT INTO agent_commercial_authorization_receipts (
  receipt_id,
  decision_id,
  contract_id,
  capability_id,
  principal_id,
  decision,
  reason,
  entitlement_or_payment_ref,
  approval_receipt_id,
  outcome,
  environment,
  occurred_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(decision_id) DO NOTHING`;

const READ_RECEIPT = `SELECT
  receipt_id,
  decision_id,
  contract_id,
  capability_id,
  principal_id,
  decision,
  reason,
  entitlement_or_payment_ref,
  approval_receipt_id,
  outcome,
  environment,
  occurred_at
FROM agent_commercial_authorization_receipts
WHERE decision_id = ?`;

function receiptFromRow(row: AuthorizationReceiptRow): AgentCommercialAuthorizationReceipt {
  return {
    receiptId: row.receipt_id,
    decisionId: row.decision_id,
    contractId: row.contract_id,
    capabilityId: row.capability_id,
    principalId: row.principal_id,
    decision: row.decision,
    reason: row.reason,
    entitlementOrPaymentRef: row.entitlement_or_payment_ref,
    approvalReceiptId: row.approval_receipt_id,
    outcome: row.outcome,
    environment: row.environment,
    occurredAt: row.occurred_at
  };
}

/**
 * Adapt a Cloudflare D1 primary binding to the commercial authorization store.
 * D1 batch provides the atomic insert/readback boundary and the decision primary
 * key provides idempotency across concurrent retries.
 */
export function createD1AgentCommercialAuthorizationStore(
  db: AgentCommercialD1Database
): AgentCommercialAuthorizationStore {
  return {
    async commit(receipt) {
      const insert = db
        .prepare(INSERT_RECEIPT)
        .bind(
          receipt.receiptId,
          receipt.decisionId,
          receipt.contractId,
          receipt.capabilityId,
          receipt.principalId,
          receipt.decision,
          receipt.reason,
          receipt.entitlementOrPaymentRef,
          receipt.approvalReceiptId,
          receipt.outcome,
          receipt.environment,
          receipt.occurredAt
        );
      const read = db.prepare(READ_RECEIPT).bind(receipt.decisionId);
      const [insertResult, readResult] = await db.batch([insert, read]);
      const row = readResult?.results?.[0] as AuthorizationReceiptRow | undefined;

      if (!insertResult?.success || !readResult?.success || !row) {
        throw new Error('D1 did not commit and read back the commercial authorization receipt');
      }

      return {
        status: insertResult.meta?.changes === 1 ? 'inserted' : 'existing',
        receipt: receiptFromRow(row)
      };
    }
  };
}
