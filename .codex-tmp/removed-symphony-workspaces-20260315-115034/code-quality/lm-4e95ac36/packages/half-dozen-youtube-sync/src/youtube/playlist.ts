/**
 * YouTube Playlist Parser
 * 
 * Extracts video information from YouTube playlists using Steel.dev browser automation.
 * Handles pagination and extracts video IDs, titles, and metadata.
 */

import type { Page } from 'puppeteer-core';
import type { YouTubePlaylist, YouTubeVideo } from '../types.js';

// =============================================================================
// Constants
// =============================================================================

const YOUTUBE_PLAYLIST_URL_PATTERN = /youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/;
const YOUTUBE_VIDEO_URL_PATTERN = /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/;

// =============================================================================
// URL Helpers
// =============================================================================

/**
 * Extract playlist ID from YouTube playlist URL
 */
export function extractPlaylistId(url: string): string | null {
  const match = url.match(YOUTUBE_PLAYLIST_URL_PATTERN);
  return match ? match[1] : null;
}

/**
 * Extract video ID from YouTube video URL
 */
export function extractVideoId(url: string): string | null {
  // Handle various YouTube URL formats
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /youtu\.be\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Check if URL is a valid YouTube playlist URL
 */
export function isPlaylistUrl(url: string): boolean {
  return YOUTUBE_PLAYLIST_URL_PATTERN.test(url);
}

/**
 * Check if URL is a valid YouTube video URL
 */
export function isVideoUrl(url: string): boolean {
  return extractVideoId(url) !== null;
}

/**
 * Build YouTube video URL from video ID
 */
export function buildVideoUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Build YouTube playlist URL from playlist ID
 */
export function buildPlaylistUrl(playlistId: string): string {
  return `https://www.youtube.com/playlist?list=${playlistId}`;
}

// =============================================================================
// Playlist Extraction
// =============================================================================

/**
 * Extract playlist information and video list from a YouTube playlist page.
 * Uses Steel.dev browser automation to handle dynamic content.
 * 
 * @param page - Puppeteer page connected to Steel session
 * @param playlistUrl - YouTube playlist URL
 * @param limit - Maximum number of videos to extract (default: all)
 */
export async function extractPlaylist(
  page: Page,
  playlistUrl: string,
  limit?: number
): Promise<YouTubePlaylist> {
  const playlistId = extractPlaylistId(playlistUrl);
  
  if (!playlistId) {
    throw new Error(`Invalid YouTube playlist URL: ${playlistUrl}`);
  }

  // Navigate to playlist page
  await page.goto(playlistUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  
  // Wait for playlist content to load
  await page.waitForSelector('ytd-playlist-video-renderer, #contents ytd-playlist-video-list-renderer', { timeout: 15000 }).catch(() => {
    // Playlist might be empty or use different selectors
  });

  // Scroll to load more videos if needed
  if (!limit || limit > 100) {
    await scrollToLoadVideos(page, limit);
  }

  // Extract playlist metadata and videos
  const playlistData = await page.evaluate((maxVideos) => {
    const data: {
      title: string;
      channelName: string;
      videoCount: number;
      videos: Array<{
        videoId: string;
        title: string;
        url: string;
        thumbnailUrl?: string;
        duration?: string;
        channelName?: string;
      }>;
    } = {
      title: '',
      channelName: '',
      videoCount: 0,
      videos: []
    };

    // Extract playlist title
    const titleEl = document.querySelector('yt-formatted-string.style-scope.yt-dynamic-sizing-formatted-string') ||
                    document.querySelector('h1#title yt-formatted-string') ||
                    document.querySelector('.metadata-wrapper yt-formatted-string');
    data.title = titleEl?.textContent?.trim() || 'Untitled Playlist';

    // Extract channel name
    const channelEl = document.querySelector('#owner-text a') ||
                      document.querySelector('.ytd-playlist-byline-renderer a');
    data.channelName = channelEl?.textContent?.trim() || '';

    // Extract video count from stats
    const statsEl = document.querySelector('.metadata-stats yt-formatted-string, .byline-item');
    const statsText = statsEl?.textContent || '';
    const countMatch = statsText.match(/(\d+)\s*video/i);
    data.videoCount = countMatch ? parseInt(countMatch[1], 10) : 0;

    // Extract video items
    const videoElements = document.querySelectorAll('ytd-playlist-video-renderer');
    
    videoElements.forEach((el, index) => {
      if (maxVideos && data.videos.length >= maxVideos) return;

      const linkEl = el.querySelector('a#video-title');
      const href = linkEl?.getAttribute('href') || '';
      const videoIdMatch = href.match(/v=([a-zA-Z0-9_-]+)/);
      
      if (!videoIdMatch) return;

      const videoId = videoIdMatch[1];
      const title = linkEl?.textContent?.trim() || `Video ${index + 1}`;
      
      // Get thumbnail
      const thumbEl = el.querySelector('img');
      const thumbnailUrl = thumbEl?.getAttribute('src') || undefined;
      
      // Get duration
      const durationEl = el.querySelector('span.ytd-thumbnail-overlay-time-status-renderer, .badge-shape-wiz__text');
      const duration = durationEl?.textContent?.trim() || undefined;

      // Get channel name (for mixed playlists)
      const videoChannelEl = el.querySelector('#channel-name a, .ytd-channel-name a');
      const videoChannelName = videoChannelEl?.textContent?.trim() || data.channelName;

      data.videos.push({
        videoId,
        title,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnailUrl,
        duration,
        channelName: videoChannelName
      });
    });

    // Update video count if we didn't find it in stats
    if (data.videoCount === 0) {
      data.videoCount = data.videos.length;
    }

    return data;
  }, limit);

  return {
    playlistId,
    title: playlistData.title,
    url: playlistUrl,
    channelName: playlistData.channelName,
    videoCount: playlistData.videoCount,
    videos: playlistData.videos
  };
}

/**
 * Scroll the playlist page to load more videos (handles lazy loading)
 */
async function scrollToLoadVideos(page: Page, targetCount?: number): Promise<void> {
  const maxScrolls = 50; // Prevent infinite scrolling
  let scrollCount = 0;
  let previousHeight = 0;

  while (scrollCount < maxScrolls) {
    // Get current video count
    const currentCount = await page.evaluate(() => {
      return document.querySelectorAll('ytd-playlist-video-renderer').length;
    });

    // Stop if we have enough videos
    if (targetCount && currentCount >= targetCount) break;

    // Scroll to bottom
    const currentHeight = await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
      return document.documentElement.scrollHeight;
    });

    // Wait for new content to load
    await page.evaluate(() => new Promise(r => setTimeout(r, 1000)));

    // Stop if no new content loaded
    if (currentHeight === previousHeight) {
      // Try one more time
      await page.evaluate(() => new Promise(r => setTimeout(r, 2000)));
      const newHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      if (newHeight === previousHeight) break;
    }

    previousHeight = currentHeight;
    scrollCount++;
  }

  // Scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0));
}

/**
 * Extract video IDs from a playlist URL without full browser automation.
 * Uses a lightweight approach for quick ID extraction.
 * 
 * Note: This won't work for large playlists or private playlists.
 * Use extractPlaylist() with Steel session for full functionality.
 */
export async function extractVideoIdsQuick(playlistUrl: string): Promise<string[]> {
  const playlistId = extractPlaylistId(playlistUrl);
  if (!playlistId) {
    throw new Error(`Invalid YouTube playlist URL: ${playlistUrl}`);
  }

  // For now, this is a placeholder - full implementation requires browser or API
  // The Steel-based extractPlaylist() is the recommended approach
  return [];
}
