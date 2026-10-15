/**
 * Manajemen cookie sesi.
 *
 * - sip_session : httpOnly, berisi token sesi GAS yang asli (opaque).
 * - sip_role    : httpOnly, berisi "<role>.<hmac>" — dibaca middleware TANPA
 *                 memanggil GAS (cepat), tidak bisa dipalsukan tanpa
 *                 SESSION_SECRET. Otorisasi final tetap di GAS.
 * - sip_csrf    : terbaca JS, dipakai untuk proteksi CSRF (double-submit).
 */
import { hmacSign, hmacVerify } from './crypto-edge.js';

export const SESSION_COOKIE = 'sip_session';
export const ROLE_COOKIE = 'sip_role';
export const CSRF_COOKIE = 'sip_csrf';
export const SESSION_MAX_AGE = 6 * 3600; // 6 jam, selaras TTL sesi GAS

const VALID_ROLES = ['admin', 'kasir', 'owner'];

function sessionSecret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('SESSION_SECRET belum diisi di environment.');
  return s;
}

export async function signRole(role) {
  const sig = await hmacSign(role, sessionSecret());
  return `${role}.${sig}`;
}

/** Kembalikan role bila tanda tangan valid, selain itu null. */
export async function verifyRoleCookie(value) {
  if (!value || typeof value !== 'string') return null;
  const dot = value.indexOf('.');
  if (dot === -1) return null;
  const role = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (!VALID_ROLES.includes(role) || !sig) return null;
  const ok = await hmacVerify(role, sig, sessionSecret());
  return ok ? role : null;
}

export function baseCookieOpts(httpOnly = true) {
  return {
    httpOnly,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  };
}

export function clearAuthCookies(res) {
  // Atribut penghapusan harus selaras dengan atribut saat cookie dipasang,
  // agar browser benar-benar menghapusnya.
  const prod = process.env.NODE_ENV === 'production';
  const base = { path: '/', maxAge: 0, sameSite: 'lax', secure: prod };
  res.cookies.set(SESSION_COOKIE, '', { ...base, httpOnly: true });
  res.cookies.set(ROLE_COOKIE, '', { ...base, httpOnly: true });
  res.cookies.set(CSRF_COOKIE, '', { ...base, httpOnly: false });
}
