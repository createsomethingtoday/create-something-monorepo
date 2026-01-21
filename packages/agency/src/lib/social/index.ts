/**
 * Social Posting Library
 *
 * Zuhandenheit: The tool recedes into use.
 * Schedule content once, forget about it.
 */

// LinkedIn
export { LinkedInClient, createLinkedInClient, getTokenStatus } from './linkedin-client';
export type { PostResult, LinkedInUserInfo, StoredToken } from './linkedin-client';

// Formats (LinkedIn content research)
export {
	FORMATS,
	HOOK_TEMPLATES,
	WEEKLY_PILLARS,
	getFormatForGoal,
	getTodaysPillar,
	getFormat,
	getHooksForFormat,
	getFormatsByEngagement,
	isFormatSuitableFor
} from './formats';
export type { FormatType, FormatSpec, HookTemplate, ContentPillar } from './formats';

// Twitter/X
export {
	TwitterClient,
	createTwitterClient,
	getTwitterTokenStatus
} from './twitter-client';
export type {
	TweetResult,
	ThreadResult,
	TwitterUserInfo,
	StoredTwitterToken
} from './twitter-client';

// Parsing
export { parseThread, formatPostForLinkedIn, consolidateToLongForm, getCharacterCount } from './linkedin-parser';
export type { ParsedPost, ParsedThread, ThreadMetadata } from './linkedin-parser';

// Strategy
export {
	getNextOptimalTime,
	generateSchedule,
	generatePostId,
	generateThreadId,
	formatSchedulePreview,
	checkScheduleConflicts,
	suggestConflictFreeStartDate,
	DEFAULT_PREFERRED_DAYS,
	OPTIMAL_DAYS,
	DEFAULT_PREFERRED_HOUR
} from './strategy';
export type {
	PostingMode,
	DayOfWeek,
	ScheduledPost,
	ScheduleOptions,
	ScheduleConflict,
	ConflictCheckResult
} from './strategy';
