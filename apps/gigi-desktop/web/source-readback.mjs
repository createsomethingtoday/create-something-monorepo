/** A detail read can omit an attached source. Retain it as prior evidence, explicitly. */
export function reconcileSourceReadback(previous, readback) {
  if (!readback || readback.id !== previous?.id) throw new Error('The record readback did not match.');
  if (previous.source?.kind && previous.source.kind !== 'manual' && !readback.source?.kind) {
    return {record:{...readback,source:previous.source},status:'retained'};
  }
  return {record:readback,status:readback.source?.kind ? 'read' : 'unavailable'};
}

export function sourceEvidenceRows(source) {
 return [['Source reference',source?.externalId],['Last source fetch',source?.observedAt],['Import coverage',source?.coverage ?? 'Not recorded']].filter(([,v])=>typeof v==='string'&&v.trim()).map(([label,value])=>({label,value}));
}

/** Never infer money semantics from a title, sign, merchant, or legacy statement. */
export function recordedMoneyKind(record) {
 const value=record?.fields?.['Transaction Kind'] ?? record?.source?.preview?.transactionKind;
 return ['Payment','Transfer','Refund'].includes(value) ? value : 'Unknown';
}
