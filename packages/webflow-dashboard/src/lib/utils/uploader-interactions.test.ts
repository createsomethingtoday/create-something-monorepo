import { describe, expect, it } from 'vitest';
import {
	canAcceptCarouselFiles,
	countReservedCarouselSlots,
	getRemainingCarouselSlots,
	hasUploadWork,
	isSingleUploadInteractive,
	type UploadQueueLike
} from './uploader-interactions';

describe('uploader interaction guards', () => {
	it('keeps single-image dropzones logically inactive while an upload is running', () => {
		expect(isSingleUploadInteractive({ disabled: false, isUploading: false })).toBe(true);
		expect(isSingleUploadInteractive({ disabled: false, isUploading: true })).toBe(false);
		expect(isSingleUploadInteractive({ disabled: true, isUploading: false })).toBe(false);
	});

	it('treats pending and uploading carousel items as active work', () => {
		expect(hasUploadWork([{ status: 'error' }, { status: 'complete' }])).toBe(false);
		expect(hasUploadWork([{ status: 'pending' }])).toBe(true);
		expect(hasUploadWork([{ status: 'uploading' }])).toBe(true);
	});

	it('reserves carousel capacity for queued and completed items until they settle', () => {
		const queue: UploadQueueLike[] = [
			{ status: 'pending' },
			{ status: 'uploading' },
			{ status: 'complete' },
			{ status: 'error' }
		];

		expect(countReservedCarouselSlots(queue)).toBe(3);
		expect(getRemainingCarouselSlots({ uploadedCount: 4, maxImages: 8, queue })).toBe(1);
	});

	it('allows additional carousel files during active uploads when capacity remains', () => {
		const queue: UploadQueueLike[] = [{ status: 'uploading' }];

		expect(canAcceptCarouselFiles({ disabled: false, uploadedCount: 3, maxImages: 8, queue })).toBe(
			true
		);
		expect(canAcceptCarouselFiles({ disabled: false, uploadedCount: 7, maxImages: 8, queue })).toBe(
			false
		);
		expect(canAcceptCarouselFiles({ disabled: true, uploadedCount: 3, maxImages: 8, queue })).toBe(
			false
		);
	});
});
