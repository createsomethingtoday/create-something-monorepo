export async function trackEvent(name, properties = {}) {
  try {
    const { track } = await import('@vercel/analytics/server');
    await track(name, properties);
  } catch {
    // Tracking should never fail the request path.
  }
}
