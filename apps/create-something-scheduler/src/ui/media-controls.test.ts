import { describe, expect, it, vi } from 'vitest';
import { createMediaControls } from './media-controls.js';

describe('owned media controls', () => {
  it('toggles microphone, camera, and screen share through the meeting self interface', async () => {
    const self = {
      audioEnabled: true,
      videoEnabled: true,
      screenShareEnabled: false,
      enableAudio: vi.fn(async () => { self.audioEnabled = true; }),
      disableAudio: vi.fn(async () => { self.audioEnabled = false; }),
      enableVideo: vi.fn(async () => { self.videoEnabled = true; }),
      disableVideo: vi.fn(async () => { self.videoEnabled = false; }),
      enableScreenShare: vi.fn(async () => { self.screenShareEnabled = true; }),
      disableScreenShare: vi.fn(async () => { self.screenShareEnabled = false; })
    };
    const controls = createMediaControls(self);

    await expect(controls.toggleAudio()).resolves.toBe(false);
    await expect(controls.toggleVideo()).resolves.toBe(false);
    await expect(controls.toggleScreenShare()).resolves.toBe(true);
    await expect(controls.toggleScreenShare()).resolves.toBe(false);
    expect(self.disableAudio).toHaveBeenCalledOnce();
    expect(self.disableVideo).toHaveBeenCalledOnce();
    expect(self.enableScreenShare).toHaveBeenCalledOnce();
    expect(self.disableScreenShare).toHaveBeenCalledOnce();
  });
});
