const entities = new Set(['tasks', 'interactions', 'notes', 'gigs', 'finances', 'contacts', 'companies', 'documents', 'locations', 'schedule', 'tags', 'profile', 'services']);

export function createBridge(invoke) {
  const call = (operation, input = {}) => invoke('dispatch', { operation, input });
  const owned = (workspaceId) => {
    if (!workspaceId) throw new Error('Create or select a private workspace first.');
    return workspaceId;
  };
  const entity = (name) => {
    if (!entities.has(name)) throw new Error(`Unknown record type: ${name}`);
    return name;
  };
  return {
    overview: (workspaceId, today) => call('workspace.overview', { workspaceId: owned(workspaceId), today }),
    getWorkspace: (workspaceId) => call('workspace.get', workspaceId ? { workspaceId } : {}),
    createWorkspace: (name) => call('workspace.create', { name: name.trim() }),
    listRecords: (workspaceId, name, cursor) => call('records.list', { workspaceId: owned(workspaceId), entity: entity(name), ...(cursor ? { cursor } : {}) }),
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
    connectionStatus: (provider) => call('connections.status', { provider }),
    beginConnection: (provider, requestId) => call('connections.begin', { provider, requestId }),
    openConsent: (url) => call('connections.openConsent', { url }),
    reconcileConnection: (provider, connectedAccountId) => call('connections.reconcile', { provider, connectedAccountId }),
    importSource: (workspaceId, provider, connectedAccountId, cursor) => call('connections.import', { workspaceId: owned(workspaceId), provider, connectedAccountId, ...(cursor ? { cursor } : {}) }),
    searchContext: (query, limit = 5) => call('context.search', { query, limit }),
    syncContext: () => call('context.sync', {}),
    signIn: () => call('auth.login', {}),
    call
  };
}

export function tauriBridge() {
  const invoke = globalThis.__TAURI__?.core?.invoke;
  if (!invoke) throw new Error('GiGi must be opened in the installed desktop app.');
  return createBridge(invoke);
}
