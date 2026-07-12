export type ControllableMedia = {
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenShareEnabled: boolean;
  enableAudio(): Promise<void>;
  disableAudio(): Promise<void>;
  enableVideo(): Promise<void>;
  disableVideo(): Promise<void>;
  enableScreenShare(): Promise<void>;
  disableScreenShare(): Promise<void>;
};

export function createMediaControls(self: ControllableMedia) {
  return {
    async toggleAudio(): Promise<boolean> {
      const enabled = !self.audioEnabled;
      await (enabled ? self.enableAudio() : self.disableAudio());
      return enabled;
    },
    async toggleVideo(): Promise<boolean> {
      const enabled = !self.videoEnabled;
      await (enabled ? self.enableVideo() : self.disableVideo());
      return enabled;
    },
    async toggleScreenShare(): Promise<boolean> {
      const enabled = !self.screenShareEnabled;
      await (enabled ? self.enableScreenShare() : self.disableScreenShare());
      return enabled;
    }
  };
}
