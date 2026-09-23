import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { boundedText } from '$lib/server/body';
import { isSameOrigin, normalizeEmail } from '$lib/server/policy';
import { emptyIntake, intakeConsent, intakePaths, type IntakeValues } from '$lib/intake';

export const actions = {
  default: async ({ request, platform, setHeaders }) => {
    setHeaders({ 'Cache-Control': 'private, no-store' });
    const reject = (status: number, error: string, values: IntakeValues = { ...emptyIntake }) =>
      fail(status, { success: false, error, values });
    if (!isSameOrigin(request)) return reject(403, 'Please send your introduction from this page.');
    let fields: FormData;
    try {
      const type = request.headers.get('content-type') || '';
      if (
        !type.startsWith('application/x-www-form-urlencoded') &&
        !type.startsWith('multipart/form-data')
      )
        return reject(415, 'Please use the introduction form.');
      const body = await boundedText(request, 16384);
      fields = await new Request(request.url, {
        method: 'POST',
        headers: { 'content-type': type },
        body
      }).formData();
    } catch {
      return reject(400, 'That introduction could not be read. Keep it short and try again.');
    }
    const values = { ...emptyIntake };
    for (const key of Object.keys(values) as (keyof IntakeValues)[]) {
      const value = fields.get(key);
      if (value !== null && typeof value !== 'string')
        return reject(400, 'Please use text and links, not uploads.');
      values[key] = (value || '').trim();
    }
    const env = platform?.env;
    if (!env?.DB || !env.PCN_INTAKE_RATE_LIMIT)
      return reject(
        503,
        'Introductions are temporarily unavailable. Please try again shortly.',
        values
      );
    try {
      const limit = await env.PCN_INTAKE_RATE_LIMIT.limit({
        key: `intake:${request.headers.get('CF-Connecting-IP') || 'unknown'}`
      });
      if (!limit.success) {
        setHeaders({ 'Retry-After': '60' });
        return reject(
          429,
          'A few too many introductions at once. Wait a minute, then try again.',
          values
        );
      }
    } catch {
      return reject(
        503,
        'Introductions are temporarily unavailable. Please try again shortly.',
        values
      );
    }
    // No record or email for automated honeypot submissions.
    if (fields.get('website')) return { success: true, error: '', values: { ...emptyIntake } };
    const email = normalizeEmail(values.email);
    if (!intakePaths.some((path) => path.value === values.intent))
      return reject(400, 'Choose what brings you here.', values);
    if (!values.display_name || values.display_name.length > 80 || !email)
      return reject(400, 'Add your name and a valid email address.', values);
    if (values.practice.length < 20 || values.practice.length > 2000)
      return reject(400, 'Tell us a little more about your practice: 20–2,000 characters.', values);
    if (values.referral.length > 160)
      return reject(400, 'Keep the introduction note under 160 characters.', values);
    if (values.work_url) {
      try {
        const url = new URL(values.work_url);
        if (
          url.protocol !== 'https:' ||
          url.username ||
          url.password ||
          values.work_url.length > 2000
        )
          throw new Error();
      } catch {
        return reject(
          400,
          'Use an HTTPS work link without a username or password, or leave it blank.',
          values
        );
      }
    }
    if (values.consent !== 'yes')
      return reject(400, 'Confirm we can review and reply to your introduction.', values);
    try {
      // Do not overwrite an earlier introduction, expose its existence, or grant any access.
      await env.DB.prepare(
        `INSERT INTO invitation_requests(id,email,display_name,intent,practice,work_url,referral,consent_version)
        VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(email,intent) DO NOTHING`
      )
        .bind(
          crypto.randomUUID(),
          email,
          values.display_name,
          values.intent,
          values.practice,
          values.work_url,
          values.referral,
          intakeConsent
        )
        .run();
    } catch {
      return reject(
        503,
        'We could not confirm your introduction was saved. Your answers are still here; please try again.',
        values
      );
    }
    return { success: true, error: '', values: { ...emptyIntake } };
  }
} satisfies Actions;
