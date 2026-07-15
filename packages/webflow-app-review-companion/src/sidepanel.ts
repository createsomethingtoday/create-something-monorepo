import { MISSIONS, type MissionId } from './core';
import { COMPANION_API_BASE } from './config';
import { requestMissionTarget } from './permissions';

const LABELS: Record<MissionId, { title: string; detail: string }> = {
  production_runtime: { title: 'Capture runtime evidence', detail: 'Exercise the published behavior and capture partner-supplied scripts, requests, and resulting state. Webflow-controlled automation issues the security result.' }
};

const root = document.querySelector<HTMLElement>('#app')!;

async function send(message: unknown): Promise<any> {
  return chrome.runtime.sendMessage(message);
}

function escape(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

async function render(): Promise<void> {
  const [response, tabs] = await Promise.all([
    send({ type: 'COMPANION_GET_STATE' }),
    chrome.tabs.query({ active: true, currentWindow: true })
  ]);
  const activeTab = tabs[0];
  const state = response.state;
  if (!state.run) {
    root.innerHTML = __COMPANION_LOCAL_PAIRING__ ? `
      <header><div class="mark">W</div><div><h1>App Review Companion</h1><p>One mission set. Evidence everyone can trust.</p></div></header>
      <main><section class="hero"><span class="eyebrow">NEW VALIDATION RUN</span><h2>Choose the exact submission</h2><p>The service—not this browser—binds the run to its version and trust level.</p></section>
      <form id="begin-form" class="card">
        <label>Preflight service<input name="apiBaseUrl" value="${escape(COMPANION_API_BASE)}" required></label>
        <label>Session token<input name="token" type="password" value="test-token" autocomplete="off" required></label>
        <label>Review ID<input name="reviewId" required></label>
        <label>Version ID<input name="reviewVersionId" required></label>
        <label>Runtime package ID<input name="runtimeTestPackageId" required></label>
        <button type="submit">Begin validation</button>
      </form><aside class="privacy"><strong>Privacy boundary</strong><p>No headers, cookies, bodies, form values, or storage values are captured.</p></aside></main>` : `
      <header><div class="mark">W</div><div><h1>App Review Companion</h1><p>One mission set. Evidence everyone can trust.</p></div></header>
      <main><section class="hero"><span class="eyebrow">READY TO CONNECT</span><h2>Start in Webflow Designer</h2><p>Open App Review Preflight, choose the exact revision, and click <strong>Connect browser companion</strong>.</p></section>
      <section class="card"><strong>No setup to paste</strong><p>Your signed-in Webflow identity binds the version and evidence trust automatically.</p></section>
      <aside class="privacy"><strong>Privacy boundary</strong><p>No headers, cookies, bodies, form values, or storage values are captured.</p></aside></main>`;
    if (!__COMPANION_LOCAL_PAIRING__) return;
    document.querySelector<HTMLFormElement>('#begin-form')!.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = {
        ...Object.fromEntries(new FormData(event.currentTarget as HTMLFormElement)),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      };
      const result = await send({ type: 'COMPANION_BEGIN_RUN', settings: data });
      if (!result.ok) return showError(result.error);
      await render();
    });
    return;
  }

  const completed = state.run.missions.filter((mission: any) => mission.status === 'passed').length;
  root.innerHTML = `
    <header><div class="mark">W</div><div><h1>App Review Companion</h1><p>${escape(state.run.actorRole === 'reviewer' ? 'Reviewer replay' : 'Developer validation')}</p></div></header>
    <main><section class="status card"><div><span class="eyebrow">${escape(state.run.evidenceTrust.replace('_', ' '))}</span><h2>Capture production-runtime evidence</h2></div><strong>${completed}/${state.run.missions.length}</strong></section>
    <div class="version">Version <code>${escape(state.run.reviewVersionId)}</code><br>Bundle <code>${escape(state.run.bundleSha256.slice(0, 12))}…</code></div>
    <section class="card"><strong>Authorization is already complete</strong><p>External app authorization is a setup prerequisite and is not scored or recorded by this validation.</p></section>
    <section class="missions">${state.run.missions.map((mission: any, index: number) => {
      const active = state.activeMission === mission.id;
      const done = mission.status === 'passed';
      return `<article class="mission ${done ? 'done' : ''} ${active ? 'active' : ''}"><div class="step">${done ? '✓' : index + 1}</div><div class="mission-copy"><h3>${escape(LABELS[mission.id as MissionId].title)}</h3><p>${escape(LABELS[mission.id as MissionId].detail)}</p><span>${escape(active ? `${state.events.length} observations captured` : mission.status)}</span></div><button data-mission="${mission.id}" data-action="${active ? 'complete' : 'start'}" ${done || (state.activeMission && !active) ? 'disabled' : ''}>${active ? 'Complete' : done ? 'Saved' : 'Start'}</button></article>`;
    }).join('')}</section>
    ${completed === state.run.missions.length ? '<section class="success"><strong>Partner evidence saved</strong><p>This does not verify code security. The Webflow-controlled runtime job must independently load and hash the published code.</p></section>' : '<aside class="privacy"><strong>Evidence only</strong><p>Browser buttons cannot produce a security pass. Missing Webflow-observed evidence remains Blocked.</p></aside>'}
    </main>`;
  document.querySelectorAll<HTMLButtonElement>('[data-mission]').forEach((button) => {
    button.addEventListener('click', async () => {
      const type = button.dataset.action === 'complete' ? 'COMPANION_COMPLETE_MISSION' : 'COMPANION_START_MISSION';
      let targetTabId: number | undefined;
      if (type === 'COMPANION_START_MISSION') {
        try {
          const target = await requestMissionTarget(
            activeTab,
            (permissions) => chrome.permissions.request(permissions)
          );
          targetTabId = target.targetTabId;
        } catch (error) {
          showError(error instanceof Error ? error.message : 'Current-site access was not granted.');
          return;
        }
      }
      const result = await send({
        type,
        mission: button.dataset.mission,
        targetTabId
      });
      if (!result.ok) return showError(result.error);
      await render();
    });
  });
}

function showError(message: string): void {
  let banner = document.querySelector<HTMLElement>('#error');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'error';
    banner.className = 'error';
    root.prepend(banner);
  }
  banner.textContent = message;
}

void render();
chrome.tabs.onActivated.addListener(() => void render());
chrome.tabs.onUpdated.addListener((_tabId, change, tab) => {
  if (tab.active && change.url) void render();
});
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'session' && changes.companionState) void render();
});
