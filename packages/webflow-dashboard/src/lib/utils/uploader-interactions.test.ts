import { describe, expect, it } from 'vitest';
import {
	canAcceptCarouselFiles,
	countReservedCarouselSlots,
	getRemainingCarouselSlots,
	hasUploadWork,
	isSingleUploadInteractive,
	setThumbnailUrlAtIndex,
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

	it('reserves carousel capacity only for uploads still in flight', () => {
		const queue: UploadQueueLike[] = [
			{ status: 'pending' },
			{ status: 'uploading' },
			{ status: 'complete' },
			{ status: 'error' }
		];

		// A completed upload has already been appended to `value`, so counting it
		// here would reserve the same slot twice. Errors never reserved one.
		expect(countReservedCarouselSlots(queue)).toBe(2);
		expect(getRemainingCarouselSlots({ uploadedCount: 4, maxImages: 8, queue })).toBe(2);
	});

	it('does not double-count a completed upload that is already in value', () => {
		// uploadSingleImage sets status = 'complete' and calls onchange([...value, url])
		// back-to-back, and the completed item lingers in the queue for ~1s before the
		// setTimeout purge. During that window value.length already includes the URL.
		const queue: UploadQueueLike[] = [{ status: 'complete' }];

		expect(getRemainingCarouselSlots({ uploadedCount: 7, maxImages: 8, queue })).toBe(1);
		expect(canAcceptCarouselFiles({ disabled: false, uploadedCount: 7, maxImages: 8, queue })).toBe(
			true
		);
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

describe('setThumbnailUrlAtIndex', () => {
	it('survives a JSON round trip when writing past the end of a shorter array', () => {
		// The real server constraint: a sparse array passes the runtime `some`-based
		// string guard (holes are skipped) but JSON.stringify turns each hole into
		// null, which the API rejects with a 400.
		const result = setThumbnailUrlAtIndex([], 2, 'https://cdn.example.com/c.webp');

		const roundTripped: unknown = JSON.parse(JSON.stringify(result));
		expect(roundTripped).toEqual(['https://cdn.example.com/c.webp']);
		expect((roundTripped as unknown[]).every((entry) => typeof entry === 'string')).toBe(true);
	});

	it('replaces the URL in an already-occupied slot', () => {
		const result = setThumbnailUrlAtIndex(
			['https://cdn.example.com/a.webp', 'https://cdn.example.com/b.webp'],
			1,
			'https://cdn.example.com/b2.webp'
		);

		expect(result).toEqual(['https://cdn.example.com/a.webp', 'https://cdn.example.com/b2.webp']);
	});

	it('appends without holes when writing the next contiguous slot', () => {
		const result = setThumbnailUrlAtIndex(['https://cdn.example.com/a.webp'], 1, 'https://cdn.example.com/b.webp');

		expect(result).toEqual(['https://cdn.example.com/a.webp', 'https://cdn.example.com/b.webp']);
	});
});
