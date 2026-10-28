const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);

/** Date bounds are explicit UTC instants, with an exclusive upper bound. */
export function sourceSelection(provider, draft = {}) {
 const selection = provider === 'googlecalendar' ? {calendarId:'primary'} : {};
 for (const key of ['from','to']) {
  if (!draft[key]) continue;
  const date = String(draft[key]);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Choose valid source dates.');
  const instant = new Date(date + 'T00:00:00Z');
  if (!Number.isFinite(instant.getTime()) || instant.toISOString().slice(0,10) !== date) throw new Error('Choose valid source dates.');
  selection[key] = instant.toISOString().replace('.000Z','Z');
 }
 if (selection.from && selection.to && selection.from >= selection.to) throw new Error('The source end date must be after the start date.');
 return selection;
}

export const sourceImportRunning = run => ['committing','cancelling'].includes(run?.receipt?.state);

/** Actual native receipts are displayed without upgrading bounded coverage to a full history claim. */
export function sourceImportView(provider, account, draft = {}, run, busy) {
 const current = run?.accountId === account ? run : null;
 const preview = current?.preview;
 const receipt = current?.receipt;
 const canCommit = preview && !receipt;
 const running = sourceImportRunning(current);
 const next = receipt?.nextCursor || (!receipt && preview?.nextCursor);
 return `<div class="source-import" aria-label="${safe(provider === 'gmail' ? 'Gmail' : 'Calendar')} read and import">
  <div class="source-selection"><div class="field"><label for="source-${provider}-from">From (UTC)</label><input id="source-${provider}-from" type="date" data-source-date="${provider}" data-bound="from" value="${safe(draft.from)}" ${busy || running ? 'disabled' : ''}></div><div class="field"><label for="source-${provider}-to">Before (UTC)</label><input id="source-${provider}-to" type="date" data-source-date="${provider}" data-bound="to" value="${safe(draft.to)}" ${busy || running ? 'disabled' : ''}></div></div>
  ${current?.restoredScope ? `<p class="muted">Continuing the saved selection exactly: ${safe(current.selection?.from || 'no lower date bound')} to ${safe(current.selection?.to || 'no upper date bound')}. Editing a date starts a new scan.</p>` : ''}<p class="muted">Dates apply within scanned pages, not a complete source search. ${provider === 'googlecalendar' ? 'Primary calendar only; all-day events without a clear timezone may be excluded.' : 'Sender, subject, date and a short snippet; full email and attachments are not read.'} Each preview scans one bounded page.</p>
  <div class="inline-actions"><button class="btn" data-source-preview="${provider}" ${busy || running ? 'disabled' : ''}>${['preview','fresh'].includes(busy) ? 'Reading source page…' : receipt && receipt.state !== 'complete' ? 'Preview page again to retry' : next ? 'Preview next page' : 'Preview source page'}</button>${current ? `<button class="btn text" data-source-fresh="${provider}" ${busy || running ? 'disabled' : ''}>Start fresh preview</button>` : ''}</div>
  ${preview ? `<section class="source-preview" aria-label="Source preview"><h4>Review before importing</h4><p>${safe(preview.scannedCount)} scanned · ${safe(preview.selectedCount)} selected · ${safe(preview.newCount)} new · ${safe(preview.existingCount)} existing.</p>${preview.excludedCount || preview.unknownDateCount ? `<p class="muted">${safe(preview.excludedCount || 0)} outside selection · ${safe(preview.unknownDateCount || 0)} without a usable date.</p>` : ''}<p class="muted">${preview.coverage === 'complete' ? 'Reached the end of this source scan.' : 'More source pages may remain. This preview does not establish complete date coverage.'}</p>${preview.records?.length ? `<ul class="source-preview-records">${preview.records.slice(0,25).map(record => `<li><strong>${safe(record.title)}</strong>${record.fields?.Date ? `<small>${safe(record.fields.Date)}</small>` : ''}</li>`).join('')}</ul>` : '<p>No matching records in this page.</p>'}<p class="muted">Preview text is source content to review. Import saves only these selected records to ${provider === 'gmail' ? 'Interactions' : 'Schedule'} on this Mac.</p>${canCommit ? `<div class="inline-actions"><button class="btn primary" data-source-commit="${provider}" ${busy || !preview.records?.length ? 'disabled' : ''}>${busy === 'commit' ? 'Importing reviewed records…' : 'Import reviewed records'}</button><button class="btn" data-source-import-cancel="${provider}">${busy === 'commit' ? 'Stop import' : 'Discard preview'}</button></div>` : ''}</section>` : ''}
  ${receipt ? `<section class="source-receipt" aria-label="Import receipt" role="status"><h4>${receipt.state === 'committing' ? 'Import in progress' : receipt.state === 'cancelled' ? 'Import stopped' : receipt.state === 'cancelling' ? 'Stopping import' : receipt.state === 'partial' ? 'Import needs review' : 'Import receipt'}</h4><p>${safe(receipt.createdCount || 0)} created · ${safe(receipt.existingCount || 0)} existing · ${safe(receipt.failedCount || 0)} failed.</p><p class="muted">${running ? 'Import is still running or stopping. Check the receipt for the final counts.' : receipt.state === 'cancelled' ? 'Already saved records remain. Stopping does not roll back imported records.' : receipt.nextCursor ? 'More source pages remain; preview the next page when needed.' : 'No next page recorded for this import.'}</p>${receipt.guidance ? `<p class="muted">${safe(receipt.guidance)}</p>` : ''}${receipt.recoveredAfterInterruption ? '<p class="muted">The last import was interrupted. This receipt reflects the records already saved; preview again before retrying.</p>' : ''}${receipt.failures?.length ? `<p class="muted">${receipt.failures.slice(0,3).map(failure => safe(failure.message)).join(' · ')}</p>` : ''}<div class="inline-actions">${receipt.state === 'committing' ? `<button class="btn" data-source-import-cancel="${provider}">Stop import</button>` : ''}<button class="btn" data-source-receipt="${provider}" ${busy ? 'disabled' : ''}>Check import receipt</button><button class="btn text" data-page="${provider === 'gmail' ? 'interactions' : 'schedule'}">Review local records ↗</button></div></section>` : ''}
 </div>`;
}
