/**
 * Steel.dev Browser Provider for YouTube Sync
 * 
 * Manages cloud browser sessions for YouTube playlist and transcript extraction.
 * Uses Steel's cloud browser API with Puppeteer for automation.
 * 
 * @see https://steel.dev
 * @see https://docs.steel.dev
 */

import Steel from 'steel-sdk';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';
import type {
  SteelSession,
  SessionStatus,
  SessionRecording,
  VideoData,
  YouTubePlaylist,
  BrowserSessionMetrics
} from '../types.js';
import { extractPlaylist } from '../youtube/playlist.js';
import { extractTranscript, extractVideoMetadata } from '../youtube/transcript.js';

import { STEEL_SESSION_TIMEOUT, VIDEO_EXTRACTION_DELAY } from '../config.js';

// =============================================================================
// Provider Implementation
// =============================================================================

interface ActiveSession {
  session: SteelSession;
  browser: Browser;
  startTime: number;
}

export class YouTubeSteelProvider {
  private client: Steel;
  private apiKey: string;
  private activeSessions: Map<string, ActiveSession> = new Map();
  private metrics: BrowserSessionMetrics = {
    sessionsCreated: 0,
    sessionsClosed: 0,
    sessionErrors: 0,
    totalDurationMs: 0,
    averageDurationMs: 0,
    videosExtracted: 0,
    extractionErrors: 0
  };

  constructor(apiKey?: string) {
    const key = apiKey || process.env.STEEL_API_KEY;
    if (!key) {
      throw new Error(
        'Steel API key required. Set STEEL_API_KEY environment variable or pass apiKey to constructor.'
      );
    }

    this.apiKey = key;
    this.client = new Steel({ steelAPIKey: key });
  }

  /**
   * Build WebSocket URL with API key authentication
   */
  private getWebSocketUrl(sessionId: string): string {
    return `wss://connect.steel.dev?apiKey=${this.apiKey}&sessionId=${sessionId}`;
  }

  /**
   * Create a Steel session for YouTube extraction.
   * 
   * Unlike Zoom Clips, YouTube transcripts are typically public,
   * so we don't need session context for authentication.
   */
  async createSession(initialUrl?: string, timeout?: number): Promise<SteelSession> {
    const sessionTimeout = timeout || STEEL_SESSION_TIMEOUT;

    try {
      this.metrics.sessionsCreated++;

      // Use Steel Profile for authenticated YouTube access (full browser state)
      const profileId = process.env.STEEL_PROFILE_ID;

      const session = await this.client.sessions.create({
        timeout: sessionTimeout,
        solveCaptcha: true,
        ...(profileId ? { profileId } : {}),
      });

      if (profileId) {
        console.error(`Steel session created with profile ${profileId.substring(0, 8)}...`);
      } else {
        console.error('Steel session created without profile — run "pnpm capture:session" to authenticate');
      }

      // Connect Puppeteer to the Steel session (retry — context injection may delay readiness)
      let browser: Browser;
      const wsUrl = this.getWebSocketUrl(session.id);
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
          break;
        } catch (err) {
          if (attempt === 2) throw err;
          console.error(`Puppeteer connect attempt ${attempt + 1} failed, retrying in 2s...`);
          await new Promise(r => setTimeout(r, 2000));
        }
      }
      browser = browser!;

      const now = new Date();
      const steelSession: SteelSession = {
        id: session.id,
        liveViewUrl: (session as { sessionViewerUrl?: string }).sessionViewerUrl || 
                     `https://app.steel.dev/sessions/${session.id}`,
        debuggerUrl: this.getWebSocketUrl(session.id),
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + sessionTimeout).toISOString(),
        status: 'active',
        recordingEnabled: true
      };

      // Navigate to initial URL if provided
      if (initialUrl) {
        const pages = await browser.pages();
        const page = pages.length > 0 ? pages[0] : await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.goto(initialUrl, { 
          waitUntil: 'networkidle2',
          timeout: 60000 
        });
        steelSession.currentUrl = initialUrl;
      }

      // Store active session
      this.activeSessions.set(session.id, {
        session: steelSession,
        browser,
        startTime: now.getTime()
      });

      return steelSession;

    } catch (error) {
      this.metrics.sessionErrors++;
      throw error;
    }
  }

  /**
   * Get status of an active session
   */
  async getSessionStatus(sessionId: string): Promise<SessionStatus> {
    const activeSession = this.activeSessions.get(sessionId);
    
    if (!activeSession) {
      return {
        sessionId,
        status: 'closed',
        isReady: false,
        elapsedMs: 0,
        remainingMs: 0
      };
    }

    const { session, browser, startTime } = activeSession;
    const now = Date.now();
    const elapsedMs = now - startTime;
    const expiresAt = new Date(session.expiresAt).getTime();
    const remainingMs = Math.max(0, expiresAt - now);

    // Get current URL from active page
    let currentUrl: string | undefined;
    try {
      const pages = await browser.pages();
      if (pages.length > 0) {
        currentUrl = pages[pages.length - 1].url();
      }
    } catch {
      // Browser may be disconnected
    }

    return {
      sessionId,
      status: session.status,
      currentUrl,
      isReady: session.status === 'ready',
      elapsedMs,
      remainingMs
    };
  }

  /**
   * Navigate to a URL in the session
   */
  async navigate(sessionId: string, url: string): Promise<{ success: boolean; currentUrl?: string }> {
    const activeSession = this.activeSessions.get(sessionId);
    if (!activeSession) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const { browser, session } = activeSession;
    
    try {
      const pages = await browser.pages();
      const page = pages.length > 0 ? pages[pages.length - 1] : await browser.newPage();
      
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      session.currentUrl = url;
      session.status = 'active';

      return { success: true, currentUrl: url };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, currentUrl: message };
    }
  }

  /**
   * Extract playlist from YouTube
   */
  async extractPlaylist(sessionId: string, playlistUrl: string, limit?: number): Promise<YouTubePlaylist> {
    const activeSession = this.activeSessions.get(sessionId);
    if (!activeSession) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const { browser, session } = activeSession;
    session.status = 'extracting';

    try {
      const pages = await browser.pages();
      const page = pages.length > 0 ? pages[pages.length - 1] : await browser.newPage();

      const playlist = await extractPlaylist(page, playlistUrl, limit);
      
      session.status = 'ready';
      return playlist;

    } catch (error) {
      this.metrics.extractionErrors++;
      session.status = 'error';
      throw error;
    }
  }

  /**
   * Extract video data including transcript
   */
  async extractVideo(sessionId: string, videoUrl: string): Promise<VideoData> {
    const activeSession = this.activeSessions.get(sessionId);
    if (!activeSession) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const { browser, session } = activeSession;
    session.status = 'extracting';

    try {
      const pages = await browser.pages();
      const page = pages.length > 0 ? pages[pages.length - 1] : await browser.newPage();

      // Navigate to video
      await page.goto(videoUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      await this.wait(page, 2000);

      // Extract metadata
      const metadata = await extractVideoMetadata(page, videoUrl);

      // Extract transcript (tries get_transcript first, then caption tracks)
      const transcriptResult = await extractTranscript(videoUrl, page);

      const videoId = videoUrl.match(/v=([a-zA-Z0-9_-]+)/)?.[1] || '';

      const videoData: VideoData = {
        videoId,
        url: videoUrl,
        title: metadata.title || 'Untitled',
        channelName: metadata.channelName,
        publishedAt: metadata.publishedAt,
        duration: metadata.duration,
        thumbnailUrl: metadata.thumbnailUrl,
        transcript: transcriptResult?.transcript,
        transcriptSegments: transcriptResult?.segments,
        scrapedAt: new Date().toISOString(),
        extractionMethod: 'steel'
      };

      this.metrics.videosExtracted++;
      session.status = 'ready';

      return videoData;

    } catch (error) {
      this.metrics.extractionErrors++;
      session.status = 'error';
      throw error;
    }
  }

  /**
   * Extract multiple videos from a playlist
   */
  async extractPlaylistVideos(
    sessionId: string,
    playlistUrl: string,
    limit?: number
  ): Promise<{ playlist: YouTubePlaylist; videos: VideoData[]; errors: Array<{ url: string; error: string }> }> {
    // First extract playlist info
    const playlist = await this.extractPlaylist(sessionId, playlistUrl, limit);

    const activeSession = this.activeSessions.get(sessionId);
    if (!activeSession) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const { browser, session } = activeSession;
    const pages = await browser.pages();
    const page = pages.length > 0 ? pages[pages.length - 1] : await browser.newPage();

    const videos: VideoData[] = [];
    const errors: Array<{ url: string; error: string }> = [];

    // Extract each video — browser-first (server-side APIs blocked as of 2026)
    for (const video of playlist.videos) {
      try {
        console.log(`Extracting: ${video.title}`);
        
        // Transcript extraction is server-side; Steel still supplies playlist metadata.
        const transcriptResult = await extractTranscript(video.url, page);

        const videoData: VideoData = {
          videoId: video.videoId,
          url: video.url,
          title: video.title,
          channelName: video.channelName || playlist.channelName,
          duration: video.duration,
          thumbnailUrl: video.thumbnailUrl,
          transcript: transcriptResult?.transcript,
          transcriptSegments: transcriptResult?.segments,
          scrapedAt: new Date().toISOString(),
          extractionMethod: 'steel',
          playlistId: playlist.playlistId,
          playlistTitle: playlist.title
        };

        if (transcriptResult) {
          console.log(`  Transcript: ${transcriptResult.transcript.length} chars`);
        } else {
          console.log(`  No transcript available`);
        }

        videos.push(videoData);
        this.metrics.videosExtracted++;

        // Rate limiting between videos
        await this.wait(page, VIDEO_EXTRACTION_DELAY);

      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push({ url: video.url, error: message });
        this.metrics.extractionErrors++;
      }
    }

    session.status = 'ready';
    return { playlist, videos, errors };
  }

  /**
   * Close session and return recording information
   */
  async closeSession(sessionId: string): Promise<SessionRecording> {
    const activeSession = this.activeSessions.get(sessionId);
    
    if (!activeSession) {
      return {
        sessionId,
        durationMs: 0,
        videoCount: 0
      };
    }

    const { browser, startTime } = activeSession;
    const durationMs = Date.now() - startTime;

    try {
      // Close browser connection
      await browser.close();
      this.metrics.sessionsClosed++;

      // Release Steel session
      try {
        await this.client.sessions.release(sessionId);
      } catch {
        // Session may have already been released
      }

      // Update metrics
      this.metrics.totalDurationMs += durationMs;
      this.metrics.averageDurationMs = 
        this.metrics.totalDurationMs / this.metrics.sessionsClosed;

      // Remove from active sessions
      this.activeSessions.delete(sessionId);

      return {
        sessionId,
        recordingUrl: `https://steel.dev/sessions/${sessionId}/recording`,
        durationMs,
        videoCount: this.metrics.videosExtracted
      };

    } catch (error) {
      this.metrics.sessionErrors++;
      this.activeSessions.delete(sessionId);
      throw error;
    }
  }

  /**
   * Get active session by ID
   */
  getActiveSession(sessionId: string): SteelSession | undefined {
    return this.activeSessions.get(sessionId)?.session;
  }

  /**
   * Get session with page reference for advanced operations
   */
  async getSession(sessionId: string): Promise<{ session: SteelSession; page: Page } | null> {
    const activeSession = this.activeSessions.get(sessionId);
    if (!activeSession) return null;

    const pages = await activeSession.browser.pages();
    if (pages.length === 0) return null;

    return {
      session: activeSession.session,
      page: pages[pages.length - 1]
    };
  }

  /**
   * List all active sessions
   */
  listActiveSessions(): SteelSession[] {
    return Array.from(this.activeSessions.values()).map(s => s.session);
  }

  /**
   * Get metrics
   */
  getMetrics(): BrowserSessionMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      sessionsCreated: 0,
      sessionsClosed: 0,
      sessionErrors: 0,
      totalDurationMs: 0,
      averageDurationMs: 0,
      videosExtracted: 0,
      extractionErrors: 0
    };
  }

  /**
   * Clean up all sessions (for shutdown)
   */
  async cleanup(): Promise<void> {
    const sessionIds = Array.from(this.activeSessions.keys());
    await Promise.all(sessionIds.map(id => this.closeSession(id)));
  }

  /**
   * Helper to wait
   */
  private async wait(page: Page, ms: number): Promise<void> {
    await page.evaluate(`new Promise(r => setTimeout(r, ${ms}))`);
  }

}

// =============================================================================
// Factory
// =============================================================================

let providerInstance: YouTubeSteelProvider | null = null;

export function getYouTubeProvider(apiKey?: string): YouTubeSteelProvider {
  if (!providerInstance) {
    providerInstance = new YouTubeSteelProvider(apiKey);
  }
  return providerInstance;
}

export function resetProvider(): void {
  if (providerInstance) {
    providerInstance.cleanup().catch(() => {});
    providerInstance = null;
  }
}
