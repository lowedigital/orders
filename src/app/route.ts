import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, SESSION_MAX_AGE, checkAdminCredentials, createSessionToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const username = body.username || '';
  const password = body.password || '';

  if (!checkAdminCredentials(username, password)) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
  }

  const token = await createSessionToken(username);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
