import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { callGas } from '@/lib/gas';
import { clearAuthCookies, SESSION_COOKIE } from '@/lib/session';
import { validCsrf } from '@/lib/csrf';

/**
 * POST /api/gas  { action, ...params }
 *
 * Proxy umum ke GAS Web App. Browser tidak pernah tahu URL/token GAS.
 * - Wajib cookie sesi + header CSRF yang cocok dengan cookie.
 * - "auth.login" tidak boleh lewat sini (ada endpoint khusus).
 * - Sesi basi dari GAS -> 401 + cookie dibersihkan.
 */
export async function POST(req) {
  const jar = await cookies();

  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ ok: false, message: 'Belum login.' }, { status: 401 });
  }

  if (!validCsrf(req, jar)) {
    return NextResponse.json({ ok: false, message: 'Token keamanan tidak valid.' }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Body tidak valid.' }, { status: 400 });
  }

  const { action, ...params } = body;
  if (!action || typeof action !== 'string') {
    return NextResponse.json({ ok: false, message: 'Aksi tidak valid.' }, { status: 400 });
  }
  if (action === 'auth.login') {
    return NextResponse.json({ ok: false, message: 'Gunakan /api/auth/login.' }, { status: 400 });
  }

  const result = await callGas(action, params, token);

  if (result.configError || result.networkError) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 502 });
  }
  if (result.sessionExpired) {
    const res = NextResponse.json({ ok: false, message: result.message }, { status: 401 });
    clearAuthCookies(res);
    return res;
  }
  return NextResponse.json(result);
}
