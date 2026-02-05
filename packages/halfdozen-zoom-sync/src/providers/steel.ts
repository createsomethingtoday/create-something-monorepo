/**
 * Steel.dev Browser Provider with Human-in-the-Loop Support
 * 
 * Extends Steel's cloud browser API for Zoom Clips extraction.
 * Key feature: Live View URL allows human operators to interact with the browser
 * while the agent maintains control for extraction.
 * 
 * Features:
 * - 24-hour session duration for batch processing
 * - Live View URL for human interaction (transcript access, auth, CAPTCHA)
 * - Session recording for audit trail
 * - Persistent WebSocket connection during human interaction
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
  ClipData,
  BrowserSessionMetrics
} from '../types.js';
import { extractZoomClip } from '../extractors/zoom-clip.js';

// =============================================================================
// Configuration
// =============================================================================

// Paid plan: longer sessions available
const DEFAULT_SESSION_TIMEOUT = 3600000; // 1 hour
const ZOOM_CLIPS_BASE_URL = 'zoom.us/clips/share';

// =============================================================================
// Provider Implementation
// =============================================================================

interface ActiveSession {
  session: SteelSession;
  browser: Browser;
  startTime: number;
}

export class ZoomClipsSteelProvider {
  private client: Steel;
  private apiKey: string;
  private activeSessions: Map<string, ActiveSession> = new Map();
  private metrics: BrowserSessionMetrics = {
    sessionsCreated: 0,
    sessionsClosed: 0,
    sessionErrors: 0,
    totalDurationMs: 0,
    averageDurationMs: 0,
    clipsExtracted: 0,
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
   * Validate that URL is a Zoom Clips share URL
   */
  private isZoomClipsUrl(url: string): boolean {
    return url.includes(ZOOM_CLIPS_BASE_URL);
  }

  /**
   * Create a Steel session with live view for human-in-the-loop interaction.
   * 
   * The session allows:
   * 1. Human to view/interact via liveViewUrl
   * 2. Agent to control via Puppeteer WebSocket
   * 3. Session recording for audit trail
   */
  async createSession(initialUrl?: string, timeout?: number): Promise<SteelSession> {
    const sessionTimeout = timeout || DEFAULT_SESSION_TIMEOUT;

    try {
      this.metrics.sessionsCreated++;

      // Create Steel session with CAPTCHA solving (paid plan feature)
      const session = await this.client.sessions.create({
        timeout: sessionTimeout,
        solveCaptcha: true
      });

      // Connect Puppeteer to the Steel session
      const browser = await puppeteer.connect({
        browserWSEndpoint: this.getWebSocketUrl(session.id)
      });

      const now = new Date();
      const steelSession: SteelSession = {
        id: session.id,
        // Use sessionViewerUrl from Steel API (interactive live view)
        liveViewUrl: (session as any).sessionViewerUrl || `https://app.steel.dev/sessions/${session.id}`,
        debuggerUrl: (session as any).websocketUrl || this.getWebSocketUrl(session.id),
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + sessionTimeout).toISOString(),
        status: 'active',
        recordingEnabled: true
      };

      // Navigate to initial URL if provided
      if (initialUrl) {
        const page = await browser.newPage();
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
   * Mark session as ready for extraction (human has completed interaction)
   */
  markSessionReady(sessionId: string): boolean {
    const activeSession = this.activeSessions.get(sessionId);
    if (!activeSession) return false;

    activeSession.session.status = 'ready';
    return true;
  }

  /**
   * Navigate the session browser to a new URL
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
      session.status = 'active'; // Reset to active after navigation

      return { success: true, currentUrl: url };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, currentUrl: message };
    }
  }

  /**
   * Extract clip data from the current page in the session.
   * Call this after human has navigated to the transcript.
   */
  async extractClip(sessionId: string): Promise<ClipData> {
    const activeSession = this.activeSessions.get(sessionId);
    if (!activeSession) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const { browser, session } = activeSession;
    session.status = 'extracting';

    try {
      const pages = await browser.pages();
      if (pages.length === 0) {
        throw new Error('No pages open in session');
      }

      const page = pages[pages.length - 1];
      const url = page.url();

      // Wait for page to settle
      await this.wait(page, 1000);

      // Execute extraction script
      const clipData = await extractZoomClip(page, url, sessionId);

      this.metrics.clipsExtracted++;
      session.status = 'ready'; // Ready for next clip

      return clipData;

    } catch (error) {
      this.metrics.extractionErrors++;
      session.status = 'error';
      throw error;
    }
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
        clipCount: 0
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
        clipCount: this.metrics.clipsExtracted
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
   * Get session with page reference for advanced operations (e.g., UI diagnostics)
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
      clipsExtracted: 0,
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
   * Helper to wait - Steel sessions are stable for longer waits
   */
  private async wait(page: Page, ms: number): Promise<void> {
    await page.evaluate(`new Promise(r => setTimeout(r, ${ms}))`);
  }
}

// =============================================================================
// Factory
// =============================================================================

let providerInstance: ZoomClipsSteelProvider | null = null;

export function getZoomClipsProvider(apiKey?: string): ZoomClipsSteelProvider {
  if (!providerInstance) {
    providerInstance = new ZoomClipsSteelProvider(apiKey);
  }
  return providerInstance;
}

export function resetProvider(): void {
  if (providerInstance) {
    providerInstance.cleanup().catch(() => {});
    providerInstance = null;
  }
}
