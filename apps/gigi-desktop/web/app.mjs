import { tauriBridge } from './bridge.mjs';
import { sections, fields, moneyFields, booleanFields, fieldOptions, listFrom, recordFields, editedFields, formatMoney, gigBalance, relatedEndpoint, sourcePreview, sourceCanBegin, sourceNeedsOperatorReview, importRunForAccount, nextImportCursor, pendingConsentForProvider, pendingAccountForProvider, linkInput } from './model.mjs';

const root = document.querySelector('#app');
const bridge = tauriBridge();
const state = { workspace: null, setupProfile: false, setupDraft: null, currency: null, page: 'overview', records: [], recordCount: 0, nextCursor: null, selected: null, editing: false, editorDraft: null, sourceExpanded: false, busy: false, signingIn: false, justCreated: false, agentProvider: 'codex', toast: null, summary: null, history: [], backupId: null, pendingRestoreId: null, agent: null, agentReceipt: null, relationSchema: null, linkChoices: null, sources: {}, sourceAttempts: {}, connectionRequests: {}, imports: {}, contextHits: [], contextQueried: false };
const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const label = (name) => sections.find((item) => item.id === name)?.label || name;
const entityName = (name) => ({ schedule: 'schedule', finances: 'financial record', contacts: 'contact', companies: 'company', gigs: 'gig or shift', locations: 'place' })[name] || name.replace(/s$/, '');
const status = (record) => String(record?.fields?.Status || record?.status || '').trim();
const workspaceId = () => state.workspace?.workspaceId || state.workspace?.id;
const explain = (error) => {
  const raw = error instanceof Error ? error.message : String(error);
  const reasons = { unconfigured: 'Source connection needs developer configuration on this build.', unauthorized: 'Sign in to the source account and try again.', reauthentication_required: 'Your connector session expired. Sign in again before retrying.', refresh_in_progress: 'Connector session is refreshing. Check status again shortly.', refresh_outcome_unknown: 'Session refresh is uncertain. Check source status before retrying.', missing_dependency: 'A required companion is missing. Reinstall the complete GiGi app.', invalid_readback: 'The source account could not be verified. Check the account ID and retry.', unavailable: 'The source is temporarily unavailable. Try again later.', provider_unavailable: 'Connector sign-in is temporarily unavailable. Your local records are unchanged; try again later.', timeout: 'Connector sign-in timed out. Your local records are unchanged; try again.', cancelled: 'Connection was cancelled. Your records are unchanged.' };
  return reasons[raw] || raw;
};

function notice(message, error = false) {
  state.toast = { message, error };
  render();
  setTimeout(() => { if (state.toast?.message === message) { state.toast = null; render(); } }, 5000);
}

async function run(task) {
  state.busy = true; render();
  try { await task(); } catch (error) { notice(explain(error), true); }
  finally { state.busy = false; render(); }
}

async function load() {
  const result = await bridge.getWorkspace();
  state.workspace = result?.workspace || result?.workspaceId && result || result?.id && result || null;
  if (state.workspace) {
    const profiles = listFrom(await bridge.listRecords(workspaceId(), 'profile'));
    state.setupProfile = profiles.length === 0;
    state.currency = profiles[0] ? (await bridge.getRecord(workspaceId(), 'profile', profiles[0].id)).fields?.Currency || null : null;
    if (!state.setupProfile) await openPage(state.page);
  }
  render();
}

async function openPage(page) {
  if (page !== 'settings') state.justCreated = false;
  state.page = page; state.selected = null; state.editing = false; state.editorDraft = null; state.sourceExpanded = false; state.summary = null;
  if (page !== 'settings') state.pendingRestoreId = null;
  if (page === 'overview') {
    const names = ['gigs', 'tasks', 'contacts', 'finances'];
    const results = await Promise.all(names.map((name) => bridge.listRecords(workspaceId(), name)));
    state.overview = Object.fromEntries(names.map((name, index) => [name, listFrom(results[index])]));
    state.overviewCounts = Object.fromEntries(names.map((name, index) => [name, results[index]?.count ?? listFrom(results[index]).length]));
  } else if (page === 'history') {
    state.history = listFrom(await bridge.listHistory(workspaceId(), 40));
  } else if (page === 'settings') {
    const providers = ['gmail', 'googlecalendar'];
    const results = await Promise.allSettled([...providers.map((provider) => bridge.connectionStatus(provider)), bridge.agentStatus()]);
    state.sources = Object.fromEntries(providers.map((provider, index) => [provider, results[index].status === 'fulfilled' ? results[index].value : { state: 'unavailable', detail: explain(results[index].reason) }]));
    state.agentReceipt = results[2].status === 'fulfilled' ? results[2].value : null;
  } else if (fields[page]) {
    const result = await bridge.listRecords(workspaceId(), page);
    state.records = listFrom(result);
    state.recordCount = result?.count ?? state.records.length;
    state.nextCursor = result?.nextCursor || null;
  }
  render();
}

async function selectRecord(id) {
  state.selected = await bridge.getRecord(workspaceId(), state.page, id);
  state.editing = false;
  state.editorDraft = null;
  state.sourceExpanded = false;
  if (state.page === 'gigs') state.summary = await bridge.gigSummary(workspaceId(), id);
  render();
}

function sidebar() {
  const groups = [sections.slice(0, 7), sections.slice(7, 13), sections.slice(13)];
  return `<aside class="sidebar"><div class="brand"><span class="brand-mark">g.</span><div><strong>GiGi</strong><small>Private workspace</small></div></div><div class="workspace-chip" title="${safe(state.workspace?.name)}">${safe(state.workspace?.name || 'My workspace')}</div>${groups.map((items, index) => `<div><p class="nav-label">${['Work', 'Library', 'Workspace'][index]}</p><nav class="nav" aria-label="${['Work', 'Library', 'Workspace'][index]}">${items.map((item) => `<button type="button" data-page="${item.id}" ${state.page === item.id ? 'aria-current="page"' : ''}>${safe(item.label)}</button>`).join('')}</nav></div>`).join('')}<div class="sidebar-foot"><span class="status-dot"></span>Stored on this desktop<br>Source and agent status in Settings</div></aside>`;
}

function shell(body) {
  return `<div class="shell">${sidebar()}<main class="main"><div class="topbar"><span class="crumb">GiGi / ${safe(label(state.page))}</span><span class="right">PRIVATE · LOCAL</span></div><div class="content">${body}</div></main></div>${state.toast ? `<div class="toast ${state.toast.error ? 'error' : ''}" role="status">${safe(state.toast.message)}</div>` : ''}`;
}

function heading(eyebrow, title, description, action = '') {
  return `<div class="page-head"><div><p class="eyebrow">${safe(eyebrow)}</p><h1>${safe(title)}</h1><p class="subhead">${safe(description)}</p></div>${action}</div>`;
}

function rows(name, records, max = Infinity) {
  if (!records.length) return `<div class="empty"><strong>Nothing here yet.</strong>Add a ${safe(entityName(name))} to start building your connected workspace.</div>`;
  return `<div class="rows">${records.slice(0, max).map((record) => `<button class="row" type="button" data-open="${safe(record.id)}" data-entity="${name}"><span><strong>${safe(record.title || 'Untitled')}</strong><small>${safe(status(record) || record.date || record.fields?.Date || record.fields?.['Due Date'] || 'Open record')}</small></span><span class="arrow" aria-hidden="true">↗</span></button>`).join('')}</div>`;
}

function overview() {
  const data = state.overview || { gigs: [], tasks: [], contacts: [], finances: [] };
  const next = data.gigs.slice(0, 5);
  const counts = state.overviewCounts || {};
  return heading('Your workspace', 'Make room for the work.', 'Keep shows, people, dates and money linked in one private place.', `<button class="btn primary" data-new="gigs">+ New gig</button>`) + `<div class="cards"><div class="card"><div class="label">Gigs & shifts</div><div class="value">${counts.gigs ?? data.gigs.length}</div></div><div class="card"><div class="label">Tasks</div><div class="value">${counts.tasks ?? data.tasks.length}</div></div><div class="card"><div class="label">People</div><div class="value">${counts.contacts ?? data.contacts.length}</div></div></div><div class="split section-gap"><section class="panel"><div class="panel-head"><h2>Recent work</h2><button class="btn text" data-page="gigs">All gigs ↗</button></div>${rows('gigs', next)}</section><section class="panel"><div class="panel-head"><h2>Getting started</h2></div><div class="steps"><div class="step"><span class="number">1</span><div><h3>Add a gig</h3><p>Capture a show or shift and its confirmed details.</p></div></div><div class="step"><span class="number">2</span><div><h3>Link the people</h3><p>Connect the contact and place to that work.</p></div></div><div class="step"><span class="number">3</span><div><h3>Set up sources and agent</h3><p>Connect sources or your subscribed Codex or Claude Code session.</p><button class="btn text" data-page="settings">Open setup guide →</button></div></div></div></section></div>`;
}

function collection() {
  const name = state.page;
  const action = name === 'profile' && state.records.length ? `<button class="btn" data-open="${safe(state.records[0].id)}" data-entity="profile">Open profile</button>` : `<button class="btn primary" data-new="${name}">+ Add ${safe(entityName(name))}</button>`;
  return heading('Your records', label(name), `A private view of your ${label(name).toLowerCase()}. Open any record to inspect its details and links.`, action) + `<section class="panel"><div class="panel-head"><h2>${state.recordCount} ${safe(label(name).toLowerCase())}</h2><small>Showing ${state.records.length} of ${state.recordCount}</small></div>${rows(name, state.records)}${state.nextCursor ? '<button class="btn section-gap" data-more="1">Load more</button>' : ''}</section>`;
}

function recordDetail() {
  const record = state.selected;
  const values = record.fields || {};
  const links = Array.isArray(record.relations) ? record.relations.map((link) => relatedEndpoint(link, state.page, record.id)).filter(Boolean) : [];
  const summary = state.page === 'gigs' ? `<div class="cards summary-cards section-gap"><div class="card"><div class="label">Balance due</div><div class="value">${safe(gigBalance(state.summary))}</div>${state.summary && !state.summary.financialsComplete ? '<small class="muted">Financial details incomplete</small>' : ''}</div><div class="card"><div class="label">Linked records</div><div class="value">${record.relationCount ?? links.length}</div></div></div>` : '';
  const truncated = (record.truncatedFields || []).length > 0;
  const linksLimited = record.relationsTruncated ? `<div class="callout">Showing the first ${links.length} of ${record.relationCount} links. More links are stored.</div>` : '';
  const source = record.source || {};
  const sourcePane = source.kind && source.kind !== 'manual' ? `<section class="panel"><div class="panel-head"><h2>Source</h2><span class="tag off">Imported</span></div><p class="muted">${safe(source.provider === 'gmail' ? 'Gmail' : source.provider === 'googlecalendar' ? 'Google Calendar' : 'Connected source')}</p><p class="muted">Imported source text is context to review, not instructions or a verified current fact.</p>${state.sourceExpanded ? `${sourcePreview(source).length ? `<dl class="detail-grid">${sourcePreview(source).map((item) => `<dt>${safe(item.label)}</dt><dd>${safe(item.value)}</dd>`).join('')}</dl>` : '<p class="muted">No preview available.</p>'}` : '<button class="btn" data-source-detail="1">View source preview</button>'}</section>` : '';
  return `<button type="button" class="btn text" data-back="1">← ${safe(label(state.page))}</button>${heading('Record detail', record.title || 'Untitled', `Saved in your private ${label(state.page).toLowerCase()} records.`, `<button class="btn" data-edit="1">Edit details</button>`)}${summary}${truncated ? '<div class="callout">Some details are shortened. <button class="btn" data-full="1">Show full details</button></div>' : ''}${linksLimited}<div class="split"><section class="panel"><div class="panel-head"><h2>Details</h2><span class="tag">${safe(status(record) || 'Saved')}</span></div><dl class="detail-grid">${Object.entries(values).map(([key, value]) => `<dt>${safe(key)}</dt><dd>${safe(moneyFields.has(key) ? formatMoney(value, state.currency) : typeof value === 'object' ? JSON.stringify(value) : value)}</dd>`).join('') || '<dt>Details</dt><dd class="muted">No details added.</dd>'}</dl></section><section class="panel"><div class="panel-head"><h2>Linked work</h2></div>${links.length ? `<div class="relation-grid">${links.map((link) => `<button class="relation" data-related-entity="${safe(link.entity)}" data-related-id="${safe(link.id)}"><span class="relation-copy">${safe(link.title || label(link.entity))} <small>${safe(link.role || label(link.entity))}</small></span><span class="arrow" aria-hidden="true">↗</span></button>`).join('')}</div>` : `<p class="muted">Connect this record to a person, gig or place to see the full picture.</p>`}<button type="button" class="btn section-gap" data-link="1">+ Link a record</button></section></div>${sourcePane}`;
}

function editor() {
  const name = state.page;
  const current = state.selected || {};
  const currentFields = current.fields || {};
  return `<button type="button" class="btn text" data-cancel="1">← Back</button>${heading(current.id ? 'Edit record' : 'New record', current.id ? `Edit ${entityName(name)}` : `Add ${entityName(name)}`, name === 'profile' ? 'Set your defaults. Currency cannot change after monetary records are saved.' : 'Save the details you know. Leave uncertain fields empty.')}
  <form id="record-form" class="panel" data-entity="${name}"><div class="form-grid"><div class="field wide"><label for="title">Title <span aria-hidden="true">*</span></label><input id="title" name="title" required maxlength="200" value="${safe(state.editorDraft?.title ?? current.title ?? '')}" autocomplete="off"></div>${(fields[name] || []).map((field) => { const value = currentFields[field] ?? ''; const display = state.editorDraft?.[field] ?? (moneyFields.has(field) && value !== '' ? Number(value) / 100 : value); const selectedValue = state.editorDraft?.[field] ?? value; const id = `field-${field.replace(/\s+/g, '-').toLowerCase()}`; return `<div class="field ${['Description', 'Details', 'Note Details', 'Requirements', 'Venue Intel', 'Summary'].includes(field) ? 'wide' : ''}"><label for="${id}">${safe(field)}${moneyFields.has(field) ? ' (in your currency)' : ''}</label>${fieldOptions(name, field) ? `<select id="${id}" name="${safe(field)}" required><option value="">Choose ${safe(field.toLowerCase())}</option>${fieldOptions(name, field).map((choice) => `<option value="${safe(choice)}" ${selectedValue === choice ? 'selected' : ''}>${safe(choice)}</option>`).join('')}</select>` : name === 'profile' && field === 'Currency' ? `<select id="${id}" name="Currency" required><option value="">Choose currency</option>${['USD','CAD','EUR','GBP'].map((code) => `<option value="${code}" ${selectedValue === code ? 'selected' : ''}>${code}</option>`).join('')}</select>` : booleanFields.has(`${name}.${field}`) ? `<select id="${id}" name="${safe(field)}"><option value="">Not set</option><option value="true" ${selectedValue === true || selectedValue === 'true' ? 'selected' : ''}>Yes</option><option value="false" ${selectedValue === false || selectedValue === 'false' ? 'selected' : ''}>No</option></select>` : ['Description', 'Details', 'Note Details', 'Requirements', 'Venue Intel', 'Summary'].includes(field) ? `<textarea id="${id}" name="${safe(field)}">${safe(display)}</textarea>` : `<input id="${id}" name="${safe(field)}" value="${safe(display)}" ${moneyFields.has(field) ? 'inputmode="decimal"' : ''} autocomplete="off">`}</div>`; }).join('')}</div><div class="form-actions"><button type="button" class="btn" data-cancel="1">Cancel</button><button class="btn primary" type="submit">Save ${safe(entityName(name))}</button></div></form>`;
}

function linkEditor() {
  const candidates = [...new Set((state.relationSchema?.relationFields || []).map((field) => field.targetEntity))].filter((name) => name !== state.page || state.page === 'tasks');
  const selected = state.linkChoices?.entity || candidates[0];
  const roles = (state.relationSchema?.relationFields || []).filter((field) => field.targetEntity === selected);
  const choices = state.linkChoices?.items || [];
  return `<button class="btn text" data-link-cancel="1">← Record</button>${heading('Relationship', 'Link this record', 'Choose an existing record in your private workspace.')}<form id="link-form" class="panel" novalidate>${candidates.length ? `<div class="field"><label for="link-entity">Record type</label><select id="link-entity" name="entity">${candidates.map((name) => `<option value="${name}" ${name === selected ? 'selected' : ''}>${safe(label(name))}</option>`).join('')}</select></div><div class="field"><label for="link-role">Relationship</label><select id="link-role" name="role" required>${roles.map((field) => `<option value="${safe(field.name)}">${safe(field.name)}</option>`).join('')}</select></div><div class="field"><label for="link-record">Record</label><select id="link-record" name="id" required><option value="">Choose a record</option>${choices.map((record) => `<option value="${safe(record.id)}">${safe(record.title)}</option>`).join('')}</select></div>${state.linkChoices?.nextCursor ? '<button class="btn" type="button" data-link-more="1">Load more records</button>' : ''}<div class="form-actions"><button class="btn primary" type="button" data-link-submit="1">Link records</button></div>` : '<p class="muted">No available relationship types for this record.</p>'}</form>`;
}

function history() {
  return heading('Activity', 'History', 'Recent changes in this private workspace.') + `<section class="panel">${state.history.length ? `<div class="rows">${state.history.map((item) => `<div class="row"><span><strong>${safe(item.operation || item.action || 'Record change')}</strong><small>${safe(item.entity || '')} ${safe(item.title || item.recordId || '')}</small></span><small>${safe(item.createdAt || item.at || '')}</small></div>`).join('')}</div>` : '<div class="empty"><strong>No activity yet.</strong>Changes to your workspace will appear here.</div>'}</section>`;
}

function sourceCard(provider, title) {
  const source = state.sources[provider] || { state: 'unavailable' };
  const connected = source.state === 'connected';
  const account = source.connectedAccountId || '';
  const attempt = state.sourceAttempts[provider] || null;
  const accountToVerify = pendingAccountForProvider(source, provider) || source.connectedAccountId;
  const consentUrl = pendingConsentForProvider(source, state.sourceAttempts, provider);
  const reconnectable = source.state === 'attention' && source.reconnectable === true;
  const operatorReview = sourceNeedsOperatorReview(source);
  const run = importRunForAccount(state.imports[provider], account);
  const stateText = { connected: 'Account verified', pending: 'Consent pending', disconnected: 'Not connected', attention: 'Needs attention', unavailable: 'Unavailable', unconfigured: 'Needs setup' }[source.state] || 'Not connected';
  const importText = run ? `<p class="muted">Last import page: ${run.result.processedCount} processed (including existing records), ${run.result.failedCount} failed. ${run.result.complete ? run.result.nextCursor ? 'More pages remain.' : 'Reached the last page for this run.' : 'Retry this page before continuing.'}</p>${run.result.failures?.length ? `<p class="muted">${run.result.failures.slice(0, 3).map((failure) => safe(failure.message)).join(' · ')}</p>` : ''}` : '';
  return `<div class="step"><span class="number">${provider === 'gmail' ? '✉' : '◷'}</span><div><h3>${title}</h3><p>${operatorReview ? 'Connection outcome is uncertain. Ask the GiGi operator to review this attempt before connecting again.' : reconnectable ? 'The previous connection ended. Connect again with fresh consent.' : connected ? 'Account verified. Import is a separate step.' : safe(explain(source.detail || 'Connect with your own account consent. You can continue manually.'))}</p><div class="inline-actions section-gap"><button class="btn" data-source-refresh="${provider}">Check status</button>${sourceCanBegin(source) ? `<button class="btn" data-source-begin="${provider}">${reconnectable ? `Reconnect ${title}` : state.connectionRequests[provider] ? 'Resume connection' : `Connect ${title}`}</button>` : ''}${connected && account ? `<button class="btn" data-source-import="${provider}">${run ? run.result.complete && run.result.nextCursor ? 'Import next page' : run.result.complete ? 'Run import again' : 'Retry import page' : 'Import source records'}</button>` : ''}</div>${consentUrl ? `<p class="muted">Consent is pending. Open the hosted consent page in your browser, then return here to verify.</p><p><button class="btn" data-open-consent="${provider}">Open consent page ↗</button></p>` : attempt && source.state === 'pending' ? '<p class="muted">Consent started. Check status after completing the browser step.</p>' : ''}${!connected && !reconnectable && !operatorReview && accountToVerify ? `<button class="btn" data-source-reconcile="${provider}">Verify connection</button>` : !connected && !reconnectable && !operatorReview && ['pending','attention'].includes(source.state) ? '<p class="muted">The account ID is not available yet. Check status after consent; do not start a new connection while this attempt is pending.</p>' : ''}${connected && account ? `<details><summary>Account details</summary><p class="muted">Connected account ID: ${safe(account)}</p></details>` : ''}${importText}</div><span class="tag ${connected ? '' : 'off'}">${safe(stateText)}</span></div>`;
}
function agentSetup() {
  const claude = state.agentProvider === 'claude';
  const provider = claude ? 'Claude Code' : 'Codex';
  const command = claude ? state.agent?.claudeCommand : state.agent?.codexCommand;
  return `<section class="panel" id="agent-setup"><div class="panel-head"><h2>Connect your desktop agent</h2><small>Optional</small></div><p class="muted">GiGi stores your work; Codex or Claude Code runs the conversation. Use an eligible subscription account in the agent on this Mac. GiGi does not supply model tokens or require a model API key for this beta.</p><fieldset class="provider-choice"><legend>Choose your agent</legend><div class="inline-actions"><button type="button" class="btn" data-agent-provider="codex" aria-pressed="${!claude}">Codex</button><button type="button" class="btn" data-agent-provider="claude" aria-pressed="${claude}">Claude Code</button></div></fieldset>
    <ol class="setup-instructions"><li><strong>Sign in to ${provider} on this Mac.</strong> ${claude ? 'Have Claude Code available in Terminal and sign in with your Claude subscription account.' : 'Have the Codex CLI available in Terminal and sign in with your ChatGPT account. The setup guide explains installation and sign-in.'} <button class="btn text" data-help="${claude ? 'claude-setup' : 'codex-setup'}">Open ${provider} setup guide ↗</button></li><li><strong>Prepare GiGi’s connector.</strong> This creates commands for this workspace; it does not install or connect the agent for you.<div class="inline-actions"><button class="btn" data-prepare-agent="1">${state.agentReceipt?.prepared || state.agent ? 'Show setup commands' : 'Prepare GiGi connector'}</button></div></li><li><strong>${claude ? 'Start Claude with GiGi.' : 'Register GiGi with Codex.'}</strong> ${claude ? 'Run the command below in Terminal. It loads GiGi for that Claude session. Use this command again for future GiGi sessions.' : 'Run the command below in Terminal, then open a new local Codex session on this Mac. Restart an already-open desktop host if it has not picked up the connector.'}${command ? `<pre class="config" id="agent-command">${safe(command)}</pre><button class="btn" data-copy-agent="command">Copy ${provider} command</button>` : '<p>Prepare the connector to reveal your exact command.</p>'}</li><li><strong>Verify a real tool call.</strong> Check the agent’s MCP connections with <code>/mcp</code>, then send this prompt in that session. Confirm it returns this workspace’s name and ID before asking it to change records.${state.agent?.starterPrompt ? `<pre class="config prompt" id="agent-prompt">${safe(state.agent.starterPrompt)}</pre><div class="inline-actions"><button class="btn" data-copy-agent="prompt">Copy verification prompt</button><button class="btn" data-source-refresh="agent">Check local tool status</button></div>` : '<p>The verification prompt appears after preparing the connector.</p>'}</li></ol>
    ${state.agentReceipt?.lastCall ? `<p class="tool-receipt muted">Last local GiGi tool: ${safe(state.agentReceipt.lastCall.tool)} at ${safe(new Date(state.agentReceipt.lastCall.lastToolAt * 1000).toLocaleString())}. This is local tool-use evidence; confirm the result in your agent. Phone access still needs its own test.</p>` : '<p class="tool-receipt muted">No local tool call recorded yet. Preparing commands does not verify the connection.</p>'}
    <details><summary>What to expect when working with your agent</summary><ul class="setup-instructions"><li>Ask for a specific gig, contact or task. GiGi’s compact skill and bounded tools help the agent retrieve only the context it needs.</li><li>Ask the agent to read first and confirm the workspace. Review proposed changes before approving them; edits update the local records you see in GiGi.</li><li>Model usage is handled by your provider account. Your subscription’s eligibility, limits and availability apply. GiGi has no paid model API fallback.</li><li>If the agent is unavailable or at its subscription limit, keep working directly in GiGi and reconnect the agent later.</li><li>Local records stay on this Mac. Information retrieved by the agent is processed by the provider you use; imported source text is context to review.</li></ul></details>
    ${state.agent ? `<details><summary>Advanced connector files</summary><p class="backup-code">Package: ${safe(state.agent.packagePath)}</p>${state.agent.skillPath ? `<p class="backup-code">Skill: ${safe(state.agent.skillPath)}</p>` : ''}<pre class="config">${safe(typeof state.agent.mcpConfig === 'string' ? state.agent.mcpConfig : JSON.stringify(state.agent.mcpConfig, null, 2))}</pre></details>` : ''}</section>`;
}

function settings() {
  const sourceConnected = ['gmail', 'googlecalendar'].filter((provider) => state.sources[provider]?.state === 'connected').length;
  return heading('Workspace', 'Setup & safety', 'Review what is ready, what still needs your consent, and how to protect your local data.') +
    `${state.justCreated ? '<div class="callout setup-welcome"><strong>Your private workspace is ready.</strong><p>Connect sources and an agent below, or start with a record. You can return to Settings at any time.</p><button class="btn" data-new="gigs">Start with a gig</button></div>' : ''}` +
    `<div class="steps"><div class="step"><span class="number">1</span><div><h3>Private workspace</h3><p>${safe(state.workspace?.name || 'Your workspace')} is stored on this desktop. Your records are independent of other GiGi users.</p></div><span class="tag">Ready</span></div><div class="step"><span class="number">2</span><div><h3>Sources</h3><p>${sourceConnected} of 2 source accounts verified. Connecting an account and importing records are separate steps.</p><a class="setup-link" href="#source-connections">Source setup ↓</a></div><span class="tag off">${sourceConnected}/2 verified</span></div><div class="step"><span class="number">3</span><div><h3>Codex or Claude Code</h3><p>Connect the local GiGi connector to your subscribed Codex or Claude Code session, then confirm a real tool call.</p><a class="setup-link" href="#agent-setup">Agent setup ↓</a></div><span class="tag off">${state.agentReceipt?.lastCall ? 'Local tool used · Phone unverified' : state.agentReceipt?.prepared || state.agent ? 'Prepared · Not verified' : 'Not verified'}</span></div><div class="step"><span class="number">4</span><div><h3>Phone access</h3><p>If your account supports remote access, connect to this Mac and test a GiGi read from your phone on cellular data.</p><a class="setup-link" href="#phone-access">Phone expectations ↓</a></div><span class="tag off">Needs device test</span></div></div>
    <section class="panel" id="source-connections"><div class="panel-head"><h2>Source connections</h2><small>Separate consent required</small></div><p class="muted">Your local workspace needs no login. Source connections use a separate GiGi connector sign-in and your consent for each Google account.</p><ol class="setup-instructions"><li><strong>Sign in below.</strong> Finish the GiGi sign-in in your browser, then return here.</li><li><strong>Connect Gmail or Calendar.</strong> Complete the Google consent page for your own account. If a link is stale, check status before starting another attempt.</li><li><strong>Verify, then import.</strong> Return to GiGi and choose Check status, then Verify connection if it is shown. Once Account verified appears, choose Import source records. Imports run one page at a time; connecting alone does not import anything.</li></ol><p class="muted">GiGi imports email sender, subject, date and a short message snippet, plus calendar event details. It does not send email or change calendars. You can skip either source and add records manually.</p><button class="btn" data-sign-in="1" ${state.signingIn ? 'disabled' : ''}>${state.signingIn ? 'Waiting for browser sign-in…' : 'Sign in to connector'}</button><div class="steps section-gap">${sourceCard('gmail', 'Gmail')}${sourceCard('googlecalendar', 'Google Calendar')}</div></section>
    ${agentSetup()}
    <section class="panel" id="phone-access"><div class="panel-head"><h2>Use GiGi from your phone</h2><span class="tag off">Optional · Separate test</span></div><p class="muted">Phone access connects to an agent session on this Mac. It is available only when your provider and account support remote access. A normal mobile chat does not connect to GiGi by itself.</p><details><summary>Phone setup and offline expectations</summary><ol class="setup-instructions"><li><strong>Connect to this Mac.</strong> For Codex, use the ChatGPT desktop remote setup and the same account/workspace on your phone. For Claude Code, start the GiGi-enabled session above, then use <code>/remote-control</code> inside that session and open its phone link.</li><li><strong>Keep the host available.</strong> Keep this Mac awake, online and signed in, with the provider’s desktop host or Claude session running. GiGi’s local connector must remain installed.</li><li><strong>Test over cellular.</strong> Turn phone Wi-Fi off and send the verification prompt above. Confirm the correct workspace before requesting an edit. A local tool receipt alone cannot prove a phone connection.</li><li><strong>If the Mac goes offline.</strong> A request may wait or fail. Reconnect and check the record before retrying an edit, so a completed change is not repeated.</li></ol><div class="inline-actions"><button class="btn" data-help="codex-remote">Codex remote guide ↗</button><button class="btn" data-help="claude-remote">Claude remote guide ↗</button></div></details></section>
    <section class="panel"><div class="panel-head"><h2>Backup & restore</h2></div><p class="muted">Create a local recovery point before major changes. Restore replaces the active workspace with a chosen backup.</p><div class="inline-actions"><button class="btn" data-backup="1">Create backup</button><button class="btn" data-restore-toggle="1" ${state.busy ? 'disabled' : ''}>Restore backup</button></div>${state.backupId ? `<span class="backup-code">Backup ID: ${safe(state.backupId)}</span>` : ''}${state.pendingRestoreId ? `<div class="callout section-gap" role="group" aria-label="Confirm restore"><strong>Confirm restore</strong><p>The current workspace will be replaced with backup ${safe(state.pendingRestoreId)}. GiGi will save a safety backup first.</p><div class="inline-actions"><button type="button" class="btn danger" data-confirm-restore="1" ${state.busy ? 'disabled' : ''}>Restore this backup</button><button type="button" class="btn" data-cancel-restore="1" ${state.busy ? 'disabled' : ''}>Cancel</button></div></div>` : '<form id="restore-form" class="section-gap" hidden><div class="field"><label for="backup-id">Backup ID</label><input id="backup-id" name="backupId" required autocomplete="off"></div><button class="btn danger" type="submit">Continue to confirmation</button></form>'}</section>
    <section class="panel"><div class="panel-head"><h2>Source context</h2><button class="btn" data-context-sync="1">Sync local history</button></div><p class="muted">Search supporting CTX history from this workspace. Current records and calculations remain in the local database. Each result shows its source session.</p><form id="context-form" class="inline-actions section-gap"><input class="compact-input" name="query" aria-label="Search history" placeholder="Search local history" required maxlength="160"><button class="btn" type="submit">Search</button></form>${state.contextQueried ? state.contextHits.length ? `<div class="rows section-gap">${state.contextHits.map((hit) => `<div class="row"><span><strong>${safe(hit.snippet)}</strong><small>Source: ${safe(hit.provider)} · session ${safe(hit.sessionId)}</small></span></div>`).join('')}</div>` : '<p class="muted section-gap">No matching history in this workspace.</p>' : ''}</section>`;
}
function onboarding() {
  const resume = Boolean(state.workspace);
  return `<div class="setup"><span class="brand-mark">g.</span><p class="eyebrow">Welcome to GiGi</p><h1>${resume ? 'Finish your profile.' : 'Your work, in one place.'}</h1><p class="subhead">${resume ? 'Your private workspace is ready. Add your profile to finish setup.' : 'Build a private home for gigs, shifts, contacts, money and the details that connect them. Your records live on this Mac. No login is needed to start; connect sources and your subscribed agent when ready.'}</p><ol class="welcome-plan" role="list"><li><strong>${resume ? 'Finish your profile' : 'Create your workspace'}</strong><span>Private local records for your gigs, people and money.</span></li><li><strong>Connect sources, if useful</strong><span>Separate GiGi sign-in and Google consent; import when you choose.</span></li><li><strong>Use your own agent</strong><span>Connect Codex or Claude Code on this Mac, then test a real tool call.</span></li></ol><form id="workspace-form" class="panel"><h2>${resume ? 'Your profile' : 'Make it yours'}</h2><p class="muted">${resume ? 'Choose your currency carefully. You can change other defaults later, but currency locks after you save monetary records.' : 'Start with your name and workspace. Choose your currency carefully: it locks after you save monetary records. Connect sources later.'}</p><div class="form-grid section-gap"><div class="field"><label for="owner-name">Your name</label><input id="owner-name" name="ownerName" required maxlength="80" placeholder="Your name" value="${safe(state.setupDraft?.ownerName || '')}" autocomplete="name" ${state.busy ? 'disabled' : ''}></div>${resume ? '' : `<div class="field"><label for="workspace-name">Workspace name</label><input id="workspace-name" name="name" required maxlength="80" placeholder="e.g. Danny’s work" value="${safe(state.setupDraft?.name || '')}" autocomplete="off" ${state.busy ? 'disabled' : ''}></div>`}<div class="field"><label for="currency">Currency</label><select id="currency" name="currency" required ${state.busy ? 'disabled' : ''}><option value="">Choose currency</option><option value="USD" ${state.setupDraft?.currency === 'USD' ? 'selected' : ''}>USD</option><option value="CAD" ${state.setupDraft?.currency === 'CAD' ? 'selected' : ''}>CAD</option><option value="EUR" ${state.setupDraft?.currency === 'EUR' ? 'selected' : ''}>EUR</option><option value="GBP" ${state.setupDraft?.currency === 'GBP' ? 'selected' : ''}>GBP</option></select></div></div><div class="form-actions"><button type="submit" class="btn primary" ${state.busy ? 'disabled' : ''}>${state.busy ? 'Saving workspace…' : resume ? 'Finish setup' : 'Create private workspace'} →</button></div></form><p class="section-gap"><small>Gmail, Calendar and agent access are optional setup steps that require separate verification.</small></p></div>${state.toast ? `<div class="toast ${state.toast.error ? 'error' : ''}" role="status">${safe(state.toast.message)}</div>` : ''}`;
}

function render() {
  root.classList.toggle('loading', state.busy);
  if (!state.workspace || state.setupProfile) { root.innerHTML = onboarding(); return; }
  let body;
  if (state.editing === 'link') body = linkEditor();
  else if (state.editing) body = editor();
  else if (state.selected) body = recordDetail();
  else if (state.page === 'overview') body = overview();
  else if (state.page === 'history') body = history();
  else if (state.page === 'settings') body = settings();
  else body = collection();
  root.innerHTML = shell(body);
  const linkButton = root.querySelector?.('[data-link-submit]');
  linkButton?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation?.();
    const entity = root.querySelector('#link-entity');
    const role = root.querySelector('#link-role');
    const record = root.querySelector('#link-record');
    if (!entity || !role || !record) { notice('Link fields are unavailable. Reopen the record and retry.', true); return; }
    submitLink({ entity: entity.value, role: role.value, id: record.value });
  });

}

async function loadLinkChoices(entity, cursor) {
  const result = await bridge.listRecords(workspaceId(), entity, cursor);
  const old = cursor && state.linkChoices?.entity === entity ? state.linkChoices.items : [];
  state.linkChoices = { entity, items: [...old, ...listFrom(result)], nextCursor: result?.nextCursor || null };
  render();
}

function submitLink(data) {
  if (state.busy) { notice('Please wait for the current action to finish.', true); return; }
  if (state.editing !== 'link' || !state.selected?.id) { notice('Link view changed. Reopen the record and retry.', true); return; }
  let input;
  try { input = linkInput(data, state.page, state.selected.id); }
  catch (error) { notice(explain(error), true); return; }
  void run(async () => {
    await bridge.linkRecords(workspaceId(), input.fromEntity, input.fromId, input.toEntity, input.toId, input.role);
    state.editing = false;
    await selectRecord(input.fromId);
    notice('Records linked.');
  });
}

root.addEventListener('click', (event) => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.page) void run(() => openPage(button.dataset.page));
  else if (button.dataset.new) { state.justCreated = false; state.page = button.dataset.new; state.selected = null; state.editorDraft = null; state.editing = true; render(); }
  else if (button.dataset.open) void run(async () => { if (state.page !== button.dataset.entity) await openPage(button.dataset.entity); await selectRecord(button.dataset.open); });
  else if (button.dataset.back || button.dataset.cancel) { state.selected = null; state.editing = false; state.editorDraft = null; render(); }
  else if (button.dataset.edit) void run(async () => { state.selected = await bridge.getRecord(workspaceId(), state.page, state.selected.id, 'full'); state.editorDraft = null; state.editing = true; });
  else if (button.dataset.full) void run(async () => { state.selected = await bridge.getRecord(workspaceId(), state.page, state.selected.id, 'full'); });
  else if (button.dataset.sourceDetail) void run(async () => { state.selected = await bridge.getRecord(workspaceId(), state.page, state.selected.id, 'full'); state.sourceExpanded = true; });
  else if (button.dataset.link) void run(async () => { state.relationSchema = await bridge.describeSchema(state.page); const first = state.relationSchema.relationFields?.[0]?.targetEntity; state.linkChoices = null; if (first) await loadLinkChoices(first); state.editing = 'link'; render(); });
  else if (button.dataset.linkMore) void run(() => loadLinkChoices(state.linkChoices.entity, state.linkChoices.nextCursor));
  else if (button.dataset.linkCancel) { state.editing = false; render(); }
  else if (button.dataset.relatedEntity) void run(async () => { await openPage(button.dataset.relatedEntity); await selectRecord(button.dataset.relatedId); });
  else if (button.dataset.backup) void run(async () => { const result = await bridge.createBackup(workspaceId()); state.backupId = result?.backupId || result?.id || String(result); notice('Backup created. Keep its ID in a safe place.'); });
  else if (button.dataset.more) void run(async () => { const result = await bridge.listRecords(workspaceId(), state.page, state.nextCursor); state.records.push(...listFrom(result)); state.nextCursor = result?.nextCursor || null; state.recordCount = result?.count ?? state.recordCount; });
  else if (button.dataset.agentProvider) { if (['codex','claude'].includes(button.dataset.agentProvider)) { state.agentProvider = button.dataset.agentProvider; render(); root.querySelector(`[data-agent-provider="${state.agentProvider}"]`)?.focus(); } }
  else if (button.dataset.copyAgent) { const value = button.dataset.copyAgent === 'prompt' ? state.agent?.starterPrompt : state.agentProvider === 'claude' ? state.agent?.claudeCommand : state.agent?.codexCommand; if (!value) { notice('Prepare the connector before copying.', true); return; } if (!globalThis.navigator?.clipboard?.writeText) { notice('Clipboard is unavailable. Select and copy the displayed text.', true); return; } void navigator.clipboard.writeText(value).then(() => notice('Copied. Paste into Terminal or your agent as directed.')).catch(() => notice('Could not copy. Select and copy the displayed text.', true)); }
  else if (button.dataset.help) void run(() => bridge.call('help.open', { topic: button.dataset.help }));
  else if (button.dataset.prepareAgent) void run(async () => { state.agent = await bridge.prepareAgent(); state.agentReceipt = await bridge.agentStatus(); notice('GiGi connector prepared. Follow the selected agent steps, then verify a real tool call.'); });
  else if (button.dataset.signIn) { state.signingIn = true; render(); void bridge.signIn().then(async () => { state.signingIn = false; await openPage('settings'); notice('Connector sign-in completed. Authorize your sources separately.'); }).catch((error) => { state.signingIn = false; notice(explain(error), true); }); }
  else if (button.dataset.sourceRefresh) void run(() => openPage('settings'));
  else if (button.dataset.sourceReconcile) void run(async () => { const provider = button.dataset.sourceReconcile; const accountId = pendingAccountForProvider(state.sources[provider], provider) || state.sources[provider]?.connectedAccountId; if (!accountId) throw new Error('Check connection status after finishing consent.'); await bridge.reconcileConnection(provider, accountId); delete state.sourceAttempts[provider]; delete state.connectionRequests[provider]; await openPage('settings'); notice('Source account verified. Import records separately.'); });
  else if (button.dataset.sourceImport) void run(async () => { const provider = button.dataset.sourceImport; const accountId = state.sources[provider]?.connectedAccountId; if (!accountId || state.sources[provider]?.state !== 'connected') throw new Error('Verify the source account before import.'); const cursor = nextImportCursor(state.imports[provider], accountId); const result = await bridge.importSource(workspaceId(), provider, accountId, cursor); state.imports[provider] = { accountId, cursor, result }; notice(result.failedCount ? 'Import page partly failed. Retry this page before continuing.' : result.nextCursor ? 'Import page saved. More pages remain.' : 'Import reached the last page for this run.'); });
  else if (button.dataset.contextSync) void run(async () => { await bridge.syncContext(); notice('Local history synced. Search to see cited context.'); });
  else if (button.dataset.openConsent) void run(async () => { const provider = button.dataset.openConsent; const url = pendingConsentForProvider(state.sources[provider], state.sourceAttempts, provider); if (!url) throw new Error('Consent link is unavailable or expired. Check source status.'); await bridge.openConsent(url); notice('Consent page opened in your browser. Return here to verify the account.'); });
  else if (button.dataset.sourceBegin) void run(async () => { const provider = button.dataset.sourceBegin; const source = state.sources[provider]; if (!sourceCanBegin(source)) throw new Error('Check source status before starting consent.'); const requestId = source.reconnectable === true ? crypto.randomUUID() : state.connectionRequests[provider] || crypto.randomUUID(); state.connectionRequests[provider] = requestId; delete state.sourceAttempts[provider]; state.sources[provider] = { provider, state: 'pending' }; const result = await bridge.beginConnection(provider, requestId); state.sourceAttempts[provider] = result; state.sources[provider] = { provider, state: 'pending', connectedAccountId: result.connectedAccountId }; render(); });
  else if (button.dataset.restoreToggle && !state.busy) { if (state.pendingRestoreId) { state.pendingRestoreId = null; render(); } else { const form = document.querySelector('#restore-form'); if (form) form.hidden = !form.hidden; } }
  else if (button.dataset.cancelRestore) { state.pendingRestoreId = null; render(); }
  else if (button.dataset.confirmRestore && !state.busy && state.pendingRestoreId) { const backupId = state.pendingRestoreId; void run(async () => { const restored = await bridge.restoreBackup(backupId); state.pendingRestoreId = null; state.imports = {}; state.contextHits = []; state.contextQueried = false; state.sourceAttempts = {}; state.backupId = restored.safetyBackupId || null; await load(); notice('Backup restored. A safety backup was created; sync local history before relying on CTX results.'); }); }
});

root.addEventListener('change', (event) => { if (event.target.id === 'link-entity') void run(() => loadLinkChoices(event.target.value)); });

root.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.target;
  if (state.busy) return;
  if (form.id === 'workspace-form') { const data = Object.fromEntries(new FormData(form)); state.setupDraft = { ...data }; void run(async () => { if (!state.workspace) state.workspace = await bridge.createWorkspace(data.name); state.setupProfile = true; await bridge.saveRecord(workspaceId(), 'profile', { title: String(data.ownerName).trim(), fields: { Currency: String(data.currency) } }); state.currency = String(data.currency); state.setupProfile = false; state.setupDraft = null; state.justCreated = true; await openPage('settings'); notice('Your private workspace is ready. Connections are optional.'); }); }
  else if (form.id === 'record-form') { const data = Object.fromEntries(new FormData(form)); state.editorDraft = { ...data }; void run(async () => { const title = String(data.title).trim(); delete data.title; const selected = state.selected; const saved = await bridge.saveRecord(workspaceId(), state.page, { ...(selected?.id ? { id: selected.id, fieldsMode: 'replace', expectedRecord: { title: selected.title, fields: selected.fields, source: selected.source } } : {}), title, fields: selected?.id ? editedFields(selected.fields, data, state.page) : recordFields(data, state.page) }); if (state.page === 'profile') state.currency = saved.fields?.Currency || null; state.editing = false; state.editorDraft = null; await openPage(state.page); await selectRecord(saved.id || saved.record?.id); notice(`${entityName(state.page)} saved.`); }); }
  else if (form.id === 'link-form') submitLink(Object.fromEntries(new FormData(form)));
  else if (form.id === 'restore-form') { const backupId = String(new FormData(form).get('backupId')).trim(); if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(backupId)) { notice('Enter a valid backup ID.', true); return; } state.pendingRestoreId = backupId; render(); }
  else if (form.id === 'context-form') void run(async () => { const query = String(new FormData(form).get('query')).trim(); state.contextHits = await bridge.searchContext(query, 5); state.contextQueried = true; });

});

load().catch((error) => { root.innerHTML = `<div class="setup"><span class="brand-mark">g.</span><h1>Couldn’t open GiGi.</h1><p class="subhead">${safe(explain(error))}</p><button class="btn section-gap" id="retry">Retry</button></div>`; document.querySelector('#retry')?.addEventListener('click', () => location.reload()); });
