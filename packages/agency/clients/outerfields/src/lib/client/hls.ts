import { browser } from '$app/environment';

export interface AttachedMediaSource {
	destroy: () => void;
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
	src: string
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
		return { destroy: () => {} };
	}

	const hls = new Hls();
	hls.loadSource(src);
	hls.attachMedia(video);

	return {
		destroy: () => hls.destroy()
	};
}

