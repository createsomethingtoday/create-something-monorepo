export type VideoMiddleware = object;

export type BackgroundBlurMeeting = {
  self: {
    setVideoMiddlewareGlobalConfig(input: {
      disablePerFrameCanvasRendering: boolean;
    }): Promise<void>;
    addVideoMiddleware(middleware: VideoMiddleware): Promise<unknown>;
    removeVideoMiddleware(middleware: VideoMiddleware): Promise<unknown>;
  };
};

export type BackgroundBlurFactory = {
  isSupported(): boolean;
  init(input: { meeting: never }): Promise<{
    createBackgroundBlurVideoMiddleware(blurLength?: number): Promise<VideoMiddleware>;
  }>;
};

export function createBackgroundBlurController(input: {
  meeting: BackgroundBlurMeeting;
  factory: BackgroundBlurFactory;
}) {
  let transformer: Awaited<ReturnType<BackgroundBlurFactory['init']>> | null = null;
  let middleware: VideoMiddleware | null = null;

  return {
    isSupported: input.factory.isSupported(),
    async toggle(): Promise<boolean> {
      if (middleware) {
        await input.meeting.self.removeVideoMiddleware(middleware);
        middleware = null;
        return false;
      }

      await input.meeting.self.setVideoMiddlewareGlobalConfig({
        disablePerFrameCanvasRendering: true
      });
      transformer ??= await input.factory.init({ meeting: input.meeting as never });
      const nextMiddleware = await transformer.createBackgroundBlurVideoMiddleware(35);
      await input.meeting.self.addVideoMiddleware(nextMiddleware);
      middleware = nextMiddleware;
      return true;
    }
  };
}
