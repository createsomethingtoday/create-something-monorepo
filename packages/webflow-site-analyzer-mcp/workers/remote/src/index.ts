import { DurableObject } from 'cloudflare:workers';

import { retiredContainerResponse, retiredResponse } from './retired-response.js';

/**
 * Compatibility export for Durable Object callbacks left by the retired
 * container deployment. The active Worker configuration no longer binds it.
 */
export class AnalyzerContainer extends DurableObject {
  fetch(request: Request): Response {
    return retiredContainerResponse(request);
  }

  expireTemplateReviewJob(): null {
    return null;
  }
}

export default {
  fetch(request: Request): Response {
    return retiredResponse(request);
  }
};
