import { browser } from '$app/environment';

export interface AttachedMediaSource {
	destroy: () => void;
}

export interface AttachVideoSourceOptions {
	onError?: (message: string) => void;
}

export function isHlsSource(src: string): boolean {
	return src.includes('.m3u8');
}

function canPlayHlsNatively(video: HTMLVideoElement): boolean {
	return video.canPlayType('application/vnd.apple.mpegurl') !== '';
}

/**
 * Attach a source to a <video> element, using hls.js when needed.
 *
 * Cloudflare Stream returns HLS (.m3u8). Most browsers require hls.js to play it.
 */
export async function attachVideoSource(
	video: HTMLVideoElement,
	src: string,
	options?: AttachVideoSourceOptions
): Promise<AttachedMediaSource> {
	if (!browser) {
		return { destroy: () => {} };
	}

	if (!isHlsSource(src) || canPlayHlsNatively(video)) {
		video.src = src;
		return { destroy: () => {} };
	}

	const mod = await import('hls.js');
	const Hls = mod.default;

	if (!Hls.isSupported()) {
		// Last resort: try native anyway.
		video.src = src;
		options?.onError?.('HLS playback is not supported in this browser.');
		return { destroy: () => {} };
	}

	const hls = new Hls();
	let destroyed = false;

	hls.on(Hls.Events.ERROR, (_event, data) => {
		if (!data?.fatal) return;

		if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
			hls.startLoad();
			return;
		}

		if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
			hls.recoverMediaError();
			return;
		}

		if (!destroyed) {
			options?.onError?.(
				typeof data.details === 'string'
					? `Playback failed (${data.details}).`
					: 'Playback failed while loading stream.'
			);
		}
	});

	hls.loadSource(src);
	hls.attachMedia(video);

	return {
		destroy: () => {
			destroyed = true;
			hls.destroy();
		}
	};
}
