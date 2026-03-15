import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
	id: string;
	type: ToastType;
	message: string;
	duration?: number;
}

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);

	function add(type: ToastType, message: string, duration = 5000) {
		const id = crypto.randomUUID();
		const toast: Toast = { id, type, message, duration };

		update((toasts) => [...toasts, toast]);

		if (duration > 0) {
			setTimeout(() => {
				remove(id);
			}, duration);
		}

		return id;
	}

	function remove(id: string) {
		update((toasts) => toasts.filter((t) => t.id !== id));
	}

	function clear() {
		update(() => []);
	}

	return {
		subscribe,
		success: (message: string, duration?: number) => add('success', message, duration),
		error: (message: string, duration?: number) => add('error', message, duration),
		warning: (message: string, duration?: number) => add('warning', message, duration),
		info: (message: string, duration?: number) => add('info', message, duration),
		remove,
		clear
	};
}

export const toast = createToastStore();
