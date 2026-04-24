const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export interface NormalizedVideoReference {
  videoId: string;
  url: string;
}

export interface YouTubeWatchMetadata {
  title?: string;
  channelName?: string;
  publishedAt?: string;
  thumbnailUrl?: string;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function cleanText(value: string | undefined): string | undefined {
  const cleaned = value?.replace(/\s+/g, ' ').replace(/ - YouTube$/, '').trim();
  return cleaned ? decodeHtmlEntities(cleaned) : undefined;
}

function sanitizeVideoId(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const candidate = value.trim();
  return VIDEO_ID_PATTERN.test(candidate) ? candidate : null;
}

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '');
}

export function buildCanonicalVideoUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function buildMobileWatchVideoUrl(videoId: string): string {
  return `https://m.youtube.com/watch?v=${videoId}`;
}

export function buildBrowserFallbackVideoUrl(videoId: string): string {
  const url = new URL(buildCanonicalVideoUrl(videoId));
  url.searchParams.set('bpctr', '9999999999');
  url.searchParams.set('has_verified', '1');
  return url.toString();
}

export function extractVideoId(input: string): string | null {
  const trimmed = input.trim();
  const directId = sanitizeVideoId(trimmed);
  if (directId) {
    return directId;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = normalizeHost(url.hostname);

  if (host === 'youtu.be') {
    return sanitizeVideoId(url.pathname.split('/').filter(Boolean)[0]);
  }

  if (!host.endsWith('youtube.com') && !host.endsWith('youtube-nocookie.com')) {
    return null;
  }

  if (url.pathname === '/watch') {
    return sanitizeVideoId(url.searchParams.get('v'));
  }

  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length < 2) {
    return null;
  }

  if (['embed', 'shorts', 'live', 'v'].includes(segments[0])) {
    return sanitizeVideoId(segments[1]);
  }

  return null;
}

export function normalizeVideoReference(input: string): NormalizedVideoReference {
  const videoId = extractVideoId(input);
  if (!videoId) {
    throw new Error(`Invalid YouTube video reference: ${input}`);
  }

  return {
    videoId,
    url: buildCanonicalVideoUrl(videoId),
  };
}

function matchFirst(html: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = pattern.exec(html);
    const value = cleanText(match?.[1]);
    if (value) {
      return value;
    }
  }
  return undefined;
}

export function extractVisitorData(html: string): string | undefined {
  return html.match(/"visitorData":"([^"]+)"/)?.[1];
}

export function extractTranscriptParamsFromHtml(html: string): string | undefined {
  return html.match(/"getTranscriptEndpoint"\s*:\s*\{\s*"params"\s*:\s*"([^"]+)"/)?.[1];
}

function extractRunsText(value: any): string | undefined {
  const simpleText = cleanText(value?.simpleText);
  if (simpleText) {
    return simpleText;
  }

  const runs = Array.isArray(value?.runs) ? value.runs : [];
  const joined = cleanText(runs.map((entry: any) => entry?.text ?? '').join(''));
  return joined;
}

function extractJsonObjectLiteral(html: string, startIndex: number): string | undefined {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < html.length; index += 1) {
    const character = html[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (character === '\\') {
        escaped = true;
        continue;
      }

      if (character === '"') {
        inString = false;
      }

      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }

    if (character === '{') {
      depth += 1;
      continue;
    }

    if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        return html.slice(startIndex, index + 1);
      }
    }
  }

  return undefined;
}

export function extractInitialPlayerResponseFromHtml(
  html: string,
): Record<string, unknown> | undefined {
  const patterns = [
    /(?:var\s+)?ytInitialPlayerResponse\s*=\s*/g,
    /window\[['"]ytInitialPlayerResponse['"]\]\s*=\s*/g,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const assignmentEnd = match.index + match[0].length;
      let jsonStart = assignmentEnd;

      while (jsonStart < html.length && /\s/.test(html[jsonStart])) {
        jsonStart += 1;
      }

      if (html[jsonStart] !== '{') {
        continue;
      }

      const jsonLiteral = extractJsonObjectLiteral(html, jsonStart);
      if (!jsonLiteral) {
        continue;
      }

      try {
        const parsed = JSON.parse(jsonLiteral) as Record<string, unknown>;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        continue;
      }
    }
  }

  return undefined;
}

export function extractVideoMetadataFromPlayerResponse(
  payload: Record<string, unknown> | undefined,
  videoId: string,
): YouTubeWatchMetadata {
  const playerResponse = payload as any;
  const microformat = playerResponse?.microformat?.playerMicroformatRenderer;
  const title =
    extractRunsText(microformat?.title) ??
    cleanText(playerResponse?.videoDetails?.title) ??
    `Video ${videoId}`;
  const channelName =
    cleanText(microformat?.ownerChannelName) ??
    cleanText(playerResponse?.videoDetails?.author);
  const publishedAt =
    cleanText(microformat?.publishDate) ?? cleanText(microformat?.uploadDate);
  const playerThumbnail = Array.isArray(microformat?.thumbnail?.thumbnails)
    ? microformat.thumbnail.thumbnails.at(-1)?.url
    : undefined;
  const videoThumbnail = Array.isArray(playerResponse?.videoDetails?.thumbnail?.thumbnails)
    ? playerResponse.videoDetails.thumbnail.thumbnails.at(-1)?.url
    : undefined;
  const thumbnailUrl =
    cleanText(playerThumbnail) ??
    cleanText(videoThumbnail) ??
    `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  return {
    title,
    channelName,
    publishedAt,
    thumbnailUrl,
  };
}

export function extractVideoMetadataFromHtml(
  html: string,
  videoId: string,
): YouTubeWatchMetadata {
  const title =
    matchFirst(html, [
      /<meta\s+property="og:title"\s+content="([^"]+)"/i,
      /<meta\s+name="title"\s+content="([^"]+)"/i,
      /<title>([^<]+)<\/title>/i,
    ]) ?? `Video ${videoId}`;

  const channelName = matchFirst(html, [
    /<meta\s+itemprop="author"\s+content="([^"]+)"/i,
    /"ownerChannelName":"([^"]+)"/i,
    /"author":"([^"]+)"/i,
  ]);

  const publishedAt = matchFirst(html, [
    /<meta\s+itemprop="datePublished"\s+content="([^"]+)"/i,
    /"publishDate":"([^"]+)"/i,
  ]);

  const thumbnailUrl =
    matchFirst(html, [
      /<meta\s+property="og:image"\s+content="([^"]+)"/i,
      /<link\s+itemprop="thumbnailUrl"\s+href="([^"]+)"/i,
    ]) ?? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  return {
    title,
    channelName,
    publishedAt,
    thumbnailUrl,
  };
}
