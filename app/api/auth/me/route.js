import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { callGas } from '@/lib/gas';
import { clearAuthCookies, SESSION_COOKIE } from '@/lib/session';

/**
 * GET /api/auth/me — info user dari sesi yang valid (untuk UI).
 * Memvalidasi token ke GAS; sesi basi -> 401 + cookie dibersihkan.
 */
export async function GET() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ ok: false, message: 'Belum login.' }, { status: 401 });
  }

  const result = await callGas('auth.me', {}, token);
  if (!result.ok) {
    const res = NextResponse.json(
      { ok: false, message: result.message },
      { status: result.sessionExpired ? 401 : 502 }
    );
    if (result.sessionExpired) clearAuthCookies(res);
    return res;
  }
  return NextResponse.json({ ok: true, user: result.data });
}
