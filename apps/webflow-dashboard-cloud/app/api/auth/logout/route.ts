import { deleteSession } from '@create-something/webflow-dashboard-core';
import { NextRequest } from 'next/server';
import { getOptionalEnv } from '../../../../lib/server/env';
import { jsonNoStore } from '../../../../lib/server/responses';
import { clearSessionCookie } from '../../../../lib/server/session';

export async function POST(request: NextRequest) {
  const env = await getOptionalEnv();
  const sessionToken = request.cookies.get('session_token')?.value;

  if (sessionToken && env?.SESSIONS) {
    try {
      await deleteSession(env.SESSIONS, sessionToken);
    } catch (error) {
      console.error('[Auth Logout] Failed to delete session:', error);
    }
  }

  const response = jsonNoStore({ message: 'Logged out successfully' });
  clearSessionCookie(response);
  return response;
}
