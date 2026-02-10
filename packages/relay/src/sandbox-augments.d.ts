/**
 * Type augmentations for @cloudflare/sandbox
 *
 * These methods exist at runtime but are not yet in the published type definitions.
 * Remove this file when @cloudflare/sandbox types are updated to include them.
 */

import '@cloudflare/sandbox';

declare module '@cloudflare/sandbox' {
	interface Process {
		waitForPort(
			port: number,
			options?: { mode?: 'tcp' | 'http'; timeout?: number }
		): Promise<void>;
	}

	interface Sandbox {
		mountBucket(
			bucketName: string,
			mountPath: string,
			options?: {
				endpoint?: string;
				credentials?: {
					accessKeyId: string;
					secretAccessKey: string;
				};
			}
		): Promise<void>;
	}
}
