import type { ConciergeThread } from '$chat/thread-store';
import type { ConciergeWidget } from './types';

export function selectWidgets(thread: ConciergeThread): ConciergeWidget[] {
	return [...thread.widgets].sort((left, right) => left.priority - right.priority);
}

export function splitWidgetsByPlacement(thread: ConciergeThread) {
	const widgets = selectWidgets(thread);

	return {
		inline: widgets.filter((widget) => widget.placement === 'inline'),
		rail: widgets.filter((widget) => widget.placement === 'rail')
	};
}
