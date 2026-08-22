export function classifyRequestFailure(failure, targetOrigin) {
  let requestUrl;
  try {
    requestUrl = new URL(failure.url);
  } catch {
    return 'required';
  }

  return requestUrl.origin === targetOrigin &&
    requestUrl.pathname === '/cdn-cgi/rum' &&
    failure.error === 'net::ERR_ABORTED'
    ? 'cloudflare-rum-aborted'
    : 'required';
}
