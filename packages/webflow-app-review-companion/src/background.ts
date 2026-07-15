import { MISSIONS, normalizeEvent, sanitizeDetail, sanitizeUrl, sha256, sha256Bytes, type CapturedEvent, type MissionId } from './core';
import { COMPANION_API_BASE } from './config';
import {
  isAllowedPairingSender,
  redeemAndBeginCompanion,
  type CompanionSettings
} from './pairing';

type Settings = CompanionSettings;

interface CompanionState {
  settings: Settings | null;
  run: any | null;
  activeMission: MissionId | null;
  activeTabId: number | null;
  events: CapturedEvent[];
  error: string | null;
}

const EMPTY: CompanionState = {
  settings: null,
  run: null,
  activeMission: null,
  activeTabId: null,
  events: [],
  error: null
};

async function loadState(): Promise<CompanionState> {
  const stored = await chrome.storage.session.get('companionState');
  return (stored.companionState as CompanionState | undefined) ?? EMPTY;
}

async function saveState(state: CompanionState): Promise<void> {
  await chrome.storage.session.set({ companionState: state });
}

async function api<T>(settings: Settings, path: string, init: RequestInit): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${settings.token}`);
  if (!(init.body instanceof FormData)) headers.set('content-type', 'application/json');
  const response = await fetch(`${settings.apiBaseUrl.replace(/\/$/, '')}${path}`, {
    ...init,
    headers
  });
  const body = (await response.json()) as T & { message?: string };
  if (!response.ok) throw new Error(body.message ?? `Request failed (${response.status}).`);
  return body;
}

async function appendEvent(event: CapturedEvent, tabId?: number): Promise<void> {
  const state = await loadState();
  if (!state.activeMission || state.activeTabId === null || tabId !== state.activeTabId) return;
  state.events = [...state.events.slice(-499), normalizeEvent(event)];
  await saveState(state);
}

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) return;
  void appendEvent(
    { kind: 'navigation', at: new Date().toISOString(), url: details.url },
    details.tabId
  );
});

chrome.webRequest.onCompleted.addListener(
  (details) => {
    void appendEvent(
      {
        kind: 'network',
        at: new Date(details.timeStamp).toISOString(),
        url: details.url,
        method: details.method,
        statusCode: details.statusCode,
        resourceType: details.type
      },
      details.tabId
    );
  },
  { urls: ['http://*/*', 'https://*/*'] }
);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'COMPANION_EVENT') {
    void appendEvent(message.event as CapturedEvent, sender.tab?.id);
    return;
  }
  void (async () => {
    try {
      if (message?.type === 'COMPANION_GET_STATE') {
        sendResponse({ ok: true, state: await loadState(), missions: MISSIONS });
        return;
      }
      if (message?.type === 'COMPANION_BEGIN_RUN') {
        if (!__COMPANION_LOCAL_PAIRING__) {
          throw new Error('Begin the run from App Review Preflight in Webflow Designer.');
        }
        const settings = message.settings as Settings;
        const body = await api<{ run: any }>(
          settings,
          `/v1/reviews/${encodeURIComponent(settings.reviewId)}/companion-runs`,
          { method: 'POST', body: JSON.stringify({ reviewVersionId: settings.reviewVersionId }) }
        );
        const state = { ...EMPTY, settings, run: body.run };
        await saveState(state);
        sendResponse({ ok: true, state });
        return;
      }
      if (message?.type === 'COMPANION_START_MISSION') {
        const state = await loadState();
        const mission = message.mission as MissionId;
        if (!state.run || !state.settings || !MISSIONS.includes(mission)) throw new Error('Start a version-bound run first.');
        const explicitTabId = Number.isInteger(message.targetTabId)
          ? Number(message.targetTabId)
          : null;
        const tab = explicitTabId === null
          ? (await chrome.tabs.query({ active: true, currentWindow: true }))[0]
          : await chrome.tabs.get(explicitTabId);
        if (!tab?.id || !tab.url) throw new Error('Open the Designer or published site tab first.');
        const origin = `${new URL(tab.url).origin}/*`;
        const alreadyGranted = await chrome.permissions.contains({ origins: [origin] });
        const granted = alreadyGranted || await chrome.permissions.request({ origins: [origin] });
        if (!granted) throw new Error('This mission needs access to the current site only.');
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
        state.activeMission = mission;
        state.activeTabId = tab.id;
        state.events = [{ kind: 'lifecycle', at: new Date().toISOString(), url: tab.url, detail: { marker: 'mission_started' } }];
        state.error = null;
        await saveState(state);
        sendResponse({ ok: true, state });
        return;
      }
      if (message?.type === 'COMPANION_COMPLETE_MISSION') {
        const state = await loadState();
        if (!state.run || !state.settings || !state.activeMission || state.activeTabId === null) throw new Error('No mission is running.');
        const snapshot = await chrome.tabs.sendMessage(state.activeTabId, { type: 'COMPANION_CAPTURE_SNAPSHOT' });
        const sanitizedSnapshot = {
          url: sanitizeUrl(snapshot.url),
          scripts: (snapshot.scripts ?? []).slice(0, 200).map((item: any) => ({ src: sanitizeUrl(item.src), integrity: item.integrity, crossOrigin: item.crossOrigin })),
          frames: (snapshot.frames ?? []).slice(0, 50).map((item: any) => ({ src: sanitizeUrl(item.src) })),
          dom: sanitizeDetail(snapshot.dom),
          storage: {
            local: (snapshot.storage?.local ?? []).slice(0, 100).map((item: any) => ({ key: String(item.key).slice(0, 120), bytes: Number(item.bytes) || 0 })),
            session: (snapshot.storage?.session ?? []).slice(0, 100).map((item: any) => ({ key: String(item.key).slice(0, 120), bytes: Number(item.bytes) || 0 }))
          }
        };
        await chrome.tabs.sendMessage(state.activeTabId, { type: 'COMPANION_CAPTURE_MASK', enabled: true });
        const targetTab = await chrome.tabs.get(state.activeTabId);
        const localHarnessScreenshot =
          __COMPANION_LOCAL_PAIRING__ &&
          typeof message.localHarnessScreenshot === 'string' &&
          state.settings.apiBaseUrl.startsWith('http://127.0.0.1:') &&
          targetTab.url?.startsWith('http://localhost:')
            ? message.localHarnessScreenshot
            : null;
        await chrome.tabs.update(state.activeTabId, { active: true });
        const screenshotUrl = localHarnessScreenshot ??
          await chrome.tabs.captureVisibleTab(targetTab.windowId, { format: 'png' });
        await chrome.tabs.sendMessage(state.activeTabId, { type: 'COMPANION_CAPTURE_MASK', enabled: false });
        const screenshot = await (await fetch(screenshotUrl)).blob();
        const screenshotSha256 = await sha256Bytes(await screenshot.arrayBuffer());
        const evidence = {
          events: state.events,
          snapshot: sanitizedSnapshot,
          screenshot: { bytes: screenshot.size, sha256: screenshotSha256, maskedFormControls: true }
        };
        const evidenceDigest = await sha256(evidence);
        const manifest = {
          reviewVersionId: state.run.reviewVersionId,
          evidenceTrust: state.run.evidenceTrust,
          status: 'passed',
          evidenceDigest,
          eventCount: state.events.length,
          artifactCount: 1,
          observedAt: new Date().toISOString(),
          evidence
        };
        const form = new FormData();
        form.set('manifest', JSON.stringify(manifest));
        form.set('screenshot', new File([screenshot], 'mission.png', { type: 'image/png' }));
        const body = await api<{ run: any }>(
          state.settings,
          `/v1/companion-runs/${encodeURIComponent(state.run.id)}/missions/${state.activeMission}`,
          {
            method: 'POST',
            body: form
          }
        );
        state.run = body.run;
        state.activeMission = null;
        state.activeTabId = null;
        state.events = [];
        await saveState(state);
        sendResponse({ ok: true, state });
        return;
      }
      throw new Error('Unknown companion action.');
    } catch (error) {
      sendResponse({ ok: false, error: error instanceof Error ? error.message : 'Companion action failed.' });
    }
  })();
  return true;
});

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  void (async () => {
    try {
      if (message?.type !== 'COMPANION_PAIR') throw new Error('Unknown pairing action.');
      if (!isAllowedPairingSender(sender.origin, __COMPANION_LOCAL_PAIRING__)) {
        throw new Error('Pairing must start from the owning Webflow Designer extension.');
      }
      if (typeof message.code !== 'string' || message.code.length < 32) {
        throw new Error('The one-time pairing code is invalid.');
      }
      const paired = await redeemAndBeginCompanion({
        code: message.code,
        apiBaseUrl: COMPANION_API_BASE
      });
      const state: CompanionState = {
        ...EMPTY,
        settings: paired.settings,
        run: paired.run
      };
      await saveState(state);
      if (sender.tab?.windowId !== undefined) {
        await chrome.sidePanel.open({ windowId: sender.tab.windowId }).catch(() => undefined);
      }
      sendResponse({ ok: true });
    } catch (error) {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : 'The browser companion could not connect.'
      });
    }
  })();
  return true;
});
