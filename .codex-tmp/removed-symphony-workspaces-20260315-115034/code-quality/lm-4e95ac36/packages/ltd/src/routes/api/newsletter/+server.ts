/**
 * Newsletter API - LTD
 *
 * Uses shared handler from @create-something/canon/newsletter
 */

import { createNewsletterHandler } from '@create-something/canon/newsletter';

export const POST = createNewsletterHandler({ property: 'ltd' });
