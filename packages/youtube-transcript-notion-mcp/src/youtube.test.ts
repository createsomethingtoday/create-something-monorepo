import { describe, expect, it } from 'vitest';

import {
  buildBrowserFallbackVideoUrl,
  buildCanonicalVideoUrl,
  buildCanonicalPlaylistUrl,
  buildMobileWatchVideoUrl,
  extractInitialPlayerResponseFromHtml,
  extractPlaylistId,
  extractTranscriptParamsFromHtml,
  extractVideoId,
  extractVideoMetadataFromHtml,
  extractVideoMetadataFromPlayerResponse,
  normalizePlaylistReference,
  normalizeVideoReference,
} from './youtube.js';

const VIDEO_ID = 'ZDv4iYaLbpI';
const PLAYLIST_ID = 'PLlu6DY1uonzYTiwLRBUj5OZBXUa6n4mCz';

describe('youtube URL utilities', () => {
  it('extracts a video ID from common YouTube URL formats', () => {
    expect(extractVideoId(VIDEO_ID)).toBe(VIDEO_ID);
    expect(
      extractVideoId(`https://www.youtube.com/watch?v=${VIDEO_ID}&ab_channel=CreateSomething`),
    ).toBe(VIDEO_ID);
    expect(extractVideoId(`https://youtu.be/${VIDEO_ID}?si=abc123`)).toBe(VIDEO_ID);
    expect(extractVideoId(`https://www.youtube.com/embed/${VIDEO_ID}`)).toBe(VIDEO_ID);
    expect(extractVideoId(`https://www.youtube.com/shorts/${VIDEO_ID}`)).toBe(VIDEO_ID);
    expect(extractVideoId(`https://m.youtube.com/live/${VIDEO_ID}`)).toBe(VIDEO_ID);
  });

  it('rejects malformed or unrelated inputs', () => {
    expect(extractVideoId('')).toBeNull();
    expect(extractVideoId('not a url')).toBeNull();
    expect(extractVideoId('https://example.com/watch?v=12345678901')).toBeNull();
    expect(extractVideoId('https://www.youtube.com/watch?v=too-short')).toBeNull();
  });

  it('canonicalizes a valid input to the watch URL form', () => {
    expect(normalizeVideoReference(`https://youtu.be/${VIDEO_ID}`)).toEqual({
      videoId: VIDEO_ID,
      url: buildCanonicalVideoUrl(VIDEO_ID),
    });
  });

  it('builds the verified watch URL used by the browser fallback', () => {
    expect(buildBrowserFallbackVideoUrl(VIDEO_ID)).toBe(
      `https://www.youtube.com/watch?v=${VIDEO_ID}&bpctr=9999999999&has_verified=1`,
    );
  });

  it('builds the mobile watch URL used by the direct provider', () => {
    expect(buildMobileWatchVideoUrl(VIDEO_ID)).toBe(
      `https://m.youtube.com/watch?v=${VIDEO_ID}`,
    );
  });

  it('throws for invalid references during normalization', () => {
    expect(() => normalizeVideoReference('https://example.com/video')).toThrow(
      /Invalid YouTube video reference/,
    );
  });

  it('extracts a playlist ID from a playlist URL or raw ID', () => {
    expect(extractPlaylistId(PLAYLIST_ID)).toBe(PLAYLIST_ID);
    expect(
      extractPlaylistId(
        `https://www.youtube.com/playlist?list=${PLAYLIST_ID}&si=playlist-token`,
      ),
    ).toBe(PLAYLIST_ID);
  });

  it('canonicalizes a valid playlist reference', () => {
    expect(
      normalizePlaylistReference(`https://www.youtube.com/watch?v=${VIDEO_ID}&list=${PLAYLIST_ID}`),
    ).toEqual({
      playlistId: PLAYLIST_ID,
      url: buildCanonicalPlaylistUrl(PLAYLIST_ID),
    });
  });

  it('rejects invalid playlist references', () => {
    expect(extractPlaylistId('https://example.com/playlist?list=abc')).toBeNull();
    expect(() => normalizePlaylistReference('https://example.com/playlist')).toThrow(
      /Invalid YouTube playlist reference/,
    );
  });

  it('extracts useful metadata from a watch page html fragment', () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="How Transcript MCPs Work" />
          <meta itemprop="author" content="CREATE SOMETHING" />
          <meta itemprop="datePublished" content="2026-04-20" />
          <meta property="og:image" content="https://img.youtube.com/vi/${VIDEO_ID}/hqdefault.jpg" />
        </head>
        <body></body>
      </html>
    `;

    expect(extractVideoMetadataFromHtml(html, VIDEO_ID)).toEqual({
      title: 'How Transcript MCPs Work',
      channelName: 'CREATE SOMETHING',
      publishedAt: '2026-04-20',
      thumbnailUrl: `https://img.youtube.com/vi/${VIDEO_ID}/hqdefault.jpg`,
    });
  });

  it('extracts transcript params when the watch page exposes a transcript endpoint', () => {
    const html = `
      <script>
        var ytInitialPlayerResponse = {
          "engagementPanels": [
            {
              "engagementPanelSectionListRenderer": {
                "content": {
                  "continuationItemRenderer": {
                    "showTranscriptAction": {
                      "getTranscriptEndpoint": {
                        "params": "page-transcript-params"
                      }
                    }
                  }
                }
              }
            }
          ]
        };
      </script>
    `;

    expect(extractTranscriptParamsFromHtml(html)).toBe('page-transcript-params');
  });

  it('extracts the populated initial player response from a mobile watch page', () => {
    const html = `
      <script>var ytInitialPlayerResponse = null;</script>
      <script>
        var ytInitialPlayerResponse = {
          "captions": {
            "playerCaptionsTracklistRenderer": {
              "captionTracks": [
                {
                  "baseUrl": "/api/timedtext?v=${VIDEO_ID}&lang=en",
                  "languageCode": "en"
                }
              ]
            }
          },
          "microformat": {
            "playerMicroformatRenderer": {
              "title": {
                "runs": [{ "text": "Stop Wasting Money on AI APIs" }]
              }
            }
          }
        };
      </script>
    `;

    expect(extractInitialPlayerResponseFromHtml(html)).toMatchObject({
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [
            {
              languageCode: 'en',
            },
          ],
        },
      },
      microformat: {
        playerMicroformatRenderer: {
          title: {
            runs: [{ text: 'Stop Wasting Money on AI APIs' }],
          },
        },
      },
    });
  });

  it('extracts useful metadata from a player response', () => {
    const payload = {
      microformat: {
        playerMicroformatRenderer: {
          title: {
            runs: [{ text: 'Stop Wasting Money on AI APIs' }],
          },
          ownerChannelName: 'Cloudflare Developers',
          publishDate: '2026-04-23T08:41:34-07:00',
          thumbnail: {
            thumbnails: [
              { url: 'https://img.youtube.com/vi/ignored/default.jpg' },
              { url: `https://img.youtube.com/vi/${VIDEO_ID}/maxresdefault.jpg` },
            ],
          },
        },
      },
      videoDetails: {
        title: 'Fallback title',
        author: 'Fallback channel',
      },
    };

    expect(extractVideoMetadataFromPlayerResponse(payload, VIDEO_ID)).toEqual({
      title: 'Stop Wasting Money on AI APIs',
      channelName: 'Cloudflare Developers',
      publishedAt: '2026-04-23T08:41:34-07:00',
      thumbnailUrl: `https://img.youtube.com/vi/${VIDEO_ID}/maxresdefault.jpg`,
    });
  });
});
