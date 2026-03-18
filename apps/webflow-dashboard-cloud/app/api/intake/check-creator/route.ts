import { validateEmail } from '@create-something/webflow-dashboard-core';
import { jsonNoStore } from '../../../../lib/server/responses';
import { evaluateCreatorEligibility } from '../../../../lib/intake/creator-eligibility';

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = validateEmail(body.email || '');
    const result = await evaluateCreatorEligibility(email);
    return jsonNoStore(result);
  } catch (error) {
    return jsonNoStore(
      {
        allowed: false,
        userExists: false,
        hasError: true,
        message: error instanceof Error ? error.message : 'Invalid request.'
      },
      { status: 400 }
    );
  }
}
