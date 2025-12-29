/**
 * Social Posting Library
 *
 * Zuhandenheit: The tool recedes into use.
 * Schedule content once, forget about it.
 */

export { LinkedInClient, createLinkedInClient, getTokenStatus } from './linkedin-client';
export type { PostResult, LinkedInUserInfo, StoredToken } from './linkedin-client';

export { parseThread, formatPostForLinkedIn, consolidateToLongForm, getCharacterCount } from './linkedin-parser';
export type { ParsedPost, ParsedThread, ThreadMetadata } from './linkedin-parser';

export {
	getNextOptimalTime,
	generateSchedule,
	generatePostId,
	generateThreadId,
	formatSchedulePreview,
	checkScheduleConflicts,
	suggestConflictFreeStartDate
} from './strategy';
export type {
	PostingMode,
	DayOfWeek,
	ScheduledPost,
	ScheduleOptions,
	ScheduleConflict,
	ConflictCheckResult
} from './strategy';
