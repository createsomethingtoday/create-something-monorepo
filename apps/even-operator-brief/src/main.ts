import {
  CreateStartUpPageContainer,
  TextContainerProperty,
  TextContainerUpgrade,
  waitForEvenAppBridge
} from '@evenrealities/even_hub_sdk';

import {
  errorScreen,
  loadingScreen,
  missingTokenScreen
} from './brief';
import {
  inputSourceFromEventSource,
  resolveOperatorInteraction,
  type OperatorInteraction,
  type ViewMode
} from './interaction';
import {
  clampSelection,
  formatClaimPrompt,
  formatClaimResult,
  formatIssueDetail,
  formatLinearQueue,
  moveSelection,
  normalizeClaimResult,
  normalizeLinearQueue,
  selectedIssue,
  type LinearOpenQueue
} from './linear';

const CONTAINER_ID = 1;
const CONTAINER_NAME = 'operator-brief';
const STORAGE_TOKEN_KEY = 'create-something.ink-device-token';
const STORAGE_BRIDGE_KEY = 'create-something.ink-bridge-url';
const STORAGE_QUEUE_KEY = 'create-something.linear-open-cache';
const DEFAULT_BRIDGE_URL = 'https://ink.createsomething.agency';
const REFRESH_MS = 60_000;

type EvenBridge = Awaited<ReturnType<typeof waitForEvenAppBridge>>;

type RuntimeConfig = {
  bridgeUrl: string;
  token: string;
};

const debugElement = document.querySelector<HTMLDivElement>('#debug');
const config = loadRuntimeConfig();
let currentQueue: LinearOpenQueue = loadCachedQueue();
let selectedIndex = 0;
let viewMode: ViewMode = 'queue';
let bridge: EvenBridge | null = null;

setupBrowserDebug();
await start();

async function start(): Promise<void> {
  renderDebug(loadingScreen());

  try {
    bridge = await waitForEvenAppBridge();
    await createMainContainer(loadingScreen());
    bridge.onEvenHubEvent((event) => {
      const textEvent = event.textEvent;
      const inputSource = inputSourceFromEventSource(event.sysEvent?.eventSource);
      if (textEvent && textEvent.containerID !== CONTAINER_ID) return;
      if (!textEvent && inputSource !== 'ring') return;

      const interaction = resolveOperatorInteraction({
        eventType: textEvent?.eventType ?? event.sysEvent?.eventType,
        inputSource,
        viewMode
      });
      if (interaction) void applyInteraction(interaction);
    });
  } catch (error) {
    console.warn('Even bridge unavailable; using browser debug renderer.', error);
  }

  if (!config.token) {
    await render(missingTokenScreen());
    return;
  }

  if ((currentQueue.issues?.length ?? 0) > 0) {
    await renderCurrent();
    void refreshQueue({ silent: true });
  } else {
    await refreshQueue();
  }

  window.setInterval(() => {
    void refreshQueue({ silent: true });
  }, REFRESH_MS);
}

async function applyInteraction(interaction: OperatorInteraction): Promise<void> {
  if (interaction.kind === 'exit') {
    bridge?.shutDownPageContainer(1);
    return;
  }

  if (interaction.kind === 'move') {
    await handleMove(interaction.delta);
    return;
  }

  if (interaction.kind === 'refresh-silent') {
    await refreshQueue({ silent: true });
    return;
  }

  if (interaction.kind === 'set-view') {
    viewMode = interaction.viewMode;
    await renderCurrent();
    return;
  }

  await handleTap();
}

async function handleTap(): Promise<void> {
  if (!config.token) {
    await render(missingTokenScreen());
    return;
  }

  if (viewMode === 'queue') {
    viewMode = 'detail';
    await renderCurrent();
    return;
  }

  if (viewMode === 'detail') {
    viewMode = 'claim';
    await renderCurrent();
    return;
  }

  if (viewMode === 'claim') {
    await claimSelectedIssue();
    return;
  }

  viewMode = 'queue';
  await refreshQueue();
}

async function handleMove(delta: number): Promise<void> {
  if (viewMode === 'claim' || viewMode === 'message') {
    viewMode = 'detail';
    await renderCurrent();
    return;
  }

  selectedIndex = moveSelection(currentQueue, selectedIndex, delta);
  await renderCurrent();
}

async function refreshQueue(options: { silent?: boolean } = {}): Promise<void> {
  if (!options.silent) {
    await render(loadingScreen());
  }

  try {
    const response = await fetch(`${config.bridgeUrl}/ink/linear-open?team=CRE&limit=5`, {
      headers: {
        'x-ink-token': config.token,
        accept: 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Bridge returned ${response.status}`);
    }

    currentQueue = normalizeLinearQueue(await response.json());
    selectedIndex = clampSelection(currentQueue, selectedIndex);
    localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(currentQueue));
    if (viewMode === 'message') viewMode = 'queue';
    await renderCurrent();
  } catch (error) {
    if (!options.silent) {
      const message = error instanceof Error ? error.message : 'Unknown sync error';
      await render(errorScreen(message));
    }
  }
}

async function claimSelectedIssue(): Promise<void> {
  const issue = selectedIssue(currentQueue, selectedIndex);
  if (!issue?.identifier) {
    viewMode = 'queue';
    await refreshQueue();
    return;
  }

  await render(['CLAIMING', '', issue.identifier, '', 'Please wait...'].join('\n'));

  try {
    const response = await fetch(`${config.bridgeUrl}/ink/linear-action`, {
      method: 'POST',
      headers: {
        'x-ink-token': config.token,
        'content-type': 'application/json',
        accept: 'application/json'
      },
      body: JSON.stringify({
        action: 'claim',
        issue: issue.identifier,
        team: 'CRE'
      })
    });

    if (!response.ok) {
      throw new Error(`Bridge returned ${response.status}`);
    }

    viewMode = 'message';
    await render(formatClaimResult(normalizeClaimResult(await response.json())));
    void refreshQueue({ silent: true });
  } catch (error) {
    viewMode = 'message';
    const message = error instanceof Error ? error.message : 'Unknown claim error';
    await render(errorScreen(message));
  }
}

async function renderCurrent(): Promise<void> {
  if (viewMode === 'detail') {
    await render(formatIssueDetail(currentQueue, selectedIndex));
    return;
  }

  if (viewMode === 'claim') {
    await render(formatClaimPrompt(selectedIssue(currentQueue, selectedIndex)));
    return;
  }

  await render(formatLinearQueue(currentQueue, selectedIndex));
}

async function createMainContainer(content: string): Promise<void> {
  if (!bridge) return;

  const result = await bridge.createStartUpPageContainer(
    new CreateStartUpPageContainer({
      containerTotalNum: 1,
      textObject: [
        new TextContainerProperty({
          xPosition: 0,
          yPosition: 0,
          width: 576,
          height: 288,
          borderWidth: 0,
          borderColor: 5,
          paddingLength: 4,
          containerID: CONTAINER_ID,
          containerName: CONTAINER_NAME,
          content,
          isEventCapture: 1
        })
      ]
    })
  );

  if (result !== 0) {
    throw new Error(`createStartUpPageContainer failed: ${result}`);
  }
}

async function render(content: string): Promise<void> {
  renderDebug(content);

  if (!bridge) return;

  await bridge.textContainerUpgrade(
    new TextContainerUpgrade({
      containerID: CONTAINER_ID,
      containerName: CONTAINER_NAME,
      content
    })
  );
}

function loadRuntimeConfig(): RuntimeConfig {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token')?.trim() || import.meta.env.VITE_INK_DEVICE_TOKEN?.trim() || localStorage.getItem(STORAGE_TOKEN_KEY)?.trim() || '';
  const bridgeUrl = normalizeBridgeUrl(
    params.get('bridge')?.trim() ||
      import.meta.env.VITE_INK_BRIDGE_URL?.trim() ||
      localStorage.getItem(STORAGE_BRIDGE_KEY)?.trim() ||
      DEFAULT_BRIDGE_URL
  );

  if (params.get('token')?.trim()) {
    localStorage.setItem(STORAGE_TOKEN_KEY, params.get('token')!.trim());
  }

  if (params.get('bridge')?.trim()) {
    localStorage.setItem(STORAGE_BRIDGE_KEY, bridgeUrl);
  }

  return { bridgeUrl, token };
}

function normalizeBridgeUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  return trimmed || DEFAULT_BRIDGE_URL;
}

function loadCachedQueue(): LinearOpenQueue {
  const cached = localStorage.getItem(STORAGE_QUEUE_KEY);
  if (!cached) return { issues: [] };
  try {
    return normalizeLinearQueue(JSON.parse(cached));
  } catch {
    return { issues: [] };
  }
}

function setupBrowserDebug(): void {
  document.body.style.margin = '0';
  document.body.style.background = '#001a0b';
  document.body.style.color = '#68ff9a';
  document.body.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  document.body.style.fontSize = 'clamp(14px, 4.2vw, 18px)';
  document.body.style.lineHeight = '1.35';
  document.body.style.whiteSpace = 'pre-wrap';
  document.body.style.overflowWrap = 'anywhere';
  document.body.style.overflowX = 'hidden';
  document.body.style.padding = '16px';
  document.body.style.boxSizing = 'border-box';
  document.body.style.width = '100vw';
  document.body.style.maxWidth = '576px';
  document.body.style.minHeight = '288px';
}

function renderDebug(content: string): void {
  if (debugElement) {
    debugElement.textContent = content;
  }
}
