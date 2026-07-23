import {
  buildReferenceMissionReadModel,
  type ReferenceMissionReadModel
} from '../governance/reference-mission';
import {
  listGovernanceDecisions,
  listGovernanceDeliveryReceipts,
  listGovernanceProofs,
  listGovernanceSignals
} from './governance-runtime';

type GovernanceD1Database = Parameters<typeof listGovernanceSignals>[0];

export async function loadReferenceMissionReadModel(
  db: GovernanceD1Database,
  options: { now?: string; staleAfterMs?: number } = {}
): Promise<ReferenceMissionReadModel> {
  const signals = await listGovernanceSignals(db, { limit: 100 });
  const preliminary = buildReferenceMissionReadModel(
    { signals, decisions: [], proofs: [], receipts: [] },
    options
  );
  const signalId = preliminary.operator?.source.signal_id;
  if (!signalId) return preliminary;

  const [decisions, proofs] = await Promise.all([
    listGovernanceDecisions(db, { signalId, limit: 100 }),
    listGovernanceProofs(db, { signalId, limit: 100 })
  ]);
  const receiptBatches = await Promise.all(
    proofs.map((proof) =>
      listGovernanceDeliveryReceipts(db, {
        recordProductId: 'proof',
        recordId: proof.id,
        limit: 100
      })
    )
  );

  return buildReferenceMissionReadModel(
    { signals, decisions, proofs, receipts: receiptBatches.flat() },
    options
  );
}
