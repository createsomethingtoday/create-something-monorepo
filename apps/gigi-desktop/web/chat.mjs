const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const sessionItems = (value) => Array.isArray(value) ? value : Array.isArray(value?.sessions) ? value.sessions : [];
const pollLimit = 120;
const uncertainOutcomes = new Set(['reconciliation_required', 'write_outcome_unknown', 'turn_outcome_unknown']);
const explanations = {
  codex_unavailable: 'Codex is unavailable on this Mac. Check that Codex is installed and running, then reopen Ask GiGi.',
  chatgpt_auth_required: 'Sign in to your ChatGPT account in Codex on this Mac, then reopen Ask GiGi.',
  reconciliation_required: 'The last send may have started. Reopen this conversation and check its latest messages before sending again.',
  write_outcome_unknown: 'A record change may have happened. Check the record in GiGi before requesting another change.',
  turn_outcome_unknown: 'The last send may have started. Reopen this conversation and check its latest messages before sending again.',
  usage_limit_reached: 'Your Codex usage limit is reached. Try again after it resets.',
  usage_limit: 'Your Codex usage limit is reached. Try again after it resets.',
  quota_exceeded: 'Your Codex usage limit is reached. Try again after it resets.',
  rate_limit_exceeded: 'Codex is at its usage limit. Try again later.',
  rate_limit: 'Codex is at its usage limit. Try again later.',
  authentication_required: 'Sign in to Codex on this Mac, then reopen Ask GiGi.',
  not_authenticated: 'Sign in to Codex on this Mac, then reopen Ask GiGi.',
  gigi_tools_unavailable: 'GiGi’s local tools are unavailable. Check agent setup in Settings. If a companion is missing, reinstall the complete GiGi app.',
};
function explanation(raw) {
  const code = String(raw ?? '').trim();
  return explanations[code] || 'Could not complete this request. Reopen the conversation to check its state.';
}
function needsReconciliation(chat) { return uncertainOutcomes.has(chat.error) || uncertainOutcomes.has(chat.current?.error); }

function approvalCopy(item) {
  let args;
  try { args = JSON.parse(item.detail); } catch { /* Provider detail is explanatory text. */ }
  if (!args || typeof args !== 'object' || Array.isArray(args)) return `<strong>${escape(item.title)}</strong><p>${escape(item.detail)}</p>`;
  const tool = String(item.title || '').replace(/^Approve\s+/, '');
  const names = { gigi_records_save: 'Save a record', gigi_relations_link: 'Link records', gigi_backup_create: 'Create a backup' };
  const title = names[tool] || item.title;
  const summary = [args.entity, args.title].filter((value) => typeof value === 'string' && value.trim()).join(' · ');
  const fields = args.fields && typeof args.fields === 'object' && !Array.isArray(args.fields) ? Object.entries(args.fields).slice(0, 20) : [];
  const fieldList = fields.length ? `<dl class="chat-proposal-fields">${fields.map(([name, value]) => `<dt>${escape(name)}</dt><dd>${escape(typeof value === 'string' ? value : JSON.stringify(value))}</dd>`).join('')}</dl>` : '';
  return `<strong>${escape(title)}</strong>${summary ? `<p>${escape(summary)}</p>` : ''}${fieldList}<details><summary>Technical details</summary><pre>${escape(item.detail)}</pre></details>`;
}

export class ChatController {
  constructor(bridge, workspaceId, changed, completed, schedule = setTimeout, clear = clearTimeout) {
    this.bridge = bridge; this.workspaceId = workspaceId; this.changed = changed; this.completed = completed;
    this.schedule = schedule; this.clear = clear; this.visible = false; this.status = null;
    this.sessions = []; this.current = null; this.record = null; this.draft = ''; this.error = null;
    this.pending = false; this.reading = false; this.timer = null; this.epoch = 0; this.pollCount = 0;
  }
  emit() { this.changed(); }
  stopPolling() { if (this.timer != null) this.clear(this.timer); this.timer = null; this.epoch++; }
  close() { this.visible = false; this.stopPolling(); this.emit(); }
  async open(record = null) {
    this.stopPolling(); this.visible = true; this.record = record; this.current = null; this.draft = ''; this.error = null; this.emit();
    const epoch = this.epoch;
    try {
      const [status, list] = await Promise.allSettled([this.bridge.chatStatus(this.workspaceId), this.bridge.chatList(this.workspaceId)]);
      if (epoch !== this.epoch || !this.visible) return;
      if (status.status === 'rejected') throw status.reason;
      this.status = status.value;
      if (list.status === 'fulfilled') this.sessions = sessionItems(list.value);
      else this.error = String(list.reason?.message || list.reason);
      this.emit();
    } catch (error) { if (epoch === this.epoch) { this.status = { provider: 'codex', available: false, authenticated: false }; this.error = String(error?.message || error); this.emit(); } }
  }
  async start() {
    if (this.pending || !this.status?.available || !this.status?.authenticated) return;
    this.stopPolling(); this.pollCount = 0; this.pending = true; this.error = null; this.current = null; this.emit();
    const epoch = this.epoch;
    try {
      const started = await this.bridge.chatStart(this.workspaceId, this.record ? { entity: this.record.entity, id: this.record.id } : null);
      if (epoch !== this.epoch || !this.visible) return;
      const sessionId = started?.sessionId;
      if (!sessionId) throw new Error('Codex did not return a session ID.');
      await this.read(sessionId, epoch, true);
      if (!this.visible || this.current?.sessionId !== sessionId) return;
      const list = await this.bridge.chatList(this.workspaceId);
      if (!this.visible || this.current?.sessionId !== sessionId) return;
      this.sessions = sessionItems(list); this.emit();
    } catch (error) { if (epoch === this.epoch) { this.error = String(error?.message || error); this.emit(); } }
    finally { this.pending = false; this.emit(); }
  }
  async read(sessionId, epoch = this.epoch, preserveContext = false) {
    this.stopPolling(); this.pollCount = 0; epoch = this.epoch;
    const saved = this.sessions.find((item) => item.sessionId === sessionId);
    const savedRecord = saved?.record;
    if (saved && !preserveContext) this.record = savedRecord ? { entity: savedRecord.entity, id: savedRecord.id, ...(savedRecord.title ? { title: savedRecord.title } : this.record?.entity === savedRecord.entity && this.record?.id === savedRecord.id && this.record?.title ? { title: this.record.title } : {}) } : null;
    this.reading = true; this.error = null; this.current = { sessionId, messages: [], state: 'idle', approvals: [], recordLinks: [] }; this.emit();
    try {
      const result = await this.bridge.chatRead(this.workspaceId, sessionId);
      if (epoch !== this.epoch || !this.visible) return;
      this.accept(result);
    } catch (error) { if (epoch === this.epoch) { this.error = String(error?.message || error); this.emit(); } }
    finally { if (epoch === this.epoch) { this.reading = false; this.emit(); } }
  }
  accept(result) {
    if (!result || result.sessionId !== this.current?.sessionId) return;
    const previous = this.current.state;
    const messages = Array.isArray(result.messages) && result.messages.length ? result.messages : this.current.messages;
    this.current = { ...result, messages }; this.error = result.error || null; this.emit();
    if (['running', 'approval'].includes(previous) && result.state === 'idle') void this.completed?.(result);
    if (result.state === 'running') this.queuePoll();
  }
  queuePoll() {
    if (!this.visible || this.timer != null || this.pollCount >= pollLimit) {
      if (this.pollCount >= pollLimit) { this.error = 'The response is still running. Open this session again to check it.'; this.emit(); }
      return;
    }
    const epoch = this.epoch;
    this.timer = this.schedule(async () => {
      this.timer = null;
      if (epoch !== this.epoch || !this.visible || this.current?.state !== 'running') return;
      this.pollCount++;
      try { const result = await this.bridge.chatPoll(this.workspaceId, this.current.sessionId); if (epoch === this.epoch && this.visible) this.accept(result); }
      catch (error) { if (epoch === this.epoch) { this.error = String(error?.message || error); this.emit(); } }
    }, 1000);
  }
  async send(message) {
    const text = String(message ?? '').trim();
    if (!text || this.pending || this.reading || !this.current || !this.status?.available || !this.status?.authenticated || needsReconciliation(this) || this.current.state === 'running' || this.current.state === 'approval') return;
    this.pending = true; this.error = null; this.emit();
    const sessionId = this.current.sessionId, epoch = this.epoch;
    try {
      const result = await this.bridge.chatSend(this.workspaceId, sessionId, text);
      if (epoch !== this.epoch) return;
      this.draft = '';
      if (result?.sessionId) { this.accept(result); if (result.state === 'idle') void this.completed?.(result); }
      else await this.read(sessionId);
    } catch (error) { if (epoch === this.epoch) { this.error = String(error?.message || error); this.emit(); } }
    finally { this.pending = false; this.emit(); }
  }
  async cancel() {
    if (!this.current || this.pending || this.current.state !== 'running') return;
    this.stopPolling(); this.pending = true; this.emit();
    const sessionId = this.current.sessionId, epoch = this.epoch;
    try { const result = await this.bridge.chatCancel(this.workspaceId, sessionId); if (epoch !== this.epoch || !this.visible) return; if (result?.sessionId) this.accept(result); else await this.read(sessionId); }
    catch (error) { this.error = String(error?.message || error); this.emit(); }
    finally { this.pending = false; this.emit(); }
  }
  async decide(approvalId, decision) {
    if (!this.current || this.pending || this.current.state !== 'approval' || !['approve', 'reject'].includes(decision) || !this.current.approvals?.some((item) => item.id === approvalId)) return;
    this.pending = true; this.emit();
    const sessionId = this.current.sessionId, epoch = this.epoch;
    try { const result = await this.bridge.chatApprove(this.workspaceId, sessionId, approvalId, decision); if (epoch !== this.epoch || !this.visible) return; if (result?.sessionId) this.accept(result); else await this.read(sessionId); }
    catch (error) { this.error = String(error?.message || error); this.emit(); }
    finally { this.pending = false; this.emit(); }
  }
}

export function chatView(chat) {
  if (!chat.visible) return '';
  const current = chat.current;
  const ready = chat.status?.available && chat.status?.authenticated;
  const unavailable = chat.status ? (!chat.status.available ? explanation(chat.status.reason || 'codex_unavailable') : !chat.status.authenticated ? explanation(chat.status.reason || 'chatgpt_auth_required') : '') : 'Checking Codex…';
  const uncertain = needsReconciliation(chat);
  const failureNote = uncertain ? 'Check the latest conversation and affected GiGi records before sending another message.' : 'This response failed. Reopen the conversation to check its state.';
  const failedMarkup = `<p class="chat-error">${failureNote}</p>`;
  const context = chat.record ? `<span class="chat-context">About ${escape(chat.record.title || `${chat.record.entity} · ${chat.record.id}`)}</span>` : '<span class="chat-context">Workspace</span>';
  const messages = (current?.messages || []).map((item) => `<div class="chat-message ${item.role === 'user' ? 'from-user' : 'from-agent'}"><span class="chat-message-label">${item.role === 'user' ? 'You' : 'GiGi'}</span><p>${escape(item.text)}</p></div>`).join('');
  const approvals = current?.state === 'approval' ? (current.approvals || []).map((item) => `<div class="chat-approval">${approvalCopy(item)}<div class="inline-actions"><button class="btn primary" data-chat-approval="${escape(item.id)}" data-chat-decision="approve" ${chat.pending ? 'disabled' : ''}>Approve</button><button class="btn danger" data-chat-approval="${escape(item.id)}" data-chat-decision="reject" ${chat.pending ? 'disabled' : ''}>Reject</button></div></div>`).join('') : '';
  const links = (current?.recordLinks || []).map((item) => `<button type="button" class="btn text chat-record-link" data-chat-link-entity="${escape(item.entity)}" data-chat-link-id="${escape(item.id)}">${escape(item.title || item.id)} ↗</button>`).join('');
  const sessions = chat.sessions.map((item) => `<button type="button" class="chat-session" data-chat-session="${escape(item.sessionId)}" ${item.sessionId === current?.sessionId ? 'aria-current="true"' : ''}><span>${escape(item.title || item.record?.title || 'Conversation')}</span><small>${escape(item.state || '')}</small></button>`).join('');
  return `<aside class="chat-panel" aria-label="Ask GiGi"><div class="chat-head"><div><p class="eyebrow">Codex · local session</p><h2>Ask GiGi</h2></div><button type="button" class="btn text" data-chat-close="1" aria-label="Close Ask GiGi">Close</button></div><div class="chat-context-row">${context}<span class="chat-presence">${ready ? 'Codex signed in' : chat.status ? 'Unavailable' : 'Checking'}</span></div><p class="chat-scope">Ask about your local workspace and approve edits to existing records. Create records and links with GiGi’s record controls. Selected record context is included when starting a chat. Phone access is a separate setup step in Settings.</p>${unavailable ? `<p class="chat-status" role="status">${unavailable}</p>` : ''}${chat.error ? `<p class="chat-error" role="alert">${escape(explanation(chat.error))}${chat.error === 'gigi_tools_unavailable' ? ' <button type="button" class="btn text" data-page="settings">Open Settings</button>' : ''}</p>` : ''}<div class="chat-sessions"><div class="chat-section-head"><strong>Conversations</strong><button type="button" class="btn text" data-chat-new="1" ${!ready || chat.pending ? 'disabled' : ''}>New chat</button></div>${sessions || '<p class="muted">No saved conversations yet.</p>'}</div><div class="chat-transcript" role="log" aria-label="Conversation" aria-live="polite">${messages || '<p class="chat-empty">Ask about your work, or open a saved conversation.</p>'}${approvals}${links}${current?.state === 'running' ? '<p class="chat-running" role="status">GiGi is responding…</p>' : ''}${current?.state === 'interrupted' ? '<p class="chat-status">This response was interrupted. You can send another message.</p>' : ''}${current?.state === 'failed' ? failedMarkup : ''}</div>${current ? `<form id="chat-form" class="chat-composer"><label for="chat-message">Message GiGi</label><textarea id="chat-message" name="message" rows="3" maxlength="12000" placeholder="Ask about this ${chat.record ? 'record' : 'workspace'}…" ${!ready ? 'disabled' : ''}>${escape(chat.draft)}</textarea><div class="chat-actions">${current.state === 'running' ? `<button type="button" class="btn danger" data-chat-stop="1" ${chat.pending ? 'disabled' : ''}>Stop response</button>` : `<button type="submit" class="btn primary" ${!ready || chat.pending || chat.reading || uncertain || current.state === 'approval' ? 'disabled' : ''}>Send message</button>`}</div></form>` : '<p class="chat-hint">Start a chat to ask GiGi about your workspace.</p>'}</aside>`;
}
