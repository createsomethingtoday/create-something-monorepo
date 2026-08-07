import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import {
  CHAT_HOLDOUT_STORAGE_KEY,
  getStoredChatHoldoutArm,
  resolveChatHoldoutArm,
} from '../src/components/chat/templateChatHoldout';

type GlobalWithWindow = typeof globalThis & { window?: Window };

function installWindow(storage: Map<string, string> | null): void {
  const g = globalThis as GlobalWithWindow;
  const localStorage =
    storage === null
      ? undefined
      : {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: (key: string, value: string) => {
            storage.set(key, value);
          },
          removeItem: (key: string) => {
            storage.delete(key);
          },
        };
  g.window = { localStorage } as unknown as Window;
}

function removeWindow(): void {
  delete (globalThis as GlobalWithWindow).window;
}

beforeEach(() => {
  removeWindow();
});

test('SSR resolves visible without assigning', () => {
  assert.equal(resolveChatHoldoutArm(50), 'visible');
  assert.equal(getStoredChatHoldoutArm(), null);
});

test('percent 0 keeps the launcher visible and never persists', () => {
  const storage = new Map<string, string>();
  installWindow(storage);
  assert.equal(resolveChatHoldoutArm(0), 'visible');
  assert.equal(storage.size, 0);
});

test('percent 100 assigns hidden and persists the arm', () => {
  const storage = new Map<string, string>();
  installWindow(storage);
  assert.equal(resolveChatHoldoutArm(100), 'hidden');
  assert.equal(storage.get(CHAT_HOLDOUT_STORAGE_KEY), 'hidden');
});

test('a stored arm is sticky regardless of the current percent', () => {
  const storage = new Map<string, string>([[CHAT_HOLDOUT_STORAGE_KEY, 'hidden']]);
  installWindow(storage);
  assert.equal(resolveChatHoldoutArm(1), 'hidden');
  // Experiment paused: everyone sees the launcher, assignment kept for resume.
  assert.equal(resolveChatHoldoutArm(0), 'visible');
  assert.equal(storage.get(CHAT_HOLDOUT_STORAGE_KEY), 'hidden');
});

test('garbage in storage is ignored, then overwritten by a fresh assignment', () => {
  const storage = new Map<string, string>([[CHAT_HOLDOUT_STORAGE_KEY, 'purple']]);
  installWindow(storage);
  assert.equal(getStoredChatHoldoutArm(), null);
  const arm = resolveChatHoldoutArm(100);
  assert.equal(arm, 'hidden');
  assert.equal(storage.get(CHAT_HOLDOUT_STORAGE_KEY), 'hidden');
});

test('storage failure still yields a usable arm', () => {
  installWindow(null); // window without localStorage (privacy mode)
  const arm = resolveChatHoldoutArm(100);
  assert.equal(arm, 'hidden');
});

test('50 percent assignment is roughly balanced and always persists a valid arm', () => {
  let hidden = 0;
  for (let i = 0; i < 400; i += 1) {
    const storage = new Map<string, string>();
    installWindow(storage);
    const arm = resolveChatHoldoutArm(50);
    assert.ok(arm === 'visible' || arm === 'hidden');
    assert.equal(storage.get(CHAT_HOLDOUT_STORAGE_KEY), arm);
    if (arm === 'hidden') hidden += 1;
  }
  // 400 draws at p=0.5: outside 120–280 would be ~16 sigma — a real bug.
  assert.ok(hidden > 120 && hidden < 280, `hidden arm count ${hidden} is implausible for 50%`);
});
