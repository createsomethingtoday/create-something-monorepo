import {
  DEFAULT_PLAYLIST_MAX_SCAN_ITEMS,
  DEFAULT_PLAYLIST_MAX_SYNC_ITEMS,
  PLAYLIST_SYNC_LEASE_MS,
} from './config.js';
import { buildPlaylistItemSyncKey } from './playlist-state.js';
import { TranscriptExtractionError } from './transcript-service.js';
import {
  buildCanonicalPlaylistUrl,
  buildCanonicalVideoUrl,
  normalizePlaylistReference,
} from './youtube.js';
import type {
  ListPlaylistItemsInput,
  ListPlaylistItemsResult,
  NotionService,
  PlaylistListItem,
  PlaylistService,
  PlaylistStateStore,
  PlaylistSyncItemResult,
  PlaylistSyncResult,
  PlaylistSyncStateSnapshot,
  SyncPlaylistToNotionInput,
  TranscriptRecord,
  TranscriptService,
} from './types.js';

type YouTubePlaylistItemResponse = {
  nextPageToken?: string;
  items?: Array<{
    snippet?: {
      title?: string;
      playlistId?: string;
      publishedAt?: string;
      position?: number;
      channelTitle?: string;
      videoOwnerChannelTitle?: string;
      resourceId?: {
        videoId?: string;
      };
      thumbnails?: Record<string, { url?: string }>;
    };
    contentDetails?: {
      videoPublishedAt?: string;
    };
  }>;
};

type YouTubePlaylistMetadataResponse = {
  items?: Array<{
    snippet?: {
      title?: string;
    };
  }>;
};

const workerFetch: typeof fetch = (input, init) => globalThis.fetch(input, init);

export class PlaylistSyncServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'PlaylistSyncServiceError';
  }
}

function parseTimestamp(value?: string): number {
  if (!value) {
    return Number.NaN;
  }

  return Date.parse(value);
}

function resolveThumbnailUrl(
  thumbnails: Record<string, { url?: string }> | undefined,
): string | undefined {
  if (!thumbnails) {
    return undefined;
  }

  const ranked = ['maxres', 'standard', 'high', 'medium', 'default'];
  for (const key of ranked) {
    const url = thumbnails[key]?.url?.trim();
    if (url) {
      return url;
    }
  }

  return Object.values(thumbnails)
    .map((entry) => entry?.url?.trim())
    .find(Boolean);
}

function normalizePlaylistItem(
  playlistId: string,
  playlistTitle: string | undefined,
  item: NonNullable<YouTubePlaylistItemResponse['items']>[number],
): PlaylistListItem | null {
  const snippet = item?.snippet;
  const videoId = snippet?.resourceId?.videoId?.trim();
  if (!videoId) {
    return null;
  }

  const title = snippet?.title?.trim() || `Video ${videoId}`;
  return {
    playlistId,
    playlistUrl: buildCanonicalPlaylistUrl(playlistId),
    playlistTitle,
    videoId,
    videoUrl: buildCanonicalVideoUrl(videoId),
    title,
    channelName:
      snippet?.videoOwnerChannelTitle?.trim() ||
      snippet?.channelTitle?.trim() ||
      undefined,
    publishedAt: item?.contentDetails?.videoPublishedAt?.trim() || undefined,
    dateAddedToPlaylist: snippet?.publishedAt?.trim() || undefined,
    thumbnailUrl: resolveThumbnailUrl(snippet?.thumbnails),
    position:
      typeof snippet?.position === 'number' ? snippet.position : undefined,
  };
}

function comparePlaylistItemsNewestFirst(a: PlaylistListItem, b: PlaylistListItem): number {
  const dateDiff = parseTimestamp(b.dateAddedToPlaylist) - parseTimestamp(a.dateAddedToPlaylist);
  if (Number.isFinite(dateDiff) && dateDiff !== 0) {
    return dateDiff;
  }

  if (typeof a.position === 'number' && typeof b.position === 'number') {
    return a.position - b.position;
  }

  return a.videoId.localeCompare(b.videoId);
}

function dedupeByVideoAndAddedDate(items: PlaylistListItem[]): PlaylistListItem[] {
  const seen = new Set<string>();
  const deduped: PlaylistListItem[] = [];
  for (const item of items) {
    const key = buildPlaylistItemSyncKey(item.videoId, item.dateAddedToPlaylist);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

function parseCursor(value: string | undefined): number | null {
  if (!value?.trim()) {
    return null;
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    throw new PlaylistSyncServiceError(
      'INVALID_PLAYLIST_CURSOR',
      `Invalid sinceCursor value "${value}". Expected an ISO date or datetime string.`,
    );
  }

  return timestamp;
}

function buildTranscriptUnavailableRecord(
  item: PlaylistListItem,
  error: TranscriptExtractionError,
): TranscriptRecord {
  return {
    videoId: item.videoId,
    url: item.videoUrl,
    title: item.title,
    channelName: item.channelName,
    publishedAt: item.publishedAt,
    thumbnailUrl: item.thumbnailUrl,
    transcript: '',
    segments: [],
    extractionMethod: 'unavailable',
    language: undefined,
    warnings: [error.message],
    sourceDiagnostics:
      (error.diagnostics as TranscriptRecord['sourceDiagnostics']) ?? {
        attempts: [],
      },
    playlistId: item.playlistId,
    playlistTitle: item.playlistTitle,
    dateAddedToPlaylist: item.dateAddedToPlaylist,
    captionsSource: 'none',
  };
}

function resolveCaptionsSource(record: TranscriptRecord): string {
  if (record.extractionMethod === 'unavailable') {
    return 'none';
  }

  if (record.extractionMethod === 'supadata') {
    const transcriptMode = String(record.sourceDiagnostics?.transcriptMode ?? '').trim();
    if (transcriptMode === 'native') {
      return 'official';
    }
    if (transcriptMode === 'generate' || transcriptMode === 'auto') {
      return 'generated';
    }
  }

  return record.extractionMethod;
}

function buildTranscriptHeaderLines(record: TranscriptRecord): string[] {
  const playlistLabel = record.playlistTitle
    ? `${record.playlistTitle} (${record.playlistId ?? 'unknown-playlist'})`
    : record.playlistId ?? 'Unknown playlist';

  return [
    `Video title: ${record.title}`,
    `Video URL: ${record.url}`,
    `Playlist: ${playlistLabel}`,
    `Captions source: ${record.captionsSource ?? resolveCaptionsSource(record)}`,
    `Date added to playlist: ${record.dateAddedToPlaylist ?? 'Unknown'}`,
  ];
}

function buildTranscriptBodyText(
  record: TranscriptRecord,
  unavailableReason?: string,
): string {
  if (record.transcript.trim()) {
    return record.transcript;
  }

  return unavailableReason
    ? `Transcript unavailable: ${unavailableReason}`
    : 'Transcript unavailable.';
}

function buildDryRunItemResult(item: PlaylistListItem): PlaylistSyncItemResult {
  return {
    videoId: item.videoId,
    url: item.videoUrl,
    title: item.title,
    dateAddedToPlaylist: item.dateAddedToPlaylist,
    transcriptStatus: 'unavailable',
    extractionMethod: 'unavailable',
    warnings: ['Dry run skipped transcript extraction and Notion sync.'],
    skippedReason: 'dry_run',
  };
}

function buildStatusSnapshot(
  configured: boolean,
  options: {
    defaultPlaylistId?: string;
    defaultDatabaseId?: string;
    maxScanItems: number;
    maxSyncItems: number;
    stateStoreKind: string;
    state?: PlaylistSyncStateSnapshot;
  },
): Record<string, unknown> {
  return {
    configured,
    defaultPlaylistId: options.defaultPlaylistId ?? null,
    defaultDatabaseId: options.defaultDatabaseId ?? null,
    maxScanItems: options.maxScanItems,
    maxSyncItems: options.maxSyncItems,
    stateStore: {
      kind: options.stateStoreKind,
      available: true,
    },
    ...(options.state ? { state: options.state } : {}),
  };
}

export class YouTubePlaylistSyncService implements PlaylistService {
  constructor(
    private readonly options: {
      apiKey?: string;
      defaultPlaylistId?: string;
      defaultDatabaseId?: string;
      maxScanItems?: number;
      maxSyncItems?: number;
      stateStore: PlaylistStateStore;
      stateStoreKind?: string;
      transcriptService: TranscriptService;
      notionService: NotionService;
    },
    private readonly fetchImpl: typeof fetch = workerFetch,
  ) {}

  private getApiKey(): string {
    const apiKey = this.options.apiKey?.trim();
    if (!apiKey) {
      throw new PlaylistSyncServiceError(
        'YOUTUBE_DATA_API_UNAVAILABLE',
        'Playlist tools are unavailable because YOUTUBE_DATA_API_KEY is not configured.',
      );
    }

    return apiKey;
  }

  private resolvePlaylistId(input?: string): { playlistId: string; url: string } {
    const reference = input?.trim() || this.options.defaultPlaylistId?.trim();
    if (!reference) {
      throw new PlaylistSyncServiceError(
        'PLAYLIST_ID_REQUIRED',
        'No playlistId was provided and no YOUTUBE_PLAYLIST_ID default is configured.',
      );
    }

    try {
      return normalizePlaylistReference(reference);
    } catch (error) {
      throw new PlaylistSyncServiceError(
        'INVALID_PLAYLIST_ID',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private buildApiUrl(path: string, params: Record<string, string | number | undefined>): string {
    const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
    url.searchParams.set('key', this.getApiKey());
    return url.toString();
  }

  private async requestJson<T>(url: string): Promise<T> {
    const response = await this.fetchImpl(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    const text = await response.text();
    const data = text ? (JSON.parse(text) as T & { error?: { message?: string } }) : ({} as T);

    if (!response.ok) {
      throw new PlaylistSyncServiceError(
        'YOUTUBE_DATA_API_ERROR',
        (data as { error?: { message?: string } })?.error?.message ||
          `YouTube Data API request failed with status ${response.status}.`,
        {
          status: response.status,
          url,
        },
      );
    }

    return data as T;
  }

  private async fetchPlaylistTitle(playlistId: string): Promise<string | undefined> {
    const response = await this.requestJson<YouTubePlaylistMetadataResponse>(
      this.buildApiUrl('playlists', {
        part: 'snippet',
        id: playlistId,
        maxResults: 1,
      }),
    );

    return response.items?.[0]?.snippet?.title?.trim() || undefined;
  }

  async listItems(input: ListPlaylistItemsInput): Promise<ListPlaylistItemsResult> {
    const { playlistId, url: playlistUrl } = this.resolvePlaylistId(input.playlistId);
    const requestedLimit = Math.max(
      1,
      Math.min(input.limit ?? this.options.maxScanItems ?? DEFAULT_PLAYLIST_MAX_SCAN_ITEMS, 200),
    );
    let pageToken = input.pageToken;
    let remaining = requestedLimit;
    const playlistTitle = await this.fetchPlaylistTitle(playlistId);
    const items: PlaylistListItem[] = [];

    while (remaining > 0) {
      const pageSize = Math.min(remaining, 50);
      const response = await this.requestJson<YouTubePlaylistItemResponse>(
        this.buildApiUrl('playlistItems', {
          part: 'snippet,contentDetails',
          playlistId,
          maxResults: pageSize,
          pageToken,
        }),
      );

      for (const entry of response.items ?? []) {
        const normalized = normalizePlaylistItem(playlistId, playlistTitle, entry);
        if (normalized) {
          items.push(normalized);
        }
      }

      pageToken = response.nextPageToken;
      remaining = requestedLimit - items.length;

      if (!pageToken || !response.items?.length) {
        break;
      }
    }

    const deduped = dedupeByVideoAndAddedDate(items).sort(comparePlaylistItemsNewestFirst);

    return {
      playlistId,
      playlistUrl,
      playlistTitle,
      items: deduped.slice(0, requestedLimit),
      nextPageToken: pageToken,
      limit: requestedLimit,
    };
  }

  async getStatus(playlistId?: string): Promise<Record<string, unknown>> {
    let state: PlaylistSyncStateSnapshot | undefined;
    const resolvedPlaylistId = playlistId?.trim() || this.options.defaultPlaylistId?.trim();

    if (resolvedPlaylistId) {
      try {
        const normalized = this.resolvePlaylistId(resolvedPlaylistId);
        state = await this.options.stateStore.getState(normalized.playlistId);
      } catch {
        state = undefined;
      }
    }

    return buildStatusSnapshot(Boolean(this.options.apiKey?.trim()), {
      defaultPlaylistId: this.options.defaultPlaylistId,
      defaultDatabaseId: this.options.defaultDatabaseId,
      maxScanItems: this.options.maxScanItems ?? DEFAULT_PLAYLIST_MAX_SCAN_ITEMS,
      maxSyncItems: this.options.maxSyncItems ?? DEFAULT_PLAYLIST_MAX_SYNC_ITEMS,
      stateStoreKind: this.options.stateStoreKind ?? 'memory',
      state,
    });
  }

  async syncPlaylist(input: SyncPlaylistToNotionInput): Promise<PlaylistSyncResult> {
    const { playlistId, url: playlistUrl } = this.resolvePlaylistId(input.playlistId);
    const databaseId = input.databaseId?.trim() || this.options.defaultDatabaseId?.trim();
    const maxScanItems = Math.max(
      1,
      Math.min(input.maxScanItems ?? this.options.maxScanItems ?? DEFAULT_PLAYLIST_MAX_SCAN_ITEMS, 200),
    );
    const maxItems = Math.max(
      1,
      Math.min(input.maxItems ?? this.options.maxSyncItems ?? DEFAULT_PLAYLIST_MAX_SYNC_ITEMS, maxScanItems),
    );
    const dryRun = Boolean(input.dryRun);
    const sinceCursor = parseCursor(input.sinceCursor);
    const source = input.automation ? 'scheduled' : 'tool';
    const runId = crypto.randomUUID();

    if (!dryRun && !databaseId) {
      throw new PlaylistSyncServiceError(
        'NOTION_DATABASE_REQUIRED',
        'sync_playlist_to_notion requires a databaseId or configured YOUTUBE_PLAYLIST_DATABASE_ID/NOTION_DATABASE_ID default.',
      );
    }

    const state = await this.options.stateStore.getState(playlistId);
    const lease = dryRun
      ? { acquired: true, state }
      : await this.options.stateStore.acquireLease(playlistId, {
          runId,
          source,
          leaseMs: PLAYLIST_SYNC_LEASE_MS,
        });

    if (!lease.acquired) {
      throw new PlaylistSyncServiceError(
        'PLAYLIST_SYNC_IN_PROGRESS',
        'A playlist sync is already running for this playlist.',
        {
          playlistId,
          activeRun: lease.activeRun,
        },
      );
    }

    try {
      const listed = await this.listItems({
        playlistId,
        limit: maxScanItems,
      });
      const knownKeys = new Set(lease.state.recentItemKeys);
      const bootstrapRun =
        lease.state.recentItemKeys.length === 0 &&
        lease.state.recentVideoIds.length === 0 &&
        sinceCursor === null;
      const candidateItems = listed.items.filter((item) => {
        const itemKey = buildPlaylistItemSyncKey(item.videoId, item.dateAddedToPlaylist);
        if (knownKeys.has(itemKey)) {
          return false;
        }

        if (sinceCursor === null) {
          return true;
        }

        const itemTimestamp = parseTimestamp(item.dateAddedToPlaylist);
        return Number.isFinite(itemTimestamp) ? itemTimestamp >= sinceCursor : false;
      });

      const newestCandidates = candidateItems.slice(0, maxItems);
      const cutoffApplied = candidateItems.length > newestCandidates.length;
      const selectedItems = [...newestCandidates].reverse();
      const backfillSkippedKeys =
        bootstrapRun && cutoffApplied
          ? candidateItems
              .slice(newestCandidates.length)
              .map((item) => buildPlaylistItemSyncKey(item.videoId, item.dateAddedToPlaylist))
          : [];
      const itemResults: PlaylistSyncItemResult[] = [];
      const successfulItemKeys: string[] = [...backfillSkippedKeys];
      const successfulVideoIds: string[] = [];
      let created = 0;
      let updated = 0;
      let failed = 0;

      for (const item of selectedItems) {
        if (dryRun) {
          itemResults.push(buildDryRunItemResult(item));
          continue;
        }

        let record: TranscriptRecord;
        let transcriptUnavailableReason: string | undefined;

        try {
          record = await this.options.transcriptService.extract({
            videoUrl: item.videoUrl,
            includeTimestamps: input.includeTimestamps,
          });
          record = {
            ...record,
            playlistId: item.playlistId,
            playlistTitle: item.playlistTitle,
            dateAddedToPlaylist: item.dateAddedToPlaylist,
            captionsSource: resolveCaptionsSource(record),
          };
        } catch (error) {
          if (error instanceof TranscriptExtractionError) {
            transcriptUnavailableReason = error.message;
            record = buildTranscriptUnavailableRecord(item, error);
          } else {
            failed += 1;
            itemResults.push({
              videoId: item.videoId,
              url: item.videoUrl,
              title: item.title,
              dateAddedToPlaylist: item.dateAddedToPlaylist,
              transcriptStatus: 'unavailable',
              extractionMethod: 'unavailable',
              warnings: [],
              error: {
                code: 'UNEXPECTED_TRANSCRIPT_ERROR',
                message: error instanceof Error ? error.message : String(error),
              },
            });
            continue;
          }
        }

        try {
          const transcriptBodyText = record.transcript.trim()
            ? undefined
            : buildTranscriptBodyText(record, transcriptUnavailableReason);
          const syncResult = await this.options.notionService.syncTranscript(record, {
            databaseId,
            propertyMapping: input.propertyMapping,
            includeTimestamps: input.includeTimestamps && Boolean(record.transcript.trim()),
            replaceExistingTranscript: true,
            transcriptHeaderLines: buildTranscriptHeaderLines(record),
            transcriptBodyText,
          });

          if (syncResult.action === 'created') {
            created += 1;
          } else {
            updated += 1;
          }

          successfulItemKeys.push(
            buildPlaylistItemSyncKey(item.videoId, item.dateAddedToPlaylist),
          );
          successfulVideoIds.push(item.videoId);

          itemResults.push({
            videoId: item.videoId,
            url: item.videoUrl,
            title: record.title,
            dateAddedToPlaylist: item.dateAddedToPlaylist,
            transcriptStatus: record.transcript.trim() ? 'available' : 'unavailable',
            extractionMethod: record.extractionMethod,
            action: syncResult.action,
            transcriptAction: syncResult.transcriptAction,
            matchedOn: syncResult.matchedOn,
            pageId: syncResult.pageId,
            pageUrl: syncResult.pageUrl,
            warnings: [...record.warnings, ...syncResult.warnings],
          });
        } catch (error) {
          failed += 1;
          itemResults.push({
            videoId: item.videoId,
            url: item.videoUrl,
            title: item.title,
            dateAddedToPlaylist: item.dateAddedToPlaylist,
            transcriptStatus: record.transcript.trim() ? 'available' : 'unavailable',
            extractionMethod: record.extractionMethod,
            warnings: [...record.warnings],
            error: {
              code:
                error instanceof PlaylistSyncServiceError
                  ? error.code
                  : error instanceof Error
                    ? error.name || 'NOTION_SYNC_ERROR'
                    : 'NOTION_SYNC_ERROR',
              message: error instanceof Error ? error.message : String(error),
            },
          });
        }
      }

      const skipped = listed.items.length - selectedItems.length;
      const summary = {
        created,
        updated,
        skipped,
        failed,
        cutoffApplied,
      };
      const processedCount = selectedItems.length;
      const completedState = dryRun
        ? lease.state
        : await this.options.stateStore.completeRun(playlistId, {
            runId,
            recentItemKeys: successfulItemKeys,
            recentVideoIds: successfulVideoIds,
            processedAt:
              selectedItems
                .map((item) => item.dateAddedToPlaylist)
                .find((value) => Boolean(value)) ?? undefined,
            summary,
          });

      return {
        playlistId,
        playlistUrl,
        playlistTitle: listed.playlistTitle,
        databaseId,
        dryRun,
        created,
        updated,
        skipped,
        failed,
        cutoffApplied,
        processedCount,
        state: completedState,
        items: itemResults,
      };
    } catch (error) {
      if (!dryRun) {
        await this.options.stateStore.failRun(playlistId, {
          runId,
          error: {
            code:
              error instanceof PlaylistSyncServiceError
                ? error.code
                : error instanceof Error
                  ? error.name || 'PLAYLIST_SYNC_FAILED'
                  : 'PLAYLIST_SYNC_FAILED',
            message: error instanceof Error ? error.message : String(error),
          },
        });
      }
      throw error;
    }
  }
}
