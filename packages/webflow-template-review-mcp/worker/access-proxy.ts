import { handleAccessProxyRequest } from '../src/access-proxy.js';

interface Env {
  TEMPLATE_REVIEW_UPSTREAM_ORIGIN: string;
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleAccessProxyRequest(request, {
      upstreamOrigin: env.TEMPLATE_REVIEW_UPSTREAM_ORIGIN,
    });
  },
};
