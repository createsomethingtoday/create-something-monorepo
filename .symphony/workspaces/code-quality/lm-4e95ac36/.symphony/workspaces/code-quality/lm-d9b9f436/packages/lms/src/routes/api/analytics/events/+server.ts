/**
 * Unified Analytics Events Endpoint
 * 
 * Uses shared handler from @create-something/canon/analytics
 */

import { createAnalyticsEventsHandler } from '@create-something/canon/analytics';

export const { POST, GET } = createAnalyticsEventsHandler();
