import RealtimeKitClient from '@cloudflare/realtimekit';
import { defineCustomElements, setNonce } from '@cloudflare/realtimekit-ui/loader';
import RealtimeKitVideoBackgroundTransformer from '@cloudflare/realtimekit-virtual-background';
import {
  createBackgroundBlurController,
  type BackgroundBlurFactory,
  type BackgroundBlurMeeting
} from './background-blur.js';
import { createMediaControls, type ControllableMedia } from './media-controls.js';

const videoBackground = RealtimeKitVideoBackgroundTransformer as unknown as BackgroundBlurFactory;

type JoinCredential = {
  status: 'ready' | 'rejected' | 'retryable';
  role?: 'host' | 'guest';
  providerToken?: string;
  nextCapability?: string;
  reason?: string;
};

type MeetingElement = HTMLElement & {
  meeting?: unknown;
};

type ActiveMeeting = BackgroundBlurMeeting & {
  self: BackgroundBlurMeeting['self'] & ControllableMedia;
  participants: {
    waitlisted: {
      values(): IterableIterator<{ id: string }>;
      on(event: 'participantJoined', listener: (participant: { id: string }) => void): void;
    };
    acceptWaitingRoomRequest(participantId: string): void;
  };
};

const realtimeKit = RealtimeKitClient as unknown as {
  init(input: {
    authToken: string;
  }): Promise<unknown>;
};

const root = document.querySelector<HTMLElement>('[data-room-id]');
const gate = document.querySelector<HTMLElement>('#room-gate');
const stage = document.querySelector<HTMLElement>('#meeting-stage');
const form = document.querySelector<HTMLFormElement>('#join-form');
const displayName = document.querySelector<HTMLInputElement>('#display-name');
const joinButton = document.querySelector<HTMLButtonElement>('#join-room');
const status = document.querySelector<HTMLElement>('#room-status');
const meetingElement = document.querySelector<MeetingElement>('#realtimekit-meeting');
const microphoneButton = document.querySelector<HTMLButtonElement>('#toggle-microphone');
const cameraButton = document.querySelector<HTMLButtonElement>('#toggle-camera');
const screenShareButton = document.querySelector<HTMLButtonElement>('#toggle-screen-share');
const backgroundButton = document.querySelector<HTMLButtonElement>('#background-blur');
const endButton = document.querySelector<HTMLButtonElement>('#end-room');

if (
  !root || !gate || !stage || !form || !displayName || !joinButton ||
  !status || !meetingElement || !microphoneButton || !cameraButton ||
  !screenShareButton || !backgroundButton || !endButton
) throw new Error('room_surface_incomplete');
const statusElement = status;

const nonce = document.querySelector<HTMLMetaElement>('meta[name="csp-nonce"]')?.content;
if (nonce) setNonce(nonce);
defineCustomElements(window);

const roomId = root.dataset.roomId ?? '';
const capabilityKey = `create-something:room:${roomId}:capability`;
const endKey = `create-something:room:${roomId}:end-key`;
const currentUrl = new URL(window.location.href);
let activeCapability = currentUrl.searchParams.get('cap') ?? safeSessionRead(capabilityKey);
let activeMeeting: ActiveMeeting | null = null;
let backgroundController: ReturnType<typeof createBackgroundBlurController> | null = null;
let mediaControls: ReturnType<typeof createMediaControls> | null = null;
currentUrl.searchParams.delete('cap');
window.history.replaceState({}, '', `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);

if (!roomId || !activeCapability) {
  setStatus('This room link is missing, expired, or has already been used.', 'error');
  joinButton.disabled = true;
} else {
  setStatus('Secure room link ready. Continue when you are ready to check devices.');
}

document.addEventListener('securitypolicyviolation', (event) => {
  if (!['connect-src', 'media-src', 'script-src', 'worker-src'].includes(event.effectiveDirective)) {
    return;
  }
  const blockedHost = safeHost(event.blockedURI);
  const directive = event.effectiveDirective || 'content policy';
  setStatus(
    blockedHost
      ? `The media client was blocked from ${blockedHost} by ${directive}. The room policy needs an endpoint update.`
      : `The media client was blocked by ${directive}. The room policy needs an endpoint update.`,
    'error'
  );
  joinButton.disabled = false;
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!activeCapability || !displayName.value.trim()) return;
  joinButton.disabled = true;
  setStatus('Issuing a fresh, room-bound media credential.');

  try {
    const response = await fetch(`/api/v1/rooms/${encodeURIComponent(roomId)}/credentials`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        capability: activeCapability,
        displayName: displayName.value.trim()
      })
    });
    const credential = await response.json() as JoinCredential;
    if (
      !response.ok ||
      credential.status !== 'ready' ||
      !credential.providerToken ||
      !credential.nextCapability ||
      !credential.role
    ) {
      throw new Error(credential.reason ?? 'join_credential_unavailable');
    }

    activeCapability = credential.nextCapability;
    safeSessionWrite(capabilityKey, activeCapability);
    const meeting = await withTimeout(
      realtimeKit.init({ authToken: credential.providerToken }),
      15_000,
      'media_client_initialization_timeout'
    );
    delete credential.providerToken;
    activeMeeting = meeting as ActiveMeeting;
    backgroundController = createBackgroundBlurController({
      meeting: activeMeeting,
      factory: videoBackground
    });
    mediaControls = createMediaControls(activeMeeting.self);
    meetingElement.meeting = meeting;
    microphoneButton.hidden = false;
    cameraButton.hidden = false;
    screenShareButton.hidden = false;
    if (backgroundController.isSupported) {
      backgroundButton.hidden = false;
    }
    if (credential.role === 'host') {
      endButton.hidden = false;
      const acceptExpectedGuest = (participant: { id: string }): void => {
        activeMeeting?.participants.acceptWaitingRoomRequest(participant.id);
      };
      activeMeeting.participants.waitlisted.on('participantJoined', acceptExpectedGuest);
      for (const participant of activeMeeting.participants.waitlisted.values()) {
        acceptExpectedGuest(participant);
      }
    }
    gate.hidden = true;
    stage.hidden = false;
    document.title = 'LIVE ROOM / CREATE SOMETHING';
  } catch (error) {
    setStatus(
      error instanceof Error && error.message === 'media_client_initialization_timeout'
        ? 'The media client timed out before device setup. Check the network policy, then retry.'
        : 'The room could not be joined. Check the link and your connection, then retry.',
      'error'
    );
    joinButton.disabled = false;
  }
});

microphoneButton.addEventListener('click', () => runMediaControl(
  microphoneButton,
  () => mediaControls?.toggleAudio(),
  (enabled) => enabled ? 'Mute mic' : 'Unmute mic'
));

cameraButton.addEventListener('click', () => runMediaControl(
  cameraButton,
  () => mediaControls?.toggleVideo(),
  (enabled) => enabled ? 'Turn camera off' : 'Turn camera on'
));

screenShareButton.addEventListener('click', () => runMediaControl(
  screenShareButton,
  () => mediaControls?.toggleScreenShare(),
  (enabled) => enabled ? 'Stop sharing' : 'Share screen'
));

backgroundButton.addEventListener('click', async () => {
  if (!backgroundController) return;
  backgroundButton.disabled = true;
  try {
    const blurred = await backgroundController.toggle();
    backgroundButton.textContent = blurred ? 'Remove background blur' : 'Blur background';
    backgroundButton.setAttribute('aria-pressed', String(blurred));
  } catch {
    backgroundButton.textContent = 'Blur unavailable';
    backgroundButton.hidden = true;
  } finally {
    backgroundButton.disabled = false;
  }
});

endButton.addEventListener('click', async () => {
  if (!activeCapability) return;
  endButton.disabled = true;
  const idempotencyKey = safeSessionRead(endKey) ?? `browser-end-${crypto.randomUUID()}`;
  safeSessionWrite(endKey, idempotencyKey);
  try {
    const response = await fetch(`/api/v1/rooms/${encodeURIComponent(roomId)}/end`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey,
        explicitIntent: true,
        capability: activeCapability
      })
    });
    const result = await response.json() as { status?: string };
    if (!response.ok || result.status !== 'ended') throw new Error('room_end_failed');
    safeSessionDelete(capabilityKey);
    activeCapability = null;
    stage.hidden = true;
    gate.hidden = false;
    form.hidden = true;
    setStatus('Room ended. Both participants have been disconnected.');
    document.title = 'ROOM ENDED / CREATE SOMETHING';
  } catch {
    endButton.disabled = false;
  }
});

function setStatus(message: string, kind: 'info' | 'error' = 'info'): void {
  statusElement.textContent = message;
  statusElement.classList.toggle('error', kind === 'error');
}

async function runMediaControl(
  button: HTMLButtonElement,
  toggle: () => Promise<boolean> | undefined,
  label: (enabled: boolean) => string
): Promise<void> {
  const operation = toggle();
  if (!operation) return;
  button.disabled = true;
  try {
    const enabled = await operation;
    button.textContent = label(enabled);
    button.setAttribute('aria-pressed', String(enabled));
  } finally {
    button.disabled = false;
  }
}

function safeSessionRead(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionWrite(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // A capability can remain memory-only when storage is unavailable.
  }
}

function safeSessionDelete(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Nothing durable must be cleared when storage is unavailable.
  }
}

function safeHost(value: string): string | null {
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, milliseconds: number, reason: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) => {
      window.setTimeout(() => reject(new Error(reason)), milliseconds);
    })
  ]);
}
