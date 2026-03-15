/**
 * Video Player Store
 *
 * Manages persistent video playback state across navigation.
 * Enables mini-player mode for continuous viewing while browsing.
 */
import { writable } from 'svelte/store';

export interface Video {
	id: string;
	title: string;
	description: string;
	duration: string;
	thumbnail: string;
	category: string;
	src: string;
}

export type PlayerMode = 'hidden' | 'modal' | 'fullscreen' | 'mini';

interface VideoPlayerState {
	activeVideo: Video | null;
	mode: PlayerMode;
	isPlaying: boolean;
	currentTime: number;
	duration: number;
	volume: number;
	muted: boolean;
}

const initialState: VideoPlayerState = {
	activeVideo: null,
	mode: 'hidden',
	isPlaying: false,
	currentTime: 0,
	duration: 0,
	volume: 1,
	muted: false
};

function createVideoPlayerStore() {
	const { subscribe, set, update } = writable<VideoPlayerState>(initialState);

	return {
		subscribe,

		play: (video: Video) => {
			update(state => ({
				...state,
				activeVideo: video,
				mode: 'modal',
				isPlaying: true,
				currentTime: 0
			}));
		},

		pause: () => {
			update(state => ({ ...state, isPlaying: false }));
		},

		resume: () => {
			update(state => ({ ...state, isPlaying: true }));
		},

		togglePlay: () => {
			update(state => ({ ...state, isPlaying: !state.isPlaying }));
		},

		minimize: () => {
			update(state => ({ ...state, mode: 'mini' }));
		},

		maximize: () => {
			update(state => ({ ...state, mode: 'modal' }));
		},

		enterFullscreen: () => {
			update(state => ({ ...state, mode: 'fullscreen' }));
		},

		exitFullscreen: () => {
			update(state => ({ ...state, mode: 'modal' }));
		},

		setMode: (mode: PlayerMode) => {
			update(state => ({ ...state, mode }));
		},

		close: () => {
			set(initialState);
		},

		updateTime: (currentTime: number) => {
			update(state => ({ ...state, currentTime }));
		},

		setDuration: (duration: number) => {
			update(state => ({ ...state, duration }));
		},

		toggleMute: () => {
			update(state => ({ ...state, muted: !state.muted }));
		},

		setVolume: (volume: number) => {
			update(state => ({ ...state, volume, muted: volume === 0 }));
		}
	};
}

export const videoPlayer = createVideoPlayerStore();
