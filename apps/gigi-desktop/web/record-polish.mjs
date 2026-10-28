export function historyPresentation(item) {
  const operation = item.operation || item.action;
  const action = ({'records.save':'Saved record','relations.link':'Linked records','workspace.create':'Created workspace','backup.create':'Created backup','backup.restore':'Restored backup'})[operation] || 'Workspace activity';
  const prefix = `Saved ${item.entity} ${item.recordId}: `;
  const detail = item.title || (typeof item.summary === 'string' && item.summary.startsWith(prefix) ? item.summary.slice(prefix.length) : item.summary || '');
  const raw = item.createdAt || item.at || '';
  const instant = new Date(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw) ? raw.replace(' ', 'T')+'Z' : raw);
  const time = Number.isFinite(instant.getTime()) ? new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(instant) : raw;
  return {action, detail, time};
}
export function copyableRecordField(key, value) {
  return ['Link','Website','Map URL','Email','Phone'].includes(key) && typeof value === 'string' && value.trim() ? value : null;
}
