/**
 * User Analytics API - IO
 *
 * Uses shared handler from @create-something/components/analytics
 */

import { createUserAnalyticsHandler } from '@create-something/components/analytics';

export const GET = createUserAnalyticsHandler({ property: 'io' });
