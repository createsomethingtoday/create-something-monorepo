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
    OPENAI_API_KEY?: string;
    AIRTABLE_API_KEY?: string;
    IGNORE_SIGNATURE?: string;
    // Dify agent (drafting brain — Option B)
    DIFY_API_BASE?: string;
    DIFY_AGENT_API_KEY?: string;
    DIFY_AGENT_USER?: string;
  }
}
