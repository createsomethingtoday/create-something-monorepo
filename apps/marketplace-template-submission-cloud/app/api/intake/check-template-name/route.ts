import { jsonNoStore } from '../../../../lib/server/responses';
import { checkTemplateNameAvailability } from '../../../../lib/server/template-name-availability';
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
  if (!syntax.valid) {
    return jsonNoStore({
      valid: false,
      available: false,
      errors: syntax.errors,
      matchedForbiddenTokens: syntax.matchedForbiddenTokens
    });
  }

  try {
    const availability = await checkTemplateNameAvailability(name);
    const available = availability.available;
    const errors = available
      ? syntax.errors
      : [...syntax.errors, 'Template name is already in use.'];

    return jsonNoStore({
      valid: syntax.valid && available,
      available,
      errors,
      matchedForbiddenTokens: syntax.matchedForbiddenTokens,
      source: availability.source,
      warning: availability.warning
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' &&
            error &&
            'message' in error &&
            typeof (error as { message?: unknown }).message === 'string'
          ? (error as { message: string }).message
          : 'Template name availability is temporarily unavailable. Please try again.';

    return jsonNoStore(
      {
        valid: syntax.valid,
        available: false,
        errors: [...syntax.errors, message],
        matchedForbiddenTokens: syntax.matchedForbiddenTokens
      },
      { status: 503 }
    );
  }
}
