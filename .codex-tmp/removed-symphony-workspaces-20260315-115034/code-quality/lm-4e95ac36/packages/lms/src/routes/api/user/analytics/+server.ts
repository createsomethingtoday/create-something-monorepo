/**
 * User Analytics API - LMS
 *
 * Uses shared handler from @create-something/canon/analytics
 */

import { createUserAnalyticsHandler } from '@create-something/canon/analytics';

export const GET = createUserAnalyticsHandler({ property: 'lms' });
