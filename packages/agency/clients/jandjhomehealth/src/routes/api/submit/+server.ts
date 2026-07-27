import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { parseContactSubmission } from '$lib/server/contact-submission';
import { getDb, nowIso } from '$lib/server/db';

export const POST: RequestHandler = async ({ request, platform }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  const payload = parseContactSubmission(body);
  if (!payload) {
    return json(
      { success: false, error: 'Name and phone are required. Please check your email address.' },
      { status: 400 }
    );
  }

  try {
    const db = getDb(platform);
    const result = await db
      .prepare(
        `INSERT INTO contacts (name, email, dob, phone, insurance_group, created_at)
				 VALUES (?, ?, '', ?, NULL, ?)`
      )
      .bind(payload.name, payload.email, payload.phone, nowIso())
      .run();

    return json({ success: true, data: { id: result.meta.last_row_id } });
  } catch (error) {
    console.error('Contact submission failed:', error);
    return json({ success: false, error: 'Submission failed.' }, { status: 500 });
  }
};
