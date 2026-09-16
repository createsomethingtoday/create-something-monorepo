import { proxyTemplateReviewRequest } from '../../../proxy';

export const dynamic = 'force-dynamic';

export const GET = (request: Request) => proxyTemplateReviewRequest(request);
export const OPTIONS = (request: Request) => proxyTemplateReviewRequest(request);
