import { displayField } from './experience.mjs';
import { moneyFields, supportedCurrencies } from './model.mjs';

const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
function same(left, right) {
  if (left === right) return true;
  if (Array.isArray(left) && Array.isArray(right)) return left.length === right.length && left.every((value, i) => same(value, right[i]));
  if (!object(left) || !object(right)) return false;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every((key) => Object.hasOwn(right, key) && same(left[key], right[key]));
}
function valueCopy(name, value, currency, currencyKnown = true) {
  if (value === null) return 'Cleared (null)';
  if (value === '') return '(empty string)';
  if (moneyFields.has(name)) {
    if (typeof value !== 'number' || !Number.isSafeInteger(value)) return `${JSON.stringify(value)} (invalid minor-unit value)`;
    if (!currencyKnown) return `${displayField(name, value, null).replace('(currency unset)', '(currency unavailable)')}`;
    const formatted = displayField(name, value, currency);
    return supportedCurrencies.has(currency) ? `${formatted} ${currency}` : formatted;
  }
  const formatted = displayField(name, value, currency);
  const dateField = name === 'Date' || name.endsWith(' Date') || name === 'Call Time' || name === 'Set Time';
  return dateField && typeof value === 'string' && formatted !== value ? `${formatted}\n${value}` : formatted;
}

export function approvalCopy(item, currency = null, currencyKnown = true) {
  let args;
  try { args = JSON.parse(item.detail); } catch { /* Keep non-JSON provider detail as escaped explanatory text. */ }
  const technical = `<details><summary>Technical details</summary><pre>${escape(item.detail)}</pre></details>`;
  if (!object(args)) return `<strong>${escape(item.title)}</strong><p>${escape(item.detail)}</p>`;
  const tool = String(item.title || '').replace(/^Approve\s+/, '');
  if (tool !== 'gigi_records_save') return `<strong>${escape(item.title)}</strong><p>${escape(item.detail)}</p>${technical}`;
  const before = args.expectedRecord;
  const snapshot = object(before) && typeof before.title === 'string' && object(before.fields) && object(before.source);
  const mode = Object.hasOwn(args, 'fieldsMode') ? args.fieldsMode : 'merge';
  const validFields = object(args.fields) || (args.fields === undefined && mode === 'merge');
  const comparable = snapshot && validFields && ['merge', 'replace'].includes(mode) && typeof args.title === 'string' && args.title.trim() !== '';
  const fields = object(args.fields) ? args.fields : {};
  const nextFields = comparable ? mode === 'replace' ? fields : { ...before.fields, ...fields } : fields;
  const beforeCurrency = args.entity === 'profile' && snapshot ? before.fields.Currency ?? null : currency;
  const nextCurrency = args.entity === 'profile' ? nextFields.Currency ?? null : currency;
  const profileCurrencyKnown = args.entity === 'profile' && snapshot;
  const rows = [];
  const row = (name, oldValue, newValue, hasOld = true, hasNew = true) => {
    if (comparable && hasOld === hasNew && same(oldValue, newValue)) return;
    rows.push(`<tr><th scope="row">${escape(name)}</th><td>${!comparable ? 'Unavailable' : hasOld ? escape(valueCopy(name, oldValue, beforeCurrency, profileCurrencyKnown || currencyKnown)) : 'Not set'}</td><td>${hasNew ? escape(valueCopy(name, newValue, nextCurrency, profileCurrencyKnown || currencyKnown)) : 'Removed'}</td></tr>`);
  };
  if (Object.hasOwn(args, 'title')) row('Title', before?.title, typeof args.title === 'string' ? args.title.trim() : args.title);
  if (comparable) {
    for (const name of new Set([...Object.keys(before.fields), ...Object.keys(nextFields)])) row(name, before.fields[name], nextFields[name], Object.hasOwn(before.fields, name), Object.hasOwn(nextFields, name));
  } else {
    for (const [name, value] of Object.entries(fields)) row(name, undefined, value);
    if (!validFields) row('Fields', undefined, args.fields);
  }
  if (Object.hasOwn(args, 'source')) {
    // records.save retains import provenance when explicitly converting to manual.
    const next = snapshot && object(args.source) && args.source.kind === 'manual' && before.source.kind !== 'manual' ? { ...args.source, origin: before.source } : args.source;
    row('Source', before?.source, next);
  }
  const title = snapshot ? before.title : args.title;
  const summary = [args.entity, title].filter((value) => typeof value === 'string' && value.trim()).join(' · ');
  const note = !comparable ? `<p class="chat-proposal-note">${snapshot ? 'These proposed values cannot be compared with the current record.' : 'Current values unavailable.'} Review the proposed values and technical details before deciding.</p>` : '';
  const table = rows.length ? `<table class="chat-proposal-fields"><caption>${comparable ? 'Proposed changes' : 'Proposed values'}</caption><thead><tr><th scope="col">Field</th><th scope="col">Before</th><th scope="col">After</th></tr></thead><tbody>${rows.join('')}</tbody></table>` : comparable ? '<p>No record values change.</p>' : '<p>No proposed record values provided.</p>';
  return `<strong>Review record changes</strong>${summary ? `<p>${escape(summary)}</p>` : ''}${note}${table}<p class="chat-proposal-note">Reject changes declines this proposal. Exact submitted values are in Technical details.</p>${technical}`;
}
