import { json } from '@sveltejs/kit';
import { supportBriefSchema } from '$lib/support-brief/contract';

/** Public read-only discovery. No intake, persistence, authentication or execution. */
export function GET() {
  return json({
    version: '1.0.0',
    capability: 'prepare_support_brief',
    status: 'preview',
    interface: '/support-brief',
    transport: 'browser_form_or_local_artifact',
    submissionSupported: false,
    persistence: 'none_in_this_feature',
    authority: 'context_only',
    schema: supportBriefSchema
  }, { headers: { 'Cache-Control': 'no-store' } });
}
