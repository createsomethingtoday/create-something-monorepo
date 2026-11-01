// Presentation preferences belong to one local workspace. This schema deliberately
// excludes records, credentials, provider settings, executable code and custom CSS.
export const defaults = Object.freeze({
  version: 1,
  theme: 'studio',
  density: 'comfortable',
  startPage: 'overview',
  collectionView: 'list',
  scheduleView: 'upcoming',
  chatWidth: 'standard',
  chatTextSize: 'standard',
  chatDensity: 'comfortable',
});

const choices = {
  chatWidth: ['standard', 'wide'],
  chatTextSize: ['standard', 'larger'],
  chatDensity: ['comfortable', 'compact'],
  theme: ['studio', 'paper', 'midnight'],
  density: ['comfortable', 'compact'],
  startPage: ['overview', 'music', 'social', 'gigs', 'schedule', 'tasks', 'finances', 'contacts'],
  collectionView: ['list', 'cards'],
  scheduleView: ['upcoming', 'past', 'all'],
};
const maxBytes = 16 * 1024;
const plain = (value) => value !== null && typeof value === 'object'
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const valid = (key, value) => key === 'version' ? value === 1
  : choices[key]?.includes(value) === true;
const storageKey = (workspaceId) => `gigi:preferences:v1:${workspaceId}`;
const chatStorageKey = (workspaceId) => `gigi:chat-preferences:v1:${workspaceId}`;
const chatKeys = ['chatWidth', 'chatTextSize', 'chatDensity'];
const hasWorkspace = (workspaceId) => typeof workspaceId === 'string' && workspaceId.trim().length > 0;

export function normalizePreferences(value) {
  const result = { ...defaults };
  if (!plain(value) || (Object.hasOwn(value, 'version') && value.version !== 1)) return result;
  for (const key of Object.keys(defaults)) {
    if (Object.hasOwn(value, key) && valid(key, value[key])) result[key] = value[key];
  }
  return result;
}

export function importPreferences(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > maxBytes) {
    throw new Error('Configuration must be a JSON document of 16 KiB or less.');
  }
  let value;
  try { value = JSON.parse(text); }
  catch { throw new Error('Configuration is not valid JSON.'); }
  if (!plain(value)) throw new Error('Configuration must be a JSON object.');
  for (const key of Object.keys(value)) {
    if (!Object.hasOwn(defaults, key)) throw new Error(`Configuration contains an unsupported setting: ${key}.`);
    if (!(key === 'version' && value[key] === 2) && !valid(key, value[key])) throw new Error(`Configuration has an unsupported value for ${key}.`);
  }
  return normalizePreferences({ ...value, version: 1 });
}

const corePreferences = (value) => Object.fromEntries(Object.entries(value).filter(([key]) => !chatKeys.includes(key)));
export function exportPreferences(value, { includeChat = false } = {}) {
  const normalized = normalizePreferences(value);
  return JSON.stringify(includeChat === true ? { ...normalized, version: 2 } : corePreferences(normalized), null, 2);
}

function importStoredPreferences(text) {
  const value = importPreferences(text);
  // Both on-device keys retain their original v1 storage contract.
  if (JSON.parse(text).version === 2) throw new Error('Stored preferences require version 1.');
  return value;
}

export function readPreferences(storage, workspaceId) {
  if (!hasWorkspace(workspaceId)) return { ...defaults };
  try {
    const text = storage?.getItem(storageKey(workspaceId));
    const base = text == null ? { ...defaults } : importStoredPreferences(text);
    // Core v1 remains readable by the advertised rollback. Read old combined
    // candidate payloads too; the next explicit save separates their extension.
    try {
      const extension = storage?.getItem(chatStorageKey(workspaceId));
      if (extension != null) {
        const chat = importStoredPreferences(extension);
        const value = JSON.parse(extension);
        if (Object.keys(value).some(key => key !== 'version' && !chatKeys.includes(key))) return base;
        for (const key of chatKeys) base[key] = chat[key];
      }
    } catch { /* A damaged chat extension cannot discard core choices. */ }
    return base;
  } catch { return { ...defaults }; }
}

export function writePreferences(storage, workspaceId, value) {
  if (!hasWorkspace(workspaceId)) throw new Error('A workspace is required to save preferences.');
  const normalized = normalizePreferences(value);
  const core = corePreferences(normalized);
  const chat = { version: 1, ...Object.fromEntries(chatKeys.map(key => [key, normalized[key]])) };
  const entries = [[storageKey(workspaceId), JSON.stringify(core)], [chatStorageKey(workspaceId), JSON.stringify(chat)]];
  const previous = [];
  try {
    for (const [key] of entries) previous.push([key, storage.getItem(key)]);
    for (const [key, text] of entries) storage.setItem(key, text);
  } catch {
    // Restore both prior entries if either write fails; do not report a partial
    // save as successful. Storage can itself be unavailable during recovery.
    for (const [key, text] of previous) {
      try { if (text == null) storage.removeItem(key); else storage.setItem(key, text); } catch { /* best effort */ }
    }
    throw new Error('Could not save preferences on this device. Check local storage and try again.');
  }
  return normalized;
}

export function applyPreferences(value, document = globalThis.document) {
  const normalized = normalizePreferences(value);
  const dataset = document?.documentElement?.dataset;
  if (dataset) {
    dataset.theme = normalized.theme;
    dataset.density = normalized.density;
    dataset.collectionView = normalized.collectionView;
    dataset.chatWidth = normalized.chatWidth;
    dataset.chatTextSize = normalized.chatTextSize;
    dataset.chatDensity = normalized.chatDensity;
  }
  return normalized;
}
