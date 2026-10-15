import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { callGas } from '@/lib/gas';
import { clearAuthCookies, SESSION_COOKIE } from '@/lib/session';
import { validCsrf } from '@/lib/csrf';

/**
 * POST /api/auth/logout
 * Butuh CSRF (sesi sudah ada). Mengakhiri sesi di GAS lalu membersihkan cookie.
 */
export async function POST(req) {
  const jar = await cookies();

  if (!validCsrf(req, jar)) {
    return NextResponse.json({ ok: false, message: 'Token keamanan tidak valid.' }, { status: 403 });
  }

  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    // Best-effort: sesi lokal tetap dibersihkan walau GAS tidak terjangkau.
    await callGas('auth.logout', {}, token);
  }

  const res = NextResponse.json({ ok: true });
  clearAuthCookies(res);
  return res;
}
