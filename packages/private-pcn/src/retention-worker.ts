import type { D1Database } from '@cloudflare/workers-types';

// No HTTP entrypoint: retention runs even without application traffic.
export default {
  async scheduled(_event: unknown, env: { DB: D1Database }) {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM impact_daily WHERE day<date('now','-90 days')"),
      env.DB.prepare("DELETE FROM customer_impact_daily WHERE day<date('now','-90 days')"),
      env.DB.prepare("DELETE FROM network_impact_daily WHERE day<date('now','-90 days')")
    ]);
  }
};
