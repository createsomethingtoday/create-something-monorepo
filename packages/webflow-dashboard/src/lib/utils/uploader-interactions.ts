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

/**
 * An upload still occupies a slot only while it is queued or in flight.
 *
 * `complete` items do NOT count: the uploaded URL is appended to `value` in the
 * same tick the status flips, so the item and its URL would be double-counted
 * during the ~1s window before the completed entry is purged from the queue.
 * `error` items never reserved a slot to begin with.
 */
export function isUploadInFlight(item: UploadQueueLike): boolean {
	return item.status === 'pending' || item.status === 'uploading';
}

export function hasUploadWork(items: UploadQueueLike[]): boolean {
	return items.some(isUploadInFlight);
}

export function countReservedCarouselSlots(items: UploadQueueLike[]): number {
	return items.filter(isUploadInFlight).length;
}

/**
 * Assign a thumbnail URL at `index` without leaving array holes.
 *
 * Writing past the end of a copied array produces a SPARSE array. `Array.some`
 * skips holes, so the server's `assertOptionalStringArray` guard passes, but
 * `JSON.stringify` serializes each hole as `null` and the request is rejected
 * with a 400. Compacting matches the delete branch's `filter` semantics and
 * never sends blank strings to the API.
 */
export function setThumbnailUrlAtIndex(urls: string[], index: number, url: string): string[] {
	const nextUrls = [...urls];
	nextUrls[index] = url;
	return nextUrls.filter((entry) => typeof entry === 'string' && entry.length > 0);
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
