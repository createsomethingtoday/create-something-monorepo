import { jsonNoStore } from '../../../../lib/server/responses';
import { getServerAirtable } from '../../../../lib/server/airtable';
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
    const uniqueness = await airtable.checkAssetNameUniqueness(name);

    return jsonNoStore({
      valid: syntax.valid && uniqueness.unique,
      available: uniqueness.unique,
      errors: uniqueness.unique ? syntax.errors : [...syntax.errors, 'Template name is already in use.'],
      matchedForbiddenTokens: syntax.matchedForbiddenTokens
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
