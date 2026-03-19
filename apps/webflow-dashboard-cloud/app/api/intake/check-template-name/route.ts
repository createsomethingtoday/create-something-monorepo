import { jsonNoStore } from '../../../../lib/server/responses';
import { getServerAirtable } from '../../../../lib/server/airtable';
import { checkRemoteTemplateNameAvailability } from '../../../../lib/intake/external';
import { validateTemplateNameSyntax } from '../../../../lib/intake/template-name';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const name = typeof body.name === 'string' ? body.name.trim() : '';

  if (!name) {
    return jsonNoStore(
      {
        valid: false,
        available: false,
        errors: ['Template name is required.'],
        matchedForbiddenTokens: []
      },
      { status: 400 }
    );
  }

  const syntax = validateTemplateNameSyntax(name);

  try {
    const airtable = await getServerAirtable();
    const [uniqueness, remoteAvailability] = await Promise.all([
      airtable.checkAssetNameUniqueness(name),
      checkRemoteTemplateNameAvailability(name)
        .then((result) => ({
          taken: result.taken,
          source: 'remote' as const
        }))
        .catch(() => null)
    ]);

    const takenRemotely = remoteAvailability?.taken === true;
    const available = uniqueness.unique && !takenRemotely;
    const errors = available
      ? syntax.errors
      : [...syntax.errors, 'Template name is already in use.'];

    return jsonNoStore({
      valid: syntax.valid && available,
      available,
      errors,
      matchedForbiddenTokens: syntax.matchedForbiddenTokens,
      source: remoteAvailability ? 'hybrid' : 'local'
    });
  } catch (error) {
    return jsonNoStore(
      {
        valid: syntax.valid,
        available: false,
        errors: [
          ...syntax.errors,
          error instanceof Error ? error.message : 'Failed to verify template name.'
        ],
        matchedForbiddenTokens: syntax.matchedForbiddenTokens
      },
      { status: 500 }
    );
  }
}
