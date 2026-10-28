import {localToday} from './experience.mjs';
const entities = new Set(['tasks', 'interactions', 'notes', 'gigs', 'finances', 'contacts', 'companies', 'documents', 'locations', 'schedule', 'tags', 'profile', 'services']);

export function createBridge(invoke, onMutation = () => {}) {
  const call = async (operation, input = {}) => {const result=await invoke('dispatch', {operation,input});if(['records.save','relations.link','backup.restore','connections.import','imports.commit'].includes(operation))onMutation(input.workspaceId);return result;};
  const owned = (workspaceId) => {
    if (!workspaceId) throw new Error('Create or select a private workspace first.');
    return workspaceId;
  };
  const entity = (name) => {
    if (!entities.has(name)) throw new Error(`Unknown record type: ${name}`);
    return name;
  };
  return {
    overview: (workspaceId, today) => call('workspace.overview', { workspaceId: owned(workspaceId), today, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    getWorkspace: (workspaceId) => call('workspace.get', workspaceId ? { workspaceId } : {}),
    createWorkspace: (name) => call('workspace.create', { name: name.trim() }),
    listRecords: (workspaceId, name, cursor, query) => call('records.list', { workspaceId: owned(workspaceId), entity: entity(name), ...(cursor ? { cursor } : {}), ...(name === 'contacts' && query?.trim() ? { query: query.trim() } : {}) }),
    listGigs: (workspaceId, gigs, cursor) => call('records.list', { workspaceId: owned(workspaceId), entity: 'gigs', gigs: { ...gigs, today: localToday(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }, ...(cursor ? {cursor} : {}) }),
    getRecord: (workspaceId, name, id, detail) => call('records.get', { workspaceId: owned(workspaceId), entity: entity(name), id, ...(detail ? { detail } : {}) }),
    saveRecord: (workspaceId, name, record) => call('records.save', { workspaceId: owned(workspaceId), entity: entity(name), ...record }),
    linkRecords: (workspaceId, fromEntity, fromId, toEntity, toId, role) => call('relations.link', { workspaceId: owned(workspaceId), fromEntity: entity(fromEntity), fromId, toEntity: entity(toEntity), toId, ...(role ? { role } : {}) }),
    gigSummary: (workspaceId, gigId) => call('gigs.summary', { workspaceId: owned(workspaceId), gigId }),
    listHistory: (workspaceId, limit = 30) => call('history.list', { workspaceId: owned(workspaceId), limit }),
    createBackup: (workspaceId) => call('backup.create', { workspaceId: owned(workspaceId) }),
    restoreBackup: (backupId) => call('backup.restore', { backupId }),
    describeSchema: (name) => call('schema.describe', { entity: entity(name) }),
    prepareAgent: () => call('agent.prepare', {}),
    agentStatus: () => call('agent.status', {}),
    chatStatus: (workspaceId) => call('agent.chat.status', { workspaceId: owned(workspaceId) }),
    chatList: (workspaceId) => call('agent.chat.list', { workspaceId: owned(workspaceId) }),
    chatStart: (workspaceId, record) => call('agent.chat.start', { workspaceId: owned(workspaceId), ...(record ? { record } : {}) }),
    chatRead: (workspaceId, sessionId) => call('agent.chat.read', { workspaceId: owned(workspaceId), sessionId }),
    chatSend: (workspaceId, sessionId, message) => call('agent.chat.send', { workspaceId: owned(workspaceId), sessionId, message }),
    chatPoll: (workspaceId, sessionId) => call('agent.chat.poll', { workspaceId: owned(workspaceId), sessionId }),
    chatCancel: (workspaceId, sessionId) => call('agent.chat.cancel', { workspaceId: owned(workspaceId), sessionId }),
    chatApprove: (workspaceId, sessionId, approvalId, decision) => call('agent.chat.approve', { workspaceId: owned(workspaceId), sessionId, approvalId, decision }),
    connectionStatus: (provider) => call('connections.status', { provider }),
    sourceStatus: (workspaceId, provider) => call('sources.status', { workspaceId: owned(workspaceId), provider }),
    previewSource: (workspaceId, provider, connectedAccountId, selection = {}, cursor) => call('sources.preview', { workspaceId: owned(workspaceId), provider, connectedAccountId, selection, maxPages: 1, maxRecords: 25, ...(cursor ? { cursor } : {}) }),
    commitSource: (workspaceId, previewId, expectedRevision, idempotencyKey) => call('imports.commit', { workspaceId: owned(workspaceId), previewId, expectedRevision, idempotencyKey, confirmed: true }),
    importStatus: (workspaceId, jobId) => call('imports.status', { workspaceId: owned(workspaceId), jobId }),
    cancelImport: (workspaceId, previewId) => call('imports.cancel', { workspaceId: owned(workspaceId), previewId }),
    beginConnection: (provider, requestId) => call('connections.begin', { provider, requestId }),
    openConsent: (url, provider) => call('connections.openConsent', { url, provider }),
    reconcileConnection: (provider, connectedAccountId) => call('connections.reconcile', { provider, connectedAccountId }),
    importSource: (workspaceId, provider, connectedAccountId, cursor) => call('connections.import', { workspaceId: owned(workspaceId), provider, connectedAccountId, ...(cursor ? { cursor } : {}) }),
    searchContext: (query, limit = 5) => call('context.search', { query, limit }),
    syncContext: () => call('context.sync', {}),
    signIn: () => call('auth.login', {}),
    signOut: () => call('auth.logout', {}),
    call
  };
}

export function tauriBridge(onMutation) {
  const invoke = globalThis.__TAURI__?.core?.invoke;
  if (!invoke) throw new Error('GiGi must be opened in the installed desktop app.');
  return createBridge(invoke, onMutation);
}
