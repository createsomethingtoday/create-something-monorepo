export type UploadQueueStatus = 'pending' | 'uploading' | 'complete' | 'error';

export interface UploadQueueLike {
	status: UploadQueueStatus;
}

export function isSingleUploadInteractive(options: {
	disabled: boolean;
	isUploading: boolean;
}): boolean {
	return !options.disabled && !options.isUploading;
}

export function hasUploadWork(items: UploadQueueLike[]): boolean {
	return items.some((item) => item.status === 'pending' || item.status === 'uploading');
}

export function countReservedCarouselSlots(items: UploadQueueLike[]): number {
	return items.filter((item) => item.status !== 'error').length;
}

export function getRemainingCarouselSlots(options: {
	uploadedCount: number;
	maxImages: number;
	queue: UploadQueueLike[];
}): number {
	return Math.max(0, options.maxImages - options.uploadedCount - countReservedCarouselSlots(options.queue));
}

export function canAcceptCarouselFiles(options: {
	disabled: boolean;
	uploadedCount: number;
	maxImages: number;
	queue: UploadQueueLike[];
}): boolean {
	return (
		!options.disabled &&
		getRemainingCarouselSlots({
			uploadedCount: options.uploadedCount,
			maxImages: options.maxImages,
			queue: options.queue
		}) > 0
	);
}
