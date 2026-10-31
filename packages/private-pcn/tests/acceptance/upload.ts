// Test transport only: never contacts Stream. Production TUS is not replaced.
export class Upload {
  constructor(
    _file: File,
    private options: any
  ) {}
  async start() {
    try {
      this.options.onProgress(50, 100);
      const response = await fetch('/__fixture/transfer', { method: 'POST' });
      if (!response.ok)
        throw new Error(
          'Synthetic transfer interrupted. Return to the workspace to check the reserved upload.'
        );
      this.options.onProgress(100, 100);
      this.options.onSuccess();
    } catch (error) {
      this.options.onError(error);
    }
  }
}
