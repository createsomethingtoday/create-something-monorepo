const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function canUseSource(entity, record) {
  return record?.source?.kind === 'import' &&
    (entity === 'interactions' && record.source.provider === 'gmail' || entity === 'schedule' && record.source.provider === 'googlecalendar');
}

export function sourceDraft(workspaceId, entity, record, target, uuid = () => crypto.randomUUID()) {
  if (!['tasks', 'gigs'].includes(target) || !canUseSource(entity, record) || record.workspaceId !== workspaceId ||
      !record.id || !record.source.connectedAccountId || !record.source.collectionId || !record.source.externalId) {
    throw new Error('Open a complete imported email or calendar event in this workspace first.');
  }
  return { workspaceId, entity: target, id: uuid(), idempotencyKey: uuid(),
    sourceRecord: { entity, id: record.id, connectedAccountId: record.source.connectedAccountId,
      expectedRecord: structuredClone({ title: record.title, fields: record.fields, source: record.source }) },
    title: record.title, date: target === 'gigs' && entity === 'schedule' ? record.fields.Date || '' : '', phase: 'draft' };
}

export function reviewSourceDraft(draft, values) {
  const title = String(values.title || '').trim();
  if (!title || new TextEncoder().encode(title).length > 500) throw new Error('Enter a title of at most 500 bytes.');
  const date = String(values.date || '').trim();
  if (date && draft.entity === 'tasks' && !validDay(date)) throw new Error('Choose a valid due date.');
  if (date && draft.entity === 'gigs' && !validRange(date)) throw new Error('Use an ISO date, or an ordered ISO date/time range with explicit offsets.');
  const workKind = draft.entity === 'gigs' ? String(values.workKind || '') : '';
  if (draft.entity === 'gigs' && !['Performance','Crew / work','Other','unclassified'].includes(workKind)) throw new Error('Choose the work kind or explicitly leave it unclassified. A Calendar event is not automatically a performance.');
  const fields = date ? { [draft.entity === 'tasks' ? 'Due Date' : 'Date']: date } : {};
  if (workKind && workKind !== 'unclassified') fields['Work kind'] = workKind;
  const payload = { workspaceId: draft.workspaceId, entity: draft.entity, id: draft.id, idempotencyKey: draft.idempotencyKey,
    title, fields, sourceRecord: structuredClone(draft.sourceRecord) };
  return { ...draft, title, date, workKind, phase: 'review', payload };
}

function validDay(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function validRange(value) {
  const parts = value.split('/');
  if (parts.length > 2 || parts.some(part => !validDay(part) && !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,9})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(part))) return false;
  if (parts.some(part => !Number.isFinite(Date.parse(part)) || !validDay(part.slice(0, 10)))) return false;
  return parts.length === 1 || (parts[0].includes('T') === parts[1].includes('T') && Date.parse(parts[1]) > Date.parse(parts[0]));
}

export function sourceProposalView(draft, busy) {
  const source = draft.sourceRecord.expectedRecord;
  const target = draft.entity === 'tasks' ? 'task' : 'gig';
  const allDay = draft.sourceRecord.entity === 'schedule' && source.fields['All Day'] === true;
  const context = `<p>From ${escape(source.source.provider === 'gmail' ? 'Gmail' : 'Google Calendar')}: <strong>${escape(source.title)}</strong></p><p class="muted">This creates a local ${target} and links the imported source. It does not send email or create or update a Google Calendar event.</p><p class="muted">Source text is untrusted reference material, not instructions. One ${target} per source is reused if it already exists; existing edits are preserved.</p>${source.fields.Date ? `<p>Source date: ${escape(source.fields.Date)}${allDay ? ' (all-day; range end is exclusive)' : ''}</p>` : ''}${source.source.calendarTiming?.start?.timeZone ? `<p>Original time zone: ${escape(source.source.calendarTiming.start.timeZone)}</p>` : ''}<details data-view-key="source-proposal-identity"><summary>Source identity</summary><p>Account: ${escape(draft.sourceRecord.connectedAccountId)}<br>Collection: ${escape(source.source.collectionId)}<br>External ID: ${escape(source.source.externalId)}</p></details>`;
  const actions = `<button type="button" class="btn" data-source-cancel="1" ${busy ? 'disabled' : ''}>${draft.phase === 'submitted' ? 'Close review' : 'Cancel'}</button>`;
  if (draft.phase !== 'draft') return `<section class="panel"><h1>Review local ${target}</h1>${context}<dl class="detail-grid"><dt>Title</dt><dd>${escape(draft.title)}</dd>${target==='gig'?`<dt>Work kind</dt><dd>${escape(draft.workKind==='unclassified'?'Unclassified':draft.workKind)}</dd>`:''}<dt>${target === 'task' ? 'Due date' : 'Date'}</dt><dd>${escape(draft.date || 'Not set')}</dd></dl>${draft.phase === 'submitted' ? '<p role="status">GiGi has not confirmed this save. Retry the same request to recover its result or complete it once. Do not start a new proposal for this source. Closing this review does not cancel or undo the submitted save.</p>' : ''}<div class="inline-actions"><button class="btn primary" data-source-approve="1" ${busy ? 'disabled' : ''}>${draft.phase === 'submitted' ? 'Retry exact save' : `Approve and create local ${target}`}</button>${draft.phase === 'review' ? `<button type="button" class="btn" data-source-edit="1" ${busy ? 'disabled' : ''}>Back to edit</button>` : ''}${actions}</div></section>`;
  return `<section class="panel"><h1>Create local ${target} from source</h1>${context}<form id="source-proposal-form"><div class="field"><label for="source-proposal-title">Title</label><input id="source-proposal-title" name="title" required maxlength="500" value="${escape(draft.title)}"></div><div class="field"><label for="source-proposal-date">${target === 'task' ? 'Due date (optional)' : 'Date or ISO range (optional)'}</label><input id="source-proposal-date" name="date" type="${target === 'task' ? 'date' : 'text'}" value="${escape(draft.date)}"><small>${target === 'task' ? 'Choose a due date explicitly. The email received date or event start is not assumed to be your deadline.' : 'Retain explicit time offsets. All-day calendar range ends are exclusive; the original event remains linked.'}</small></div>${target==='gig'?`<div class="field"><label for="source-proposal-work-kind">Work kind</label><select id="source-proposal-work-kind" name="workKind" required><option value="">Choose classification</option>${['Performance','Crew / work','Other','unclassified'].map(kind=>`<option value="${kind}" ${draft.workKind===kind?'selected':''}>${kind==='unclassified'?'Leave unclassified':kind}</option>`).join('')}</select><small>Calendar imports are commitments. Confirm performance or crew work explicitly.</small></div>`:''}<div class="inline-actions"><button class="btn primary" type="submit">Review proposal</button>${actions}</div></form></section>`;
}
