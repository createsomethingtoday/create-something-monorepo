import {
  CreateStartUpPageContainer,
  TextContainerProperty,
  TextContainerUpgrade,
  waitForEvenAppBridge
} from '@evenrealities/even_hub_sdk';
import type { ActionReceipt, PresenceAction, PresenceCard } from '@create-something/codex-presence';

import { inputSource, resolveInteraction, type PresenceInteraction } from './interaction';
import {
  actionable,
  actionsScreen,
  confirmScreen,
  detailScreen,
  messageScreen,
  overviewScreen,
  voiceScreen,
  type PresenceView
} from './screens';

const CONTAINER_ID = 1;
const REFRESH_MS = 1_000;
type Bridge = Awaited<ReturnType<typeof waitForEvenAppBridge>>;

const params = new URLSearchParams(window.location.search);
const token = params.get('token')?.trim() || '';
const serviceUrl = (params.get('service')?.trim() || 'http://127.0.0.1:4782').replace(/\/+$/, '');
const preferredTaskId = params.get('task')?.trim() || '';
const debugElement = document.querySelector<HTMLDivElement>('#debug');
let bridge: Bridge | null = null;
let cards: PresenceCard[] = [];
let cardIndex = 0;
let actionIndex = 0;
let view: PresenceView = 'overview';
let pendingAction: PresenceAction | null = null;
let voiceChunks: Uint8Array[] = [];
let voiceText = '';
let refreshTimer: number | undefined;
let preferredTaskApplied = false;

setupDebug();
await start();

async function start(): Promise<void> {
  await render(token ? 'CODEX PRESENCE\n\nConnecting...' : messageScreen('Pairing required', 'Open with a one-time service token.'));
  try {
    bridge = await waitForEvenAppBridge();
    await createContainer('CODEX PRESENCE\n\nConnecting...');
    bridge.onEvenHubEvent((event) => {
      if (event.audioEvent) {
        if (view === 'recording') voiceChunks.push(event.audioEvent.audioPcm);
        return;
      }
      const source = inputSource(event.sysEvent?.eventSource);
      const textEvent = event.textEvent;
      if (textEvent && textEvent.containerID !== CONTAINER_ID) return;
      if (!textEvent && source !== 'ring' && source !== 'glasses') return;
      const interaction = resolveInteraction({
        eventType: textEvent?.eventType ?? event.sysEvent?.eventType,
        source,
        view
      });
      if (interaction) void applyInteraction(interaction);
    });
  } catch (error) {
    console.warn('Even bridge unavailable; browser debug mode remains active.', error);
  }
  if (!token) return;
  await refresh();
  refreshTimer = window.setInterval(() => void refresh(true), REFRESH_MS);
}

async function applyInteraction(interaction: PresenceInteraction): Promise<void> {
  if (interaction.kind === 'exit') {
    if (refreshTimer) window.clearInterval(refreshTimer);
    await bridge?.audioControl(false);
    bridge?.shutDownPageContainer(1);
    return;
  }
  if (interaction.kind === 'refresh') {
    await refresh(true);
    return;
  }
  if (interaction.kind === 'voice-toggle') {
    if (view === 'recording') await finishVoice();
    else await beginVoice();
    return;
  }
  if (interaction.kind === 'back') {
    if (view === 'overview') return;
    if (view === 'recording') await bridge?.audioControl(false);
    view = view === 'actions' ? 'detail' : 'overview';
    pendingAction = null;
    await renderCurrent();
    return;
  }
  if (interaction.kind === 'move') {
    if (view === 'overview') cardIndex = wrap(cardIndex + interaction.delta, cards.length);
    if (view === 'actions') actionIndex = wrap(actionIndex + interaction.delta, actionable(currentCard()?.actions ?? []).length);
    await renderCurrent();
    return;
  }
  await selectCurrent();
}

async function selectCurrent(): Promise<void> {
  const card = currentCard();
  if (view === 'recording') {
    await finishVoice();
    return;
  }
  if (view === 'overview' && card) view = 'detail';
  else if (view === 'detail' && card) {
    view = 'actions';
    actionIndex = 0;
  } else if (view === 'actions' && card) {
    pendingAction = actionable(card.actions)[actionIndex] ?? null;
    if (!pendingAction) return;
    if (pendingAction.type === 'follow_up' || pendingAction.type === 'answer') {
      await beginVoice();
      return;
    }
    if (pendingAction.requiresConfirmation) view = 'confirm';
    else await sendAction(pendingAction);
  } else if (view === 'confirm' && pendingAction) await sendAction(pendingAction, true);
  else if (view === 'voice_review' && card && voiceText) {
    const target = card.actions.find((action) => action.type === (card.state === 'needs_input' ? 'answer' : 'follow_up'));
    if (!target) {
      view = 'error';
      await render(messageScreen('Unavailable', 'This task cannot accept voice input in its current state.'));
      return;
    }
    await sendAction(target, false, voiceText);
  } else if (view === 'receipt' || view === 'error') view = 'overview';
  await renderCurrent();
}

async function beginVoice(): Promise<void> {
  voiceChunks = [];
  voiceText = '';
  view = 'recording';
  await renderCurrent();
  const opened = await bridge?.audioControl(true);
  if (bridge && !opened) {
    view = 'error';
    await render(messageScreen('Microphone', 'The G2 microphone could not be opened.'));
  }
}

async function finishVoice(): Promise<void> {
  await bridge?.audioControl(false);
  await render('TRANSCRIBING\n\nPlease wait...');
  try {
    const audio = combine(voiceChunks);
    if (audio.byteLength === 0) throw new Error('No microphone audio was captured.');
    const response = await api('/v1/transcriptions', {
      method: 'POST',
      headers: { 'content-type': 'audio/L16;rate=16000' },
      body: audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength) as ArrayBuffer
    });
    const value = await response.json() as { text?: string; error?: string };
    if (!response.ok || !value.text) throw new Error(value.error || `Transcription returned ${response.status}.`);
    voiceText = value.text;
    view = 'voice_review';
  } catch (error) {
    view = 'error';
    voiceText = error instanceof Error ? error.message : String(error);
  }
  await renderCurrent();
}

async function sendAction(action: PresenceAction, confirmed = false, text?: string): Promise<void> {
  await render('SENDING\n\nPlease wait...');
  try {
    const response = await api('/v1/actions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        requestId: crypto.randomUUID(),
        actionId: action.id,
        taskId: currentCard()?.taskId,
        type: action.type,
        confirmed,
        text
      })
    });
    const receipt = await response.json() as ActionReceipt & { error?: string };
    if (!response.ok) throw new Error(receipt.detail || receipt.error || `Action returned ${response.status}.`);
    view = 'receipt';
    voiceText = receipt.detail || `${action.label} accepted.`;
  } catch (error) {
    view = 'error';
    voiceText = error instanceof Error ? error.message : String(error);
  }
  pendingAction = null;
  await renderCurrent();
}

async function refresh(silent = false): Promise<void> {
  try {
    const response = await api('/v1/cards');
    const value = await response.json() as { cards?: PresenceCard[]; error?: string };
    if (!response.ok || !Array.isArray(value.cards)) throw new Error(value.error || `Presence returned ${response.status}.`);
    const selectedTaskId = currentCard()?.taskId;
    cards = value.cards;
    const requestedId = !preferredTaskApplied && preferredTaskId ? preferredTaskId : selectedTaskId;
    const retainedIndex = requestedId ? cards.findIndex((card) => card.taskId === requestedId) : -1;
    cardIndex = retainedIndex >= 0 ? retainedIndex : wrap(cardIndex, cards.length);
    preferredTaskApplied = true;
    if (view === 'overview' || !silent) await renderCurrent();
  } catch (error) {
    if (!silent) {
      view = 'error';
      voiceText = error instanceof Error ? error.message : String(error);
      await renderCurrent();
    }
  }
}

function api(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${token}`);
  headers.set('accept', 'application/json');
  return fetch(`${serviceUrl}${path}`, { ...init, headers });
}

async function renderCurrent(): Promise<void> {
  const card = currentCard();
  if (view === 'overview') return render(overviewScreen(cards, cardIndex));
  if (!card) return render(messageScreen('Waiting', 'No Codex task is available.'));
  if (view === 'detail') return render(detailScreen(card));
  if (view === 'actions') return render(actionsScreen(card, actionIndex));
  if (view === 'confirm' && pendingAction) return render(confirmScreen(pendingAction));
  if (view === 'recording') return render(voiceScreen('recording'));
  if (view === 'voice_review') return render(voiceScreen('review', voiceText));
  return render(messageScreen(view === 'receipt' ? 'Accepted' : 'Could not complete', voiceText));
}

function currentCard(): PresenceCard | undefined {
  return cards[wrap(cardIndex, cards.length)];
}

async function createContainer(content: string): Promise<void> {
  if (!bridge) return;
  const result = await bridge.createStartUpPageContainer(new CreateStartUpPageContainer({
    containerTotalNum: 1,
    textObject: [new TextContainerProperty({
      xPosition: 0, yPosition: 0, width: 576, height: 288, borderWidth: 0,
      borderColor: 5, paddingLength: 4, containerID: CONTAINER_ID,
      containerName: 'codex-presence', content, isEventCapture: 1
    })]
  }));
  if (result !== 0) throw new Error(`createStartUpPageContainer failed: ${result}`);
}

async function render(content: string): Promise<void> {
  if (debugElement) debugElement.textContent = content;
  if (bridge) await bridge.textContainerUpgrade(new TextContainerUpgrade({
    containerID: CONTAINER_ID, containerName: 'codex-presence', content
  }));
}

function setupDebug(): void {
  Object.assign(document.body.style, {
    margin: '0', background: '#06110a', color: '#d7ffe2', fontFamily: 'ui-monospace, monospace',
    fontSize: 'clamp(14px, 4.2vw, 18px)', lineHeight: '1.35', whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere', padding: '16px', boxSizing: 'border-box', width: '100vw', maxWidth: '576px', minHeight: '288px'
  });
}

function wrap(index: number, length: number): number {
  return length <= 0 ? 0 : ((index % length) + length) % length;
}

function combine(chunks: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}
