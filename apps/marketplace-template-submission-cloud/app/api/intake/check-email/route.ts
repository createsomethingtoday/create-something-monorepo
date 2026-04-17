import { validateEmail } from '@create-something/webflow-dashboard-core/airtable';
import { jsonNoStore } from '../../../../lib/server/responses';
import { getServerAirtable } from '../../../../lib/server/airtable';
import { checkRemoteCreatorEmailAvailability } from '../../../../lib/intake/external';

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = validateEmail(body.email || '');
    const airtable = await getServerAirtable();
    const localCreator = await airtable.getCreatorByEmail(email);

    let remoteEmailExists = false;
    let remoteMessage = 'Email is available.';

    try {
      const remote = await checkRemoteCreatorEmailAvailability(email);
      remoteEmailExists = remote.emailExists;
      remoteMessage = remote.message;
    } catch (error) {
      remoteMessage =
        error instanceof Error ? error.message : 'Remote email verification service unavailable.';
    }

    const emailExists = Boolean(localCreator) || remoteEmailExists;

    return jsonNoStore({
      available: !emailExists,
      emailExists,
      message: emailExists ? 'This email is already attached to a creator profile.' : remoteMessage,
      source: localCreator ? 'combined' : 'remote'
    });
  } catch (error) {
    return jsonNoStore(
      {
        available: false,
        emailExists: false,
        message: error instanceof Error ? error.message : 'Invalid request.'
      },
      { status: 400 }
    );
  }
}
