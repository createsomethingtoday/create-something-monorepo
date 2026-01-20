/**
 * Newsletter API - Agency
 *
 * Uses shared handler from @create-something/components/newsletter
 */

import { createNewsletterHandler } from '@create-something/components/newsletter';

export const POST = createNewsletterHandler({ property: 'agency' });
