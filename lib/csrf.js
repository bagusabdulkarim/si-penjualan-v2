/**
 * Proteksi CSRF pola double-submit.
 *
 * Server menaruh token acak di cookie sip_csrf (terbaca JS). Setiap request
 * POST ke /api/* (kecuali login) wajib mengirim header "x-csrf-token" dengan
 * nilai yang sama dengan cookie. Situs penyerang tidak bisa membaca cookie
 * (SameSite=Lax) dan tidak bisa memasang custom header cross-origin tanpa
 * preflight yang akan ditolak — sehingga request palsu gagal di sini.
 */
import { CSRF_COOKIE } from './session.js';

export function newCsrfToken() {
  return crypto.randomUUID();
}

/** True bila header x-csrf-token sama persis dengan cookie sip_csrf. */
export function validCsrf(req, cookieStore) {
  const fromCookie = cookieStore.get(CSRF_COOKIE)?.value;
  const fromHeader = req.headers.get('x-csrf-token');
  return !!fromCookie && !!fromHeader && fromCookie === fromHeader;
}
