// Augment the wrangler-generated `Cloudflare.Env` with the secrets that
// `wrangler types` does not emit (since they're not declared in vars).
//
// `worker-configuration.d.ts` is regenerated on every deploy. Keep this
// file out-of-band so regen never blows away the secret typings.
//
// This file is a script (no imports/exports) so the namespace augmentation
// merges with the global declaration emitted by wrangler.

declare namespace Cloudflare {
  interface Env {
    BETTERMODE_CLIENT_ID?: string;
    BETTERMODE_CLIENT_SECRET?: string;
    BETTERMODE_SIGNING_SECRET?: string;
    IGNORE_SIGNATURE?: string;
    BETTERMODE_REPLY_POST_TYPE_ID?: string;
    COMMUNITY_SWEEP_ENABLED?: string;
    COMMUNITY_SWEEP_LIMIT?: string;
    // Dify agent (drafting brain — Option B)
    DIFY_API_BASE?: string;
    DIFY_AGENT_API_KEY?: string;
    DIFY_AGENT_USER?: string;
    // Comma-separated email domains whose posts the agent should NOT draft
    // replies for (typically Webflow staff announcements). Defaults to
    // `webflow.com` when unset.
    BETTERMODE_STAFF_AUTHOR_DOMAINS?: string;
  }
}
