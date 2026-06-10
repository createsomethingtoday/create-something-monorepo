import { validateEmail } from '../../../../vendor/core/airtable';
import { jsonNoStore } from '../../../../lib/server/responses';
import { getServerAirtable } from '../../../../lib/server/airtable';
import { checkRemoteCreatorEmailAvailability } from '../../../../lib/intake/external';

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = validateEmail(body.email || '');
    const airtable = await getServerAirtable();
    const [localCreator, remote] = await Promise.all([
      airtable.getCreatorByEmail(email),
      checkRemoteCreatorEmailAvailability(email).then(
        (value) => ({ ok: true as const, value }),
        (error) => ({ ok: false as const, error })
      )
    ]);

    let remoteEmailExists = false;
    let remoteMessage = 'Email is available.';

    if (remote.ok) {
      remoteEmailExists = remote.value.emailExists;
      remoteMessage = remote.value.message;
    } else {
      remoteMessage =
        remote.error instanceof Error
          ? remote.error.message
          : 'Remote email verification service unavailable.';
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
