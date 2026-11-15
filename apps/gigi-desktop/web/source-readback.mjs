/** A detail read can omit an attached source. Retain it as prior evidence, explicitly. */
export function reconcileSourceReadback(previous, readback) {
  if (!readback || readback.id !== previous?.id || (previous.entity && readback.entity && previous.entity !== readback.entity)) throw new Error('The record readback did not match.');
  const prior = previous.source;
  const current = readback.source;
  const identity = ['kind', 'provider', 'connectedAccountId', 'externalId'];
  const changed = current && identity.some(key => Object.hasOwn(current, key) && current[key] !== prior?.[key]);
  if (current !== null && prior?.kind && prior.kind !== 'manual' && !changed) {
    // Omission is historical evidence, never a claim that it was freshly fetched.
    // Explicit null values and any changed source identity supersede old evidence.
    const omitted = Object.keys(prior).filter(key => !current || !Object.hasOwn(current, key));
    if (omitted.length) return {record:{...readback,source:{...prior,...current}},status:'retained'};
  }
  return {record:readback,status:current?.kind ? 'read' : 'unavailable'};
}

export function sourceEvidenceRows(source) {
 return [['Source reference',source?.externalId],['Last source fetch',source?.observedAt],['Import coverage',source?.coverage ?? 'Not recorded']].filter(([,v])=>typeof v==='string'&&v.trim()).map(([label,value])=>({label,value}));
}

/** Never infer money semantics from a title, sign, merchant, or legacy statement. */
export function recordedMoneyKind(record) {
 const value=record?.fields?.['Transaction Kind'] ?? record?.source?.preview?.transactionKind;
 return ['Payment','Transfer','Refund'].includes(value) ? value : 'Unknown';
}
