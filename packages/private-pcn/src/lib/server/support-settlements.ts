import type Stripe from 'stripe';
import type { Network } from './networks';
import { validateSupportAccount } from './support-payments';

export const SUPPORT_POLICY = 'net_processing_75_v1';
const idOf = (v: string | { id: string } | null | undefined) => (typeof v === 'string' ? v : v?.id);
function requireProof(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(`Support settlement: ${message}`);
}
type Env = App.Platform['env'];
interface Settlement {
  charge_id: string;
  invoice_id: string;
  network_id: string;
  partner_id: string;
  destination: string;
  policy: string;
  gross: number;
  processing_fee: number;
  partner_amount: number;
  transfer_id: string | null;
  reversed_amount: number;
}

// Separate transfers are needed because the charge's actual processing fee is
// available only after payment. Never estimate fees or transfer from a redirect.
export async function reconcileSupportPayments(env: Env, network: Network, stripe: Stripe) {
  const workspace = await env.DB.prepare(
    `SELECT s.partner_id,s.status,s.settlement_policy,p.account_id,p.approved,a.status AS creator_status,b.customer_id
     FROM support_workspaces s JOIN support_partners p ON p.subject=s.partner_id
     JOIN creator_applications a ON a.subject=p.subject JOIN network_billing b ON b.network_id=s.network_id WHERE s.network_id=?`
  )
    .bind(network.id)
    .first<{
      partner_id: string;
      status: string;
      settlement_policy: string;
      account_id: string | null;
      approved: number;
      creator_status: string;
      customer_id: string | null;
    }>();
  if (!workspace?.customer_id) return;
  const live = String(env.STRIPE_SECRET_KEY).includes('_live_');
  const invoices = await stripe.invoices.list({
    customer: workspace.customer_id,
    status: 'paid',
    limit: 100
  });
  requireProof(!invoices.has_more, 'invoice history requires operator reconciliation');
  for (const invoice of invoices.data) {
    const subscriptionId = idOf(invoice.parent?.subscription_details?.subscription);
    if (!subscriptionId) continue;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    if (subscription.metadata.network_id !== network.id) continue;
    requireProof(
      subscription.metadata.support_policy === SUPPORT_POLICY &&
        workspace.settlement_policy === SUPPORT_POLICY,
      'unrecognized settlement policy; do not migrate an existing contract silently'
    );
    const destination = subscription.metadata.support_destination;
    const partner = subscription.metadata.support_partner;
    requireProof(
      destination &&
        partner === workspace.partner_id &&
        idOf(subscription.customer) === workspace.customer_id &&
        subscription.metadata.owner_id === network.owner_id &&
        subscription.livemode === live &&
        !subscription.transfer_data &&
        subscription.application_fee_percent == null,
      'subscription ownership or transfer policy differs'
    );
    const line = invoice.lines.data[0];
    requireProof(
      invoice.livemode === live &&
        idOf(invoice.customer) === workspace.customer_id &&
        invoice.status === 'paid' &&
        invoice.amount_paid === 90000 &&
        invoice.total === 90000 &&
        invoice.subtotal === 90000 &&
        !invoice.lines.has_more &&
        invoice.lines.data.length === 1 &&
        line.quantity === 1 &&
        line.amount === 90000 &&
        line.pricing?.price_details?.price === env.STRIPE_SUPPORT_PRICE_ID,
      'invoice amount, price or tax requires review'
    );
    const payments = await stripe.invoicePayments.list({
      invoice: invoice.id,
      status: 'paid',
      limit: 100
    });
    requireProof(!payments.has_more && payments.data.length === 1, 'ambiguous invoice payments');
    const payment = payments.data[0].payment;
    const intentId = idOf(payment.payment_intent);
    requireProof(payment.type === 'payment_intent' && intentId, 'unsupported payment source');
    const intent = await stripe.paymentIntents.retrieve(intentId!, {
      expand: ['latest_charge.balance_transaction']
    });
    const charge = intent.latest_charge;
    requireProof(
      intent.status === 'succeeded' &&
        intent.livemode === live &&
        intent.currency === 'usd' &&
        intent.amount === 90000 &&
        intent.amount_received === 90000 &&
        idOf(intent.customer) === workspace.customer_id &&
        !intent.transfer_data &&
        !intent.application_fee_amount &&
        !intent.on_behalf_of &&
        charge &&
        typeof charge !== 'string',
      'payment could not be verified'
    );
    if (!charge || typeof charge === 'string') throw new Error('Missing charge');
    requireProof(
      charge.paid &&
        charge.captured &&
        charge.livemode === live &&
        charge.currency === 'usd' &&
        charge.amount === 90000 &&
        idOf(charge.customer) === workspace.customer_id &&
        idOf(charge.payment_intent) === intent.id,
      'charge ownership differs'
    );
    const balance = charge.balance_transaction;
    requireProof(
      balance && typeof balance !== 'string',
      'processing fee not available yet; retry on charge.updated'
    );
    if (!balance || typeof balance === 'string') throw new Error('Missing processing fee');
    requireProof(
      idOf(balance.source) === charge.id &&
        balance.type === 'charge' &&
        balance.currency === 'usd' &&
        balance.amount === charge.amount &&
        Number.isSafeInteger(balance.fee) &&
        balance.fee >= 0 &&
        balance.fee <= charge.amount &&
        balance.net === balance.amount - balance.fee,
      'processing fee could not be verified'
    );
    const initialShare = Math.floor(((charge.amount - balance.fee) * 75) / 100);
    await env.DB.prepare(
      `INSERT INTO support_settlements(charge_id,invoice_id,network_id,partner_id,destination,policy,gross,processing_fee,partner_amount)
      VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(charge_id) DO NOTHING`
    )
      .bind(
        charge.id,
        invoice.id,
        network.id,
        partner,
        destination,
        SUPPORT_POLICY,
        charge.amount,
        balance.fee,
        initialShare
      )
      .run();
    const lease = crypto.randomUUID(),
      now = Math.floor(Date.now() / 1000);
    const row = await env.DB.prepare(
      'UPDATE support_settlements SET lease_id=?,lease_until=? WHERE charge_id=? AND lease_until<? RETURNING *'
    )
      .bind(lease, now + 120, charge.id, now)
      .first<Settlement>();
    requireProof(row, 'another settlement is running; retry');
    if (!row) throw new Error('Missing settlement lease');
    try {
      requireProof(
        row.invoice_id === invoice.id &&
          row.network_id === network.id &&
          row.partner_id === partner &&
          row.destination === destination &&
          row.policy === SUPPORT_POLICY &&
          row.gross === charge.amount &&
          row.processing_fee === balance.fee &&
          row.partner_amount === initialShare,
        'immutable settlement details differ'
      );
      const group = `pcn_support_${charge.id}`;
      // Recover successful creates whose response/storage write was lost, even
      // after Stripe's idempotency-key retention window has elapsed.
      const found = await stripe.transfers.list({ transfer_group: group, limit: 100 });
      requireProof(!found.has_more && found.data.length <= 1, 'ambiguous transfer history');
      let transfer = found.data[0];
      const eligible =
        workspace.status === 'agreed' &&
        workspace.approved === 1 &&
        workspace.creator_status === 'approved' &&
        workspace.account_id === destination;
      const target =
        charge.disputed || charge.refunded
          ? 0
          : Math.floor(
              (Math.max(0, charge.amount - charge.amount_refunded - balance.fee) * 75) / 100
            );
      if (!transfer && !row.transfer_id && target > 0) {
        requireProof(eligible, 'partner approval is required before transferring');
        const account = await stripe.v2.core.accounts.retrieve(destination, {
          include: ['configuration.recipient', 'defaults']
        });
        requireProof(
          account.id === destination && validateSupportAccount(account, partner, env),
          'partner transfer capability unavailable'
        );
        transfer = await stripe.transfers.create(
          {
            amount: target,
            currency: 'usd',
            destination,
            source_transaction: charge.id,
            transfer_group: group,
            metadata: {
              application: 'private_pcn_support',
              policy: SUPPORT_POLICY,
              network_id: network.id,
              invoice_id: invoice.id,
              charge_id: charge.id,
              partner_id: partner
            }
          },
          { idempotencyKey: `pcn-support-transfer-${charge.id}` }
        );
      }
      if (transfer) {
        requireProof(
          transfer.livemode === live &&
            transfer.currency === 'usd' &&
            idOf(transfer.destination) === destination &&
            idOf(transfer.source_transaction) === charge.id &&
            transfer.transfer_group === group &&
            transfer.amount <= initialShare &&
            transfer.metadata?.policy === SUPPORT_POLICY &&
            transfer.metadata.network_id === network.id &&
            transfer.metadata.invoice_id === invoice.id &&
            transfer.metadata.charge_id === charge.id &&
            transfer.metadata.partner_id === partner &&
            (!row.transfer_id || row.transfer_id === transfer.id),
          'transfer evidence differs'
        );
        const reversed = Math.max(0, transfer.amount - target);
        if (reversed > transfer.amount_reversed) {
          await stripe.transfers.createReversal(
            transfer.id,
            {
              amount: reversed - transfer.amount_reversed,
              metadata: {
                application: 'private_pcn_support',
                charge_id: charge.id,
                target_reversed: String(reversed)
              }
            },
            { idempotencyKey: `pcn-support-reverse-${charge.id}-${reversed}` }
          );
          transfer.amount_reversed = reversed;
        }
        // Never automatically re-pay previously reversed money. Dispute wins or
        // externally changed transfers require explicit operator reconciliation.
        const state =
          transfer.amount - transfer.amount_reversed < target
            ? 'review'
            : target === 0
              ? 'reversed'
              : 'settled';
        const saved = await env.DB.prepare(
          'UPDATE support_settlements SET transfer_id=?,reversed_amount=?,state=?,updated_at=CURRENT_TIMESTAMP WHERE charge_id=? AND lease_id=?'
        )
          .bind(transfer.id, transfer.amount_reversed, state, charge.id, lease)
          .run();
        requireProof(saved.meta.changes === 1, 'lease changed; retry');
      } else {
        requireProof(!row.transfer_id, 'recorded transfer missing from provider history');
        await env.DB.prepare(
          "UPDATE support_settlements SET state='withheld',updated_at=CURRENT_TIMESTAMP WHERE charge_id=? AND lease_id=?"
        )
          .bind(charge.id, lease)
          .run();
      }
    } finally {
      await env.DB.prepare(
        'UPDATE support_settlements SET lease_id=NULL,lease_until=0 WHERE charge_id=? AND lease_id=?'
      )
        .bind(charge.id, lease)
        .run();
    }
  }
}
