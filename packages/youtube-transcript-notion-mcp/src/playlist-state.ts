import type {
  PlaylistStateStore,
  PlaylistSyncLease,
  PlaylistSyncStateSnapshot,
  PlaylistSyncStateSummary,
} from './types.js';

const RECENT_ITEM_LIMIT = 500;

function nowIso(now?: string): string {
  return now ?? new Date().toISOString();
}

function createEmptyState(playlistId: string): PlaylistSyncStateSnapshot {
  return {
    playlistId,
    recentItemKeys: [],
    recentVideoIds: [],
  };
}

function cloneState(state: PlaylistSyncStateSnapshot): PlaylistSyncStateSnapshot {
  return JSON.parse(JSON.stringify(state)) as PlaylistSyncStateSnapshot;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function uniqRecent(values: string[], limit = RECENT_ITEM_LIMIT): string[] {
  const deduped: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    deduped.push(trimmed);
    if (deduped.length >= limit) {
      break;
    }
  }

  return deduped;
}

export function buildPlaylistItemSyncKey(videoId: string, dateAddedToPlaylist?: string): string {
  return `${videoId}:${dateAddedToPlaylist?.trim() ?? ''}`;
}

export function mergeRecentPlaylistState(
  state: PlaylistSyncStateSnapshot,
  update: {
    recentItemKeys?: string[];
    recentVideoIds?: string[];
    processedAt?: string;
    summary?: PlaylistSyncStateSummary;
    lastError?: PlaylistSyncStateSnapshot['lastError'];
    activeRun?: PlaylistSyncStateSnapshot['activeRun'];
    now?: string;
  },
): PlaylistSyncStateSnapshot {
  const timestamp = nowIso(update.now);

  return {
    ...state,
    ...(update.processedAt ? { lastProcessedAt: update.processedAt } : {}),
    ...(update.summary ? { lastSummary: update.summary } : {}),
    ...(update.lastError !== undefined ? { lastError: update.lastError } : {}),
    ...(update.activeRun !== undefined ? { activeRun: update.activeRun } : {}),
    recentItemKeys: uniqRecent([
      ...(update.recentItemKeys ?? []),
      ...state.recentItemKeys,
    ]),
    recentVideoIds: uniqRecent([
      ...(update.recentVideoIds ?? []),
      ...state.recentVideoIds,
    ]),
    ...(update.summary ? { lastSuccessAt: timestamp } : {}),
  };
}

export class InMemoryPlaylistStateStore implements PlaylistStateStore {
  private readonly states = new Map<string, PlaylistSyncStateSnapshot>();

  async getState(playlistId: string): Promise<PlaylistSyncStateSnapshot> {
    const state = this.states.get(playlistId) ?? createEmptyState(playlistId);
    this.states.set(playlistId, state);
    return cloneState(state);
  }

  async acquireLease(
    playlistId: string,
    input: {
      runId: string;
      source: string;
      leaseMs: number;
      now?: string;
    },
  ): Promise<PlaylistSyncLease> {
    const state = this.states.get(playlistId) ?? createEmptyState(playlistId);
    const timestamp = nowIso(input.now);
    const activeRun = state.activeRun;
    if (activeRun && new Date(activeRun.leaseExpiresAt).getTime() > Date.parse(timestamp)) {
      return {
        acquired: false,
        state: cloneState(state),
        activeRun: cloneJson(activeRun),
      };
    }

    const nextState: PlaylistSyncStateSnapshot = {
      ...state,
      lastAttemptAt: timestamp,
      activeRun: {
        runId: input.runId,
        source: input.source,
        startedAt: timestamp,
        leaseExpiresAt: new Date(Date.parse(timestamp) + input.leaseMs).toISOString(),
      },
    };
    this.states.set(playlistId, nextState);

    return {
      acquired: true,
      state: cloneState(nextState),
      activeRun: cloneJson(nextState.activeRun),
    };
  }

  async completeRun(
    playlistId: string,
    input: {
      runId: string;
      recentItemKeys: string[];
      recentVideoIds: string[];
      processedAt?: string;
      summary: PlaylistSyncStateSummary;
      now?: string;
    },
  ): Promise<PlaylistSyncStateSnapshot> {
    const state = this.states.get(playlistId) ?? createEmptyState(playlistId);
    const timestamp = nowIso(input.now);
    const nextState = mergeRecentPlaylistState(
      {
        ...state,
        lastRunAt: timestamp,
        lastAttemptAt: timestamp,
      },
      {
        recentItemKeys: input.recentItemKeys,
        recentVideoIds: input.recentVideoIds,
        processedAt: input.processedAt,
        summary: input.summary,
        lastError: undefined,
        activeRun:
          state.activeRun?.runId === input.runId ? undefined : state.activeRun,
        now: timestamp,
      },
    );

    this.states.set(playlistId, nextState);
    return cloneState(nextState);
  }

  async failRun(
    playlistId: string,
    input: {
      runId: string;
      error: {
        code: string;
        message: string;
      };
      now?: string;
    },
  ): Promise<PlaylistSyncStateSnapshot> {
    const state = this.states.get(playlistId) ?? createEmptyState(playlistId);
    const timestamp = nowIso(input.now);
    const nextState: PlaylistSyncStateSnapshot = {
      ...state,
      lastRunAt: timestamp,
      lastAttemptAt: timestamp,
      lastError: {
        ...input.error,
        at: timestamp,
      },
      activeRun:
        state.activeRun?.runId === input.runId ? undefined : state.activeRun,
    };

    this.states.set(playlistId, nextState);
    return cloneState(nextState);
  }
}
