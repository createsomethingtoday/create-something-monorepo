/**
 * Unified Analytics Events Endpoint
 * 
 * Uses shared handler from @create-something/components/analytics
 */

import { createAnalyticsEventsHandler } from '@create-something/components/analytics';

export const { POST, GET } = createAnalyticsEventsHandler();
