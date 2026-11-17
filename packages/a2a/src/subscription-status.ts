/** Effective monitoring state, derived without rewriting persisted subscription rows. */
export function effectiveSubscriptionStatus(subscription:{status:string;expiresAt:unknown},now=Date.now()):string {
  if(subscription.status==='revoked'||subscription.status==='paused')return subscription.status;
  const expiry=subscription.expiresAt;
  if(typeof expiry!=='number'||!Number.isFinite(expiry))return 'unknown';
  if(expiry<=now)return 'expired';
  return subscription.status;
}
