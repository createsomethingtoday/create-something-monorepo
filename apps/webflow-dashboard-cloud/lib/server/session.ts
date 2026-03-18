import {
  generateSessionToken,
  getSession
} from '@create-something/webflow-dashboard-core/kv';
import type { DashboardCloudflareEnv } from '@create-something/webflow-dashboard-core/runtime';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse, type NextRequest } from 'next/server';
import { withBasePath } from '../runtime-paths';
import { getOptionalEnv } from './env';

export interface AuthenticatedUser {
  email: string;
}

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 2;

function buildCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
    sameSite: 'none' as const
  };
}

function getSessionTokenFromRequest(request: Request | NextRequest): string | undefined {
  if ('cookies' in request && typeof request.cookies.get === 'function') {
    return request.cookies.get('session_token')?.value;
  }

  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return undefined;

  const match = cookieHeader
    .split(';')
    .map((part: string) => part.trim())
    .find((part: string) => part.startsWith('session_token='));

  return match ? decodeURIComponent(match.slice('session_token='.length)) : undefined;
}

async function getUserByToken(
  sessionToken: string | undefined,
  env: DashboardCloudflareEnv | null
): Promise<AuthenticatedUser | null> {
  if (!sessionToken || !env?.SESSIONS) {
    return null;
  }

  const session = await getSession(env.SESSIONS, sessionToken);
  if (!session?.email) return null;
  return { email: session.email };
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const env = await getOptionalEnv();
  return getUserByToken(token, env);
}

export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (user) {
    return user;
  }

  redirect(withBasePath('/login'));
}

export async function getUserFromRequest(request: Request | NextRequest): Promise<AuthenticatedUser | null> {
  const token = getSessionTokenFromRequest(request);
  const env = await getOptionalEnv();
  return getUserByToken(token, env);
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('fly-client-ip') ||
    'unknown'
  );
}

export function newSessionToken(): string {
  return generateSessionToken();
}

export function setSessionCookie(response: NextResponse, sessionToken: string): void {
  response.cookies.set('session_token', sessionToken, buildCookieOptions());
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set('session_token', '', {
    ...buildCookieOptions(),
    maxAge: 0,
    expires: new Date(0)
  });
}
