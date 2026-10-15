import { NextResponse } from 'next/server';
import { callGas } from '@/lib/gas';
import { signRole, baseCookieOpts, SESSION_COOKIE, ROLE_COOKIE, CSRF_COOKIE } from '@/lib/session';
import { newCsrfToken } from '@/lib/csrf';

/**
 * POST /api/auth/login  { username, password }
 * Tidak butuh CSRF (belum ada sesi). Mengembalikan user + memasang 3 cookie.
 */

// Rate limiting sederhana per IP: maks 10 percobaan/menit.
// Catatan: di serverless tiap instance punya memori sendiri, jadi ini
// lapisan pertama anti brute-force, bukan satu-satunya.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;
const loginAttempts = new Map();

function rateLimited(ip) {
  const now = Date.now();
  if (loginAttempts.size > 2000) {
    for (const [k, v] of loginAttempts) {
      if (now > v.resetAt) loginAttempts.delete(k);
    }
  }
  const rec = loginAttempts.get(ip);
  if (!rec || now > rec.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > RATE_MAX;
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Body tidak valid.' }, { status: 400 });
  }

  const ip =
    (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) {
    const res = NextResponse.json(
      { ok: false, message: 'Terlalu banyak percobaan login. Coba lagi sebentar.' },
      { status: 429 }
    );
    res.headers.set('Retry-After', '60');
    return res;
  }

  const username = String(body.username || '').trim();
  const password = String(body.password || '');
  if (!username || !password) {
    return NextResponse.json(
      { ok: false, message: 'Username dan password wajib diisi.' },
      { status: 400 }
    );
  }

  const result = await callGas('auth.login', { username, password });
  if (!result.ok || !result.data || !result.data.token) {
    // Samarkan: kredensial salah vs gangguan layanan dibedakan di status saja.
    const status = result.configError || result.networkError ? 502 : 401;
    return NextResponse.json(
      { ok: false, message: result.message || 'Login gagal.' },
      { status }
    );
  }

  const { token, user } = result.data;
  const res = NextResponse.json({ ok: true, user });
  const opts = baseCookieOpts(true);
  res.cookies.set(SESSION_COOKIE, token, opts);
  res.cookies.set(ROLE_COOKIE, await signRole(user.role), opts);
  res.cookies.set(CSRF_COOKIE, newCsrfToken(), baseCookieOpts(false));
  return res;
}
