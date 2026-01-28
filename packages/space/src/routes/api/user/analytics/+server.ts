/**
 * User Analytics API - Space
 *
 * Uses shared handler from @create-something/canon/analytics
 */

import { createUserAnalyticsHandler } from '@create-something/canon/analytics';

export const GET = createUserAnalyticsHandler({ property: 'space' });
